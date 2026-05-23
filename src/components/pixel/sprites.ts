// ─────────────────────────────────────────────────────────────
// Sprite system — drop a PNG into /public/sprites/<id>.png and the
// scene will blit it in place of the algorithmic drawer.
//
// Each sprite has an anchor point (where on the sprite the (x,y) you
// pass refers to) so you can swap art without retuning placement code.
//
// To replace an object with real pixel art:
//   1. Put your sprite at /public/sprites/<id>.png (any size — will be
//      drawn nearest-neighbor; logical canvas pixels recommended).
//   2. Set anchor = how the sprite should align relative to its draw point.
//   3. The drawer in objects.ts checks for a loaded sprite and uses it
//      instead of the procedural drawing.
// ─────────────────────────────────────────────────────────────

export type SpriteId =
  | "monitor"
  | "guitar-music"
  | "guitar-dread"
  | "macbook"
  | "keyboard"
  | "mouse"
  | "bookshelf"
  | "phone"
  | "shoes"
  | "fan"
  | "rubiks";

export type Anchor =
  | "top-left"
  | "top-center"
  | "bottom-center"  // most desk items — point passed is where the bottom touches the desk
  | "bottom-left"
  | "bottom-right";

interface SpriteDef {
  anchor: Anchor;
  // Logical pixel size — used for hit zones and placement math.
  // The PNG can be any resolution; it will be drawn at this logical size.
  w: number;
  h: number;
}

export const SPRITE_DEFS: Record<SpriteId, SpriteDef> = {
  monitor:      { anchor: "bottom-center", w: 350, h: 240 },
  "guitar-music": { anchor: "top-center", w: 56,  h: 200 },
  "guitar-dread": { anchor: "top-center", w: 60,  h: 200 },
  macbook:      { anchor: "bottom-center", w: 92,  h: 62  },
  keyboard:     { anchor: "bottom-center", w: 168, h: 14  },
  mouse:        { anchor: "bottom-center", w: 60,  h: 24  },
  bookshelf:    { anchor: "bottom-left",   w: 80,  h: 230 },
  phone:        { anchor: "bottom-center", w: 18,  h: 44  },
  shoes:        { anchor: "bottom-center", w: 58,  h: 18  },
  fan:          { anchor: "bottom-center", w: 36,  h: 60  },
  rubiks:       { anchor: "bottom-center", w: 16,  h: 16  },
};

// In-memory cache. populated by preloadSprites().
const cache: Partial<Record<SpriteId, HTMLImageElement>> = {};

export async function preloadSprites(ids: SpriteId[]): Promise<void> {
  await Promise.all(
    ids.map(id => {
      return new Promise<void>(resolve => {
        const img = new Image();
        img.onload = () => { cache[id] = img; resolve(); };
        img.onerror = () => resolve(); // missing PNG is fine — fall back to procedural
        img.src = `/sprites/${id}.png`;
      });
    }),
  );
}

export function getSprite(id: SpriteId): HTMLImageElement | undefined {
  return cache[id];
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  id: SpriteId,
  x: number,
  y: number,
): boolean {
  const img = cache[id];
  if (!img) return false;
  const def = SPRITE_DEFS[id];
  let drawX = x, drawY = y;
  switch (def.anchor) {
    case "top-left":      break;
    case "top-center":    drawX -= def.w / 2; break;
    case "bottom-center": drawX -= def.w / 2; drawY -= def.h; break;
    case "bottom-left":   drawY -= def.h; break;
    case "bottom-right":  drawX -= def.w;     drawY -= def.h; break;
  }
  ctx.drawImage(img, drawX | 0, drawY | 0, def.w, def.h);
  return true;
}
