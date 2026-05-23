import { Ctx, rect, hline, vline, px, beveled, ellipse, stipple } from "./draw";
import { G, A } from "./palette";

// Acoustic guitar hung on the wall (vertical, headstock up).
// Drawn to match reference photo: light wood top, dark fretboard, soundhole,
// pickguard, bridge, optional strap.
export function drawGuitar(
  c: Ctx, cx: number, topY: number,
  opts: { dreadnought?: boolean; strap?: boolean } = {},
) {
  const dread = !!opts.dreadnought;

  // Wall hanger
  rect(c, cx - 1, topY - 4, 2, 4, G.g50);
  hline(c, cx - 2, topY - 4, 4, G.g70);
  rect(c, cx - 3, topY - 2, 6, 2, G.g40);
  hline(c, cx - 3, topY - 2, 6, G.g60);

  // ─── Headstock ───
  const hsY = topY;
  const hsW = 14;
  rect(c, cx - hsW / 2, hsY, hsW, 14, G.g25);
  // headstock face lighter (light from top-left)
  hline(c, cx - hsW / 2, hsY, hsW, G.g35);
  hline(c, cx - hsW / 2, hsY + 1, hsW, G.g30);
  vline(c, cx - hsW / 2, hsY, 14, G.g35);
  vline(c, cx + hsW / 2 - 1, hsY, 14, G.g15);
  hline(c, cx - hsW / 2, hsY + 13, hsW, G.g10);
  // Tuning pegs — 3 per side
  for (let p = 0; p < 3; p++) {
    const yy = hsY + 2 + p * 4;
    rect(c, cx - hsW / 2 - 2, yy, 2, 2, G.g65); px(c, cx - hsW / 2 - 2, yy, G.g85);
    rect(c, cx + hsW / 2, yy, 2, 2, G.g65);     px(c, cx + hsW / 2, yy, G.g85);
  }
  // Nut (white slip between headstock and neck)
  hline(c, cx - 4, hsY + 14, 8, G.paper);

  // ─── Neck / Fretboard ───
  const neckY = hsY + 15;
  const neckH = 56;
  const neckW = 8;
  rect(c, cx - neckW / 2, neckY, neckW, neckH, G.g15);
  vline(c, cx - neckW / 2, neckY, neckH, G.g25);
  vline(c, cx + neckW / 2 - 1, neckY, neckH, G.g05);
  // Frets
  for (let f = 0; f < 9; f++) {
    hline(c, cx - neckW / 2, neckY + 4 + f * 6, neckW, G.g60);
  }
  // Position dots (inlays)
  px(c, cx, neckY + 16, G.paper);
  px(c, cx, neckY + 34, G.paper);

  // ─── Body ───
  // Dreadnought: bigger, more squared lower bout. Otherwise classic curves.
  const bodyTop = neckY + neckH;
  const bodyW = dread ? 56 : 50;
  const bodyH = 84;
  const bodyX = cx - bodyW / 2;

  // Upper bout (rounded — drawn as stack of rows)
  drawBodyShape(c, bodyX, bodyTop, bodyW, bodyH, G.g80, G.paper, G.g50, dread);

  // Soundhole — black with thin ring
  const shCx = cx;
  const shCy = bodyTop + Math.floor(bodyH * 0.32);
  ellipse(c, shCx, shCy, 7, 7, G.g75);
  ellipse(c, shCx, shCy, 6, 6, G.ink);
  // Rosette ring
  ellipse(c, shCx, shCy, 8, 8, G.g60);
  ellipse(c, shCx, shCy, 7, 7, G.ink);

  // Pickguard (right side of soundhole on right guitar, left on left)
  const pgSide = opts.strap ? -1 : 1;
  drawPickguard(c, shCx + pgSide * 4, shCy + 2, pgSide);

  // Bridge — small dark rect below soundhole
  const brY = shCy + 18;
  rect(c, cx - 7, brY, 14, 4, G.g15);
  hline(c, cx - 7, brY, 14, G.g30);
  hline(c, cx - 7, brY + 3, 14, G.ink);
  // Bridge pins
  for (let i = 0; i < 6; i++) px(c, cx - 5 + i * 2, brY + 1, G.paper);

  // Strings — six faint lines headstock to bridge
  for (let s = 0; s < 6; s++) {
    const sx = cx - 3 + s;
    // along neck
    for (let yy = hsY + 14; yy < brY; yy += 1) {
      if (yy < neckY + neckH || (yy > neckY + neckH && yy < brY)) {
        // skip drawing over soundhole interior
        const dyShole = yy - shCy;
        const halfW = Math.round(Math.sqrt(Math.max(0, 49 - dyShole * dyShole)));
        if (Math.abs(sx - shCx) < halfW && Math.abs(dyShole) < 7) continue;
        if (yy % 1 === 0) px(c, sx, yy, s < 3 ? G.g60 : G.g80);
      }
    }
  }

  // Optional strap (left guitar = red strap, matches reference photo)
  if (opts.strap) {
    drawStrap(c, cx, hsY, brY);
  }

  // Subtle wood grain stipple on body
  stipple(c, bodyX + 2, bodyTop + 2, bodyW - 4, bodyH - 4, G.g65, 0.04, 11);
  stipple(c, bodyX + 2, bodyTop + 2, bodyW - 4, bodyH - 4, G.paper, 0.02, 17);
}

function drawBodyShape(
  c: Ctx, x: number, y: number, w: number, h: number,
  body: string, hl: string, sh: string, dread: boolean,
) {
  // Render an acoustic body silhouette row-by-row.
  // Profile is parameterized: upper bout, waist, lower bout.
  for (let j = 0; j < h; j++) {
    const t = j / h;
    let halfW: number;
    if (t < 0.34) {
      // upper bout — swells out
      const k = t / 0.34;
      halfW = w * (0.34 + 0.16 * Math.sin(k * Math.PI));
    } else if (t < 0.5) {
      // waist
      const k = (t - 0.34) / 0.16;
      halfW = w * (0.5 - 0.1 * Math.sin(k * Math.PI));
    } else {
      // lower bout — bigger
      const k = (t - 0.5) / 0.5;
      const lower = dread ? 0.52 : 0.5;
      halfW = w * (lower * Math.sin((1 - k) * Math.PI * 0.9 + 0.1));
      if (k > 0.92) halfW *= 1 - (k - 0.92) * 6;
    }
    halfW = Math.max(0, Math.round(halfW));
    rect(c, (x + w / 2 - halfW) | 0, y + j, halfW * 2, 1, body);
  }
  // Outline pass — darker rim
  for (let j = 0; j < h; j++) {
    const t = j / h;
    let halfW: number;
    if (t < 0.34) halfW = w * (0.34 + 0.16 * Math.sin((t / 0.34) * Math.PI));
    else if (t < 0.5) halfW = w * (0.5 - 0.1 * Math.sin(((t - 0.34) / 0.16) * Math.PI));
    else {
      const k = (t - 0.5) / 0.5;
      const lower = dread ? 0.52 : 0.5;
      halfW = w * (lower * Math.sin((1 - k) * Math.PI * 0.9 + 0.1));
      if (k > 0.92) halfW *= 1 - (k - 0.92) * 6;
    }
    halfW = Math.max(0, Math.round(halfW));
    if (halfW > 0) {
      px(c, (x + w / 2 - halfW) | 0, y + j, sh);
      px(c, (x + w / 2 + halfW - 1) | 0, y + j, sh);
      // top-left highlight
      if (j < 3) px(c, (x + w / 2 - halfW + 1) | 0, y + j, hl);
    }
  }
}

function drawPickguard(c: Ctx, cx: number, cy: number, side: number) {
  // Teardrop pickguard — dark shape.
  const dark = G.g05;
  for (let j = 0; j < 18; j++) {
    const t = j / 18;
    const halfW = Math.round(5 * Math.sin(t * Math.PI) * 1.2);
    rect(c, cx + (side === 1 ? 0 : -halfW * 2), cy + j, halfW * 2, 1, dark);
  }
  // Slight highlight rim
  for (let j = 0; j < 18; j += 4) {
    const t = j / 18;
    const halfW = Math.round(5 * Math.sin(t * Math.PI) * 1.2);
    px(c, cx + (side === 1 ? 0 : -halfW * 2), cy + j, G.g25);
  }
}

function drawStrap(c: Ctx, cx: number, topY: number, bottomY: number) {
  // Red strap loops from headstock around the body and dangles.
  const strap = A.red, strapDk = A.redDk;
  // Top portion: across headstock down
  for (let y = topY - 6; y < topY + 12; y++) {
    rect(c, cx - 9, y, 4, 1, strap);
    px(c, cx - 9, y, strapDk);
  }
  // Curve around to bottom-left of body
  for (let y = topY + 12; y < bottomY + 4; y++) {
    const t = (y - topY - 12) / (bottomY - topY - 8);
    const x = (cx - 9 - t * 12) | 0;
    rect(c, x, y, 4, 1, strap);
    if (y % 6 === 0) rect(c, x, y, 4, 1, strapDk);
  }
  // Dangle below body
  for (let y = bottomY + 4; y < bottomY + 36; y++) {
    rect(c, cx - 22, y, 3, 1, strap);
    if (y % 5 === 0) px(c, cx - 22, y, strapDk);
  }
}
