import { Ctx, rect, hline, vline, px, ellipse, stipple } from "./draw";
import { G, A, W } from "./palette";

// Acoustic guitar hung on the wall — matches the reference photo:
// blonde wood top, dark sides peeking, dark fretboard, soundhole, pickguard.
//
// Body shape is a hand-tuned silhouette (array of half-widths per row) so
// the acoustic curves read clean instead of math-derived pinches.
//
// `strap=true` adds the red strap (left guitar in the photo).
// `dreadnought=true` uses a fuller squared-off lower bout silhouette.
export function drawGuitar(
  c: Ctx, cx: number, topY: number,
  opts: { dreadnought?: boolean; strap?: boolean } = {},
) {
  const dread = !!opts.dreadnought;

  // ─── Wall hanger ───
  rect(c, cx - 1, topY - 5, 2, 5, G.g50);
  hline(c, cx - 2, topY - 5, 4, G.g80);
  rect(c, cx - 4, topY - 2, 8, 3, G.g35);
  hline(c, cx - 4, topY - 2, 8, G.g60);

  // ─── Headstock ───
  const hsY = topY + 1;
  const hsW = 16, hsH = 16;
  rect(c, cx - hsW / 2, hsY, hsW, hsH, G.g15);
  hline(c, cx - hsW / 2, hsY, hsW, G.g30);
  hline(c, cx - hsW / 2, hsY + 1, hsW, G.g25);
  vline(c, cx - hsW / 2, hsY, hsH, G.g30);
  vline(c, cx + hsW / 2 - 1, hsY, hsH, G.g05);
  hline(c, cx - hsW / 2, hsY + hsH - 1, hsW, G.g05);
  // little headstock cap curve
  px(c, cx - hsW / 2, hsY, G.g25);
  px(c, cx + hsW / 2 - 1, hsY, G.g10);
  // Tuning pegs — 3 per side
  for (let p = 0; p < 3; p++) {
    const yy = hsY + 3 + p * 4;
    rect(c, cx - hsW / 2 - 3, yy, 3, 2, G.g70);
    hline(c, cx - hsW / 2 - 3, yy, 3, G.paper);
    rect(c, cx + hsW / 2, yy, 3, 2, G.g70);
    hline(c, cx + hsW / 2, yy, 3, G.paper);
  }
  // Nut (white strip)
  hline(c, cx - 5, hsY + hsH, 10, G.white);

  // ─── Neck / Fretboard ───
  const neckY = hsY + hsH + 1;
  const neckH = 56;
  const neckW = 10;
  // dark rosewood fretboard
  rect(c, cx - neckW / 2, neckY, neckW, neckH, G.g10);
  vline(c, cx - neckW / 2, neckY, neckH, G.g20);
  vline(c, cx + neckW / 2 - 1, neckY, neckH, G.g05);
  // Frets
  for (let f = 0; f < 9; f++) {
    hline(c, cx - neckW / 2, neckY + 5 + f * 6, neckW, G.g75);
  }
  // Position dots
  px(c, cx, neckY + 17, G.paper);
  px(c, cx, neckY + 35, G.paper);
  px(c, cx, neckY + 47, G.paper);

  // ─── Body ───
  const bodyTop = neckY + neckH;
  const profile = dread ? DREAD_PROFILE : CONCERT_PROFILE;
  const bodyH = profile.length;

  // Body fill (light wood top) + dark rim per row.
  const wood = W.hl;       // light warm gray (blonde)
  const woodHl = G.paper;  // top highlight
  const woodSh = G.g35;    // bottom shadow / rim

  for (let j = 0; j < bodyH; j++) {
    const halfW = profile[j];
    if (halfW <= 0) continue;
    const x = cx - halfW;
    const w = halfW * 2;
    const y = bodyTop + j;
    rect(c, x, y, w, 1, wood);
    // rim
    px(c, x, y, woodSh);
    px(c, x + w - 1, y, woodSh);
    // top sheen on the very top rows
    if (j < 4) px(c, x + 2, y, woodHl);
    // subtle right-edge darker (light from top-left)
    if (j > 4 && j < bodyH - 2) px(c, x + w - 2, y, G.g60);
  }

  // ─── Sound hole + rosette ───
  const shCx = cx;
  const shCy = bodyTop + Math.floor(bodyH * 0.34);
  ellipse(c, shCx, shCy, 8, 8, G.g50);   // outer rosette
  ellipse(c, shCx, shCy, 7, 7, G.g25);   // inner rosette ring
  ellipse(c, shCx, shCy, 6, 6, G.ink);   // hole
  // ring highlight
  px(c, shCx - 6, shCy - 2, G.paper);
  px(c, shCx + 5, shCy + 3, G.g70);

  // ─── Pickguard (teardrop, lower-right of soundhole) ───
  drawPickguard(c, shCx + 4, shCy - 2);

  // ─── Bridge ───
  const brY = shCy + 16;
  rect(c, cx - 9, brY, 18, 5, G.g10);
  hline(c, cx - 9, brY, 18, G.g30);
  hline(c, cx - 9, brY + 4, 18, G.ink);
  vline(c, cx - 9, brY, 5, G.g25);
  vline(c, cx + 8, brY, 5, G.g05);
  // Bridge pins — 6 white dots
  for (let i = 0; i < 6; i++) px(c, cx - 6 + i * 2, brY + 2, G.paper);
  // Saddle
  hline(c, cx - 7, brY + 1, 14, G.g60);

  // ─── Strings ───
  // Drawn only on neck (above body). On body, strings are barely visible
  // single very-light pixels at sparse intervals — keeps the body clean.
  for (let s = 0; s < 6; s++) {
    const sx = cx - 3 + Math.round(s * 1.2);
    // along neck (solid, thin)
    for (let yy = hsY + hsH; yy < bodyTop; yy++) {
      px(c, sx, yy, s < 3 ? G.g60 : G.g80);
    }
    // body — only show string between soundhole and bridge (faint dots)
    for (let yy = shCy + 8; yy < brY; yy += 2) {
      px(c, sx, yy, G.g70);
    }
  }

  // Optional strap — sits along left edge of body, not across it
  if (opts.strap) drawStrap(c, cx, hsY, bodyTop, bodyH, profile);

  // Very subtle wood grain on the top
  stipple(c, cx - 22, bodyTop + 4, 44, bodyH - 10, G.g80, 0.02, 11);
}

// ─── Body silhouettes (half-widths per row, hand-tuned) ───
// Length = body height in pixels. Rendered top-down.
const CONCERT_PROFILE: number[] = (() => {
  const p: number[] = [];
  // Upper bout: 0..28
  for (let i = 0; i < 28; i++) {
    const t = i / 27;
    // half-ellipse: starts narrow at neck join, swells to upper-bout peak
    p.push(Math.round(14 + 8 * Math.sin(t * Math.PI * 0.95)));
  }
  // Waist: 28..40
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    p.push(Math.round(18 - 4 * Math.sin(t * Math.PI)));
  }
  // Lower bout: 40..86
  for (let i = 0; i < 46; i++) {
    const t = i / 45;
    const peak = 24;
    const swell = Math.sin(t * Math.PI * 0.92 + 0.08);
    p.push(Math.round(peak * swell));
  }
  return p;
})();

const DREAD_PROFILE: number[] = (() => {
  const p: number[] = [];
  // Dreadnought: bigger, squared-off bouts, shallower waist
  for (let i = 0; i < 28; i++) {
    const t = i / 27;
    p.push(Math.round(16 + 9 * Math.sin(t * Math.PI * 0.95)));
  }
  for (let i = 0; i < 10; i++) {
    const t = i / 9;
    p.push(Math.round(22 - 3 * Math.sin(t * Math.PI)));
  }
  // Lower bout — fuller, with squared-off bottom
  for (let i = 0; i < 50; i++) {
    const t = i / 49;
    const swell = Math.sin(t * Math.PI * 0.85 + 0.12);
    const v = Math.round(26 * swell);
    // Square the very bottom slightly
    p.push(t > 0.92 ? Math.max(0, v - Math.floor((t - 0.92) * 80)) : v);
  }
  return p;
})();

function drawPickguard(c: Ctx, cx: number, cy: number) {
  // Teardrop, dark.
  const dark = G.g05;
  for (let j = 0; j < 22; j++) {
    const t = j / 21;
    const halfW = Math.round(6 * Math.sin(t * Math.PI) * 1.0);
    rect(c, cx, cy + j, halfW * 2, 1, dark);
    if (j === 1 || j === 2) px(c, cx + 1, cy + j, G.g25); // rim sheen
  }
}

function drawStrap(
  c: Ctx, cx: number, hsY: number, bodyTop: number, bodyH: number, profile: number[],
) {
  const strap = A.red, strapDk = A.redDk, strapHl = "#d44a44";
  // Loop from top of headstock around to the bottom strap pin.
  // Drawn as a band along the left edge of the body, not across the face.
  // 1) Diagonal across headstock + along left side of neck
  for (let y = hsY - 6; y < bodyTop - 4; y++) {
    const t = (y - (hsY - 6)) / (bodyTop - 4 - (hsY - 6));
    const x = (cx - 6 - t * 12) | 0;
    rect(c, x, y, 4, 1, strap);
    px(c, x, y, strapDk);
    px(c, x + 3, y, strapHl);
  }
  // 2) Follow the left edge of the body down
  for (let j = 0; j < bodyH; j++) {
    const halfW = profile[j];
    if (halfW <= 0) continue;
    const y = bodyTop + j;
    const x = cx - halfW - 3;
    rect(c, x, y, 3, 1, strap);
    if (j % 4 === 0) px(c, x, y, strapDk);
    if (j % 4 === 2) px(c, x + 2, y, strapHl);
  }
  // 3) Dangle past bottom of body
  for (let y = bodyTop + bodyH; y < bodyTop + bodyH + 40; y++) {
    const t = (y - bodyTop - bodyH) / 40;
    const x = (cx - 22 + t * 8) | 0;
    rect(c, x, y, 3, 1, strap);
    if (y % 5 === 0) px(c, x, y, strapDk);
  }
  // Frayed tail
  px(c, (cx - 14) | 0, bodyTop + bodyH + 40, strapDk);
  px(c, (cx - 13) | 0, bodyTop + bodyH + 41, strapDk);
}
