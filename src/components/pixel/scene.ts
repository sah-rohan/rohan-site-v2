import { Ctx, rect, hline, vline, px, stipple, beveled } from "./draw";
import { G, W, A } from "./palette";

// Canvas logical size — chunky pixels, scaled up to fill viewport.
export const CW = 640;
export const CH = 400;

// Horizon line between wall and desk top.
export const DESK_TOP_Y = 252;
export const DESK_FRONT_Y = 268;
export const DESK_BOTTOM_Y = 286;

export function drawWall(c: Ctx) {
  // Base wall — warm dark gray, top-to-bottom subtle gradient via banding.
  rect(c, 0, 0, CW, DESK_TOP_Y, G.g20);
  // Vertical gradient — lighter at top (ceiling bounce), darker toward desk.
  for (let y = 0; y < DESK_TOP_Y; y++) {
    const t = y / DESK_TOP_Y;
    if (y % 2 === 0 && t < 0.35) hline(c, 0, y, CW, G.g25);
    if (t > 0.7 && y % 3 === 0) hline(c, 0, y, CW, G.g15);
  }
  // Wall grain stipple — extremely subtle.
  stipple(c, 0, 0, CW, DESK_TOP_Y, G.g15, 0.03, 7);
  stipple(c, 0, 0, CW, DESK_TOP_Y, G.g25, 0.02, 13);

  // Baseboard along desk top (behind desk).
  hline(c, 0, DESK_TOP_Y - 2, CW, G.g15);
  hline(c, 0, DESK_TOP_Y - 1, CW, G.g10);
}

export function drawWindow(c: Ctx) {
  // Right-side window — view onto the Bay Bridge at dusk.
  // Composition: gradient dusk sky, distant SF skyline, the bridge silhouette
  // with suspension cables and tower lights, dark bay water with reflected lights.
  const x = 470, y = 18, w = 158, h = 220;

  // Outer wood frame
  beveled(c, x - 5, y - 5, w + 10, h + 10, G.g30, G.g45, G.g10);
  beveled(c, x - 3, y - 3, w + 6, h + 6, G.g20, G.g35, G.g05);
  // Inner sill highlight at bottom
  hline(c, x - 3, y + h + 2, w + 6, G.g50);

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

  // ── Mullion (vertical window divider) ──
  vline(c, x + (w >> 1), y, h, G.g15);
  vline(c, x + (w >> 1) + 1, y, h, G.g25);

  // ── Glass pane reflection sheen (subtle diagonal) ──
  for (let i = 0; i < 28; i++) {
    const xx = x + 6 + i;
    const yy = y + 8 + i * 2;
    if (yy < y + h - 4 && xx < x + w - 4) {
      px(c, xx, yy, "rgba(255,255,255,0.05)");
    }
  }
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
