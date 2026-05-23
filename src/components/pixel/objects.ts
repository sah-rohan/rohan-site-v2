import { Ctx, rect, hline, vline, px, beveled, ellipse, stipple } from "./draw";
import { G, W, A } from "./palette";

// ─────────────────────────────────────────────────────────────
// MONITOR — the hero. Biggest object on the scene.
// Anchored to desk surface: y_bottom of base sits on DESK_TOP_Y.
// Returns the inner screen rect so the terminal can render into it.
// ─────────────────────────────────────────────────────────────
export interface ScreenRect { x: number; y: number; w: number; h: number; }

// 9×9 bitten-apple silhouette. Top-left at (x, y).
export function drawAppleLogo(c: Ctx, x: number, y: number, col: string) {
  // Each "1" is a pixel of the logo. 9 wide × 9 tall.
  const rows = [
    "0001100000",
    "0001100000",
    "0011111100",
    "0111111110",
    "1111111111",
    "1111111110",
    "1111111100",
    "0111111100",
    "0011111000",
    "0001110000",
  ];
  // Add a leaf above
  const leaf = [
    "0000010000",
    "0000110000",
    "0000100000",
  ];
  // Draw leaf (above the apple top)
  for (let j = 0; j < leaf.length; j++) {
    for (let i = 0; i < leaf[j].length; i++) {
      if (leaf[j][i] === "1") px(c, x + i, y - leaf.length + j, col);
    }
  }
  // Draw apple body
  for (let j = 0; j < rows.length; j++) {
    for (let i = 0; i < rows[j].length; i++) {
      if (rows[j][i] === "1") px(c, x + i, y + j, col);
    }
  }
  // Bite (subtract pixels on top-right curve)
  px(c, x + 7, y + 2, "rgba(0,0,0,0)");
  px(c, x + 7, y + 3, "rgba(0,0,0,0)");
  // The bite is "removed" by drawing transparent pixels — but canvas doesn't
  // clear that way. Instead, draw a dark notch using the wood or surface color.
  // Caller can overlay if needed. For lid (G.g75 silver), we punch a small
  // notch in the silhouette by overdrawing with the lid color.
}

export function drawMonitor(
  c: Ctx, cx: number, deskTopY: number,
): ScreenRect {
  // Monitor proportions — bigger hero (≈27" 16:9 with thin bezel).
  const screenW = 340;
  const screenH = 200;
  const bezel = 5;
  const outerW = screenW + bezel * 2;
  const outerH = screenH + bezel * 2 + 8; // +chin
  const ox = cx - outerW / 2;
  const oy = deskTopY - outerH - 18; // float above desk on stand

  // ── Outer chassis (matte black, beveled) ──
  rect(c, ox, oy, outerW, outerH, G.g10);
  // top + left highlight
  hline(c, ox, oy, outerW, G.g30);
  vline(c, ox, oy, outerH, G.g25);
  // bottom + right shadow
  hline(c, ox, oy + outerH - 1, outerW, G.ink);
  vline(c, ox + outerW - 1, oy, outerH, G.g05);
  // soft inner bezel line
  rect(c, ox + 1, oy + 1, outerW - 2, 1, G.g15);
  vline(c, ox + 1, oy + 1, outerH - 2, G.g15);

  // ── Screen recess ──
  const sx = ox + bezel;
  const sy = oy + bezel;
  rect(c, sx, sy, screenW, screenH, G.ink);
  // inset shadow
  hline(c, sx, sy, screenW, G.g05);
  vline(c, sx, sy, screenH, G.g05);
  hline(c, sx, sy + screenH - 1, screenW, G.g15);
  vline(c, sx + screenW - 1, sy, screenH, G.g15);

  // ── Chin under screen ──
  const chinY = sy + screenH + 2;
  rect(c, ox + 2, chinY, outerW - 4, 6, G.g10);
  hline(c, ox + 2, chinY, outerW - 4, G.g20);
  // Samsung-ish wordmark dot
  rect(c, cx - 12, chinY + 2, 24, 2, G.g05);
  hline(c, cx - 12, chinY + 2, 24, G.g25);
  // status LED — tiny amber dot
  px(c, ox + outerW - 6, chinY + 4, A.amberDk);

  // ── Stand neck ──
  const stY = oy + outerH;
  rect(c, cx - 8, stY, 16, 8, G.g15);
  hline(c, cx - 8, stY, 16, G.g30);
  vline(c, cx - 8, stY, 8, G.g25);
  vline(c, cx + 7, stY, 8, G.g05);
  // ── Stand base (V-foot) ──
  const bfY = stY + 8;
  for (let i = 0; i < 6; i++) {
    rect(c, cx - 32 - i, bfY + i, 64 + i * 2, 1, i < 2 ? G.g25 : G.g15);
  }
  hline(c, cx - 32, bfY, 64, G.g35);
  hline(c, cx - 38, bfY + 5, 76, G.ink);
  // foot shadow on desk
  for (let i = 0; i < 4; i++) {
    rect(c, cx - 40 - i * 2, deskTopY + 3 + i, 80 + i * 4, 1, i < 2 ? W.d2 : W.d3);
  }

  return { x: sx, y: sy, w: screenW, h: screenH };
}

// ─────────────────────────────────────────────────────────────
// TERMINAL inside the monitor screen.
// Rendered each frame so the typing animation can update it.
// ─────────────────────────────────────────────────────────────
export interface TerminalState {
  history: string[];        // prior output lines
  currentCmd: string;       // what's being typed now (mid-animation)
  cursorOn: boolean;        // blinking cursor
}

// Paint only the screen background + scanlines. Text is rendered by an
// HTML overlay in React (TerminalOverlay) so the type stays sharp.
export function drawTerminalBackground(c: Ctx, s: ScreenRect) {
  rect(c, s.x, s.y, s.w, s.h, "#04080a");
  for (let y = 0; y < s.h; y += 2) hline(c, s.x, s.y + y, s.w, "#02050a");
  stipple(c, s.x, s.y, s.w, s.h, A.greenDk, 0.015, 5);
}

// ─────────────────────────────────────────────────────────────
// MACBOOK — CLOSED clamshell viewed from above, sitting flat on desk.
// Cable runs from its back edge to the monitor (external-display setup).
// ─────────────────────────────────────────────────────────────
export function drawMacBook(c: Ctx, cx: number, deskTopY: number) {
  // Closed laptop, top-down view. Slim aluminum slab.
  const w = 98, h = 64;
  const x = cx - w / 2;
  const y = deskTopY + 6 - h + 8; // sits flat just behind/on desk lip
  // Actually: a laptop laid flat takes up depth on the desk. Place it so the
  // hinge edge is closer to the back of the desk and the front edge is
  // toward the viewer. We render it as a flat rectangle on the desk.
  const lidX = x;
  const lidY = deskTopY - h + 4;

  // ── Aluminum body ──
  rect(c, lidX, lidY, w, h, G.g80);
  // Top edge highlight (light from top-left)
  hline(c, lidX, lidY, w, G.g95);
  hline(c, lidX, lidY + 1, w, G.g85);
  vline(c, lidX, lidY, h, G.g85);
  // Bottom edge shadow (front of laptop facing viewer)
  hline(c, lidX, lidY + h - 1, w, G.g40);
  hline(c, lidX, lidY + h - 2, w, G.g55);
  vline(c, lidX + w - 1, lidY, h, G.g55);
  // Rounded corner pixels
  px(c, lidX, lidY, G.g70);
  px(c, lidX + w - 1, lidY, G.g60);
  px(c, lidX, lidY + h - 1, G.g30);
  px(c, lidX + w - 1, lidY + h - 1, G.g25);
  // Subtle horizontal seam line where the lid meets the base (closed clamshell)
  hline(c, lidX + 3, lidY + Math.floor(h * 0.58), w - 6, G.g60);
  hline(c, lidX + 3, lidY + Math.floor(h * 0.58) + 1, w - 6, G.g70);

  // ── Apple logo, big and centered on the lid ──
  const logoX = lidX + (w >> 1) - 5;
  const logoY = lidY + Math.floor(h * 0.28);
  drawAppleLogo(c, logoX, logoY, G.g25);

  // ── Cable port + cable arcing to monitor ──
  // Port on back-left edge (top of laptop)
  rect(c, lidX + 8, lidY - 1, 4, 2, G.g30);
  px(c, lidX + 8, lidY - 1, G.g50);
  // Cable arcs up-left to the monitor's right side
  const cStartX = lidX + 10;
  const cStartY = lidY - 2;
  const cEndX = cStartX - 90;
  const cEndY = deskTopY - 32;
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const xx = cStartX + (cEndX - cStartX) * t;
    const yy = cStartY + (cEndY - cStartY) * t - Math.sin(t * Math.PI) * 8;
    px(c, xx | 0, yy | 0, G.g10);
    px(c, xx | 0, (yy | 0) + 1, G.g20);
  }
}

// ─────────────────────────────────────────────────────────────
// KEYBOARD — slim aluminum, in front of monitor on desk.
// ─────────────────────────────────────────────────────────────
export function drawKeyboard(c: Ctx, cx: number, deskTopY: number) {
  const kw = 168, kh = 13;
  const kx = cx - kw / 2;
  const ky = deskTopY + 6;
  // Aluminum frame
  rect(c, kx, ky, kw, kh, G.g80);
  hline(c, kx, ky, kw, G.g95);
  hline(c, kx, ky + kh - 1, kw, G.g45);
  vline(c, kx, ky, kh, G.g85);
  vline(c, kx + kw - 1, ky, kh, G.g50);
  // Recessed key area
  rect(c, kx + 3, ky + 2, kw - 6, kh - 5, G.g35);
  // Keys — 5 rows × ~17 cols
  const rows = 5, cols = 22;
  const keyW = Math.floor((kw - 8) / cols);
  const keyH = Math.floor((kh - 6) / rows);
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const x = kx + 4 + k * keyW;
      const y = ky + 3 + r * keyH;
      rect(c, x, y, keyW - 1, keyH - 1, G.g15);
      hline(c, x, y, keyW - 1, G.g30);
      px(c, x, y, G.g50);
    }
  }
  // Drop shadow on desk — wider/darker so the keyboard reads as resting on it.
  rect(c, kx - 1, ky + kh, kw + 2, 1, W.dk);
  rect(c, kx + 1, ky + kh + 1, kw - 2, 1, W.d1);
  rect(c, kx + 3, ky + kh + 2, kw - 6, 1, W.d2);
  // Front lip cast onto the wood
  hline(c, kx + 4, ky + kh + 3, kw - 8, W.d3);
}

// ─────────────────────────────────────────────────────────────
// MOUSE + MOUSEPAD — right of keyboard.
// ─────────────────────────────────────────────────────────────
export function drawMouse(c: Ctx, cx: number, deskTopY: number) {
  // Blue mousepad
  const padW = 60, padH = 22;
  const px0 = cx - padW / 2;
  const py0 = deskTopY + 8;
  rect(c, px0, py0, padW, padH, "#1a2a44");
  hline(c, px0, py0, padW, "#243a5a");
  hline(c, px0, py0 + padH - 1, padW, "#0a1828");
  vline(c, px0, py0, padH, "#1f3552");
  vline(c, px0 + padW - 1, py0, padH, "#0c1a30");
  stipple(c, px0 + 1, py0 + 1, padW - 2, padH - 2, "#22365a", 0.15, 29);
  // Drop shadow under mousepad — anchors it to the desk.
  rect(c, px0 - 1, py0 + padH, padW + 2, 1, W.dk);
  rect(c, px0 + 1, py0 + padH + 1, padW - 2, 1, W.d2);

  // Mouse — small dark blob, top-down
  const mcx = px0 + padW - 16;
  const mcy = py0 + padH / 2;
  for (let j = -7; j <= 7; j++) {
    const halfW = Math.round(5 * Math.sqrt(Math.max(0, 1 - (j * j) / 49)));
    rect(c, mcx - halfW, (mcy + j) | 0, halfW * 2, 1, G.g15);
  }
  // Highlight
  for (let j = -7; j <= -3; j++) {
    const halfW = Math.round(5 * Math.sqrt(Math.max(0, 1 - (j * j) / 49)));
    px(c, mcx - halfW + 1, (mcy + j) | 0, G.g45);
  }
  // Scroll wheel
  px(c, mcx, mcy - 3, G.g35);
}

// ─────────────────────────────────────────────────────────────
// BOOKSHELF — left of desk, against the wall.
// Tall, multiple shelves, books of varied B&W spines with a couple amber pops.
// ─────────────────────────────────────────────────────────────
// Tall floor bookshelf — sits ON the floor in front of the desk.
// (x, floorY) = bottom-left corner of the case.
export function drawBookshelf(c: Ctx, x: number, floorY: number) {
  const shW = 72;
  const shH = 196;
  const shTop = floorY - shH;
  const deskTopY = shTop;            // retained for layout vars below
  const shelves = 5;

  // Outer case
  beveled(c, x, shTop, shW, shH, W.d2, W.d4, W.dk);
  // Inner wall (back panel)
  rect(c, x + 3, shTop + 3, shW - 6, shH - 6, G.g10);
  // Shelf dividers
  const innerH = shH - 6;
  const sliceH = Math.floor(innerH / shelves);
  for (let i = 1; i < shelves; i++) {
    const sy = shTop + 3 + i * sliceH;
    rect(c, x + 3, sy - 1, shW - 6, 2, W.d4);
    hline(c, x + 3, sy - 1, shW - 6, W.d5);
    hline(c, x + 3, sy, shW - 6, W.dk);
  }

  // Books per shelf
  for (let s = 0; s < shelves; s++) {
    const shelfY = shTop + 3 + s * sliceH;
    drawBookRow(c, x + 5, shelfY + 1, shW - 10, sliceH - 3, s);
  }

  // Tiny rubik's cube perched on top.
  drawDeskRubiks(c, x + shW - 18, shTop - 12);
  // Floor shadow under shelf
  rect(c, x + 2, floorY + 1, shW - 4, 1, "#050505");
  rect(c, x + 4, floorY + 2, shW - 8, 1, "#0a0a0a");
}

function drawBookRow(c: Ctx, x: number, y: number, w: number, h: number, seed: number) {
  // Lay books left to right with varied widths.
  let cursor = 0;
  let s = (seed + 1) * 73;
  const palettes: [string, string, string][] = [
    [G.g70, G.g85, G.g50],
    [G.g30, G.g50, G.g15],
    [G.g50, G.g70, G.g30],
    [G.paper, G.g95, G.g70],
    [G.g20, G.g35, G.g10],
  ];
  while (cursor < w - 2) {
    s = (s * 9301 + 49297) % 233280;
    const bw = 3 + Math.floor((s / 233280) * 5);
    const bh = h - 1 - Math.floor((s / 23000) % 3);
    if (cursor + bw > w) break;
    const pal = palettes[(s | 0) % palettes.length];
    rect(c, x + cursor, y + (h - bh), bw, bh, pal[0]);
    vline(c, x + cursor, y + (h - bh), bh, pal[1]);
    vline(c, x + cursor + bw - 1, y + (h - bh), bh, pal[2]);
    // accent spine — rare amber book
    if (((s >> 4) | 0) % 9 === 0) {
      vline(c, x + cursor + 1, y + (h - bh) + 1, bh - 2, A.amber);
      px(c, x + cursor + 1, y + (h - bh) + (bh >> 1), A.amberDk);
    }
    // tiny title bar
    if (bh > 6) hline(c, x + cursor + 1, y + (h - bh) + 2, bw - 2, pal[2]);
    cursor += bw;
    // occasional leaning gap
    if (((s >> 2) | 0) % 7 === 0) cursor += 1;
  }
}

function drawDeskRubiks(c: Ctx, x: number, y: number) {
  // Tiny rubik's cube as a decorative trinket on top of the bookshelf.
  // Mostly grayscale with two color accent stickers.
  rect(c, x, y, 12, 12, G.g15);
  hline(c, x, y, 12, G.g30);
  vline(c, x, y, 12, G.g30);
  // Front face — 3x3 (mostly white/gray, two accents)
  const stickers: string[] = [
    G.paper, G.g80, A.red,
    G.g80,   G.paper, G.g70,
    G.g70,   A.amber, G.paper,
  ];
  for (let r = 0; r < 3; r++) {
    for (let k = 0; k < 3; k++) {
      rect(c, x + 1 + k * 4, y + 1 + r * 4, 3, 3, stickers[r * 3 + k]);
    }
  }
  // Top face skew
  for (let i = 0; i < 4; i++) {
    rect(c, x + 2 + i, y - 4 + i, 10 - i * 2, 1, G.g80);
  }
  // Right face skew
  for (let i = 0; i < 4; i++) {
    rect(c, x + 12 + i, y + 2 + i, 1, 10 - i, G.g50);
  }
}

// ─────────────────────────────────────────────────────────────
// PHONE — laid flat on desk, screen showing time + amber notif glow.
// ─────────────────────────────────────────────────────────────
export function drawPhone(c: Ctx, cx: number, deskTopY: number) {
  const pw = 18, ph = 36;
  const x = cx - pw / 2;
  const y = deskTopY + 7;
  // Body
  rect(c, x, y, pw, ph, G.g10);
  hline(c, x, y, pw, G.g25);
  vline(c, x, y, ph, G.g20);
  hline(c, x, y + ph - 1, pw, G.ink);
  vline(c, x + pw - 1, y, ph, G.g05);
  // Screen
  rect(c, x + 2, y + 3, pw - 4, ph - 6, G.ink);
  // Time + notif bar
  rect(c, x + 3, y + 4, pw - 6, 2, A.amber);
  px(c, x + 4, y + 4, A.amberDk);
  // Lock screen wallpaper hint (dim)
  for (let yy = 8; yy < ph - 7; yy += 3) {
    hline(c, x + 3, y + yy, pw - 6, "#0a1218");
  }
  // Apple logo centered on lock screen
  drawAppleLogo(c, x + (pw >> 1) - 5, y + Math.floor(ph * 0.4), G.g70);
  // Notification card lower on screen
  rect(c, x + 3, y + ph - 12, pw - 6, 5, "#1a1410");
  hline(c, x + 3, y + ph - 12, pw - 6, A.amberDk);
  px(c, x + 5, y + ph - 10, A.amber);
  // Speaker slit
  hline(c, x + (pw >> 1) - 2, y + 2, 4, G.g30);
  // Drop shadow on desk
  rect(c, x + 1, y + ph, pw - 1, 1, W.d2);
  rect(c, x + 2, y + ph + 1, pw - 3, 1, W.d3);
}

// ─────────────────────────────────────────────────────────────
// RUNNING SHOES — pair, on floor under/in front of desk.
// ─────────────────────────────────────────────────────────────
export function drawRunningShoes(c: Ctx, cx: number, floorY: number) {
  drawShoe(c, cx - 26, floorY, false);
  drawShoe(c, cx + 2,  floorY + 3, true);
}

function drawShoe(c: Ctx, x: number, y: number, mirrored: boolean) {
  // Side-on running shoe, ~30×14
  const w = 30, h = 14;
  // Sole (white-ish)
  rect(c, x, y + h - 5, w, 4, G.paper);
  hline(c, x, y + h - 5, w, G.white);
  hline(c, x, y + h - 1, w, G.g60);
  // Sole curl at heel & toe
  px(c, x, y + h - 6, G.paper);
  px(c, x + w - 1, y + h - 6, G.paper);
  // Upper body — dark with light accents
  for (let j = 0; j < h - 5; j++) {
    const t = j / (h - 5);
    // toe box rounds down
    const leftCut = mirrored ? Math.floor((1 - t) * 4) : Math.max(0, 6 - j);
    const rightCut = mirrored ? Math.max(0, 6 - j) : Math.floor((1 - t) * 4);
    rect(c, x + leftCut, y + j, w - leftCut - rightCut, 1, G.g15);
  }
  // Heel pad
  const heelX = mirrored ? x + w - 8 : x;
  rect(c, heelX, y + h - 7, 6, 2, G.g30);
  // Laces — 4 horizontal slashes mid-shoe
  const laceX = mirrored ? x + 4 : x + w - 12;
  for (let i = 0; i < 4; i++) {
    rect(c, laceX, y + 2 + i * 2, 8, 1, G.paper);
    px(c, laceX, y + 2 + i * 2, G.g70);
  }
  // Swoosh accent — single subtle stripe
  const swX = mirrored ? x + 6 : x + 10;
  rect(c, swX, y + 6, 12, 1, G.g50);
  // Logo dot
  px(c, mirrored ? x + 6 : x + w - 7, y + 4, A.greenLt);
  // Ground shadow
  rect(c, x - 1, y + h, w + 2, 1, G.g05);
}

// ─────────────────────────────────────────────────────────────
// FAN — Vornado-style, white, left side of desk (from reference).
// ─────────────────────────────────────────────────────────────
export function drawFan(c: Ctx, cx: number, deskTopY: number) {
  // Spherical head on a small base.
  const headR = 18;
  const headCx = cx;
  const headCy = deskTopY - headR - 6;
  // Base
  rect(c, cx - 16, deskTopY - 8, 32, 7, G.paper);
  hline(c, cx - 16, deskTopY - 8, 32, G.white);
  hline(c, cx - 16, deskTopY - 2, 32, G.g60);
  // Buttons on base
  for (let i = 0; i < 4; i++) px(c, cx - 9 + i * 5, deskTopY - 5, G.g50);
  px(c, cx + 11, deskTopY - 5, A.greenLt);
  // Stem
  rect(c, cx - 3, deskTopY - 14, 6, 7, G.g80);
  hline(c, cx - 3, deskTopY - 14, 6, G.paper);
  // Head — white sphere
  for (let j = -headR; j <= headR; j++) {
    const halfW = Math.round(headR * Math.sqrt(Math.max(0, 1 - (j * j) / (headR * headR))));
    rect(c, headCx - halfW, headCy + j, halfW * 2, 1, G.paper);
  }
  // Sphere shading
  for (let j = -headR; j <= 0; j++) {
    const halfW = Math.round(headR * Math.sqrt(Math.max(0, 1 - (j * j) / (headR * headR))));
    if (halfW > 2) {
      px(c, headCx - halfW + 1, headCy + j, G.white);
      px(c, headCx - halfW + 2, headCy + j, G.white);
    }
  }
  for (let j = 0; j <= headR; j++) {
    const halfW = Math.round(headR * Math.sqrt(Math.max(0, 1 - (j * j) / (headR * headR))));
    if (halfW > 2) {
      px(c, headCx + halfW - 1, headCy + j, G.g70);
      px(c, headCx + halfW - 2, headCy + j, G.g80);
    }
  }
  // Fan grill — concentric rings inside sphere
  const grillR = headR - 4;
  for (let j = -grillR; j <= grillR; j++) {
    const halfW = Math.round(grillR * Math.sqrt(Math.max(0, 1 - (j * j) / (grillR * grillR))));
    // ring outline
    if (Math.abs(j) === grillR || halfW === 0) continue;
    px(c, headCx - halfW, headCy + j, G.g50);
    px(c, headCx + halfW - 1, headCy + j, G.g50);
  }
  // Inner blade hint — dark cross
  for (let i = -3; i <= 3; i++) {
    px(c, headCx + i, headCy, G.g30);
    px(c, headCx, headCy + i, G.g30);
  }
  // Center hub
  rect(c, headCx - 2, headCy - 2, 4, 4, G.g50);
  px(c, headCx, headCy, G.g70);
}

// ─────────────────────────────────────────────────────────────
// HANGING HEADPHONES — dangle from a hook under the desk front edge.
// (cx, hookY) = top of the hook where the cord originates.
// ─────────────────────────────────────────────────────────────
export function drawHangingHeadphones(c: Ctx, cx: number, hookY: number) {
  // Hook under desk
  rect(c, cx - 2, hookY, 4, 2, G.g50);
  hline(c, cx - 2, hookY, 4, G.g70);
  px(c, cx, hookY + 2, G.g30);
  // Cord — short arc from hook to top of headband
  const bandTopY = hookY + 22;
  for (let y = hookY + 2; y <= bandTopY; y++) {
    const t = (y - hookY - 2) / (bandTopY - hookY - 2);
    const x = (cx + Math.sin(t * Math.PI) * 4) | 0;
    px(c, x, y, G.g15);
    if (y % 3 === 0) px(c, x + 1, y, G.g25);
  }
  // Headband (arc bridge between two cups)
  const bandCx = cx + 4;
  for (let i = -14; i <= 14; i++) {
    const yy = bandTopY + Math.round(8 - Math.sqrt(196 - i * i));
    px(c, bandCx + i, yy, G.g05);
    px(c, bandCx + i, yy + 1, G.g15);
    if (i > -14 && i < 14) px(c, bandCx + i, yy - 1, G.g25);
  }
  // Headband padding underside (white)
  for (let i = -10; i <= 10; i++) {
    const yy = bandTopY + Math.round(8 - Math.sqrt(196 - i * i)) + 2;
    px(c, bandCx + i, yy, G.paper);
  }
  // Left ear cup
  drawEarCup(c, bandCx - 14, bandTopY + 12);
  // Right ear cup
  drawEarCup(c, bandCx + 14, bandTopY + 12);
}

function drawEarCup(c: Ctx, cx: number, cy: number) {
  // Round-ish black cup with light rim and inner padding.
  const r = 7;
  for (let j = -r; j <= r; j++) {
    const halfW = Math.round(r * Math.sqrt(Math.max(0, 1 - (j * j) / (r * r))));
    rect(c, cx - halfW, cy + j, halfW * 2, 1, G.g10);
  }
  // Outer rim highlight
  for (let j = -r; j <= 0; j++) {
    const halfW = Math.round(r * Math.sqrt(Math.max(0, 1 - (j * j) / (r * r))));
    if (halfW > 0) px(c, cx - halfW, cy + j, G.g35);
  }
  for (let j = 0; j <= r; j++) {
    const halfW = Math.round(r * Math.sqrt(Math.max(0, 1 - (j * j) / (r * r))));
    if (halfW > 0) px(c, cx + halfW - 1, cy + j, G.ink);
  }
  // Inner cushion ring
  for (let j = -4; j <= 4; j++) {
    const halfW = Math.round(4 * Math.sqrt(Math.max(0, 1 - (j * j) / 16)));
    rect(c, cx - halfW, cy + j, halfW * 2, 1, G.g25);
  }
  // Center driver
  rect(c, cx - 1, cy - 1, 2, 2, G.g50);
  px(c, cx, cy, G.g70);
  // Subtle brand mark — single white dot offset
  px(c, cx - 4, cy - 4, G.paper);
}

// ─────────────────────────────────────────────────────────────
// HANGING RUNNING SHOES — tied together by laces, hung over a hook.
// Side-on, with Nike swoosh on each.
// (cx, hookY) = top of the hook where the laces meet.
// ─────────────────────────────────────────────────────────────
export function drawHangingShoes(c: Ctx, cx: number, hookY: number) {
  // Hook under desk
  rect(c, cx - 2, hookY, 4, 2, G.g50);
  hline(c, cx - 2, hookY, 4, G.g70);
  // Knot of laces draped on the hook
  rect(c, cx - 3, hookY + 2, 6, 3, G.paper);
  hline(c, cx - 3, hookY + 2, 6, G.white);
  px(c, cx - 3, hookY + 4, G.g75);
  px(c, cx + 2, hookY + 4, G.g75);

  // Two lace strands fall down to each shoe
  const lAnchorY = hookY + 5;
  const leftFootX = cx - 14;
  const rightFootX = cx + 14;
  drawShoeLace(c, cx - 1, lAnchorY, leftFootX + 4, lAnchorY + 18);
  drawShoeLace(c, cx + 1, lAnchorY, rightFootX - 4, lAnchorY + 18);

  // Shoes (slightly rotated — toe pointing down a bit, hanging)
  drawHangingShoe(c, leftFootX, lAnchorY + 18, false);
  drawHangingShoe(c, rightFootX, lAnchorY + 18, true);
}

function drawShoeLace(c: Ctx, x1: number, y1: number, x2: number, y2: number) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (x1 + (x2 - x1) * t) | 0;
    const y = (y1 + (y2 - y1) * t + Math.sin(t * Math.PI) * 2) | 0;
    px(c, x, y, G.paper);
    if (i % 3 === 0) px(c, x, y + 1, G.g60);
  }
}

function drawHangingShoe(c: Ctx, cx: number, topY: number, mirrored: boolean) {
  // Compact side-on running shoe — sole bottom (heel-down hang).
  const w = 28, h = 16;
  const x = cx - w / 2;
  const y = topY;

  // Upper body — dark gray
  for (let j = 0; j < h - 5; j++) {
    const t = j / (h - 5);
    const leftCut = mirrored ? Math.floor((1 - t) * 4) : Math.max(0, 5 - j);
    const rightCut = mirrored ? Math.max(0, 5 - j) : Math.floor((1 - t) * 4);
    rect(c, x + leftCut, y + j, w - leftCut - rightCut, 1, G.g15);
    // top sheen
    if (j === 0) hline(c, x + leftCut + 1, y + j, w - leftCut - rightCut - 2, G.g35);
  }
  // Heel collar
  const heelX = mirrored ? x + w - 8 : x;
  rect(c, heelX, y, 6, 3, G.g30);
  hline(c, heelX, y, 6, G.g45);
  // Sole — chunky white midsole + dark outsole
  rect(c, x, y + h - 5, w, 4, G.paper);
  hline(c, x, y + h - 5, w, G.white);
  rect(c, x, y + h - 1, w, 1, G.g15);
  px(c, x, y + h - 6, G.paper);
  px(c, x + w - 1, y + h - 6, G.paper);
  // Sole curl at heel + toe
  px(c, mirrored ? x + w - 1 : x, y + h - 2, G.g60);

  // Laces — 4 horizontal slashes mid-shoe
  const laceX = mirrored ? x + 4 : x + w - 12;
  for (let i = 0; i < 4; i++) {
    rect(c, laceX, y + 3 + i * 2, 8, 1, G.paper);
    px(c, laceX, y + 3 + i * 2, G.g60);
  }

  // ── NIKE SWOOSH ──
  // Stylized swoosh: thick curve starting fat at heel, tapering to thin point at toe.
  drawNikeSwoosh(c, x, y, w, h, mirrored);
}

function drawNikeSwoosh(c: Ctx, x: number, y: number, w: number, h: number, mirrored: boolean) {
  // Swoosh: a curved comma shape across the side of the shoe.
  // Reference: the wide end starts ~30% from heel, sweeps down then up to a point near toe.
  const col = G.paper;
  const colDk = G.g80;
  const startX = mirrored ? x + w - 8 : x + 6;
  const endX   = mirrored ? x + 2     : x + w - 4;
  const dir    = mirrored ? -1 : 1;

  // Fat wide section near the heel
  for (let i = 0; i < 6; i++) {
    const xx = startX + i * dir;
    rect(c, xx, y + 5 + Math.floor(i * 0.5), 1, 3 - Math.floor(i / 3), col);
    if (i < 3) px(c, xx, y + 5 + Math.floor(i * 0.5) + 2, colDk);
  }
  // Curve descending and tapering
  for (let i = 0; i < 8; i++) {
    const xx = startX + (6 + i) * dir;
    const yy = y + 7 + Math.floor(Math.sin(i / 8 * Math.PI) * -1.2);
    px(c, xx, yy, col);
    if (i % 2 === 0) px(c, xx, yy + 1, colDk);
  }
  // Thin tail rising toward the toe
  for (let i = 0; i < 5; i++) {
    const xx = startX + (14 + i) * dir;
    const yy = y + 5 - Math.floor(i * 0.4);
    if (xx === endX && i > 2) break;
    px(c, xx, yy, col);
  }
}

// ─────────────────────────────────────────────────────────────
// TINY GUITAR UNDER DESK — small leaning acoustic.
// ─────────────────────────────────────────────────────────────
export function drawTinyGuitar(c: Ctx, cx: number, baseY: number) {
  // Compact (~26 wide × 70 tall) leaning slightly.
  // Body bottom rests on the floor.
  const bodyH = 38;
  const bodyTop = baseY - bodyH;
  const neckH = 22;
  const neckTop = bodyTop - neckH;
  const hsH = 8;
  const hsTop = neckTop - hsH;

  // Body (hourglass)
  const profile: number[] = [];
  for (let i = 0; i < 14; i++) profile.push(Math.round(7 + 4 * Math.sin((i / 13) * Math.PI * 0.95)));
  for (let i = 0; i < 6; i++)  profile.push(Math.round(9 - 2 * Math.sin((i / 5) * Math.PI)));
  for (let i = 0; i < 18; i++) profile.push(Math.round(11 * Math.sin((0.3 + i / 17 * 0.65) * Math.PI)));

  for (let j = 0; j < bodyH; j++) {
    const halfW = profile[j] || 0;
    if (halfW <= 0) continue;
    rect(c, cx - halfW, bodyTop + j, halfW * 2, 1, W.hl);
    px(c, cx - halfW, bodyTop + j, G.g30);
    px(c, cx + halfW - 1, bodyTop + j, G.g30);
    if (j < 3) px(c, cx - halfW + 1, bodyTop + j, G.paper);
  }
  // Sound hole
  ellipse(c, cx, bodyTop + 16, 3, 3, G.ink);
  px(c, cx - 3, bodyTop + 14, G.paper);
  // Bridge
  rect(c, cx - 4, bodyTop + 24, 8, 2, G.g10);
  px(c, cx - 3, bodyTop + 25, G.paper);
  px(c, cx + 2, bodyTop + 25, G.paper);

  // Neck
  rect(c, cx - 2, neckTop, 4, neckH, G.g10);
  for (let f = 0; f < 5; f++) hline(c, cx - 2, neckTop + 3 + f * 4, 4, G.g60);

  // Headstock
  rect(c, cx - 4, hsTop, 8, hsH, G.g15);
  hline(c, cx - 4, hsTop, 8, G.g30);
  for (let p = 0; p < 3; p++) {
    px(c, cx - 5, hsTop + 1 + p * 2, G.paper);
    px(c, cx + 4, hsTop + 1 + p * 2, G.paper);
  }
  // Nut
  hline(c, cx - 3, neckTop, 6, G.paper);

  // Floor shadow
  for (let i = 0; i < 4; i++) {
    rect(c, cx - 8 - i, baseY + i, 16 + i * 2, 1, "#050505");
  }
}

