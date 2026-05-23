import { Ctx, rect, hline, vline, px, ellipse, stipple } from "./draw";
import { G, A, W } from "./palette";

// Back-compat shim — old callers used drawGuitar(cx, topY).
// Maps to drawGuitarOnStand(cx, floorY).
export function drawGuitar(
  c: Ctx, cx: number, baseY: number,
  opts: { strap?: boolean; dreadnought?: boolean; mount?: "wall" | "lean" | "stand" } = {},
) {
  drawGuitarOnStand(c, cx, baseY, { strap: opts.strap });
}

// Acoustic guitar standing on a tripod stand on the floor.
// (cx, baseY) = bottom-center of the stand (where it touches the floor).
//
// Drawn so the headstock is on top, body at bottom resting in the stand cradle.
// Reads as a real acoustic at this size: clear waist + bouts, dark fretboard,
// soundhole, pickguard, bridge with pins.
export function drawGuitarOnStand(
  c: Ctx, cx: number, baseY: number,
  opts: { strap?: boolean } = {},
) {
  // ── Tripod stand ──
  drawStand(c, cx, baseY);

  // Guitar geometry — bottom of body at standY-ish.
  const bodyBottomY = baseY - 12;          // body bottom rests in cradle
  const bodyH = 84;
  const bodyTop = bodyBottomY - bodyH;
  const neckH = 56;
  const neckTop = bodyTop - neckH;
  const hsH = 18;
  const hsTop = neckTop - hsH;

  // ── Body silhouette (hand-tuned half-widths, top→bottom) ──
  const profile = CONCERT_PROFILE;
  // Body fill + per-row rim shading.
  for (let j = 0; j < bodyH; j++) {
    const halfW = profile[j];
    if (halfW <= 0) continue;
    const x = cx - halfW;
    const w = halfW * 2;
    const y = bodyTop + j;
    rect(c, x, y, w, 1, W.hl);
    // dark rim
    px(c, x, y, G.g30);
    px(c, x + w - 1, y, G.g30);
    // top sheen first few rows
    if (j < 5) px(c, x + 2, y, G.paper);
    // right-side shading (light from top-left)
    if (j > 6 && j < bodyH - 4) {
      px(c, x + w - 2, y, G.g65);
    }
  }

  // ── Sound hole + rosette ──
  const shCy = bodyTop + Math.floor(bodyH * 0.36);
  ellipse(c, cx, shCy, 9, 9, G.g40);    // outer rosette ring
  ellipse(c, cx, shCy, 8, 8, G.g15);    // inner ring shadow
  ellipse(c, cx, shCy, 7, 7, G.ink);    // hole
  // rosette decorative ring
  for (let a = 0; a < 24; a++) {
    const ang = (a / 24) * Math.PI * 2;
    const rx = Math.round(Math.cos(ang) * 8);
    const ry = Math.round(Math.sin(ang) * 8);
    if (a % 3 === 0) px(c, cx + rx, shCy + ry, G.paper);
  }
  // ring highlight
  px(c, cx - 6, shCy - 4, G.paper);

  // ── Pickguard (teardrop, below-right of soundhole) ──
  drawPickguard(c, cx + 6, shCy - 3);

  // ── Bridge with pins ──
  const brY = shCy + 18;
  rect(c, cx - 10, brY, 20, 5, G.g10);
  hline(c, cx - 10, brY, 20, G.g30);
  hline(c, cx - 10, brY + 4, 20, G.ink);
  // Saddle
  hline(c, cx - 8, brY + 1, 16, G.g60);
  // Bridge pins (6 white dots)
  for (let i = 0; i < 6; i++) px(c, cx - 6 + i * 2, brY + 3, G.paper);

  // ── Neck / fretboard ──
  rect(c, cx - 5, neckTop, 10, neckH, G.g10);
  vline(c, cx - 5, neckTop, neckH, G.g20);
  vline(c, cx + 4, neckTop, neckH, G.g05);
  // Frets (light)
  for (let f = 0; f < 9; f++) {
    hline(c, cx - 5, neckTop + 5 + f * 6, 10, G.g75);
  }
  // Inlays (position dots) on 3rd, 5th, 7th, 9th frets
  px(c, cx, neckTop + 14, G.paper);
  px(c, cx, neckTop + 26, G.paper);
  px(c, cx, neckTop + 38, G.paper);
  px(c, cx, neckTop + 50, G.paper);

  // ── Nut between neck and headstock ──
  hline(c, cx - 6, neckTop, 12, G.white);
  hline(c, cx - 6, neckTop - 1, 12, G.paper);

  // ── Headstock ──
  rect(c, cx - 9, hsTop, 18, hsH, G.g15);
  // Headstock face shading
  hline(c, cx - 9, hsTop, 18, G.g30);
  hline(c, cx - 9, hsTop + 1, 18, G.g25);
  vline(c, cx - 9, hsTop, hsH, G.g25);
  vline(c, cx + 8, hsTop, hsH, G.g05);
  hline(c, cx - 9, hsTop + hsH - 1, 18, G.g05);
  // Headstock cap curve (rounded top)
  px(c, cx - 9, hsTop, G.g25);
  px(c, cx - 8, hsTop - 1, G.g30);
  px(c, cx + 7, hsTop - 1, G.g15);
  px(c, cx + 8, hsTop, G.g10);
  // Manufacturer logo (tiny silver pixel cluster center)
  rect(c, cx - 2, hsTop + 4, 4, 2, G.g50);
  hline(c, cx - 2, hsTop + 4, 4, G.g70);
  // Tuning pegs — 3 per side, with white knobs
  for (let p = 0; p < 3; p++) {
    const yy = hsTop + 4 + p * 4;
    // left side
    rect(c, cx - 12, yy, 3, 2, G.g70);
    hline(c, cx - 12, yy, 3, G.paper);
    px(c, cx - 12, yy + 1, G.g50);
    // shaft
    rect(c, cx - 9, yy, 2, 2, G.g30);
    // right side
    rect(c, cx + 9, yy, 3, 2, G.g70);
    hline(c, cx + 9, yy, 3, G.paper);
    px(c, cx + 11, yy + 1, G.g50);
    rect(c, cx + 7, yy, 2, 2, G.g30);
  }

  // ── Strings ──
  // 6 strings on the neck only (very fine, light)
  for (let s = 0; s < 6; s++) {
    const sx = cx - 3 + Math.round(s * 1.2);
    for (let yy = hsTop + hsH; yy < neckTop + neckH; yy++) {
      if (yy % 1 === 0) px(c, sx, yy, s < 3 ? G.g60 : G.g75);
    }
    // Body strings — faint dots between soundhole and bridge
    for (let yy = shCy + 9; yy < brY; yy += 2) {
      px(c, sx, yy, G.g65);
    }
  }

  // ── Optional red strap draped over the body's left edge ──
  if (opts.strap) {
    drawStrap(c, cx, hsTop, bodyTop, bodyH, profile);
  }

  // ── Subtle wood grain on body top ──
  stipple(c, cx - 22, bodyTop + 6, 44, bodyH - 14, G.g80, 0.018, 11);
}

// Tripod guitar stand (cradle at top, splayed legs at bottom).
function drawStand(c: Ctx, cx: number, baseY: number) {
  // Cradle (where body bottom rests)
  rect(c, cx - 10, baseY - 14, 20, 2, G.g35);
  rect(c, cx - 11, baseY - 12, 22, 2, G.g25);
  // Soft padding on cradle (so guitar doesn't get scratched)
  hline(c, cx - 9, baseY - 14, 18, G.g50);
  px(c, cx - 10, baseY - 14, G.g70);
  px(c, cx + 9,  baseY - 14, G.g15);
  // Center post going down
  rect(c, cx - 1, baseY - 12, 2, 10, G.g30);
  vline(c, cx - 1, baseY - 12, 10, G.g45);
  // Tripod feet — three legs splaying outward
  for (let i = 0; i < 8; i++) {
    px(c, (cx - 2 - i) | 0, (baseY - 2 + i) | 0, G.g25);
    px(c, (cx + 2 + i) | 0, (baseY - 2 + i) | 0, G.g25);
    px(c, cx | 0,           (baseY - 2 + i) | 0, G.g20);
    if (i < 6) {
      px(c, (cx - 2 - i) | 0, (baseY - 1 + i) | 0, G.g35);
      px(c, (cx + 2 + i) | 0, (baseY - 1 + i) | 0, G.g35);
    }
  }
  // Foot pads
  px(c, cx - 10, baseY + 5, G.ink);
  px(c, cx,      baseY + 5, G.ink);
  px(c, cx + 10, baseY + 5, G.ink);
  // Floor shadow under stand
  for (let i = 0; i < 14; i++) {
    const t = i / 14;
    const halfW = Math.round(16 * (1 - t * 0.6));
    px(c, cx - halfW, baseY + 5 + i, "#070707");
    px(c, cx + halfW, baseY + 5 + i, "#070707");
    if (i < 4) hline(c, cx - halfW, baseY + 5 + i, halfW * 2, "#0a0a0a");
  }
}

// Hand-tuned body silhouette — half-widths per row, top → bottom.
const CONCERT_PROFILE: number[] = (() => {
  const p: number[] = [];
  // Upper bout
  for (let i = 0; i < 28; i++) {
    const t = i / 27;
    p.push(Math.round(15 + 9 * Math.sin(t * Math.PI * 0.95)));
  }
  // Waist (narrower)
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    p.push(Math.round(19 - 5 * Math.sin(t * Math.PI)));
  }
  // Lower bout (fuller)
  for (let i = 0; i < 44; i++) {
    const t = i / 43;
    const swell = Math.sin((0.32 + t * 0.65) * Math.PI);
    p.push(Math.round(25 * swell));
  }
  return p;
})();

function drawPickguard(c: Ctx, cx: number, cy: number) {
  const dark = G.g05;
  for (let j = 0; j < 24; j++) {
    const t = j / 23;
    const halfW = Math.round(6 * Math.sin(t * Math.PI));
    rect(c, cx, cy + j, halfW * 2, 1, dark);
    if (j === 1 || j === 2) px(c, cx + 1, cy + j, G.g25);
  }
}

function drawStrap(
  c: Ctx, cx: number, hsTop: number, bodyTop: number, bodyH: number, profile: number[],
) {
  const strap = A.red, strapDk = A.redDk, strapHl = "#d44a44";
  // From top of headstock, diagonally down to the upper bout's left edge.
  for (let y = hsTop - 4; y < bodyTop; y++) {
    const t = (y - (hsTop - 4)) / (bodyTop - (hsTop - 4));
    const x = (cx - 7 - t * 10) | 0;
    rect(c, x, y, 4, 1, strap);
    px(c, x, y, strapDk);
    px(c, x + 3, y, strapHl);
  }
  // Along the body's left side
  for (let j = 0; j < bodyH; j++) {
    const halfW = profile[j];
    if (halfW <= 0) continue;
    const y = bodyTop + j;
    const x = cx - halfW - 3;
    rect(c, x, y, 3, 1, strap);
    if (j % 4 === 0) px(c, x, y, strapDk);
    if (j % 4 === 2) px(c, x + 2, y, strapHl);
  }
}
