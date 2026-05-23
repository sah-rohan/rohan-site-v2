import { Ctx, rect, hline, vline, px, stipple, beveled } from "./draw";
import { G, W, A } from "./palette";

// Canvas logical size — chunky pixels, scaled up to fill viewport.
export const CW = 640;
export const CH = 400;

// Horizon line between wall and desk top.
// Front lip dropped so the desk surface band reads higher in frame.
export const DESK_TOP_Y = 252;
export const DESK_FRONT_Y = 282;
export const DESK_BOTTOM_Y = 300;

export type Theme = "dark" | "light";

export function drawWall(c: Ctx, theme: Theme = "dark") {
  // High-rise apartment: the entire back wall is a floor-to-ceiling window.
  // Dark mode  = procedural dusk Bay Bridge view.
  // Light mode = the user's SF skyline image (preloaded as a sprite).
  if (theme === "light") {
    const img = (typeof window !== "undefined")
      ? (window as Window & { __sfSkyline?: HTMLImageElement }).__sfSkyline
      : undefined;
    if (img && img.complete && img.naturalWidth > 0) {
      // Preserve image aspect ratio — fit the FULL image into the wall area
      // without zooming/cropping. Image is anchored to the bottom (so the
      // water meets the desk top), and the remaining space above is filled
      // with the image's top sky color so the wall reads as continuous.
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const drawW = CW;
      const drawH = Math.round((CW * ih) / iw);
      const drawY = DESK_TOP_Y - drawH;
      // Sky extension above the image — sample-ish lavender top color.
      // (We picked #c5b3c8 from the reference; same color used in light
      // procedural variant.)
      if (drawY > 0) {
        rect(c, 0, 0, CW, drawY, "#c5b3c8");
        // soft band fade to match the image's top row
        hline(c, 0, drawY - 1, CW, "#bca6c1");
      }
      c.drawImage(img, 0, drawY, drawW, drawH);
    } else {
      // Fallback while image loads — procedural Golden Gate
      drawGoldenGateView(c, 0, 0, CW, DESK_TOP_Y);
    }
  } else {
    drawBayView(c, 0, 0, CW, DESK_TOP_Y);
  }

  // Window frame — thin dark steel mullions framing the room edges.
  // Top header
  rect(c, 0, 0, CW, 4, G.ink);
  hline(c, 0, 4, CW, G.g15);
  // Bottom sill at desk-top level
  hline(c, 0, DESK_TOP_Y - 4, CW, G.g15);
  rect(c, 0, DESK_TOP_Y - 3, CW, 3, G.ink);
  // Vertical mullions dividing into three panels
  drawMullion(c, Math.floor(CW * 0.33));
  drawMullion(c, Math.floor(CW * 0.66));
  // Left and right vertical edges
  drawMullion(c, 0);
  drawMullion(c, CW - 2);
}

function drawMullion(c: Ctx, x: number) {
  rect(c, x, 0, 2, DESK_TOP_Y, G.ink);
  vline(c, x, 0, DESK_TOP_Y, G.g15);
}

// No-op kept for API compat — the bay view is now baked into drawWall.
export function drawWindow(_c: Ctx) { /* intentionally empty */ }

export function drawBayView(c: Ctx, x: number, y: number, w: number, h: number) {
  // The Bay Bridge at dusk, rendered to fill any rect. Composes:
  // gradient dusk sky, distant SF skyline, the bridge silhouette with
  // suspension cables + tower lights, dark bay water with reflections.

  // ── Sky (dusk gradient: deep navy top → warm amber horizon) ──
  for (let yy = 0; yy < h; yy++) {
    const t = yy / h;
    let col: string;
    if (t < 0.35) {
      // Deep dusk navy
      const k = t / 0.35;
      col = blend("#0a0f1a", "#1a2238", k);
    } else if (t < 0.55) {
      // Warm horizon haze
      const k = (t - 0.35) / 0.2;
      col = blend("#1a2238", "#3a2a1e", k);
    } else if (t < 0.62) {
      // Distant skyline darken
      col = "#1a1814";
    } else {
      // Bay water — dark with faint highlights
      const k = (t - 0.62) / 0.38;
      col = blend("#0a1018", "#03060a", k);
    }
    hline(c, x, y + yy, w, col);
  }

  // ── Stars (sparse, top third only) ──
  let s = 12345;
  for (let i = 0; i < 14; i++) {
    s = (s * 9301 + 49297) % 233280;
    const px0 = x + (s % w);
    const py0 = y + ((s >> 4) % Math.floor(h * 0.3));
    px(c, px0, py0, "#c8c8c8");
    if ((s & 3) === 0) {
      px(c, px0 + 1, py0, "#8a8a8a");
      px(c, px0, py0 + 1, "#8a8a8a");
    }
  }

  // ── Distant SF skyline silhouette ──
  const skyBase = y + Math.floor(h * 0.62);
  drawSkyline(c, x, skyBase, w);

  // ── Bay Bridge ──
  drawBayBridge(c, x, y, w, h);

  // ── Water highlights (light reflections under the bridge) ──
  for (let yy = skyBase + 4; yy < y + h; yy++) {
    const t = (yy - skyBase) / (y + h - skyBase);
    // sparse horizontal glints
    if (yy % 3 === 0) {
      let r = (yy * 73 + 11) % 1000;
      for (let k = 0; k < 4; k++) {
        r = (r * 9301 + 49297) % 233280;
        const xx = x + (r % w);
        if ((r & 7) === 0) px(c, xx, yy, A.amberDk);
        else if ((r & 3) === 0) px(c, xx, yy, "#1a2840");
      }
    }
    // very faint amber reflection band right under the bridge lights
    if (t < 0.25 && yy % 2 === 0) {
      stipple(c, x + 4, yy, w - 8, 1, A.amberDk, 0.04, yy);
    }
  }

  // (mullion intentionally drawn by drawWall in the high-rise variant)
}

// Linear-blend two hex colors. Cheap, no clamping.
function blend(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

function drawSkyline(c: Ctx, x: number, baseY: number, w: number) {
  // Procedural skyline — buildings of varying heights, with sparse window lights.
  let s = 91;
  for (let i = 0; i < w; ) {
    s = (s * 9301 + 49297) % 233280;
    const bw = 4 + Math.floor((s / 233280) * 10);
    s = (s * 9301 + 49297) % 233280;
    const bh = 6 + Math.floor((s / 233280) * 18);
    // Tall accent building occasionally (Salesforce Tower-ish)
    const tall = (s & 31) === 0 ? bh + 14 : bh;
    if (i + bw > w) break;
    // Building silhouette
    rect(c, x + i, baseY - tall, bw, tall, "#06080c");
    // Building rim highlight on top-left
    hline(c, x + i, baseY - tall, bw, "#10141e");
    vline(c, x + i, baseY - tall, tall, "#0c1018");
    // Window lights — sparse warm dots
    let r = s;
    for (let j = 0; j < tall - 3; j += 3) {
      for (let k = 1; k < bw - 1; k += 2) {
        r = (r * 9301 + 49297) % 233280;
        if ((r / 233280) < 0.18) {
          px(c, x + i + k, baseY - tall + j + 1, A.amber);
        } else if ((r / 233280) < 0.22) {
          px(c, x + i + k, baseY - tall + j + 1, A.amberDk);
        }
      }
    }
    // Antenna on tall buildings
    if (tall > bh + 5) {
      vline(c, x + i + (bw >> 1), baseY - tall - 3, 3, "#0a0c12");
      px(c, x + i + (bw >> 1), baseY - tall - 3, A.amber);
    }
    i += bw;
  }
  // Faint horizon glow line
  hline(c, x, baseY, w, "#1a1410");
  hline(c, x, baseY + 1, w, "#0d0c10");
}

function drawBayBridge(c: Ctx, x: number, y: number, w: number, h: number) {
  // The Bay Bridge — west span suspension structure.
  // Two towers, suspension cable curve between them, deck line, tower lights.
  //
  // Coords:
  //   bridgeY      = the deck (roadway) y-position
  //   towerH       = height of tower above deck
  //   tower1X, tower2X = horizontal positions of the two towers
  const bridgeY = y + Math.floor(h * 0.66);
  const towerH = 44;
  const tower1X = x + Math.floor(w * 0.18);
  const tower2X = x + Math.floor(w * 0.74);
  const towerW = 4;

  // ── Suspension cable (main span between towers) ──
  // Catenary curve: sags down at mid-span.
  const sagY = bridgeY - 6; // lowest point of cable mid-span
  drawCableArc(c, tower1X, bridgeY - towerH, tower2X, bridgeY - towerH, sagY, "#3a3a40");

  // ── Side cables anchoring off the towers down to deck ends ──
  drawCableArc(c, x + 2, bridgeY - 2, tower1X, bridgeY - towerH, bridgeY - 2, "#2a2a30");
  drawCableArc(c, tower2X, bridgeY - towerH, x + w - 2, bridgeY - 2, bridgeY - 2, "#2a2a30");

  // ── Vertical suspender cables between main cable and deck ──
  for (let xx = tower1X + 4; xx < tower2X - 2; xx += 4) {
    const t = (xx - tower1X) / (tower2X - tower1X);
    // cable height at xx, parabolic
    const cy = bridgeY - towerH + (bridgeY - sagY - (bridgeY - towerH - sagY))
      * 4 * t * (1 - t);
    const top = Math.round(cy);
    for (let yy = top + 1; yy < bridgeY - 1; yy++) {
      if (yy % 2 === 0) px(c, xx, yy, "#1f1f24");
    }
  }

  // ── Bridge deck (roadway) ──
  rect(c, x + 2, bridgeY - 2, w - 4, 3, "#0a0a0e");
  hline(c, x + 2, bridgeY - 2, w - 4, "#1a1a22");
  hline(c, x + 2, bridgeY,     w - 4, "#05060a");
  // Roadway light dots along the deck
  for (let xx = x + 6; xx < x + w - 6; xx += 5) {
    px(c, xx, bridgeY - 1, A.amber);
    if (((xx >> 1) % 3) === 0) px(c, xx, bridgeY - 1, "#f6d68a");
  }
  // Lower deck shadow line (Bay Bridge has two decks)
  hline(c, x + 2, bridgeY + 4, w - 4, "#08080c");
  hline(c, x + 2, bridgeY + 5, w - 4, "#04050a");

  // ── Towers ──
  drawTower(c, tower1X, bridgeY, towerH, towerW);
  drawTower(c, tower2X, bridgeY, towerH, towerW);

  // ── Tower top aircraft warning light (red) ──
  px(c, tower1X + (towerW >> 1), bridgeY - towerH - 1, A.red);
  px(c, tower2X + (towerW >> 1), bridgeY - towerH - 1, A.red);
}

function drawTower(c: Ctx, x: number, deckY: number, h: number, w: number) {
  // Tower above deck
  rect(c, x, deckY - h, w, h, "#16181f");
  vline(c, x, deckY - h, h, "#22242c");
  vline(c, x + w - 1, deckY - h, h, "#0a0c12");
  // Tower below deck (pier, fades to dark water)
  for (let i = 0; i < 12; i++) {
    rect(c, x, deckY + i, w, 1, blend("#0a0c12", "#03050a", i / 12));
  }
  // Cross-brace mid-tower (typical of Bay Bridge towers)
  hline(c, x - 1, deckY - Math.floor(h * 0.55), w + 2, "#1a1c22");
  // Tiny perimeter lights climbing the tower
  for (let yy = 4; yy < h; yy += 8) {
    px(c, x - 1, deckY - yy, A.amberDk);
    px(c, x + w, deckY - yy, A.amberDk);
  }
}

function drawCableArc(
  c: Ctx, x1: number, y1: number, x2: number, y2: number, lowY: number, col: string,
) {
  // Quadratic Bezier-ish curve from (x1,y1) to (x2,y2) passing near lowY at midpoint.
  const steps = Math.abs(x2 - x1) * 2;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const omt = 1 - t;
    const x = omt * omt * x1 + 2 * omt * t * ((x1 + x2) / 2) + t * t * x2;
    const yMid = (y1 + y2) / 2 + (lowY - (y1 + y2) / 2);
    const y = omt * omt * y1 + 2 * omt * t * yMid + t * t * y2;
    px(c, x | 0, y | 0, col);
  }
}

// ─────────────────────────────────────────────────────────────
// GOLDEN GATE SUNSET VIEW (light theme).
// Lavender pink sky, sunset-lit SF skyline (warm orange east-facing
// faces, dark west-facing shadows), dark navy bay, and a prominent
// red Golden Gate Bridge with one big foreground tower on the left
// and a smaller far tower in mid-distance, suspension cables sweeping
// across the frame. Inspired by the reference image.
// ─────────────────────────────────────────────────────────────
export function drawGoldenGateView(c: Ctx, x: number, y: number, w: number, h: number) {
  // Palette
  const skyHi   = "#c5b3c8";  // pale lavender top
  const skyLo   = "#b9a3bd";  // dustier lavender near horizon
  const haze    = "#d4b3a8";  // warm pinkish horizon haze
  const water   = "#1f2a44";
  const waterDk = "#141a30";
  const hill    = "#2a1f3a";
  const hillLt  = "#3a2c4a";
  const bldgWarmA = "#f4ad6a";  // sunlit building face (bright)
  const bldgWarmB = "#d49860";  // sunlit shadow
  const bldgDark  = "#1c1424";
  const bldgMid   = "#3a2a3a";
  const bridgeRed = "#c8302a";
  const bridgeRedDk = "#8a1a14";
  const bridgeRedHl = "#e85040";

  // ── Sky (lavender gradient with warm horizon) ──
  for (let yy = 0; yy < h; yy++) {
    const t = yy / h;
    let col: string;
    if (t < 0.55) {
      col = blend(skyHi, skyLo, t / 0.55);
    } else if (t < 0.66) {
      const k = (t - 0.55) / 0.11;
      col = blend(skyLo, haze, k);
    } else {
      // Below horizon — water area
      const k = (t - 0.66) / 0.34;
      col = blend(water, waterDk, k);
    }
    hline(c, x, y + yy, w, col);
  }
  // Subtle horizontal sky banding (clouds / haze striations)
  for (let yy = 4; yy < h * 0.55; yy += 5) {
    if ((yy * 13) % 7 < 3) {
      stipple(c, x, y + yy, w, 1, "#a89aae", 0.5, yy);
    }
  }

  // ── Distant hills (Marin headlands behind bridge) ──
  const horizonY = y + Math.floor(h * 0.55);
  drawDistantHills(c, x, horizonY, w, hill, hillLt);

  // ── SF skyline (right half) ──
  const skyBase = y + Math.floor(h * 0.62);
  drawSunsetSkyline(c, x + Math.floor(w * 0.42), skyBase, Math.floor(w * 0.58),
                    bldgWarmA, bldgWarmB, bldgDark, bldgMid);

  // ── Golden Gate Bridge ──
  drawGoldenGate(c, x, y, w, h, bridgeRed, bridgeRedDk, bridgeRedHl);

  // ── Water — soft horizontal glints ──
  for (let yy = horizonY + 2; yy < y + h; yy++) {
    if (yy % 3 === 0) {
      let r = (yy * 41 + 7) % 1000;
      for (let k = 0; k < 3; k++) {
        r = (r * 9301 + 49297) % 233280;
        const xx = x + (r % w);
        if ((r & 7) === 0) px(c, xx, yy, "#3a4a6a");
      }
    }
  }
}

function drawDistantHills(c: Ctx, x: number, baseY: number, w: number, hill: string, hillLt: string) {
  // Soft purple hills rolling along the horizon.
  for (let i = 0; i < w; i++) {
    const t = i / w;
    // Compose two sine waves for an irregular ridge line
    const h1 = Math.sin(t * Math.PI * 2.2) * 6;
    const h2 = Math.sin(t * Math.PI * 5 + 1.3) * 3;
    const top = Math.round(baseY - 14 - h1 - h2);
    for (let yy = top; yy < baseY; yy++) {
      const dt = (yy - top) / (baseY - top);
      const col = dt < 0.18 ? hillLt : hill;
      px(c, x + i, yy, col);
    }
    // Highlight a single pixel at the very top (catching warm light)
    px(c, x + i, top, "#5a4060");
  }
}

function drawSunsetSkyline(
  c: Ctx, x: number, baseY: number, w: number,
  warmA: string, warmB: string, dark: string, mid: string,
) {
  // Sunset-lit skyline. Each building has a sunlit east face (warm) and a
  // shadow west face (dark). Buildings layered front-to-back via z bands.
  let s = 137;
  for (let i = 0; i < w; ) {
    s = (s * 9301 + 49297) % 233280;
    const bw = 5 + Math.floor((s / 233280) * 12);
    s = (s * 9301 + 49297) % 233280;
    const bh = 8 + Math.floor((s / 233280) * 24);
    // Occasional tall accent (Transamerica / Salesforce style)
    const tallBoost = (s & 31) === 0 ? bh + 18 : ((s & 15) === 0 ? bh + 8 : 0);
    const fullH = bh + tallBoost;
    if (i + bw > w) break;
    // Background buildings are darker; foreground (sometimes) warm-lit.
    const isLit = ((s >> 5) & 1) === 0;
    const faceLit = isLit ? warmA : mid;
    const faceShadow = isLit ? warmB : dark;
    // Most of building is shadow side, narrow warm strip on the right.
    rect(c, x + i, baseY - fullH, bw, fullH, dark);
    // Sunlit right-edge band (varies in width per building)
    const litW = Math.max(1, Math.floor(bw * (0.18 + (s & 7) / 28)));
    rect(c, x + i + bw - litW, baseY - fullH, litW, fullH, faceLit);
    // Soft mid-tone between
    if (bw > litW + 1) {
      vline(c, x + i + bw - litW - 1, baseY - fullH, fullH, faceShadow);
    }
    // Top edge highlight (rooftop catches light)
    hline(c, x + i, baseY - fullH, bw, blend(faceLit, "#ffffff", 0.3));
    // Faint warm-lit window pixels on the sunlit side (rare)
    let r = s;
    for (let j = 0; j < fullH - 4; j += 3) {
      for (let k = bw - litW; k < bw - 1; k += 2) {
        r = (r * 9301 + 49297) % 233280;
        if ((r / 233280) < 0.08) {
          px(c, x + i + k, baseY - fullH + j + 2, blend(warmA, "#ffe0a0", 0.6));
        }
      }
    }
    // Antenna on tall buildings
    if (tallBoost > 12) {
      vline(c, x + i + (bw >> 1), baseY - fullH - 5, 5, dark);
      px(c, x + i + (bw >> 1), baseY - fullH - 5, blend(warmA, "#ffffff", 0.3));
    }
    i += bw;
  }
  // Horizon sliver where skyline meets water
  hline(c, x, baseY, w, "#2a1c3a");
  hline(c, x, baseY + 1, w, "#181024");
}

function drawGoldenGate(
  c: Ctx, x: number, y: number, w: number, h: number,
  red: string, redDk: string, redHl: string,
) {
  // Foreground tower (LARGE) on the left + a smaller far tower mid-right.
  // Suspension main cable curves between them; side cables anchor to deck ends.
  // The deck (roadway) runs horizontally roughly across the lower-middle.

  const deckY = y + Math.floor(h * 0.74);
  const fgTowerX = x + Math.floor(w * 0.13);
  const fgTowerW = 28;
  const fgTowerTop = y + 6;
  const farTowerX = x + Math.floor(w * 0.62);
  const farTowerW = 8;
  const farTowerTop = y + Math.floor(h * 0.30);

  // ── Main suspension cable (curves between tower tops, sags to mid-deck) ──
  const sagY = y + Math.floor(h * 0.62);
  drawCableArc(c, fgTowerX + (fgTowerW >> 1), fgTowerTop,
               farTowerX + (farTowerW >> 1), farTowerTop, sagY, red);

  // ── Side cable on the LEFT (from off-screen-left up to fg tower top) ──
  // Sweeps down to the off-frame anchorage.
  drawCableArc(c, x, deckY - 4,
               fgTowerX + (fgTowerW >> 1), fgTowerTop, deckY - 4, red);
  // ── Side cable on the RIGHT (from far tower down to off-frame right) ──
  drawCableArc(c, farTowerX + (farTowerW >> 1), farTowerTop,
               x + w + 4, deckY - 1, deckY - 1, red);

  // ── Vertical suspender cables between main cable and deck ──
  for (let xx = fgTowerX + fgTowerW + 4; xx < farTowerX; xx += 6) {
    const t = (xx - fgTowerX) / (farTowerX - fgTowerX);
    const cy = fgTowerTop + (farTowerTop - fgTowerTop) * t
             - Math.sin(t * Math.PI) * (sagY - Math.min(fgTowerTop, farTowerTop) - 8);
    // Actually use a quadratic to match the arc:
    const omt = 1 - t;
    const yMid = (fgTowerTop + farTowerTop) / 2 + (sagY - (fgTowerTop + farTowerTop) / 2);
    const top = Math.round(omt * omt * fgTowerTop + 2 * omt * t * yMid + t * t * farTowerTop);
    void cy;
    for (let yy = top + 1; yy < deckY - 2; yy++) {
      if (yy % 2 === 0) px(c, xx, yy, red);
    }
  }

  // ── Deck (roadway) — thin horizontal red line ──
  hline(c, x, deckY - 1, w, redDk);
  rect(c, x, deckY, w, 2, red);
  hline(c, x, deckY + 2, w, redDk);

  // ── Far tower (small, behind/distance) ──
  drawGGTower(c, farTowerX, farTowerTop, deckY, farTowerW, red, redDk, redHl, true);

  // ── Foreground tower (BIG, dominant on the left) ──
  drawGGTower(c, fgTowerX, fgTowerTop, deckY, fgTowerW, red, redDk, redHl, false);
}

function drawGGTower(
  c: Ctx, x: number, topY: number, deckY: number, w: number,
  red: string, redDk: string, redHl: string, small: boolean,
) {
  const h = deckY - topY;
  // Main shaft
  rect(c, x, topY, w, h, red);
  vline(c, x, topY, h, redHl);
  vline(c, x + w - 1, topY, h, redDk);
  hline(c, x, topY, w, redHl);
  // Soft top cap
  hline(c, x + 1, topY - 1, w - 2, red);
  px(c, x + 1, topY - 2, red);
  px(c, x + w - 2, topY - 2, red);

  if (!small) {
    // Foreground tower — add the iconic arched openings and cross-brace structure.
    // Two arched portals stacked vertically.
    const portalW = w - 8;
    const portalH = Math.floor(h * 0.16);
    const p1Y = topY + Math.floor(h * 0.32);
    const p2Y = topY + Math.floor(h * 0.58);
    drawArchPortal(c, x + 4, p1Y, portalW, portalH, redDk);
    drawArchPortal(c, x + 4, p2Y, portalW, portalH, redDk);
    // Cross-brace bands (thicker horizontal strips between portals)
    const braceY1 = p1Y - 4;
    const braceY2 = p1Y + portalH + 2;
    const braceY3 = p2Y - 4;
    const braceY4 = p2Y + portalH + 2;
    for (const by of [braceY1, braceY2, braceY3, braceY4]) {
      rect(c, x, by, w, 2, redDk);
      hline(c, x, by, w, red);
    }
    // Slight tapering: thin out top of tower by darkening sides
    for (let yy = topY; yy < topY + 6; yy++) {
      px(c, x, yy, redDk);
      px(c, x + w - 1, yy, redDk);
    }
  } else {
    // Far tower — simpler, just one small portal hint
    rect(c, x + 1, topY + Math.floor(h * 0.4), w - 2, 3, redDk);
  }

  // Pier (below deck — short fade into water)
  for (let i = 0; i < 6; i++) {
    rect(c, x, deckY + i, w, 1, blend(redDk, "#0a0a18", i / 6));
  }
}

function drawArchPortal(c: Ctx, x: number, y: number, w: number, h: number, dk: string) {
  // Carve an arch-shaped dark portal out of the tower.
  for (let j = 0; j < h; j++) {
    const t = j / (h - 1);
    // Top half of arch: narrower at very top, widens to full width at midpoint
    let curW: number;
    if (t < 0.35) {
      const k = t / 0.35;
      curW = Math.round(w * (0.55 + 0.45 * Math.sin(k * Math.PI / 2)));
    } else {
      curW = w;
    }
    const xx = x + Math.floor((w - curW) / 2);
    rect(c, xx, y + j, curW, 1, dk);
  }
}

export function drawFloor(c: Ctx) {
  // Floor — dark gray, planks running horizontally toward viewer.
  rect(c, 0, DESK_TOP_Y, CW, CH - DESK_TOP_Y, G.g10);
  for (let y = DESK_TOP_Y + 8; y < CH; y += 14) {
    hline(c, 0, y, CW, G.g15);
    hline(c, 0, y + 1, CW, G.g05);
  }
  // Plank seams
  for (let i = 0; i < 8; i++) {
    const x = (i * 91 + 23) % CW;
    const y = DESK_TOP_Y + 8 + Math.floor(i / 2) * 14;
    vline(c, x, y, 13, G.g05);
  }
  // Floor stipple grain
  stipple(c, 0, DESK_TOP_Y, CW, CH - DESK_TOP_Y, G.g15, 0.04, 41);
}

export function drawDesk(c: Ctx) {
  // Desk surface (top face) — warm dark wood, perspective-flat.
  const xL = 60, xR = 590;
  rect(c, xL, DESK_TOP_Y, xR - xL, DESK_FRONT_Y - DESK_TOP_Y, W.d4);
  // Top highlight along front edge (light hitting top)
  hline(c, xL, DESK_TOP_Y, xR - xL, W.d5);
  hline(c, xL, DESK_TOP_Y + 1, xR - xL, W.d4);
  // Wood grain lines on top
  for (let i = 0; i < 14; i++) {
    const x = xL + 18 + i * 38;
    rect(c, x, DESK_TOP_Y + 2, 1, DESK_FRONT_Y - DESK_TOP_Y - 3, W.d2);
  }
  stipple(c, xL, DESK_TOP_Y, xR - xL, DESK_FRONT_Y - DESK_TOP_Y, W.d3, 0.12, 19);
  stipple(c, xL, DESK_TOP_Y, xR - xL, DESK_FRONT_Y - DESK_TOP_Y, W.d5, 0.06, 23);

  // Front lip — slight shadow line
  hline(c, xL, DESK_FRONT_Y, xR - xL, W.d1);
  // Desk front face (thicker, vertical)
  rect(c, xL, DESK_FRONT_Y + 1, xR - xL, DESK_BOTTOM_Y - DESK_FRONT_Y - 1, W.d3);
  hline(c, xL, DESK_FRONT_Y + 1, xR - xL, W.d4);
  hline(c, xL, DESK_BOTTOM_Y - 1, xR - xL, W.dk);
  stipple(c, xL, DESK_FRONT_Y + 1, xR - xL, DESK_BOTTOM_Y - DESK_FRONT_Y - 1, W.d2, 0.18, 31);

  // Side bevel — the curved corner from the reference photo
  // (subtle vertical dark strips at far ends)
  vline(c, xL, DESK_TOP_Y, DESK_BOTTOM_Y - DESK_TOP_Y, W.d2);
  vline(c, xR - 1, DESK_TOP_Y, DESK_BOTTOM_Y - DESK_TOP_Y, W.d2);

  // Legs — angled metal trestle legs (like reference: dark steel)
  drawDeskLeg(c, xL + 24);
  drawDeskLeg(c, xR - 28);
}

function drawDeskLeg(c: Ctx, baseX: number) {
  // Angled leg: top at baseX, splaying outward toward floor.
  for (let y = DESK_BOTTOM_Y; y < CH - 4; y++) {
    const t = (y - DESK_BOTTOM_Y) / (CH - 4 - DESK_BOTTOM_Y);
    const dir = baseX < CW / 2 ? -1 : 1;
    const x = (baseX + dir * t * 18) | 0;
    rect(c, x - 2, y, 4, 1, G.g25);
    px(c, x - 2, y, G.g35);
    px(c, x + 1, y, G.g10);
  }
  // Floor contact pad
  const dir = baseX < CW / 2 ? -1 : 1;
  const fx = (baseX + dir * 18) | 0;
  rect(c, fx - 4, CH - 6, 8, 3, G.g30);
  hline(c, fx - 4, CH - 6, 8, G.g45);
}
