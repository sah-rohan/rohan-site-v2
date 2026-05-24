import { Ctx, rect, hline, vline, px, beveled, ellipse, stipple } from "./draw";
import { G, W, A } from "./palette";

// ─────────────────────────────────────────────────────────────
// MONITOR — the hero. Biggest object on the scene.
// Anchored to desk surface: y_bottom of base sits on DESK_TOP_Y.
// Returns the inner screen rect so the terminal can render into it.
// ─────────────────────────────────────────────────────────────
export interface ScreenRect { x: number; y: number; w: number; h: number; }

// Bitten-apple Apple logo. 13 wide × 16 tall apple body + 3-row leaf above.
// Designed to read clearly: two distinct top lobes with V-notch, slim waist,
// wide rounded bottom, prominent bite carved from upper-right.
// (x, y) is TOP-LEFT of the apple body (leaf is above).
// `col` paints the logo; `bg` carves the bite (pass the surface color).
export function drawAppleLogo(c: Ctx, x: number, y: number, col: string, bg?: string) {
  // Body — two distinct top lobes FULLY DISCONNECTED at the top, growing
  // and merging mid-body, with a clear right-side bite carved out, and a
  // soft inward curl at the very bottom (apple's natural narrowing).
  const body = [
    "....##...##..",  // 0   two humps, 3-px gap between
    "...####.####.",  // 1   humps grow
    "..#####.#####",  // 2
    ".############",  // 3   merging — V-notch starts to close
    ".############",  // 4
    "#############",  // 5
    "#############",  // 6
    "#############",  // 7
    "#############",  // 8
    "#############",  // 9
    ".###########.",  // 10
    ".###########.",  // 11
    "..#########..",  // 12
    "..#########..",  // 13
    "...#######...",  // 14  narrows
    "....#####....",  // 15  bottom curl in (the "indent" effect)
  ];
  // Leaf — small diagonal blade rising up-right from the right-hand hump.
  const leaf = [
    "........##...",
    ".......##....",
    "......##.....",
  ];

  // Leaf
  for (let j = 0; j < leaf.length; j++) {
    for (let i = 0; i < leaf[j].length; i++) {
      if (leaf[j][i] === "#") px(c, x + i, y - leaf.length + j, col);
    }
  }
  // Body
  for (let j = 0; j < body.length; j++) {
    for (let i = 0; i < body[j].length; i++) {
      if (body[j][i] === "#") px(c, x + i, y + j, col);
    }
  }
  // Bite — circular concave notch carved out of the upper-right side.
  // Generated as a filled circle of radius ~3 centered on (11, 6), so the
  // bite reads as a clean round indent (not a triangular V).
  if (bg) {
    const bcx = 11, bcy = 6, br = 3;
    for (let j = -br; j <= br; j++) {
      for (let i = -br; i <= br; i++) {
        // Slightly elongated to feel like an apple bite (taller than wide)
        const dx = i;
        const dy = j;
        if (dx * dx + dy * dy <= br * br + 1) {
          px(c, x + bcx + dx, y + bcy + dy, bg);
        }
      }
    }
  }
}

export function drawMonitor(
  c: Ctx, cx: number, deskTopY: number,
  size: { screenW: number; screenH: number } = { screenW: 280, screenH: 170 },
  theme: "dark" | "light" = "dark",
): ScreenRect {
  // Theme-aware bezel: dark = matte black, light = soft brushed silver.
  const bezelBody = theme === "light" ? G.g85 : G.g10;
  const bezelHl   = theme === "light" ? G.white : G.g30;
  const bezelSh   = theme === "light" ? G.g55 : G.ink;
  const bezelInk  = theme === "light" ? G.g65 : G.g05;
  const chinSh    = theme === "light" ? G.g70 : G.g20;
  const standBody = theme === "light" ? G.g75 : G.g15;
  const standDk   = theme === "light" ? G.g45 : G.g05;
  const standHl   = theme === "light" ? G.g90 : G.g30;
  // Monitor proportions — configurable size for responsive layout.
  const screenW = size.screenW;
  const screenH = size.screenH;
  const bezel = 2;
  const outerW = screenW + bezel * 2;
  const outerH = screenH + bezel * 2 + 8; // +chin
  const ox = cx - outerW / 2;
  // Position so the V-foot's bottom rests ON the desk surface (no gap).
  // Stand neck = 8px, V-foot = 6px tall. Foot bottom should land at deskTopY.
  const oy = deskTopY - outerH - 13;

  // ── Outer chassis (theme-aware) ──
  rect(c, ox, oy, outerW, outerH, bezelBody);
  hline(c, ox, oy, outerW, bezelHl);
  vline(c, ox, oy, outerH, bezelHl);
  hline(c, ox, oy + outerH - 1, outerW, bezelSh);
  vline(c, ox + outerW - 1, oy, outerH, bezelInk);
  rect(c, ox + 1, oy + 1, outerW - 2, 1, theme === "light" ? G.g80 : G.g15);
  vline(c, ox + 1, oy + 1, outerH - 2, theme === "light" ? G.g80 : G.g15);

  // ── Screen recess ──
  const sx = ox + bezel;
  const sy = oy + bezel;
  rect(c, sx, sy, screenW, screenH, theme === "light" ? G.g65 : G.ink);
  // inset shadow
  hline(c, sx, sy, screenW, bezelInk);
  vline(c, sx, sy, screenH, bezelInk);
  hline(c, sx, sy + screenH - 1, screenW, theme === "light" ? G.g90 : G.g15);
  vline(c, sx + screenW - 1, sy, screenH, theme === "light" ? G.g90 : G.g15);

  // ── Chin under screen ──
  const chinY = sy + screenH + 2;
  rect(c, ox + 2, chinY, outerW - 4, 6, bezelBody);
  hline(c, ox + 2, chinY, outerW - 4, chinSh);
  // Samsung-ish wordmark dot
  rect(c, cx - 12, chinY + 2, 24, 2, G.g05);
  hline(c, cx - 12, chinY + 2, 24, G.g25);
  // status LED — tiny amber dot
  px(c, ox + outerW - 6, chinY + 4, A.amberDk);

  // ── Stand neck ──
  const stY = oy + outerH;
  rect(c, cx - 8, stY, 16, 8, standBody);
  hline(c, cx - 8, stY, 16, standHl);
  vline(c, cx - 8, stY, 8, standHl);
  vline(c, cx + 7, stY, 8, standDk);
  // ── Stand base (V-foot) ──
  const bfY = stY + 8;
  for (let i = 0; i < 6; i++) {
    rect(c, cx - 32 - i, bfY + i, 64 + i * 2, 1, i < 2 ? standHl : standBody);
  }
  hline(c, cx - 32, bfY, 64, theme === "light" ? G.white : G.g35);
  hline(c, cx - 38, bfY + 5, 76, standDk);
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
// Theme-aware: dark = phosphor green/black, light = soft paper white.
export function drawTerminalBackground(c: Ctx, s: ScreenRect, theme: "dark" | "light" = "dark") {
  if (theme === "light") {
    rect(c, s.x, s.y, s.w, s.h, "#f4f1ea");        // off-white "paper" screen
    for (let y = 0; y < s.h; y += 2) hline(c, s.x, s.y + y, s.w, "#ece8df");
    stipple(c, s.x, s.y, s.w, s.h, "#d8d2c0", 0.02, 5);
  } else {
    rect(c, s.x, s.y, s.w, s.h, "#04080a");
    for (let y = 0; y < s.h; y += 2) hline(c, s.x, s.y + y, s.w, "#02050a");
    stipple(c, s.x, s.y, s.w, s.h, A.greenDk, 0.015, 5);
  }
}

// ─────────────────────────────────────────────────────────────
// MACBOOK — closed clamshell LYING FLAT on the desk, viewed from a
// slight forward-tilt perspective (same plane as keyboard/mouse).
// Wide and thin so it covers a substantial chunk of desk real estate.
// (cx, deskTopY) — cx is horizontal center, deskTopY anchors the top edge.
// ─────────────────────────────────────────────────────────────
export function drawMacBook(c: Ctx, cx: number, deskTopY: number) {
  const w = 100;
  const h = 28;
  const x = cx - w / 2;
  const y = deskTopY + 2;

  // ── Space Black aluminum lid ──
  // Real "Space Black" is a very dark gray with subtle warm undertone.
  const sb     = "#16161a";
  const sbLt   = "#22222a";
  const sbHl   = "#2c2c34";
  const sbDk   = "#08080a";

  rect(c, x, y, w, h, sb);
  // Front-edge highlight
  hline(c, x, y, w, sbHl);
  hline(c, x, y + 1, w, sbLt);
  // Back-edge shadow
  hline(c, x, y + h - 1, w, sbDk);
  hline(c, x, y + h - 2, w, "#0c0c10");
  vline(c, x, y, h, sbLt);
  vline(c, x + w - 1, y, h, sbDk);
  // Rounded corners
  px(c, x, y, sb);
  px(c, x + w - 1, y, sb);
  px(c, x, y + h - 1, sbDk);
  px(c, x + w - 1, y + h - 1, sbDk);
  // Clamshell seam along the front
  hline(c, x + 4, y + h - 4, w - 8, sbHl);
  hline(c, x + 4, y + h - 3, w - 8, sbLt);

  // Clean lid — no Apple logo. Just a faint center sheen line.
  hline(c, x + (w >> 1) - 8, y + (h >> 1), 16, sbHl);

  // ── Monitor cable: from LEFT side of laptop up to monitor's right side ──
  // Port on left edge (USB-C/Thunderbolt)
  rect(c, x - 1, y + 8, 2, 4, "#3a3a40");
  px(c, x - 1, y + 8, "#5a5a60");
  // Cable arcs up and to the left toward monitor
  const cStartX = x - 2;
  const cStartY = y + 10;
  const cEndX = cStartX - 50;
  const cEndY = deskTopY - 18;
  for (let i = 0; i <= 70; i++) {
    const t = i / 70;
    const xx = cStartX + (cEndX - cStartX) * t;
    const yy = cStartY + (cEndY - cStartY) * t - Math.sin(t * Math.PI) * 6;
    px(c, xx | 0, yy | 0, G.g10);
    px(c, xx | 0, (yy | 0) + 1, G.g20);
  }

  // ── Charger port on RIGHT side (port only — cable is fully behind desk) ──
  rect(c, x + w - 1, y + 8, 2, 4, "#3a3a40");
  px(c, x + w, y + 8, "#5a5a60");

  // Drop shadow under laptop on desk
  hline(c, x - 1, y + h, w + 2, W.dk);
  hline(c, x + 1, y + h + 1, w - 2, W.d1);
  hline(c, x + 3, y + h + 2, w - 6, W.d2);
}

// ─────────────────────────────────────────────────────────────
// KEYBOARD — slim aluminum, in front of monitor on desk.
// ─────────────────────────────────────────────────────────────
export function drawKeyboard(c: Ctx, cx: number, deskTopY: number) {
  const kw = 124, kh = 12;
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
  // Keys — 4 rows × 16 cols (smaller, still reads as keyboard)
  const rows = 4, cols = 16;
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
  // Blue mousepad — smaller
  const padW = 42, padH = 18;
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
// Small bookshelf tucked UNDER the desk in the floor area between the legs.
// (x, floorY) = bottom-left corner.
export function drawBookshelf(c: Ctx, x: number, floorY: number) {
  const shW = 56;
  const shH = 92;
  const shTop = floorY - shH;
  const shelves = 3;

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
// PHONE — laying flat face-up on desk, top-down view, in keyboard/laptop
// perspective. Compact footprint that sits fully within the desk band.
// ─────────────────────────────────────────────────────────────
export function drawPhone(c: Ctx, cx: number, deskTopY: number) {
  const pw = 16, ph = 26;       // compact, fits within the desk band
  const x = cx - pw / 2;
  const y = deskTopY + 1;        // sits on the desk surface (no overhang)
  // Body (matte black aluminum) — drawn as rounded-corner slab
  rect(c, x, y, pw, ph, G.g10);
  // Round corners
  px(c, x, y, G.g25);
  px(c, x + pw - 1, y, G.g25);
  px(c, x, y + ph - 1, G.ink);
  px(c, x + pw - 1, y + ph - 1, G.ink);
  // Edge highlights/shadows for a flat slab look
  hline(c, x + 1, y, pw - 2, G.g30);
  hline(c, x + 1, y + ph - 1, pw - 2, G.ink);
  vline(c, x, y + 1, ph - 2, G.g25);
  vline(c, x + pw - 1, y + 1, ph - 2, G.g05);
  // Screen recess — lit wallpaper (soft dusk-blue glow, matches the view).
  // Gradient from cooler at top to warmer at bottom.
  for (let yy = y + 3; yy < y + ph - 2; yy++) {
    const t = (yy - (y + 3)) / (ph - 5);
    const col = t < 0.35 ? "#1a2a48" : t < 0.7 ? "#22325a" : "#3a3050";
    hline(c, x + 2, yy, pw - 4, col);
  }
  // Camera notch / dynamic island at top
  rect(c, x + (pw >> 1) - 3, y + 4, 6, 2, "#020203");
  // Lock-screen time text (just a bright horizontal blob — too small for actual chars)
  hline(c, x + (pw >> 1) - 4, y + 9, 8, "#c8d4ec");
  px(c, x + (pw >> 1) - 5, y + 9, "#a0b0d0");
  px(c, x + (pw >> 1) + 4, y + 9, "#a0b0d0");
  // Subtle screen sheen — diagonal lighter band (gives "lit up" look)
  for (let i = 0; i < 6; i++) {
    px(c, x + 3 + i, y + 5 + i, "rgba(255,255,255,0.06)");
  }
  // Amber notification glow at bottom of screen
  rect(c, x + 3, y + ph - 5, pw - 6, 2, A.amberDk);
  px(c, x + 4, y + ph - 5, A.amber);
  px(c, x + 6, y + ph - 5, A.amber);
  // Drop shadow on desk (tight — phone is thin)
  hline(c, x + 1, y + ph, pw - 2, W.dk);
  hline(c, x + 2, y + ph + 1, pw - 4, W.d2);
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
// CHARGER BRICK + wall outlet. White Apple-style brick plugged into a small
// outlet on the wall (or window mullion). Cable trails up to the laptop.
// (x, y) = top-left of brick rectangle on the wall.
// ─────────────────────────────────────────────────────────────
export function drawChargerBrick(c: Ctx, cx: number, deskTopY: number) {
  // Brick sits on the floor area to the right of the desk.
  const brickW = 18, brickH = 22;
  const bx = cx - brickW / 2;
  const by = deskTopY + 60;
  // Brick body
  rect(c, bx, by, brickW, brickH, G.paper);
  hline(c, bx, by, brickW, G.white);
  vline(c, bx, by, brickH, G.g95);
  hline(c, bx, by + brickH - 1, brickW, G.g55);
  vline(c, bx + brickW - 1, by, brickH, G.g70);
  // Rounded corners
  px(c, bx, by, G.g80);
  px(c, bx + brickW - 1, by, G.g70);
  px(c, bx, by + brickH - 1, G.g50);
  px(c, bx + brickW - 1, by + brickH - 1, G.g40);
  // Brick has no logo — just a clean white slab with a slight center sheen.
  hline(c, bx + 4, by + 6, brickW - 8, G.white);
  // Tiny LED indicator dot
  px(c, bx + brickW - 4, by + brickH - 4, A.greenLt);
  // ── Two prongs going into a small outlet just below ──
  const oy = by + brickH;
  rect(c, cx - 4, oy, 2, 3, G.g30);
  rect(c, cx + 2, oy, 2, 3, G.g30);
  // Wall outlet plate (small rectangle behind the prongs)
  rect(c, cx - 8, oy + 2, 16, 8, G.g25);
  hline(c, cx - 8, oy + 2, 16, G.g40);
  vline(c, cx - 8, oy + 2, 8, G.g35);
  hline(c, cx - 8, oy + 9, 16, G.g10);
  vline(c, cx + 7, oy + 2, 8, G.g10);
  // Outlet slots
  rect(c, cx - 4, oy + 3, 2, 4, G.ink);
  rect(c, cx + 2, oy + 3, 2, 4, G.ink);
  // Ground hole below
  rect(c, cx - 1, oy + 7, 2, 2, G.ink);
}

// ─────────────────────────────────────────────────────────────
// CHARGER CABLE — routes from the brick (on the floor) up alongside
// the desk's right edge, then across the desk top into the laptop's
// right-side port. Never crosses through the desk's wood.
//
//   (brickCx, brickTopY) — top-center of the brick
//   (laptopPortX, laptopPortY) — where the cable plugs into the laptop
// ─────────────────────────────────────────────────────────────
export function drawChargerCable(
  c: Ctx,
  brickCx: number, brickTopY: number,
  laptopPortX: number, laptopPortY: number,
  deskTopY: number, deskRightX: number,
) {
  // Smooth cable routing: brick → up around the desk's right edge → onto
  // the desk top → into the laptop port. Drawn as a single continuous curve
  // composed of waypoints, blending with quadratic interpolation between
  // them so the cable never has visible kinks.
  const sideX = deskRightX + 4;

  // Waypoints (canvas coords). Cable passes through these in order.
  const pts: [number, number][] = [
    [brickCx,      brickTopY],            // brick top
    [brickCx + 6,  brickTopY - 14],       // slight rise + curve right
    [sideX,        deskTopY + 38],        // outside desk, mid-vertical
    [sideX,        deskTopY - 1],         // top of desk side edge
    [sideX - 4,    deskTopY + 4],         // curl over desk corner onto top
    [laptopPortX + 8, deskTopY + 7],      // approach laptop port
    [laptopPortX,  laptopPortY],          // plug
  ];

  // Render each segment as a smooth interpolated line.
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) + 1;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      // Quadratic ease so adjacent segments blend without sharp kinks.
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const xx = Math.round(x0 + (x1 - x0) * e);
      const yy = Math.round(y0 + (y1 - y0) * e);
      px(c, xx, yy, G.paper);
      // Soft shadow underline so the cable reads as round.
      px(c, xx, yy + 1, G.g60);
    }
  }
  // Plug head at the laptop port — small black USB-C connector.
  rect(c, laptopPortX - 1, laptopPortY - 1, 3, 3, G.g15);
  hline(c, laptopPortX - 1, laptopPortY - 1, 3, G.g35);
  px(c, laptopPortX, laptopPortY, G.g45);
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

  // Two lace strands fall down to each shoe — spaced WIDE so the two shoes
  // read as a clear pair, not a single blob.
  const lAnchorY = hookY + 5;
  const leftFootX  = cx - 22;
  const rightFootX = cx + 22;
  // Left shoe hangs slightly lower than the right (staggered for realism).
  drawShoeLace(c, cx - 2, lAnchorY, leftFootX + 4,  lAnchorY + 22);
  drawShoeLace(c, cx + 2, lAnchorY, rightFootX - 4, lAnchorY + 18);

  // Shoes — toe-out so the pair is mirror-symmetric.
  drawHangingShoe(c, leftFootX,  lAnchorY + 22, false);  // toe points left
  drawHangingShoe(c, rightFootX, lAnchorY + 18, true);   // toe points right
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
  // Side-on sneaker silhouette. Clear, simple, recognizable.
  // No swoosh — just a clean shoe shape.
  //
  //   ╱─────╲___      <- upper (heel collar high, toe low)
  //   ▓ . . . ▓         tongue + laces
  //   ═══════════       midsole (white)
  //   ───────────       outsole (dark rubber)
  //
  // Mirrored=true → toe points right, heel left. False → toe left, heel right.
  const W2 = 34, H2 = 18;
  const x = cx - W2 / 2;
  const y = topY;

  // Per-column top offset — defines upper silhouette curve.
  // u: 0 = heel side, 1 = toe side
  const upperTop: number[] = [];
  for (let i = 0; i < W2; i++) {
    const t = i / (W2 - 1);
    const u = mirrored ? t : 1 - t;
    let top: number;
    if (u < 0.05) {
      // Heel back curve
      const k = u / 0.05;
      top = 4 - Math.round(k * 2);
    } else if (u < 0.22) {
      // Heel collar — high
      top = 1;
    } else if (u < 0.32) {
      // Down from heel collar to ankle opening
      const k = (u - 0.22) / 0.10;
      top = 1 + Math.round(k * 4);
    } else if (u < 0.55) {
      // Tongue area (low) — keeps the dip so ankle opening reads
      top = 5;
    } else if (u < 0.85) {
      // Forefoot rises slightly
      const k = (u - 0.55) / 0.30;
      top = 5 + Math.round((1 - k) * 1);
    } else {
      // Toe box rounds down toward the sole
      const k = (u - 0.85) / 0.15;
      top = 6 + Math.round(k * 4);
    }
    upperTop.push(top);
  }

  // Fill upper body — gray with subtle shading
  for (let i = 0; i < W2; i++) {
    const top = upperTop[i];
    for (let j = top; j < H2 - 5; j++) {
      // Light at top of upper, darker toward sole
      const dt = j - top;
      const col = dt < 1 ? G.g50 : dt < 3 ? G.g30 : G.g15;
      px(c, x + i, y + j, col);
    }
  }

  // Heel collar opening — small dark oval at the top of the collar
  const collarX = mirrored ? 4 : W2 - 11;
  for (let i = 0; i < 7; i++) {
    px(c, x + collarX + i, y + 2, G.ink);
    if (i > 0 && i < 6) px(c, x + collarX + i, y + 3, G.g05);
  }
  // Padding rim around collar opening
  for (let i = -1; i < 8; i++) {
    px(c, x + collarX + i, y + 1, G.paper);
  }

  // Tongue (vertical strip in midfoot)
  const tongueX = mirrored ? 11 : W2 - 16;
  rect(c, x + tongueX, y + 4, 5, 6, G.g70);
  hline(c, x + tongueX, y + 4, 5, G.paper);
  vline(c, x + tongueX, y + 4, 6, G.g80);
  vline(c, x + tongueX + 4, y + 4, 6, G.g50);

  // Laces — 3 horizontal stripes across the tongue's tongue-flap area
  for (let r = 0; r < 3; r++) {
    const ly = y + 5 + r * 2;
    rect(c, x + tongueX, ly, 5, 1, G.white);
    // tiny eyelets
    px(c, x + tongueX, ly, G.ink);
    px(c, x + tongueX + 4, ly, G.ink);
  }

  // Side panel highlight (a single subtle band along the upper)
  const panelStart = mirrored ? 16 : 4;
  const panelEnd = mirrored ? W2 - 4 : W2 - 16;
  for (let i = panelStart; i < panelEnd; i++) {
    px(c, x + i, y + upperTop[i] + 2, G.g40);
  }

  // ── Midsole (chunky white wedge) ──
  rect(c, x, y + H2 - 5, W2, 3, G.paper);
  hline(c, x, y + H2 - 5, W2, G.white);
  hline(c, x, y + H2 - 3, W2, G.g80);
  // Soft curl at heel and toe
  px(c, x - 1, y + H2 - 4, G.paper);
  px(c, x + W2, y + H2 - 4, G.paper);
  // Subtle horizontal seam through the midsole
  hline(c, x + 1, y + H2 - 4, W2 - 2, G.g90);

  // ── Outsole (dark rubber) ──
  rect(c, x + 1, y + H2 - 2, W2 - 2, 2, G.ink);
  hline(c, x + 1, y + H2 - 2, W2 - 2, G.g20);
  // Tread blocks across the bottom
  for (let i = 2; i < W2 - 2; i += 4) {
    px(c, x + i, y + H2 - 1, G.g50);
  }
}

/* eslint-disable @typescript-eslint/no-unused-vars */
function drawNikeSwoosh(c: Ctx, x: number, y: number, w: number, h: number, mirrored: boolean) {
  // Nike swoosh — a curving comma. Wide thick body starts above the heel,
  // sweeps down across the side, then narrows up to a long thin tail at the toe.
  // We pixel-paint each "thickness" along a Bezier-ish path.
  const col = G.paper;
  const hl = G.white;
  const dk = G.g70;

  // Anchor points along the path. Offsets are relative to (x, y) and mirrored.
  // Format: [dx, dy, thickness]
  const path: [number, number, number][] = [
    [4,  4,  3],   // fat start (above heel)
    [5,  5,  4],
    [6,  6,  4],   // peak thickness
    [7,  7,  4],
    [9,  8,  3],
    [11, 9,  3],   // bottom of curve
    [13, 8,  2],
    [15, 7,  2],
    [17, 6,  2],
    [19, 5,  1],   // tail thinning
    [21, 4,  1],
    [22, 3,  1],
    [23, 2,  1],   // tail tip
  ];

  for (const [dx, dy, thick] of path) {
    const xx = x + (mirrored ? w - dx : dx);
    const yy = y + dy;
    // Draw a vertical "blob" of `thick` pixels for the body
    for (let t = 0; t < thick; t++) {
      px(c, xx, yy + t, col);
    }
    // Top highlight on the upper edge
    px(c, xx, yy - 1, dk);
    // Bottom shadow on the lower edge
    if (thick > 1) px(c, xx, yy + thick, dk);
  }
  // Small highlight on the thickest part
  px(c, x + (mirrored ? w - 6 : 6), y + 5, hl);
  px(c, x + (mirrored ? w - 7 : 7), y + 6, hl);
}
/* eslint-enable @typescript-eslint/no-unused-vars */

// ─────────────────────────────────────────────────────────────
// TINY NOTEBOOK — small bound journal sitting flat on the desk.
// Spiral binding on the left, lined pages, ribbon bookmark, leather cover.
// (cx, deskTopY) — cx is horizontal center, top edge sits on desk.
// ─────────────────────────────────────────────────────────────
export function drawNotebook(c: Ctx, cx: number, deskTopY: number) {
  const w = 22, h = 30;
  const x = cx - w / 2;
  const y = deskTopY + 1;
  // Leather cover — warm amber/brown
  rect(c, x, y, w, h, "#7a4d28");
  // Top edge highlight (light catches the cover)
  hline(c, x, y, w, "#a06838");
  hline(c, x, y + 1, w, "#8c5a30");
  // Side + bottom shadow
  vline(c, x, y, h, "#8c5a30");
  vline(c, x + w - 1, y, h, "#4a2f18");
  hline(c, x, y + h - 1, w, "#3a2410");
  // Corner rounding
  px(c, x, y, "#5a3a1c");
  px(c, x + w - 1, y, "#5a3a1c");
  px(c, x, y + h - 1, "#2a1808");
  px(c, x + w - 1, y + h - 1, "#2a1808");
  // Page edges visible at the right side (cream stack)
  vline(c, x + w - 2, y + 3, h - 6, "#e8dfc8");
  vline(c, x + w - 3, y + 3, h - 6, "#d8cfae");
  // Spiral binding rings on the left edge — small dots
  for (let i = 0; i < 6; i++) {
    const ry = y + 4 + i * 4;
    px(c, x + 1, ry, "#3a3a3a");
    px(c, x + 2, ry, "#1a1a1a");
    px(c, x, ry, "#5a5a5a");
  }
  // Small embossed title on cover — a thin line
  hline(c, x + 5, y + 8, 12, "#a06838");
  hline(c, x + 6, y + 12, 10, "#a06838");
  // Bookmark ribbon hanging from top
  rect(c, x + w - 7, y - 2, 2, 7, "#c83a40");
  px(c, x + w - 7, y + 4, "#8a2028");
  // Drop shadow on desk
  hline(c, x + 1, y + h, w - 2, W.dk);
  hline(c, x + 2, y + h + 1, w - 4, W.d2);
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

  // Body (hourglass) — rounded bottom, no point.
  const profile: number[] = [];
  // Upper bout — swells out
  for (let i = 0; i < 12; i++) profile.push(Math.round(8 + 4 * Math.sin((i / 11) * Math.PI * 0.95)));
  // Waist — pinches in
  for (let i = 0; i < 6; i++)  profile.push(Math.round(10 - 2 * Math.sin((i / 5) * Math.PI)));
  // Lower bout — fuller, rounded bottom (semicircle from waist down)
  const lowerH = 20;
  const lowerR = 12;
  for (let i = 0; i < lowerH; i++) {
    // ellipse half: stays wide and only rounds off at the very bottom
    const t = i / (lowerH - 1);
    const ellY = (t - 0.45) * (lowerR + 2); // shifts ellipse vertically
    const v = Math.sqrt(Math.max(0, 1 - (ellY * ellY) / ((lowerR + 2) * (lowerR + 2))));
    profile.push(Math.round(lowerR * v));
  }

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

