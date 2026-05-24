import { NextResponse } from "next/server";

// Server-side Spotify Now Playing endpoint.
//
// Required env (in .env.local — never expose CLIENT_SECRET / REFRESH_TOKEN
// to the browser):
//   SPOTIFY_CLIENT_ID
//   SPOTIFY_CLIENT_SECRET
//   SPOTIFY_REFRESH_TOKEN
//
// Setup once:
//   1. Spotify Developer Dashboard → create an app → get client_id + secret.
//   2. Add a redirect URI (e.g. http://localhost:3000/api/spotify-callback).
//   3. Run the OAuth flow once with scope `user-read-currently-playing
//      user-read-playback-state` to obtain a refresh_token. Save it.
//   4. Drop the three values into .env.local and restart.
//
// This route caches the response for 15s so client polling stays under the
// Spotify API rate limit.

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const NOW_PLAYING_URL = "https://api.spotify.com/v1/me/player/currently-playing";

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

async function getAccessToken(): Promise<string | null> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  const refresh = process.env.SPOTIFY_REFRESH_TOKEN;
  if (!id || !secret || !refresh) return null;
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
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

export async function GET() {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { configured: false, isPlaying: false },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    }
    const res = await fetch(NOW_PLAYING_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (res.status === 204 || res.status > 400) {
      return NextResponse.json(
        { configured: true, isPlaying: false },
        { status: 200, headers: { "Cache-Control": "public, max-age=15" } },
      );
    }
    const data = (await res.json()) as SpotifyNowPlaying;
    const item = data.item;
    if (!item) {
      return NextResponse.json(
        { configured: true, isPlaying: false },
        { status: 200, headers: { "Cache-Control": "public, max-age=15" } },
      );
    }
    const artwork = item.album.images.sort((a, b) => b.width - a.width)[0]?.url;
    return NextResponse.json(
      {
        configured: true,
        isPlaying: data.is_playing,
        title: item.name,
        artist: item.artists.map(a => a.name).join(", "),
        album: item.album.name,
        artworkUrl: artwork,
        durationSec: Math.round(item.duration_ms / 1000),
        currentSec: Math.round((data.progress_ms || 0) / 1000),
        url: item.external_urls.spotify,
      },
      { status: 200, headers: { "Cache-Control": "public, max-age=15" } },
    );
  } catch (e) {
    return NextResponse.json(
      { configured: false, isPlaying: false, error: String(e) },
      { status: 200 },
    );
  }
}
