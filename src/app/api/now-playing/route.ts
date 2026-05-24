import { NextResponse } from "next/server";

// Server-side Spotify Now Playing endpoint.
//
// Returns the currently-playing track if Spotify says one is active, else
// falls back to the most-recently-played track. Either way, the client gets
// a populated payload so the card never shows "nothing playing".
//
// Required env (in .env.local — never expose CLIENT_SECRET / REFRESH_TOKEN
// to the browser):
//   SPOTIFY_CLIENT_ID
//   SPOTIFY_CLIENT_SECRET
//   SPOTIFY_REFRESH_TOKEN
// Scopes needed on the refresh_token:
//   user-read-currently-playing user-read-playback-state user-read-recently-played

const TOKEN_URL        = "https://accounts.spotify.com/api/token";
const NOW_PLAYING_URL  = "https://api.spotify.com/v1/me/player/currently-playing";
const RECENT_URL       = "https://api.spotify.com/v1/me/player/recently-played?limit=1";

interface SpotifyImage { url: string; width: number; height: number; }
interface SpotifyArtist { name: string; }
interface SpotifyAlbum { name: string; images: SpotifyImage[]; }
interface SpotifyItem {
  name: string;
  duration_ms: number;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  external_urls: { spotify: string };
}
interface SpotifyNowPlaying {
  is_playing: boolean;
  progress_ms: number;
  item: SpotifyItem | null;
}
interface RecentlyPlayedRes {
  items: { track: SpotifyItem; played_at: string }[];
}

interface TokenResult {
  token: string | null;
  reason?: string;
}

async function getAccessToken(): Promise<TokenResult> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  const refresh = process.env.SPOTIFY_REFRESH_TOKEN;
  if (!id || !secret || !refresh) {
    return { token: null, reason: `env missing: ${[!id && "CLIENT_ID", !secret && "CLIENT_SECRET", !refresh && "REFRESH_TOKEN"].filter(Boolean).join(", ") || "?"}` };
  }
  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { token: null, reason: `refresh failed ${res.status}: ${text.slice(0, 200)}` };
  }
  const data = (await res.json()) as { access_token?: string };
  return { token: data.access_token ?? null, reason: data.access_token ? undefined : "no access_token in response" };
}

function pickArtwork(images: SpotifyImage[]): string | undefined {
  return images.slice().sort((a, b) => b.width - a.width)[0]?.url;
}

function payloadFromItem(item: SpotifyItem, isPlaying: boolean, progressMs?: number) {
  return {
    configured: true,
    isPlaying,
    title: item.name,
    artist: item.artists.map(a => a.name).join(", "),
    album: item.album.name,
    artworkUrl: pickArtwork(item.album.images),
    durationSec: Math.round(item.duration_ms / 1000),
    currentSec: Math.round((progressMs || 0) / 1000),
    url: item.external_urls.spotify,
  };
}

export async function GET(req: Request) {
  const debug = new URL(req.url).searchParams.has("debug");
  try {
    const { token: accessToken, reason } = await getAccessToken();
    if (!accessToken) {
      console.warn("[spotify] no access token:", reason);
      return NextResponse.json(
        { configured: false, isPlaying: false, ...(debug ? { reason } : {}) },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    }

    // 1) Try the live now-playing endpoint.
    const nowRes = await fetch(NOW_PLAYING_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const nowStatus = nowRes.status;
    let nowError: string | undefined;
    if (nowStatus !== 204 && nowRes.ok) {
      const data = (await nowRes.json()) as SpotifyNowPlaying;
      if (data.item) {
        return NextResponse.json(
          payloadFromItem(data.item, !!data.is_playing, data.progress_ms),
          { status: 200, headers: { "Cache-Control": "public, max-age=15" } },
        );
      }
    } else if (!nowRes.ok && nowStatus !== 204) {
      nowError = (await nowRes.text().catch(() => "")).slice(0, 200);
    }

    // 2) Fall back to the most-recently-played track.
    const recentRes = await fetch(RECENT_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const recentStatus = recentRes.status;
    let recentError: string | undefined;
    if (recentRes.ok) {
      const data = (await recentRes.json()) as RecentlyPlayedRes;
      const recent = data.items?.[0]?.track;
      if (recent) {
        return NextResponse.json(
          { ...payloadFromItem(recent, false, 0), playedAt: data.items[0].played_at },
          { status: 200, headers: { "Cache-Control": "public, max-age=60" } },
        );
      }
      recentError = "recently-played returned 0 items";
    } else {
      recentError = `recently-played ${recentStatus}: ${(await recentRes.text().catch(() => "")).slice(0, 200)}`;
    }

    console.warn(`[spotify] now=${nowStatus}${nowError ? ` (${nowError})` : ""}  recent=${recentError}`);

    return NextResponse.json(
      {
        configured: true,
        isPlaying: false,
        ...(debug ? { nowStatus, nowError, recentStatus, recentError } : {}),
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json(
      { configured: false, isPlaying: false, error: String(e) },
      { status: 200 },
    );
  }
}
