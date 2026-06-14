import { Ctx, rect, hline, vline, px, stipple } from "./draw";

export type SceneId = "sf" | "tokyo" | "nyc";
export type Theme = "dark" | "light";

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

// ─────────────────────────────────────────────────────────────
// TOKYO — sakura lake scene
// Composition (upper-section crop = sky/buildings prominent, water minimal):
//   1. Cyan sky gradient + cumulus clouds
//   2. Dark sakura branch overhanging top-left corner with blossom clusters
//   3. Distant blue city skyline on right ~40%
//   4. Tree-lined far shore (greens + sakura tree blobs)
//   5. Wooden stilt house mid-left over water
//   6. Foreground sakura tree on right
//   7. Thin water band at bottom with subtle reflection stripes
// ─────────────────────────────────────────────────────────────
interface TokyoPalette {
  skyHi: string; skyLo: string;
  cloudHi: string; cloudMid: string; cloudSh: string;
  bldgFar: string; bldgFarHl: string; bldgFarDk: string;
  bldgWin: string; bldgWinLit: string;
  shoreGreen: string; shoreGreenHl: string; shoreGreenDk: string;
  sakuraBranch: string; sakuraBranchHl: string;
  blossomHi: string; blossomMid: string; blossomDk: string;
  trunkHi: string; trunkMid: string; trunkDk: string;
  houseWall: string; houseWallHl: string; houseWallDk: string;
  houseRoof: string; houseRoofHl: string;
  houseStilt: string;
  houseWinLit: string; houseWinDk: string;
  water: string; waterHl: string; waterDk: string;
  pole: string;
  moon?: string;
  star?: string;
}

const TOKYO_LIGHT: TokyoPalette = {
  skyHi: "#9cd4ec", skyLo: "#c4e8f4",
  cloudHi: "#ffffff", cloudMid: "#e4f0f8", cloudSh: "#a8c8dc",
  bldgFar: "#5a6a90", bldgFarHl: "#7a8ab0", bldgFarDk: "#3a4a70",
  bldgWin: "#3a4a70", bldgWinLit: "#d8c890",
  shoreGreen: "#5a8a5a", shoreGreenHl: "#7aa878", shoreGreenDk: "#3a6a3a",
  sakuraBranch: "#3a2418", sakuraBranchHl: "#5a3828",
  blossomHi: "#ffffff", blossomMid: "#f4b8cc", blossomDk: "#c884a0",
  trunkHi: "#7a4828", trunkMid: "#5a3018", trunkDk: "#3a1a08",
  houseWall: "#6a4a30", houseWallHl: "#8a6840", houseWallDk: "#3a2a18",
  houseRoof: "#3a2820", houseRoofHl: "#5a4030",
  houseStilt: "#3a2418",
  houseWinLit: "#9ac0d8", houseWinDk: "#2a3a48",
  water: "#a8d0e8", waterHl: "#c4e0f0", waterDk: "#7aa8c8",
  pole: "#3a2818",
};

const TOKYO_DARK: TokyoPalette = {
  skyHi: "#0a1428", skyLo: "#1a2848",
  cloudHi: "#2a3858", cloudMid: "#1a2440", cloudSh: "#0a1428",
  bldgFar: "#0a1024", bldgFarHl: "#1a2038", bldgFarDk: "#04060f",
  bldgWin: "#04060f", bldgWinLit: "#f5c870",
  shoreGreen: "#1a2a1a", shoreGreenHl: "#2a3a24", shoreGreenDk: "#0a1408",
  sakuraBranch: "#0a0608", sakuraBranchHl: "#1a0e12",
  blossomHi: "#d8a8c0", blossomMid: "#a06a88", blossomDk: "#5a3850",
  trunkHi: "#1a0e08", trunkMid: "#0a0604", trunkDk: "#000000",
  houseWall: "#1a1410", houseWallHl: "#2a1f18", houseWallDk: "#0a0804",
  houseRoof: "#0a0604", houseRoofHl: "#1a0f08",
  houseStilt: "#0a0604",
  houseWinLit: "#f5c870", houseWinDk: "#0a0a14",
  water: "#0a182a", waterHl: "#1a2840", waterDk: "#040810",
  pole: "#0a0604",
  moon: "#f4ecd0",
  star: "#dcdcdc",
};

export function drawTokyoView(c: Ctx, x: number, y: number, w: number, h: number, theme: Theme) {
  const P = theme === "dark" ? TOKYO_DARK : TOKYO_LIGHT;

  // ── SKY GRADIENT (upper 70% — elevated crop emphasizes sky) ──
  for (let yy = 0; yy < h; yy++) {
    const t = yy / h;
    const col = t < 0.78 ? blend(P.skyHi, P.skyLo, t / 0.78) : P.skyLo;
    hline(c, x, y + yy, w, col);
  }

  // ── STARS / MOON (dark only) ──
  if (P.star) {
    let s = 2347;
    for (let i = 0; i < 22; i++) {
      s = (s * 9301 + 49297) % 233280;
      const px0 = x + (s % w);
      const py0 = y + ((s >> 4) % Math.floor(h * 0.45));
      px(c, px0, py0, P.star);
      if ((s & 7) === 0) px(c, px0 + 1, py0, "#888888");
    }
  }
  if (P.moon) {
    const mx = x + Math.floor(w * 0.74);
    const my = y + Math.floor(h * 0.20);
    for (let i = -8; i <= 8; i++)
      for (let j = -8; j <= 8; j++) {
        const d2 = i * i + j * j;
        if (d2 <= 64) {
          if (d2 <= 49) px(c, mx + i, my + j, P.moon);
          else px(c, mx + i, my + j, blend(P.moon, P.skyHi, 0.55));
        }
      }
  }

  // ── CUMULUS CLOUDS (puffy white blobs) ──
  drawCumulus(c, x + 40,  y + 20, 56, 12, P);
  drawCumulus(c, x + 200, y + 14, 78, 14, P);
  drawCumulus(c, x + 320, y + 36, 64, 10, P);
  drawCumulus(c, x + 470, y + 18, 90, 14, P);

  // ── DISTANT CITY SKYLINE (right ~50%) ──
  const skylineBase = y + Math.floor(h * 0.62);
  drawTokyoSkyline(c, x + Math.floor(w * 0.42), skylineBase, Math.floor(w * 0.58), P, theme === "dark");

  // ── FAR SHORE — tree band (greens + sakura blobs) ──
  const shoreY = y + Math.floor(h * 0.64);
  drawTokyoShore(c, x, shoreY, w, P);

  // ── WATER (thin band at bottom — elevated crop) ──
  const waterTop = y + Math.floor(h * 0.78);
  for (let yy = waterTop; yy < y + h; yy++) {
    const t = (yy - waterTop) / (y + h - waterTop);
    hline(c, x, yy, w, blend(P.water, P.waterDk, t));
  }
  // Horizontal reflection stripes
  for (let yy = waterTop + 1; yy < y + h; yy += 2) {
    let r = (yy * 53 + 7) % 1000;
    for (let k = 0; k < 14; k++) {
      r = (r * 9301 + 49297) % 233280;
      const xx = x + (r % w);
      if ((r & 7) === 0) px(c, xx, yy, P.waterHl);
    }
  }
  // Reflections under house and trees (dim color band)
  for (let xx = x + 70; xx < x + 180; xx++) {
    if ((xx + waterTop) % 3 !== 0) {
      px(c, xx, waterTop + 1, blend(P.houseWall, P.water, 0.4));
      px(c, xx, waterTop + 3, blend(P.houseWall, P.water, 0.6));
    }
  }

  // ── WOODEN STILT HOUSE (mid-left over water) ──
  drawStiltHouse(c, x + 80, shoreY - 4, P);

  // ── FOREGROUND RIGHT SAKURA TREE ──
  drawSakuraTree(c, x + Math.floor(w * 0.86), shoreY + 4, 22, P);

  // ── LEFT FOREGROUND SAKURA TREE (smaller, closer to house) ──
  drawSakuraTree(c, x + 28, shoreY + 6, 16, P);

  // ── TELEPHONE POLE (right of house, on path) ──
  drawTelephonePole(c, x + Math.floor(w * 0.52), shoreY, P);

  // ── OVERHANGING SAKURA BRANCH (top-left corner — large, dominant) ──
  drawOverhangingBranch(c, x, y, w, h, P);
}

function drawCumulus(c: Ctx, cx: number, cy: number, w: number, h: number, P: TokyoPalette) {
  // Pixel cumulus — soft ellipse with shadowed underside.
  for (let i = -Math.floor(w / 2); i <= Math.floor(w / 2); i++) {
    for (let j = -Math.floor(h / 2); j <= Math.floor(h / 2); j++) {
      const t = (i * i) / ((w / 2) * (w / 2)) + (j * j) / ((h / 2) * (h / 2));
      if (t <= 1) {
        // Bumpy top (sinusoidal)
        const bumpTop = -Math.floor(h / 2) + Math.round(Math.sin((i + cx) * 0.3) * 1.5);
        if (j < bumpTop) continue;
        let col;
        if (j > Math.floor(h / 3)) col = P.cloudSh;
        else if (j > 0) col = P.cloudMid;
        else col = P.cloudHi;
        px(c, cx + i, cy + j, col);
      }
    }
  }
  // Top highlight bumps
  for (let i = -Math.floor(w / 3); i < Math.floor(w / 3); i += 4) {
    px(c, cx + i, cy - Math.floor(h / 2) - 1, P.cloudHi);
  }
}

function drawTokyoSkyline(c: Ctx, x: number, baseY: number, w: number, P: TokyoPalette, dark: boolean) {
  // Far-distance city — chunky blue-gray buildings of varied heights.
  let s = 4111;
  let i = 0;
  while (i < w) {
    s = (s * 9301 + 49297) % 233280;
    const bw = 5 + Math.floor((s / 233280) * 13);
    s = (s * 9301 + 49297) % 233280;
    const bh = 12 + Math.floor((s / 233280) * 36);
    if (i + bw > w) break;
    // Body
    rect(c, x + i, baseY - bh, bw, bh, P.bldgFar);
    // Top + left rim highlight (catches light)
    hline(c, x + i, baseY - bh, bw, P.bldgFarHl);
    vline(c, x + i, baseY - bh, bh, P.bldgFarHl);
    // Right shadow
    vline(c, x + i + bw - 1, baseY - bh, bh, P.bldgFarDk);
    // Window grid
    let r = s;
    for (let yy = 2; yy < bh - 2; yy += 3) {
      for (let xx = 1; xx < bw - 1; xx += 2) {
        r = (r * 9301 + 49297) % 233280;
        const p = r / 233280;
        if (dark) {
          if (p < 0.42) px(c, x + i + xx, baseY - bh + yy, P.bldgWinLit);
          else px(c, x + i + xx, baseY - bh + yy, P.bldgWin);
        } else {
          if (p < 0.18) px(c, x + i + xx, baseY - bh + yy, P.bldgWinLit);
          else if (p < 0.4) px(c, x + i + xx, baseY - bh + yy, P.bldgWin);
        }
      }
    }
    // Occasional rooftop antenna / cap
    if ((s & 15) === 0) {
      vline(c, x + i + (bw >> 1), baseY - bh - 4, 4, P.bldgFarDk);
    }
    // Occasional red warning light
    if ((s & 31) === 0) px(c, x + i + (bw >> 1), baseY - bh - 1, "#d8302a");
    i += bw;
  }
}

function drawTokyoShore(c: Ctx, x: number, baseY: number, w: number, P: TokyoPalette) {
  // Tree-lined shore — wavy green band stretching across, with denser
  // foliage clusters and a few sakura tree blobs poking up.
  for (let i = 0; i < w; i++) {
    const wave1 = Math.sin(i * 0.06) * 3;
    const wave2 = Math.sin(i * 0.18 + 1.3) * 2;
    const top = Math.round(baseY - 10 - wave1 - wave2);
    for (let yy = top; yy < baseY + 4; yy++) {
      const dt = (yy - top) / Math.max(1, baseY - top);
      const col = dt < 0.25 ? P.shoreGreenHl : (dt > 0.75 ? P.shoreGreenDk : P.shoreGreen);
      px(c, x + i, yy, col);
    }
  }
  // Sakura tree blobs (pink) embedded in shore
  const sakuraSpots = [180, 240, 310, 360, 400, 540];
  for (const sx of sakuraSpots) {
    if (sx > w) continue;
    drawSakuraBlob(c, x + sx, baseY - 8, 6, P);
  }
}

function drawSakuraBlob(c: Ctx, cx: number, cy: number, r: number, P: TokyoPalette) {
  for (let i = -r; i <= r; i++) {
    for (let j = -r; j <= r; j++) {
      const d2 = i * i + j * j;
      if (d2 <= r * r) {
        const noise = ((i * 13 + j * 7) & 7);
        let col;
        if (d2 < (r - 2) * (r - 2)) col = P.blossomMid;
        else col = P.blossomDk;
        if (noise === 0) col = P.blossomHi;
        px(c, cx + i, cy + j, col);
      }
    }
  }
}

function drawSakuraTree(c: Ctx, cx: number, baseY: number, r: number, P: TokyoPalette) {
  // Trunk underneath
  for (let j = 0; j < 10; j++) {
    rect(c, cx - 2, baseY - j, 3, 1, j < 4 ? P.trunkMid : P.trunkDk);
    px(c, cx - 2, baseY - j, P.trunkHi);
  }
  // Multi-blob pink crown
  const blobs: [number, number, number][] = [
    [0, -r + 2, r],
    [-r + 2, -r + 4, Math.floor(r * 0.7)],
    [r - 3, -r + 5, Math.floor(r * 0.65)],
    [-2, -r + 8, Math.floor(r * 0.55)],
    [r - 6, -r + 1, Math.floor(r * 0.55)],
  ];
  for (const [dx, dy, br] of blobs) {
    drawSakuraBlob(c, cx + dx, baseY + dy, br, P);
  }
  // A few falling petals around the tree
  let s = (cx * 7 + baseY * 11) % 1000;
  for (let k = 0; k < 5; k++) {
    s = (s * 9301 + 49297) % 233280;
    const px0 = cx - r + (s % (r * 2));
    s = (s * 9301 + 49297) % 233280;
    const py0 = baseY + 2 + ((s >> 4) % 8);
    px(c, px0, py0, P.blossomMid);
  }
}

function drawStiltHouse(c: Ctx, x: number, baseY: number, P: TokyoPalette) {
  // A small wooden hut on stilts standing over the water.
  // Dimensions chosen to match the reference photo proportions.
  const houseW = 44;
  const houseH = 20;
  const houseY = baseY - houseH - 4;

  // ── Stilt supports (vertical posts going from base into water) ──
  for (const sx of [x + 3, x + 14, x + houseW - 15, x + houseW - 4]) {
    vline(c, sx, baseY, 14, P.houseStilt);
    vline(c, sx + 1, baseY, 14, P.houseWallDk);
  }
  // Stilt crossbeam
  rect(c, x + 2, baseY - 2, houseW - 4, 2, P.houseWallDk);

  // ── House body ──
  rect(c, x, houseY, houseW, houseH, P.houseWall);
  // Top edge highlight (catches light from above)
  hline(c, x, houseY, houseW, P.houseWallHl);
  // Bottom shadow
  hline(c, x, houseY + houseH - 1, houseW, P.houseWallDk);
  // Vertical wood plank seams
  for (let i = 4; i < houseW; i += 4) {
    vline(c, x + i, houseY + 1, houseH - 2, P.houseWallDk);
  }

  // ── Roof — slight overhang, dark brown, peaked ──
  const roofH = 6;
  rect(c, x - 3, houseY - roofH, houseW + 6, roofH, P.houseRoof);
  hline(c, x - 3, houseY - roofH, houseW + 6, P.houseRoofHl);
  // Roof front-face shadow
  hline(c, x - 3, houseY - 1, houseW + 6, P.houseWallDk);
  // Roof underside tile shadow
  hline(c, x - 3, houseY, houseW + 6, P.houseRoof);

  // ── Windows — three small lit panes across the front ──
  const winY = houseY + 7;
  const winW = 8;
  const winH = 7;
  for (let k = 0; k < 3; k++) {
    const wx = x + 5 + k * 12;
    rect(c, wx, winY, winW, winH, P.houseWinLit);
    // Window frame
    hline(c, wx, winY, winW, P.houseWallDk);
    hline(c, wx, winY + winH - 1, winW, P.houseWallDk);
    vline(c, wx, winY, winH, P.houseWallDk);
    vline(c, wx + winW - 1, winY, winH, P.houseWallDk);
    // Muntin cross
    vline(c, wx + (winW >> 1), winY + 1, winH - 2, P.houseWallDk);
    hline(c, wx + 1, winY + (winH >> 1), winW - 2, P.houseWallDk);
  }

  // ── Small sign on roof (deeper brown plank) ──
  rect(c, x + 14, houseY - roofH - 4, 16, 4, P.houseRoofHl);
  hline(c, x + 14, houseY - roofH - 4, 16, P.houseWallHl);

  // Anchor reflection in water (dim, broken stripes)
  for (let xx = x; xx < x + houseW; xx++) {
    if ((xx & 3) !== 0) {
      px(c, xx, baseY + 14, blend(P.houseWall, P.water, 0.4));
      px(c, xx, baseY + 16, blend(P.houseRoof, P.water, 0.5));
    }
  }
}

function drawTelephonePole(c: Ctx, cx: number, baseY: number, P: TokyoPalette) {
  // Tall thin pole with one crossbar near top.
  const poleTop = baseY - 26;
  vline(c, cx, poleTop, baseY - poleTop, P.pole);
  vline(c, cx + 1, poleTop, baseY - poleTop, P.pole);
  // Crossbar
  rect(c, cx - 4, poleTop + 4, 10, 1, P.pole);
  // Insulators
  px(c, cx - 4, poleTop + 3, P.pole);
  px(c, cx + 5, poleTop + 3, P.pole);
  // Sagging wires going off-frame both sides
  for (let xx = -30; xx < 0; xx++) {
    const t = (xx + 30) / 30;
    const yy = poleTop + 4 + Math.round(Math.sin(t * Math.PI) * 1.5);
    px(c, cx + xx, yy, P.pole);
  }
  for (let xx = 1; xx < 30; xx++) {
    const t = xx / 30;
    const yy = poleTop + 4 + Math.round(Math.sin(t * Math.PI) * 1.5);
    px(c, cx + xx + 2, yy, P.pole);
  }
}

function drawOverhangingBranch(c: Ctx, x: number, y: number, w: number, h: number, P: TokyoPalette) {
  void w; void h;
  // Thick dark trunk coming down from top-left corner, branching out into
  // smaller twigs each tipped with a pink blossom cluster.
  // Main trunk path — diagonal pixel curve.
  const trunkPts: [number, number][] = [];
  let cx = x + 2;
  let cy = y + 2;
  for (let i = 0; i < 38; i++) {
    rect(c, cx, cy, 4, 4, P.sakuraBranch);
    hline(c, cx, cy, 4, P.sakuraBranchHl);
    trunkPts.push([cx + 2, cy + 2]);
    cx += 1 + (i & 1);
    if (i > 8) cy += (i % 3 === 0 ? 1 : 0);
  }
  // Branches off the trunk
  const branchSpecs: [number, number, number, number][] = [
    [8, 14, 24, -2],
    [14, 18, 28, 6],
    [20, 24, 26, 14],
    [26, 30, 22, 20],
    [32, 36, 18, 26],
  ];
  for (const [startIdx, _endIdx, len, drop] of branchSpecs) {
    void _endIdx;
    if (startIdx >= trunkPts.length) continue;
    const [sx, sy] = trunkPts[startIdx];
    for (let i = 0; i < len; i++) {
      const px0 = sx + i;
      const py0 = sy + Math.round((i / len) * drop);
      rect(c, px0, py0, 2, 2, P.sakuraBranch);
    }
    // Blossom cluster at tip
    drawSakuraBlob(c, sx + len + 2, sy + drop + 1, 6, P);
    // Mid-branch blossom puff
    if (len > 18) {
      drawSakuraBlob(c, sx + Math.floor(len * 0.55), sy + Math.round(drop * 0.55) - 1, 4, P);
    }
  }
  // Top corner blossom cluster — anchors the visual weight
  drawSakuraBlob(c, x + 4, y + 5, 7, P);
  drawSakuraBlob(c, x + 16, y + 3, 5, P);
  drawSakuraBlob(c, x + 28, y + 8, 6, P);

  // Drifting petals across upper sky
  let s = 9311;
  for (let i = 0; i < 14; i++) {
    s = (s * 9301 + 49297) % 233280;
    const px0 = x + Math.floor(((s / 233280)) * (y + 0 + 380));
    s = (s * 9301 + 49297) % 233280;
    const py0 = y + Math.floor((s / 233280) * 80);
    px(c, px0, py0, P.blossomMid);
    if ((s & 3) === 0) px(c, px0 + 1, py0, P.blossomHi);
  }
}

// ─────────────────────────────────────────────────────────────
// NYC — Times Square neon canyon
// Composition (upper-section crop = more building tops, less street):
//   1. Dark night sky strip at top w/ stars
//   2. Tall building silhouettes receding (lit window grids)
//   3. Left wall: PEPSI sign + red O sign + neon shops + "stay indoors" sign
//   4. Right wall: yellow grid billboards + colorful rectangles
//   5. Center far building w/ stacked vertical digital signs
//   6. Sparkly stars over center
//   7. Thin street strip at bottom with dashed lane lines + crosswalk
// ─────────────────────────────────────────────────────────────
interface NYCPalette {
  sky: string; skyDk: string;
  bldgFar: string; bldgFarHl: string; bldgFarDk: string;
  winLit: string; winDim: string; winOff: string;
  street: string; streetHl: string; streetDk: string;
  laneLine: string;
  crosswalk: string;
  rail: string;
  glow: number; // overall neon glow multiplier 0..1
}

const NYC_DARK: NYCPalette = {
  sky: "#0a0a18", skyDk: "#04040a",
  bldgFar: "#1a1a26", bldgFarHl: "#2a2a38", bldgFarDk: "#0a0a14",
  winLit: "#f5c870", winDim: "#a87830", winOff: "#1a1a26",
  street: "#1a1a22", streetHl: "#2a2a32", streetDk: "#0a0a14",
  laneLine: "#d8c068",
  crosswalk: "#d8d8c8",
  rail: "#8a8a90",
  glow: 1.0,
};

const NYC_LIGHT: NYCPalette = {
  sky: "#7a98c0", skyDk: "#5878a8",
  bldgFar: "#4a5468", bldgFarHl: "#6a7488", bldgFarDk: "#2a3448",
  winLit: "#a89860", winDim: "#605040", winOff: "#1a242c",
  street: "#5a5a64", streetHl: "#7a7a84", streetDk: "#3a3a44",
  laneLine: "#f0e088",
  crosswalk: "#f0f0e0",
  rail: "#6a6a72",
  glow: 0.55,
};

export function drawNYCView(c: Ctx, x: number, y: number, w: number, h: number, theme: Theme) {
  const P = theme === "dark" ? NYC_DARK : NYC_LIGHT;
  const dark = theme === "dark";

  // ── SKY (top ~14%) — buildings dominate ──
  const skyH = Math.floor(h * 0.14);
  for (let yy = 0; yy < skyH; yy++) {
    const t = yy / skyH;
    hline(c, x, y + yy, w, blend(P.skyDk, P.sky, t));
  }

  // Stars
  if (dark) {
    let s = 1991;
    for (let i = 0; i < 14; i++) {
      s = (s * 9301 + 49297) % 233280;
      px(c, x + (s % w), y + ((s >> 4) % skyH), "#dcdcdc");
    }
  }

  // ── BACKGROUND TALL BUILDINGS (lit windows receding) ──
  drawNYCBackBuildings(c, x, y + skyH, w, Math.floor(h * 0.40), P, dark);

  // ── CENTER FAR BUILDING with stacked digital signs ──
  drawNYCCenterTower(c, x + Math.floor(w * 0.46), y + skyH, Math.floor(w * 0.10), Math.floor(h * 0.78), P, dark);

  // ── LEFT WALL — perspective canyon wall covered in signs ──
  drawNYCLeftWall(c, x, y + skyH, Math.floor(w * 0.42), Math.floor(h * 0.86) - skyH, P, dark);

  // ── RIGHT WALL — perspective canyon wall covered in signs ──
  drawNYCRightWall(c, x + Math.floor(w * 0.62), y + skyH, Math.floor(w * 0.38), Math.floor(h * 0.86) - skyH, P, dark);

  // ── STREET (bottom ~12%) with lane dashes converging + crosswalk ──
  const streetTop = y + Math.floor(h * 0.86);
  drawNYCStreet(c, x, streetTop, w, y + h - streetTop, P);

  // Sparkle stars over central area (decorative twinkles)
  if (dark) {
    const sparkles: [number, number][] = [
      [0.18, 0.04], [0.22, 0.08], [0.30, 0.05],
      [0.38, 0.10], [0.42, 0.06],
    ];
    for (const [sx, sy] of sparkles) {
      drawSparkle(c, x + Math.floor(w * sx), y + Math.floor(h * sy));
    }
  }
}

function drawNYCBackBuildings(c: Ctx, x: number, y: number, w: number, h: number, P: NYCPalette, dark: boolean) {
  // Far building band — tall vertical strips of lit window grids.
  let s = 5113;
  let i = 0;
  while (i < w) {
    s = (s * 9301 + 49297) % 233280;
    const bw = 14 + Math.floor((s / 233280) * 18);
    s = (s * 9301 + 49297) % 233280;
    const bh = Math.floor(h * 0.5) + Math.floor((s / 233280) * h * 0.5);
    if (i + bw > w) break;
    // Skip the center column — center tower handles that
    if (i + bw / 2 > w * 0.44 && i + bw / 2 < w * 0.58) {
      i += bw; continue;
    }
    rect(c, x + i, y, bw, bh, P.bldgFar);
    vline(c, x + i, y, bh, P.bldgFarHl);
    vline(c, x + i + bw - 1, y, bh, P.bldgFarDk);
    // Window grid — neat rows + columns
    let r = s;
    for (let yy = 2; yy < bh - 2; yy += 2) {
      for (let xx = 2; xx < bw - 2; xx += 2) {
        r = (r * 9301 + 49297) % 233280;
        const p = r / 233280;
        const litChance = dark ? 0.36 : 0.18;
        const dimChance = litChance + 0.18;
        if (p < litChance) px(c, x + i + xx, y + yy, P.winLit);
        else if (p < dimChance) px(c, x + i + xx, y + yy, P.winDim);
        else px(c, x + i + xx, y + yy, P.winOff);
      }
    }
    i += bw;
  }
}

function drawNYCCenterTower(c: Ctx, x: number, y: number, w: number, h: number, P: NYCPalette, dark: boolean) {
  // Tall narrow building in the middle, covered in stacked digital signs.
  rect(c, x, y, w, h, P.bldgFarDk);
  // Top edge
  hline(c, x, y, w, P.bldgFar);

  // Stack of vertical sign panels (mimicking the reference image)
  const signs: Array<{ frac: number; bg: string; label?: string }> = [
    { frac: 0.06, bg: "#c8302a", label: "" },        // red/white striped
    { frac: 0.12, bg: "#e0e0e0", label: "" },
    { frac: 0.18, bg: "#c8302a", label: "" },
    { frac: 0.26, bg: "#1a1a22", label: "" },
    { frac: 0.30, bg: "#3a98d8", label: "" },
    { frac: 0.36, bg: "#d8302a", label: "K" },        // KFC-ish red
    { frac: 0.43, bg: "#f4d020", label: "W" },        // yellow W sign
    { frac: 0.50, bg: "#e8e8e8", label: "" },
    { frac: 0.56, bg: "#1a1a22", label: "C" },        // dark with "Ctrl"
    { frac: 0.64, bg: "#2a48a8", label: "" },         // blue
    { frac: 0.70, bg: "#d8302a", label: "" },
    { frac: 0.78, bg: "#1a1a22", label: "" },
    { frac: 0.86, bg: "#3a98d8", label: "" },
  ];
  for (let k = 0; k < signs.length - 1; k++) {
    const { bg } = signs[k];
    const top = y + Math.floor(h * signs[k].frac);
    const bot = y + Math.floor(h * signs[k + 1].frac);
    const sh = bot - top;
    if (sh < 2) continue;
    const col = dark ? bg : blend(bg, "#888888", 0.45);
    rect(c, x + 1, top, w - 2, sh, col);
    // Top border highlight
    hline(c, x + 1, top, w - 2, blend(col, "#ffffff", 0.4));
    // Bottom shadow
    hline(c, x + 1, bot - 1, w - 2, blend(col, "#000000", 0.5));
    // Glow rim on left/right
    vline(c, x + 1, top, sh, blend(col, "#ffffff", 0.2));
    vline(c, x + w - 2, top, sh, blend(col, "#000000", 0.3));
  }

  // Outline
  vline(c, x, y, h, P.bldgFarHl);
  vline(c, x + w - 1, y, h, P.bldgFarDk);

  // Small antenna/spire at very top
  const spireX = x + (w >> 1);
  vline(c, spireX, y - 6, 6, P.bldgFar);
  px(c, spireX, y - 6, "#d8302a");
}

function drawNYCLeftWall(c: Ctx, x: number, y: number, w: number, h: number, P: NYCPalette, dark: boolean) {
  // Building wall slanting in perspective (top edge slopes down toward
  // vanishing point at right).
  // Behind the signs, draw the dark wall.
  for (let yy = 0; yy < h; yy++) {
    const t = yy / h;
    // Slope: at top yy=0, lean inward (right edge pulled in)
    const rightCut = Math.round((1 - t) * 20);
    hline(c, x, y + yy, w - rightCut, blend(P.bldgFarDk, P.bldgFar, t * 0.3));
  }
  // Vertical lit window strips at the very top of the wall
  for (let xx = 4; xx < w - 30; xx += 6) {
    let r = (xx * 13) % 1000;
    for (let yy = 4; yy < Math.floor(h * 0.18); yy += 3) {
      r = (r * 9301 + 49297) % 233280;
      if ((r / 233280) < (dark ? 0.55 : 0.25)) {
        px(c, x + xx, y + yy, P.winLit);
        px(c, x + xx + 1, y + yy, P.winLit);
      }
    }
  }

  // ── PEPSI sign (huge, top-left dominant) ──
  // Blue rounded-rect with white circle behind "POP" text.
  drawSignFrame(c, x + 2, y + Math.floor(h * 0.10), Math.floor(w * 0.42), Math.floor(h * 0.18), "#3a98d8", dark);
  drawCircleSign(c, x + 2 + Math.floor(w * 0.06), y + Math.floor(h * 0.15), 8, "#ffffff", "#e8e8e8", dark);
  drawPixelTextSmall(c, x + 2 + Math.floor(w * 0.16), y + Math.floor(h * 0.18), "POP", "#ffffff", dark);

  // ── Red curved sign with white "O" (Target-ish) ──
  drawSignFrame(c, x + 4 + Math.floor(w * 0.42), y + Math.floor(h * 0.08), Math.floor(w * 0.36), Math.floor(h * 0.22), "#d8302a", dark);
  drawCircleSign(c, x + 4 + Math.floor(w * 0.55), y + Math.floor(h * 0.18), 10, "#d8302a", "#ffffff", dark);

  // ── "COVID-19 please stay indoors" sign (blue square in mid area) ──
  drawSignFrame(c, x + 6, y + Math.floor(h * 0.45), Math.floor(w * 0.30), Math.floor(h * 0.18), "#2a48a8", dark);
  drawPixelTextSmall(c, x + 12, y + Math.floor(h * 0.50), "STAY", "#ffffff", dark);
  drawPixelTextSmall(c, x + 12, y + Math.floor(h * 0.55), "IN", "#ffffff", dark);

  // ── Theater marquee (red/orange w/ vertical letters) ──
  drawSignFrame(c, x + 4 + Math.floor(w * 0.32), y + Math.floor(h * 0.32), Math.floor(w * 0.18), Math.floor(h * 0.34), "#3a2418", dark);
  for (let k = 0; k < 5; k++) {
    const ly = y + Math.floor(h * 0.35) + k * 4;
    rect(c, x + 6 + Math.floor(w * 0.35), ly, 6, 3, "#f4c020");
  }

  // ── Bottom store fronts (colorful boxes) ──
  drawSignFrame(c, x + 4, y + Math.floor(h * 0.68), Math.floor(w * 0.20), Math.floor(h * 0.15), "#c8a070", dark);
  drawSignFrame(c, x + 6 + Math.floor(w * 0.22), y + Math.floor(h * 0.70), Math.floor(w * 0.18), Math.floor(h * 0.13), "#3a98d8", dark);
  drawSignFrame(c, x + 4 + Math.floor(w * 0.44), y + Math.floor(h * 0.72), Math.floor(w * 0.20), Math.floor(h * 0.13), "#d8d020", dark);

  // ── Marquee bulb strips (string lights) ──
  for (let xx = 6; xx < w - 32; xx += 3) {
    px(c, x + xx, y + Math.floor(h * 0.30), dark ? "#ffe080" : "#a89060");
  }

  // Wall right-edge shadow strip
  vline(c, x + w - 1, y, h, P.bldgFarDk);
}

function drawNYCRightWall(c: Ctx, x: number, y: number, w: number, h: number, P: NYCPalette, dark: boolean) {
  // Right wall — slopes inward to the left at top.
  for (let yy = 0; yy < h; yy++) {
    const t = yy / h;
    const leftCut = Math.round((1 - t) * 20);
    hline(c, x + leftCut, y + yy, w - leftCut, blend(P.bldgFarDk, P.bldgFar, t * 0.3));
  }
  // Top window strips
  for (let xx = 30; xx < w - 4; xx += 6) {
    let r = (xx * 17) % 1000;
    for (let yy = 4; yy < Math.floor(h * 0.16); yy += 3) {
      r = (r * 9301 + 49297) % 233280;
      if ((r / 233280) < (dark ? 0.55 : 0.25)) {
        px(c, x + xx, y + yy, P.winLit);
        px(c, x + xx + 1, y + yy, P.winLit);
      }
    }
  }

  // ── Big yellow grid billboard (right edge) ──
  drawGridBillboard(c, x + Math.floor(w * 0.36), y + Math.floor(h * 0.12), Math.floor(w * 0.60), Math.floor(h * 0.50), dark);

  // ── Red banner top ──
  drawSignFrame(c, x + Math.floor(w * 0.10), y + Math.floor(h * 0.05), Math.floor(w * 0.30), Math.floor(h * 0.08), "#d8302a", dark);

  // ── Orange brick sign ──
  drawSignFrame(c, x + Math.floor(w * 0.08), y + Math.floor(h * 0.14), Math.floor(w * 0.30), Math.floor(h * 0.16), "#e08838", dark);

  // ── Mid-right vertical neon strip (red) ──
  drawSignFrame(c, x + Math.floor(w * 0.06), y + Math.floor(h * 0.34), Math.floor(w * 0.08), Math.floor(h * 0.32), "#d83040", dark);

  // ── Bottom magenta + red signs ──
  drawSignFrame(c, x + Math.floor(w * 0.20), y + Math.floor(h * 0.66), Math.floor(w * 0.28), Math.floor(h * 0.18), "#d83080", dark);
  drawSignFrame(c, x + Math.floor(w * 0.04), y + Math.floor(h * 0.78), Math.floor(w * 0.50), Math.floor(h * 0.08), "#d8302a", dark);

  // Wall left-edge shadow strip
  vline(c, x, y, h, P.bldgFarDk);
}

function drawSignFrame(c: Ctx, x: number, y: number, w: number, h: number, bg: string, dark: boolean) {
  const eff = dark ? bg : blend(bg, "#888888", 0.4);
  // Frame
  rect(c, x - 1, y - 1, w + 2, h + 2, "#0a0a0a");
  rect(c, x, y, w, h, eff);
  // Top highlight glow
  hline(c, x, y, w, blend(eff, "#ffffff", 0.45));
  vline(c, x, y, h, blend(eff, "#ffffff", 0.25));
  hline(c, x, y + h - 1, w, blend(eff, "#000000", 0.4));
  vline(c, x + w - 1, y, h, blend(eff, "#000000", 0.3));
  // Scattered pixel "lights" for life
  if (dark) {
    let s = (x * 13 + y * 7) % 1000;
    for (let k = 0; k < Math.floor(w * h / 60); k++) {
      s = (s * 9301 + 49297) % 233280;
      const px0 = x + 1 + (s % (w - 2));
      const py0 = y + 1 + ((s >> 4) % (h - 2));
      if ((s & 7) === 0) px(c, px0, py0, "#ffffff");
    }
  }
}

function drawCircleSign(c: Ctx, cx: number, cy: number, r: number, ring: string, inner: string, dark: boolean) {
  void dark;
  for (let i = -r; i <= r; i++)
    for (let j = -r; j <= r; j++) {
      const d2 = i * i + j * j;
      if (d2 <= r * r) {
        let col;
        if (d2 < (r - 2) * (r - 2)) col = inner;
        else col = ring;
        px(c, cx + i, cy + j, col);
      }
    }
  // Subtle inner outline
  for (let theta = 0; theta < Math.PI * 2; theta += 0.3) {
    const ix = Math.round(cx + Math.cos(theta) * (r - 2));
    const iy = Math.round(cy + Math.sin(theta) * (r - 2));
    px(c, ix, iy, blend(inner, ring, 0.5));
  }
}

function drawGridBillboard(c: Ctx, x: number, y: number, w: number, h: number, dark: boolean) {
  // Yellow/orange/red/blue checkered billboard like in reference.
  const palette = ["#f4c020", "#d8302a", "#3a98d8", "#f4c020", "#e8e0a0"];
  rect(c, x - 1, y - 1, w + 2, h + 2, "#0a0a0a");
  const rows = 6;
  const cols = 7;
  const cellW = Math.floor(w / cols);
  const cellH = Math.floor(h / rows);
  let s = 9001;
  for (let r = 0; r < rows; r++) {
    for (let cc = 0; cc < cols; cc++) {
      s = (s * 9301 + 49297) % 233280;
      const col = palette[(r + cc + (s & 3)) % palette.length];
      const eff = dark ? col : blend(col, "#888888", 0.45);
      rect(c, x + cc * cellW, y + r * cellH, cellW, cellH, eff);
      hline(c, x + cc * cellW, y + r * cellH, cellW, blend(eff, "#ffffff", 0.3));
      hline(c, x + cc * cellW, y + r * cellH + cellH - 1, cellW, blend(eff, "#000000", 0.3));
    }
  }
}

function drawNYCStreet(c: Ctx, x: number, y: number, w: number, h: number, P: NYCPalette) {
  rect(c, x, y, w, h, P.street);
  hline(c, x, y, w, P.streetHl);
  // Vanishing-point lane dashes
  const vpX = x + (w >> 1);
  for (let k = 0; k < 8; k++) {
    const t = (k + 1) / 8;
    const yy = y + Math.round(t * t * h * 0.9);
    const len = Math.max(1, Math.round(t * 6));
    rect(c, vpX - 1, yy, 2, len, P.laneLine);
  }
  // Crosswalk near bottom
  const cwY = y + h - 5;
  for (let k = 0; k < 8; k++) {
    const xx = x + 24 + k * Math.floor((w - 48) / 8);
    rect(c, xx, cwY, Math.floor((w - 48) / 10), 4, P.crosswalk);
  }
  // Side rails
  for (let xx = x + 8; xx < x + w - 8; xx += 18) {
    if (xx < x + Math.floor(w * 0.18) || xx > x + Math.floor(w * 0.82)) {
      vline(c, xx, y + 2, 4, P.rail);
    }
  }
}

function drawSparkle(c: Ctx, cx: number, cy: number) {
  px(c, cx, cy, "#ffffff");
  px(c, cx - 1, cy, "#dcdcdc");
  px(c, cx + 1, cy, "#dcdcdc");
  px(c, cx, cy - 1, "#dcdcdc");
  px(c, cx, cy + 1, "#dcdcdc");
}

// Tiny 3x5 pixel font for big sign labels.
function drawPixelTextSmall(c: Ctx, x: number, y: number, text: string, col: string, dark: boolean) {
  const F: Record<string, string[]> = {
    A: ["010", "101", "111", "101", "101"],
    C: ["011", "100", "100", "100", "011"],
    I: ["111", "010", "010", "010", "111"],
    N: ["101", "111", "111", "111", "101"],
    O: ["010", "101", "101", "101", "010"],
    P: ["110", "101", "110", "100", "100"],
    S: ["011", "100", "010", "001", "110"],
    T: ["111", "010", "010", "010", "010"],
    Y: ["101", "101", "010", "010", "010"],
  };
  const effCol = dark ? col : blend(col, "#888888", 0.4);
  let cx = x;
  for (const ch of text) {
    const def = F[ch];
    if (def) {
      for (let r = 0; r < 5; r++)
        for (let cc = 0; cc < 3; cc++)
          if (def[r][cc] === "1") px(c, cx + cc, y + r, effCol);
    }
    cx += 4;
  }
}

// ─────────────────────────────────────────────────────────────
// Photo-based drawer retained as a no-op stub for backward import compat.
// ─────────────────────────────────────────────────────────────
export function drawScenePhoto(
  c: Ctx, x: number, y: number, w: number, h: number,
  scene: "tokyo" | "nyc", theme: Theme,
) {
  // Now routes to the procedural drawers.
  if (scene === "tokyo") drawTokyoView(c, x, y, w, h, theme);
  else drawNYCView(c, x, y, w, h, theme);
  void stipple;
}
