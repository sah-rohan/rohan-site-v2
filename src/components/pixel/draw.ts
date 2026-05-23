// Tiny pixel drawing helpers. Every operation is integer-aligned.
export type Ctx = CanvasRenderingContext2D;

export const px = (c: Ctx, x: number, y: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(x | 0, y | 0, 1, 1);
};

export const rect = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(x | 0, y | 0, w | 0, h | 0);
};

export const hline = (c: Ctx, x: number, y: number, w: number, col: string) =>
  rect(c, x, y, w, 1, col);

export const vline = (c: Ctx, x: number, y: number, h: number, col: string) =>
  rect(c, x, y, 1, h, col);

// Bordered rect with distinct top/left highlight and bottom/right shadow.
// Used everywhere — gives every object a consistent light source (top-left).
export const beveled = (
  c: Ctx,
  x: number, y: number, w: number, h: number,
  body: string, hl: string, sh: string,
) => {
  rect(c, x, y, w, h, body);
  hline(c, x, y, w, hl);
  vline(c, x, y, h, hl);
  hline(c, x, y + h - 1, w, sh);
  vline(c, x + w - 1, y, h, sh);
};

// Filled ellipse (kept small — for sound holes, mouse, etc.)
export const ellipse = (
  c: Ctx, cx: number, cy: number, rx: number, ry: number, col: string,
) => {
  c.fillStyle = col;
  for (let yy = -ry; yy <= ry; yy++) {
    const w = Math.round(rx * Math.sqrt(1 - (yy * yy) / (ry * ry)));
    c.fillRect((cx - w) | 0, (cy + yy) | 0, w * 2, 1);
  }
};

// Stipple noise inside a rect — deterministic by seed.
export const stipple = (
  c: Ctx, x: number, y: number, w: number, h: number,
  col: string, density: number, seed = 1,
) => {
  let s = seed * 9301 + 49297;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      s = (s * 9301 + 49297) % 233280;
      if (s / 233280 < density) px(c, x + i, y + j, col);
    }
  }
};
