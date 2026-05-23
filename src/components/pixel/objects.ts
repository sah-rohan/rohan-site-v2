import { Ctx, rect, hline, vline, px, beveled, ellipse, stipple } from "./draw";
import { G, W, A } from "./palette";

// ─────────────────────────────────────────────────────────────
// MONITOR — the hero. Biggest object on the scene.
// Anchored to desk surface: y_bottom of base sits on DESK_TOP_Y.
// Returns the inner screen rect so the terminal can render into it.
// ─────────────────────────────────────────────────────────────
export interface ScreenRect { x: number; y: number; w: number; h: number; }

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
// MACBOOK — sits on desk right of monitor, with cable up to monitor.
// ─────────────────────────────────────────────────────────────
export function drawMacBook(c: Ctx, cx: number, deskTopY: number) {
  // Closed-ish open laptop, seen from front three-quarters.
  const lidW = 84, lidH = 52;
  const baseW = 92, baseH = 7;
  const lidX = cx - lidW / 2;
  const lidY = deskTopY - lidH - baseH;
  const baseX = cx - baseW / 2;
  const baseY = deskTopY - baseH;

  // Lid back (silver)
  rect(c, lidX, lidY, lidW, lidH, G.g75);
  hline(c, lidX, lidY, lidW, G.g85);
  vline(c, lidX, lidY, lidH, G.g80);
  hline(c, lidX, lidY + lidH - 1, lidW, G.g50);
  vline(c, lidX + lidW - 1, lidY, lidH, G.g55);

  // Bezel around screen
  const bez = 2;
  rect(c, lidX + bez, lidY + bez, lidW - bez * 2, lidH - bez * 2, G.g10);

  // Screen — subtle blue cityscape (Toronto-ish from the photo)
  const ssx = lidX + bez + 1;
  const ssy = lidY + bez + 1;
  const ssw = lidW - bez * 2 - 2;
  const ssh = lidH - bez * 2 - 2;
  // sky gradient
  for (let y = 0; y < ssh; y++) {
    const t = y / ssh;
    const col = t < 0.45 ? A.blueDk : t < 0.6 ? "#162848" : "#1f3a5e";
    hline(c, ssx, ssy + y, ssw, col);
  }
  // skyline silhouette
  const skyBase = ssy + Math.floor(ssh * 0.62);
  for (let x = 0; x < ssw; x++) {
    const seed = (x * 17 + 9) % 23;
    const buildingH = 4 + (seed % 14);
    rect(c, ssx + x, skyBase - buildingH, 1, buildingH, "#040810");
    // window lights — rare amber pops
    if (seed === 7 && (x % 3) === 0) px(c, ssx + x, skyBase - (buildingH >> 1), A.amber);
    if (seed === 13) px(c, ssx + x, skyBase - 2, A.blueLt);
  }
  // water reflection
  for (let y = skyBase; y < ssy + ssh; y++) {
    if ((y - skyBase) % 2 === 0) hline(c, ssx, y, ssw, "#0a1828");
  }
  // menubar
  rect(c, ssx, ssy, ssw, 3, "#0a0a0a");
  px(c, ssx + 2, ssy + 1, A.greenLt);

  // Hinge
  rect(c, lidX + 2, lidY + lidH - 1, lidW - 4, 1, G.g30);

  // Base (keyboard deck)
  rect(c, baseX, baseY, baseW, baseH, G.g70);
  hline(c, baseX, baseY, baseW, G.g85);
  hline(c, baseX, baseY + baseH - 1, baseW, G.g35);
  // chamfer
  hline(c, baseX, baseY + baseH, baseW, G.g15);
  // keyboard row (faint dark band)
  rect(c, baseX + 6, baseY + 1, baseW - 12, 3, G.g30);
  // trackpad hint
  rect(c, baseX + (baseW >> 1) - 8, baseY + 5, 16, 1, G.g55);
  // Apple logo on lid
  px(c, lidX + (lidW >> 1), lidY + (lidH >> 1) - 1, G.paper);
  px(c, lidX + (lidW >> 1) - 1, lidY + (lidH >> 1), G.paper);
  px(c, lidX + (lidW >> 1), lidY + (lidH >> 1), G.paper);
  px(c, lidX + (lidW >> 1) + 1, lidY + (lidH >> 1), G.paper);
  px(c, lidX + (lidW >> 1), lidY + (lidH >> 1) + 1, G.paper);

  // Cable from laptop back to monitor (USB-C → display)
  // Comes out left side of laptop base, loops up to monitor right side.
  const cStartX = baseX;
  const cStartY = baseY + 3;
  const cEndX = cStartX - 60;
  const cEndY = deskTopY - 6;
  for (let i = 0; i <= 50; i++) {
    const t = i / 50;
    const x = cStartX - t * 60;
    const y = cStartY + Math.sin(t * Math.PI) * 6 + (cEndY - cStartY) * t;
    px(c, x | 0, (y | 0), G.g15);
    px(c, x | 0, (y | 0) + 1, G.g25);
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
  // Drop shadow on desk
  rect(c, kx + 2, ky + kh, kw - 4, 1, W.d2);
  rect(c, kx + 4, ky + kh + 1, kw - 8, 1, W.d3);
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
export function drawBookshelf(c: Ctx, x: number, deskTopY: number) {
  const shW = 80;
  const shTop = 30;
  const shBottom = deskTopY - 2;
  const shH = shBottom - shTop;
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

  // Top trinket — a small framed photo and a tiny rubik's cube
  drawDeskRubiks(c, x + shW - 18, shTop - 14);
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
  // Notification card
  rect(c, x + 3, y + 12, pw - 6, 5, "#1a1410");
  hline(c, x + 3, y + 12, pw - 6, A.amberDk);
  px(c, x + 5, y + 14, A.amber);
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
