// Grayscale ramp — light source: top-left.
// Use these names everywhere; no ad-hoc hex in object drawers.
export const G = {
  ink:  "#050505",
  g05:  "#0d0d0d",
  g10:  "#141414",
  g15:  "#1c1c1c",
  g20:  "#242424",
  g25:  "#2c2c2c",
  g30:  "#353535",
  g35:  "#3e3e3e",
  g40:  "#484848",
  g45:  "#525252",
  g50:  "#5d5d5d",
  g55:  "#686868",
  g60:  "#747474",
  g65:  "#7f7f7f",
  g70:  "#8a8a8a",
  g75:  "#969696",
  g80:  "#a3a3a3",
  g85:  "#b0b0b0",
  g90:  "#c0c0c0",
  g95:  "#d2d2d2",
  paper:"#e6e6e6",
  white:"#f4f4f4",
} as const;

// Warm wood ramp — desk only. Desaturated, almost grayscale.
export const W = {
  dk:  "#1c1611",
  d1:  "#2a2218",
  d2:  "#382e22",
  d3:  "#473a2c",
  d4:  "#564737",
  d5:  "#665445",
  d6:  "#776452",
  hl:  "#8a7868",
} as const;

// Accents — used SPARINGLY. Total accent pixels should feel rare.
export const A = {
  red:     "#b8302a", // left guitar strap
  redDk:   "#7a1d18",
  amber:   "#c8a85a", // bookshelf book spine + phone screen glow
  amberDk: "#8a6f2a",
  greenDk: "#1a3a22", // terminal phosphor base
  greenLt: "#4ade80", // terminal cursor + active glyphs
  blueDk:  "#0a1830", // macbook screen base
  blueMid: "#1a3a6a",
  blueLt:  "#7aa8d8", // macbook screen city lights
} as const;
