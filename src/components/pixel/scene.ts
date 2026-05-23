import { Ctx, rect, hline, vline, px, stipple, beveled } from "./draw";
import { G, W } from "./palette";

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
  // Right side window with blinds — based on reference photo.
  const x = 470, y = 18, w = 158, h = 220;
  // Frame outer
  beveled(c, x - 4, y - 4, w + 8, h + 8, G.g35, G.g50, G.g15);
  beveled(c, x - 2, y - 2, w + 4, h + 4, G.g25, G.g40, G.g10);
  // Window pane — cool gray daylight
  rect(c, x, y, w, h, G.g75);
  // Soft sky gradient
  for (let yy = 0; yy < h; yy++) {
    const t = yy / h;
    const shade = t < 0.4 ? G.g80 : t < 0.7 ? G.g75 : G.g65;
    if (yy % 2 === 0) hline(c, x, y + yy, w, shade);
  }
  // Blinds — horizontal slats
  for (let yy = 4; yy < h - 4; yy += 6) {
    rect(c, x + 2, y + yy, w - 4, 4, G.g85);
    hline(c, x + 2, y + yy, w - 4, G.paper);
    hline(c, x + 2, y + yy + 3, w - 4, G.g65);
    // slat seam
    hline(c, x + 2, y + yy + 4, w - 4, G.g30);
  }
  // Blind pull cord on right edge
  vline(c, x + w - 6, y + 4, h - 8, G.g50);
  px(c, x + w - 6, y + h - 6, G.g30);
  // Mullion (vertical divider through middle)
  vline(c, x + (w >> 1), y, h, G.g40);
  vline(c, x + (w >> 1) + 1, y, h, G.g50);
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
