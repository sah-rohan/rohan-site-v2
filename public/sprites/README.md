# Sprite Assets

Drop a PNG named `<id>.png` here to replace the procedural drawing of any object.

| Sprite ID       | Size (logical px) | What it is                       |
|-----------------|-------------------|----------------------------------|
| monitor.png     | 350 × 240         | Display, bezel, stand, V-foot    |
| guitar-music.png| 56 × 200          | Acoustic with red strap          |
| guitar-dread.png| 60 × 200          | Dreadnought, no strap            |
| macbook.png     | 92 × 62           | Open MacBook with screen content |
| keyboard.png    | 168 × 14          | Slim Apple-style keyboard        |
| mouse.png       | 60 × 24           | Mouse on mousepad                |
| bookshelf.png   | 80 × 230          | Tall shelf with books            |
| phone.png       | 18 × 44           | iPhone laid face up              |
| shoes.png       | 58 × 18           | Pair of running shoes, side-on   |
| fan.png         | 36 × 60           | Vornado-style desk fan           |
| rubiks.png      | 16 × 16           | Rubik's cube                     |

## How to make these

**Best path**: open Aseprite at the listed pixel size and hand-paint. Keep to the
grayscale palette from `src/components/pixel/palette.ts` with sparing accents.

**Fast path**: prompt an image model with something like
"Black-and-white pixel art of [thing], 4-color grayscale plus one warm accent,
clean rim lighting, top-left light source, transparent background, [W]×[H] pixels."
Then run the output through Aseprite or Pixilart to clean up dithering and
nearest-neighbor-resize to the exact target size.

## Hot-swap

Sprites are loaded once on page mount. After dropping a new PNG, refresh the page.
A missing or broken PNG silently falls back to the procedural drawer.
