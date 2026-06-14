"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { CW, CH, DESK_TOP_Y, drawWall, drawFloor, drawDesk, drawPhoneDesk, drawPhoneStand, SceneId } from "./pixel/scene";
import {
  drawMonitor, drawTerminalBackground, drawMacBook, drawKeyboard, drawMouse,
  drawBookshelf, drawPhone, drawNotebook,
  drawHangingHeadphones, drawHangingShoes, drawTinyGuitar,
  drawChargerBrick, drawChargerCable,
  drawTennisRacket, drawTennisBall, drawSoccerBall, drawBasketball,
  ScreenRect,
} from "./pixel/objects";
import { drawSprite, SPRITE_DEFS } from "./pixel/sprites";
import { SECTIONS, SectionId } from "@/data/sections";

// Reserved for future PNG sprites; currently empty so no 404 requests fire.
// If you ever drop PNGs into /public/sprites/, list their IDs here and the
// preload effect below will load them.
const SPRITE_IDS: (keyof typeof SPRITE_DEFS)[] = [];

interface Zone {
  id: SectionId;
  x: number; y: number; w: number; h: number;
  label: string;
}

// Hit zones — tuned to where each object lands in the 640×400 canvas.
const ZONES: Zone[] = [
  // Tiny guitar under desk (music)
  { id: "music",      x: 166, y: 326, w: 30,  h: 70,  label: "MUSIC" },
  // MacBook flat on desk (projects) — covers full laptop footprint cx=450±50, y=254-282
  { id: "projects",   x: 396, y: 252, w: 108, h: 32,  label: "PROJECTS" },
  // Small bookshelf under desk (education)
  { id: "education",  x: 90,  y: 300, w: 56,  h: 96,  label: "EDUCATION" },
  // Phone laying flat on desk (contact)
  { id: "contact",    x: 112, y: 250, w: 18,  h: 30,  label: "CONTACT" },
  // Tiny notebook on desk (journal — manifestation goals)
  { id: "journal",    x: 136, y: 250, w: 24,  h: 32,  label: "JOURNAL" },
  // Keyboard on desk (experience)
  { id: "experience", x: 178, y: 258, w: 124, h: 18,  label: "EXPERIENCE" },
  // Mouse on pad (skills) — Rohan.json
  { id: "skills",     x: 326, y: 258, w: 50,  h: 22,  label: "SKILLS" },
  // Hanging shoes under desk (interests)
  { id: "interests",  x: 408, y: 286, w: 88,  h: 60,  label: "INTERESTS" },
  // Hanging headphones under desk (now-playing / Apple Music placeholder)
  { id: "nowplaying", x: 318, y: 286, w: 56,  h: 56,  label: "♫ NOW PLAYING" },
  // Tennis racket on floor — sports takes / GOATs (desktop only)
  { id: "sports",     x: 210, y: 340, w: 30,  h: 60,  label: "SPORTS" },
];

// Monitor center — true horizontal center of the canvas.
const MONITOR_CX = 320;

type Theme = "dark" | "light";

export default function PixelDesk() {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("theme");
    if (param === "dark") {
      queueMicrotask(() => setTheme("dark"));
    }
  }, []);

  // Two breakpoints: isPhone triggers the dedicated phone-with-apps layout,
  // isTabletDown just resizes the monitor (so iPads still see the desk scene
  // but with a bigger monitor so the terminal stays readable).
  // Start both flags at `false` (SSR-safe) so the server-rendered HTML matches
  // the client's first paint — no hydration mismatch. The post-mount effect
  // measures the viewport and flips them. `mounted` gates the canvas so the
  // desktop scene doesn't briefly flash on phone-sized viewports.
  const [isCompact, setIsCompact] = useState(false);
  const [isPhone, setIsPhone]     = useState(false);
  const [mounted, setMounted]     = useState(false);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setIsCompact(w < 820);
      setIsPhone(w < 600);
    };
    update();
    // Defer the mounted flip to a microtask so React doesn't flag cascading
    // renders inside the effect body itself (lint rule).
    queueMicrotask(() => setMounted(true));
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const monitorSize = useMemo(() => (
    isCompact
      ? { screenW: 340, screenH: 210 }   // tablet
      : { screenW: 220, screenH: 140 }   // full desktop — kept small on purpose
  ), [isCompact]);

  // Weather — toggleable live rain in the window background.
  const [raining, setRaining] = useState(false);
  const [scene, setScene] = useState<SceneId>("sf");

  const [soccerX, setSoccerX] = useState(395);
  const [soccerAngle, setSoccerAngle] = useState(0);
  const soccerTargetRef = useRef(395);
  const soccerRafRef = useRef<number | null>(null);
  const SOCCER_MIN = 280;
  const SOCCER_MAX = 460;
  const SOCCER_R = 10;
  const SOCCER_ROLL_STEP = 30;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screenRectRef = useRef<ScreenRect | null>(null);
  const [screenRect, setScreenRect] = useState<ScreenRect | null>(null);
  const [hover, setHover] = useState<SectionId | null>(null);
  const [active, setActive] = useState<SectionId | null>(null);
  const [typing, setTyping] = useState(false);

  const [terminal, setTerminal] = useState({
    history: [
      "welcome to rohan@portfolio.sh — type a command or click anything",
      "try: skills · projects · education · experience · music · contact · journal · interests · nowplaying · help",
    ],
    currentCmd: "",
    cursorOn: true,
  });
  const [spritesReady, setSpritesReady] = useState(true);

  // Preload PNG sprites if any are listed. With SPRITE_IDS empty (default)
  // this effect is a no-op and no /sprites/*.png requests are made.
  useEffect(() => {
    if (SPRITE_IDS.length === 0) return;
    // Dynamic import so the bundler still tree-shakes when unused.
    import("./pixel/sprites").then(({ preloadSprites }) => {
      preloadSprites(SPRITE_IDS).then(() => setSpritesReady(true));
    });
  }, []);

  // Preload the SF skyline image used as the light-mode wall background.
  // Stashed on window so the scene drawer can reach it.
  const [wallImageReady, setWallImageReady] = useState(false);
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      (window as Window & { __sfSkyline?: HTMLImageElement }).__sfSkyline = img;
      setWallImageReady(true);
    };
    img.src = "/sf-skyline.webp";
  }, []);

  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Skip painting until we've measured the viewport, so we don't flash
    // the desktop scene on phone-sized devices before the responsive flags
    // are correctly set.
    if (!mounted) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    drawWall(ctx, theme, scene);

    // Phone viewport = close-up: bay bridge above + ONE continuous pixel-art
    // wood slab below, plus a pixel-art stand the phone rests on.
    if (isPhone) {
      drawPhoneDesk(ctx);
      drawPhoneStand(ctx, theme);
      return;
    }

    drawFloor(ctx);
    drawDesk(ctx);

    // Helper: try sprite first, fall back to procedural drawer.
    const orProc = (
      id: Parameters<typeof drawSprite>[1],
      x: number, y: number,
      proc: () => void,
    ) => {
      if (!drawSprite(ctx, id, x, y)) proc();
    };

    // Desk-top items, left → right.
    orProc("phone", 122, DESK_TOP_Y, () => drawPhone(ctx, 122, DESK_TOP_Y));
    drawNotebook(ctx, 148, DESK_TOP_Y);

    // Monitor — sprite version still needs to expose a screen rect for the
    // terminal overlay. If a sprite exists, the screen rect is derived from
    // SPRITE_DEFS bounds (tuned by user); otherwise the procedural drawer
    // returns the inner screen rect directly.
    let sr: ScreenRect;
    if (drawSprite(ctx, "monitor", MONITOR_CX, DESK_TOP_Y)) {
      const def = SPRITE_DEFS.monitor;
      sr = {
        x: MONITOR_CX - def.w / 2 + 16,
        y: DESK_TOP_Y - def.h + 14,
        w: def.w - 32,
        h: def.h - 60,
      };
    } else {
      sr = drawMonitor(ctx, MONITOR_CX, DESK_TOP_Y, monitorSize, theme);
    }
    screenRectRef.current = sr;
    if (!screenRect || sr.x !== screenRect.x || sr.y !== screenRect.y) {
      setScreenRect(sr);
    }
    drawTerminalBackground(ctx, sr, theme);

    // Layout on desk surface (x band 60-590), L→R:
    orProc("keyboard", 240, DESK_TOP_Y, () => drawKeyboard(ctx, 240, DESK_TOP_Y));
    orProc("mouse",    350, DESK_TOP_Y, () => drawMouse(ctx, 350, DESK_TOP_Y));
    orProc("macbook",  450, DESK_TOP_Y, () => drawMacBook(ctx, 450, DESK_TOP_Y));
    // Charger brick on the floor + cable routed around the desk's right edge
    // up onto the desk and into the laptop's right-side port.
    drawChargerBrick(ctx, 530, DESK_TOP_Y);
    const laptopRightPortX = 500;       // x just past the laptop's right edge
    const laptopRightPortY = DESK_TOP_Y + 12;
    drawChargerCable(ctx, 530, DESK_TOP_Y + 60,
                     laptopRightPortX, laptopRightPortY,
                     DESK_TOP_Y, 590);

    drawBookshelf(ctx, 90, CH - 6);
    drawTinyGuitar(ctx, 180, CH - 8);
    const underY = 290;
    drawHangingHeadphones(ctx, 340, underY);
    drawHangingShoes(ctx, 450, underY);

    drawTennisRacket(ctx, 225, CH - 4);
    drawTennisBall(ctx, 250, CH - 4);
    drawSoccerBall(ctx, soccerX, CH - 4, soccerAngle);
    drawBasketball(ctx, 490, CH - 4);

    // Hover outline only — the label is rendered as an HTML overlay for readability.
    if (hover) {
      const z = ZONES.find(zz => zz.id === hover)!;
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 1;
      ctx.strokeRect(z.x + 0.5, z.y + 0.5, z.w - 1, z.h - 1);
    }
    // wallImageReady is intentionally a dep so the canvas redraws when the
    // SF skyline image finishes loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hover, screenRect, theme, wallImageReady, monitorSize, isCompact, isPhone, mounted, soccerX, soccerAngle, scene]);

  // Repaint when hover changes OR sprites finish loading.
  useEffect(() => { repaint(); }, [repaint, spritesReady]);

  // Cursor blink — state only, no canvas repaint needed (text is HTML overlay).
  useEffect(() => {
    const id = window.setInterval(() => {
      setTerminal(t => ({ ...t, cursorOn: !t.cursorOn }));
    }, 520);
    return () => window.clearInterval(id);
  }, []);

  // Parse a typed command — match section name or alias, otherwise echo error.
  const runCommand = useCallback((rawCmd: string) => {
    const cmd = rawCmd.trim().toLowerCase();
    if (!cmd) return;
    // Section aliases
    const ALIASES: Record<string, SectionId> = {
      music: "music", guitar: "music", piano: "music", sing: "music",
      projects: "projects", proj: "projects", ls: "projects",
      education: "education", edu: "education", school: "education", books: "education",
      contact: "contact", email: "contact", phone: "contact",
      experience: "experience", exp: "experience", work: "experience", resume: "experience",
      interests: "interests", hobbies: "interests", run: "interests", running: "interests",
      skills: "skills", tech: "skills", stack: "skills",
      nowplaying: "nowplaying", playing: "nowplaying", "now-playing": "nowplaying", track: "nowplaying",
      journal: "journal", goals: "journal", manifest: "journal", manifestation: "journal", dreams: "journal",
      sports: "sports", tennis: "sports", soccer: "sports", football: "sports", basketball: "sports", goat: "sports", picks: "sports",
    };
    if (ALIASES[cmd]) {
      const id = ALIASES[cmd];
      setTerminal(t => ({
        history: [...t.history, `$ ${rawCmd}`, `> opening ${id}…`].slice(-4),
        currentCmd: "",
        cursorOn: t.cursorOn,
      }));
      setActive(id);
      return;
    }
    if (cmd === "help" || cmd === "?" ) {
      // Reset history to just the help output so it always fits the screen.
      setTerminal(t => ({
        history: [
          `$ ${rawCmd}`,
          "skills · projects · education · experience",
          "music · contact · journal · interests · nowplaying",
          "(or click anything in the room)",
        ],
        currentCmd: "",
        cursorOn: t.cursorOn,
      }));
      return;
    }
    if (cmd === "clear" || cmd === "cls") {
      setTerminal(t => ({ history: [], currentCmd: "", cursorOn: t.cursorOn }));
      return;
    }
    if (cmd === "whoami") {
      setTerminal(t => ({
        history: [...t.history, `$ ${rawCmd}`, "rohan sah — student, builder, runner."].slice(-4),
        currentCmd: "",
        cursorOn: t.cursorOn,
      }));
      return;
    }
    // Unknown
    setTerminal(t => ({
      history: [...t.history, `$ ${rawCmd}`, `zsh: command not found: ${cmd} — try 'help'`].slice(-4),
      currentCmd: "",
      cursorOn: t.cursorOn,
    }));
  }, []);

  // Global keyboard listener — type into the terminal at all times unless a modal is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (active) return;        // modal handles its own keys
      if (typing) return;        // ignore while click-animation is playing
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Enter") {
        e.preventDefault();
        setTerminal(t => {
          runCommand(t.currentCmd);
          return t; // runCommand updates state itself
        });
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        setTerminal(t => ({ ...t, currentCmd: t.currentCmd.slice(0, -1) }));
        return;
      }
      if (e.key.length === 1) {
        e.preventDefault();
        setTerminal(t => ({ ...t, currentCmd: t.currentCmd + e.key }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, typing, runCommand]);

  // Animate typing a command, then open modal.
  const playType = useCallback(async (id: SectionId) => {
    setTyping(true);
    const s = SECTIONS[id];
    setTerminal(t => ({
      ...t,
      history: [...t.history.slice(-3), `> opening ${s.title.toLowerCase()}…`],
      currentCmd: "",
    }));
    for (let i = 1; i <= s.cmd.length; i++) {
      const slice = s.cmd.slice(0, i);
      setTerminal(t => ({ ...t, currentCmd: slice }));
      await new Promise(r => setTimeout(r, 45 + Math.random() * 55));
    }
    await new Promise(r => setTimeout(r, 300));
    setTerminal(t => ({
      history: [...t.history, `$ ${s.cmd}`].slice(-4),
      currentCmd: "",
      cursorOn: t.cursorOn,
    }));
    setActive(id);
    setTyping(false);
  }, []);

  const eventToZone = (clientX: number, clientY: number): Zone | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const r = canvas.getBoundingClientRect();
    const sx = CW / r.width;
    const sy = CH / r.height;
    const cx = (clientX - r.left) * sx;
    const cy = (clientY - r.top) * sy;
    return ZONES.find(z => cx >= z.x && cx <= z.x + z.w && cy >= z.y && cy <= z.y + z.h) || null;
  };

  const SOCCER_CY = CH - 4 - SOCCER_R;
  const hitSoccer = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const r = canvas.getBoundingClientRect();
    const x = (clientX - r.left) * (CW / r.width);
    const y = (clientY - r.top) * (CH / r.height);
    const dx = x - soccerX;
    const dy = y - SOCCER_CY;
    return dx * dx + dy * dy <= (SOCCER_R + 3) * (SOCCER_R + 3);
  };

  const rollSoccer = (clickClientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const cx = (clickClientX - r.left) * (CW / r.width);
    // Push physics: clicking the LEFT side of the ball pushes it RIGHT.
    const dir = cx < soccerX ? 1 : -1;
    const next = Math.max(SOCCER_MIN, Math.min(SOCCER_MAX, soccerX + dir * SOCCER_ROLL_STEP));
    soccerTargetRef.current = next;
    if (soccerRafRef.current !== null) return;
    const tick = () => {
      const target = soccerTargetRef.current;
      let done = false;
      setSoccerX(curr => {
        const delta = target - curr;
        if (Math.abs(delta) < 0.4) {
          done = true;
          return target;
        }
        const step = Math.sign(delta) * Math.max(1, Math.abs(delta) * 0.25);
        // Rolling: angle = arc / radius. Rolling right = positive angle.
        setSoccerAngle(a => a + step / SOCCER_R);
        return curr + step;
      });
      if (done) {
        soccerRafRef.current = null;
      } else {
        soccerRafRef.current = requestAnimationFrame(tick);
      }
    };
    soccerRafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    return () => {
      if (soccerRafRef.current !== null) cancelAnimationFrame(soccerRafRef.current);
    };
  }, []);

  return (
    <div className="absolute inset-0 bg-[#0a0a0a]">
      {/* Fill the full viewport — canvas stretches edge-to-edge on every device. */}
      <div className="absolute inset-0">
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          className="block w-full h-full"
          onMouseMove={e => {
            if (typing) return;
            const z = eventToZone(e.clientX, e.clientY);
            setHover(z ? z.id : null);
          }}
          onMouseLeave={() => setHover(null)}
          onClick={e => {
            if (typing || active) return;
            if (hitSoccer(e.clientX, e.clientY)) {
              rollSoccer(e.clientX);
              return;
            }
            const z = eventToZone(e.clientX, e.clientY);
            if (z) playType(z.id);
          }}
          style={{
            imageRendering: "pixelated",
            cursor: hover ? "pointer" : "crosshair",
            opacity: mounted ? 1 : 0,
            transition: "opacity 0.12s ease-out",
            touchAction: "none",
          }}
        />
        {raining && <RainOverlay enableThunder={theme === "dark"} />}
        {isPhone && <PhoneScreen theme={theme} onOpen={id => setActive(id)} />}
        {screenRect && !isPhone && (
          <TerminalOverlay rect={screenRect} state={terminal} theme={theme} />
        )}
      {/* Hover label — readable HTML overlay positioned above the hovered zone */}
      {hover && (() => {
        const z = ZONES.find(zz => zz.id === hover)!;
        const left = (z.x / CW) * 100;
        const top = (z.y / CH) * 100;
        return (
          <div
            className="absolute pointer-events-none z-20"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              transform: "translate(-2px, calc(-100% - 6px))",
            }}
          >
            <div
              className="px-2 py-1 rounded-md bg-black/85 text-white font-mono whitespace-nowrap shadow-lg border border-white/10"
              style={{ fontSize: "11px", letterSpacing: "0.18em" }}
            >
              {z.label}
            </div>
          </div>
        );
        })()}
      </div>
      {active && (
        <SectionModal id={active} theme={theme} onClose={() => setActive(null)} />
      )}
      {/* Bottom-right control cluster: rain + theme toggles */}
      <div
        className="absolute right-4 z-30 flex items-center gap-1.5"
        style={{
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
          paddingRight: "env(safe-area-inset-right, 0px)",
        }}
      >
        <SceneToggle scene={scene} onCycle={() => setScene(s => {
          const order: SceneId[] = ["sf", "nyc", "tokyo"];
          return order[(order.indexOf(s) + 1) % order.length];
        })} />
        <RainToggle raining={raining} onToggle={() => setRaining(r => !r)} />
        <ThemeToggle theme={theme} onToggle={() => setTheme(t => t === "dark" ? "light" : "dark")} />
      </div>
      {!isPhone && <ScenePill scene={scene} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RainOverlay — pure CSS animated raindrops falling over the upper
// portion of the viewport (the "outside the window" area, above the desk).
// Each drop is a thin slanted line with random column, delay, and speed.
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// App icons — each rendered as a pixel-art SVG with shape-rendering:
// crispEdges so the rectangles stay sharp. 16×16 logical grid scaled up.
// ─────────────────────────────────────────────────────────────
const ICON_BOX: React.CSSProperties = {
  width: "70%",
  height: "70%",
  shapeRendering: "crispEdges",
  imageRendering: "pixelated" as React.CSSProperties["imageRendering"],
};

// GarageBand — white tile with a small electric-guitar silhouette.
function GarageBandIcon() {
  return (
    <svg viewBox="0 0 16 16" style={ICON_BOX}>
      {/* Guitar body (hourglass / strat-style) */}
      <rect x="3"  y="9"  width="6" height="4" fill="#d44a30" />
      <rect x="4"  y="13" width="4" height="1" fill="#d44a30" />
      <rect x="4"  y="8"  width="4" height="1" fill="#d44a30" />
      {/* Pickguard / lighter body face */}
      <rect x="4"  y="10" width="4" height="2" fill="#f08060" />
      {/* Neck */}
      <rect x="8"  y="6"  width="2" height="4" fill="#3a2010" />
      <rect x="9"  y="3"  width="2" height="4" fill="#3a2010" />
      <rect x="10" y="1"  width="2" height="3" fill="#3a2010" />
      {/* Fret markers */}
      <rect x="8"  y="7"  width="2" height="1" fill="#fff" />
      <rect x="9"  y="4"  width="2" height="1" fill="#fff" />
      {/* Headstock */}
      <rect x="9"  y="0"  width="4" height="2" fill="#1a1a1a" />
      <rect x="13" y="1"  width="1" height="1" fill="#1a1a1a" />
      {/* Bridge dots */}
      <rect x="4"  y="12" width="1" height="1" fill="#1a1a1a" />
      <rect x="7"  y="12" width="1" height="1" fill="#1a1a1a" />
    </svg>
  );
}

// Phone — proper iOS handset silhouette (rotated 45°, curled J-shape).
function PhoneAppIcon() {
  return (
    <svg viewBox="0 0 16 16" style={ICON_BOX}>
      {/* Earpiece (top-left ear cup) */}
      <rect x="2" y="3" width="4" height="2" fill="#fff" />
      <rect x="3" y="2" width="3" height="1" fill="#fff" />
      <rect x="2" y="5" width="2" height="1" fill="#fff" />
      {/* Curving body — diagonal handset */}
      <rect x="4" y="5" width="2" height="2" fill="#fff" />
      <rect x="5" y="6" width="2" height="2" fill="#fff" />
      <rect x="6" y="7" width="2" height="2" fill="#fff" />
      <rect x="7" y="8" width="2" height="2" fill="#fff" />
      <rect x="8" y="9" width="2" height="2" fill="#fff" />
      <rect x="9" y="10" width="2" height="2" fill="#fff" />
      {/* Mouthpiece (bottom-right ear cup) */}
      <rect x="10" y="11" width="4" height="2" fill="#fff" />
      <rect x="10" y="10" width="2" height="1" fill="#fff" />
      <rect x="12" y="13" width="2" height="1" fill="#fff" />
    </svg>
  );
}

// Notes — yellow with red top stripe + lined writing.
function NotesIcon() {
  return (
    <svg viewBox="0 0 16 16" style={ICON_BOX}>
      <rect x="2" y="2" width="12" height="2" fill="#e8a430" />
      <rect x="2" y="4" width="12" height="10" fill="#fff8d0" />
      {/* Spiral bind dots along top */}
      <rect x="3" y="3" width="1" height="1" fill="#000" />
      <rect x="6" y="3" width="1" height="1" fill="#000" />
      <rect x="9" y="3" width="1" height="1" fill="#000" />
      <rect x="12" y="3" width="1" height="1" fill="#000" />
      {/* Lines */}
      <rect x="3" y="6" width="9" height="1" fill="#d0bc7a" />
      <rect x="3" y="8" width="9" height="1" fill="#d0bc7a" />
      <rect x="3" y="10" width="7" height="1" fill="#d0bc7a" />
      <rect x="3" y="12" width="9" height="1" fill="#d0bc7a" />
    </svg>
  );
}

// Apple Books — open book with two pages over orange tile.
function BooksIcon() {
  return (
    <svg viewBox="0 0 16 16" style={ICON_BOX}>
      {/* spine */}
      <rect x="7" y="3" width="2" height="11" fill="#5a2c10" />
      {/* left page */}
      <rect x="2" y="4" width="5" height="9" fill="#fff" />
      <rect x="3" y="6" width="3" height="1" fill="#c08a40" />
      <rect x="3" y="8" width="3" height="1" fill="#c08a40" />
      <rect x="3" y="10" width="3" height="1" fill="#c08a40" />
      {/* right page */}
      <rect x="9" y="4" width="5" height="9" fill="#fff" />
      <rect x="10" y="6" width="3" height="1" fill="#c08a40" />
      <rect x="10" y="8" width="3" height="1" fill="#c08a40" />
      <rect x="10" y="10" width="3" height="1" fill="#c08a40" />
    </svg>
  );
}

// Calendar — white tile, red "JAN" top bar, big day number.
function CalendarIcon() {
  return (
    <svg viewBox="0 0 16 16" style={ICON_BOX}>
      <rect x="1" y="1" width="14" height="14" fill="#fff" stroke="#000" strokeWidth="0" />
      {/* Red header bar */}
      <rect x="1" y="1" width="14" height="4" fill="#e34335" />
      {/* "MON" letters as bars */}
      <rect x="3" y="2" width="2" height="2" fill="#fff" />
      <rect x="6" y="2" width="2" height="2" fill="#fff" />
      <rect x="9" y="2" width="2" height="2" fill="#fff" />
      <rect x="12" y="2" width="2" height="2" fill="#fff" />
      {/* Big day number "31" as blocky digits */}
      <rect x="4" y="7" width="3" height="6" fill="#000" />
      <rect x="5" y="8" width="1" height="4" fill="#fff" />
      <rect x="9" y="7" width="3" height="6" fill="#000" />
      <rect x="10" y="8" width="1" height="1" fill="#fff" />
      <rect x="10" y="10" width="1" height="1" fill="#fff" />
      <rect x="10" y="12" width="1" height="1" fill="#fff" />
    </svg>
  );
}

// Fitness — black tile, three concentric "rings" (red/green/blue).
function FitnessIcon() {
  return (
    <svg viewBox="0 0 16 16" style={ICON_BOX}>
      {/* outer red ring */}
      <rect x="2" y="2" width="12" height="12" fill="#fa2d48" />
      <rect x="4" y="4" width="8" height="8" fill="#000" />
      {/* middle green ring */}
      <rect x="4" y="4" width="8" height="8" fill="#9bff00" />
      <rect x="5" y="5" width="6" height="6" fill="#000" />
      {/* inner blue ring */}
      <rect x="5" y="5" width="6" height="6" fill="#00d6ff" />
      <rect x="6" y="6" width="4" height="4" fill="#000" />
    </svg>
  );
}

// Files — blue folder.
function FilesIcon() {
  return (
    <svg viewBox="0 0 16 16" style={ICON_BOX}>
      {/* folder tab */}
      <rect x="2" y="4" width="5" height="2" fill="#1f7fdb" />
      <rect x="3" y="3" width="3" height="1" fill="#1f7fdb" />
      {/* folder body */}
      <rect x="1" y="5" width="14" height="9" fill="#3a9be8" />
      <rect x="2" y="6" width="12" height="7" fill="#1f7fdb" />
      {/* highlight stripe */}
      <rect x="2" y="6" width="12" height="1" fill="#7ec5ff" />
    </svg>
  );
}

// Shortcuts — purple/pink gradient tile with two overlapping squares
// (one rotated 45°), per iOS Shortcuts mark.
function ShortcutsIcon() {
  return (
    <svg viewBox="0 0 16 16" style={ICON_BOX}>
      {/* Back square (pink, rotated diamond) */}
      <rect x="6" y="0" width="2" height="2" fill="#ff5a8c" />
      <rect x="5" y="1" width="4" height="2" fill="#ff5a8c" />
      <rect x="4" y="2" width="6" height="2" fill="#ff5a8c" />
      <rect x="3" y="3" width="8" height="2" fill="#ff5a8c" />
      <rect x="4" y="5" width="6" height="1" fill="#ff5a8c" />
      <rect x="5" y="6" width="4" height="1" fill="#ff5a8c" />
      <rect x="6" y="7" width="2" height="1" fill="#ff5a8c" />
      {/* Front square (blue) — overlapping bottom-right */}
      <rect x="8"  y="8"  width="6" height="6" fill="#3a9eff" />
      <rect x="9"  y="7"  width="4" height="1" fill="#3a9eff" />
      <rect x="9"  y="14" width="4" height="1" fill="#3a9eff" />
      <rect x="7"  y="9"  width="1" height="4" fill="#3a9eff" />
      <rect x="14" y="9"  width="1" height="4" fill="#3a9eff" />
    </svg>
  );
}

// Apple Music — red/pink tile with white musical note.
function AppleMusicIcon() {
  return (
    <svg viewBox="0 0 16 16" style={ICON_BOX}>
      {/* stem */}
      <rect x="10" y="3" width="2" height="9" fill="#fff" />
      {/* second stem */}
      <rect x="6" y="5" width="2" height="8" fill="#fff" />
      {/* connector beam */}
      <rect x="6" y="3" width="6" height="2" fill="#fff" />
      {/* note head 1 (eighth) */}
      <rect x="4" y="11" width="3" height="2" fill="#fff" />
      <rect x="3" y="12" width="1" height="2" fill="#fff" />
      <rect x="4" y="13" width="3" height="1" fill="#fff" />
      {/* note head 2 */}
      <rect x="9" y="10" width="3" height="2" fill="#fff" />
      <rect x="8" y="11" width="1" height="2" fill="#fff" />
      <rect x="9" y="12" width="3" height="1" fill="#fff" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// PhoneScreen — phone-only view (<600px viewport).
// Pixel-art phone leaning at a slight angle on a charging stand placed on a
// floor. The Bay Bridge wall view shows behind/above. 9 real Apple-style
// app icons in a 3×3 grid, drawn as pixel-art SVGs. Tap → opens section modal.
// ─────────────────────────────────────────────────────────────

// Each AppIcon is its own component so we can render real Apple-app
// silhouettes (Spotify / Phone / Notes / Books / Calendar / Fitness / Files /
// Xcode / Apple Music) instead of generic emoji squares.
// App icons reuse real Apple-app visuals but the LABELS map straight to the
// portfolio sections — Skills/Projects/Education/Experience/Music/Contact/
// Journal/Interests/Now Playing — so the home screen reads as a portfolio.
const APP_LIST: { id: SectionId; label: string; Icon: React.FC; bg: string }[] = [
  // skills → Files (blue folder on white)
  { id: "skills",     label: "Skills",      Icon: FilesIcon,      bg: "#f5f5f7" },
  // projects → Shortcuts (pink/blue overlapping squares)
  { id: "projects",   label: "Projects",    Icon: ShortcutsIcon,  bg: "#ffffff" },
  // education → Books (orange)
  { id: "education",  label: "Education",   Icon: BooksIcon,      bg: "#f4c168" },
  // experience → Calendar (white + red header + day)
  { id: "experience", label: "Experience",  Icon: CalendarIcon,   bg: "#ffffff" },
  // music → GarageBand (white + guitar)
  { id: "music",      label: "Music",       Icon: GarageBandIcon, bg: "#ffffff" },
  // contact → Phone (green + white handset)
  { id: "contact",    label: "Contact",     Icon: PhoneAppIcon,   bg: "#34c759" },
  // journal → Notes (yellow with red top + lines)
  { id: "journal",    label: "Journal",     Icon: NotesIcon,      bg: "#fff6b0" },
  // interests → Fitness (black + concentric rings)
  { id: "interests",  label: "Interests",   Icon: FitnessIcon,    bg: "#000000" },
  // nowplaying → Apple Music (red + note)
  { id: "nowplaying", label: "Playing", Icon: AppleMusicIcon, bg: "#fa233b" },
];

function PhoneScreen({ theme, onOpen }: { theme: Theme; onOpen: (id: SectionId) => void }) {
  // Pixel-art iPhone — stepped octagonal corners + hard offset drop shadow.
  const bezel = "#1a1a1c";
  const wallpaper = theme === "light"
    ? "linear-gradient(180deg,#f8e1d6 0%,#d4a6b0 35%,#7a5a90 70%,#2a3258 100%)"
    : "linear-gradient(180deg,#1a2240 0%,#2a2548 35%,#4a2848 65%,#1a0e28 100%)";

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {/* Charging cable — runs from below up into the phone's bottom-middle.
          No visible plug head; cable just disappears into the phone bezel. */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: "50%",
          bottom: "0",
          width: "8px",
          height: "10vh",
          transform: "translateX(-50%)",
          background:
            "linear-gradient(180deg,#ffffff 0%,#ffffff 60%,#d8d8d8 100%)",
          borderRadius: "4px",
          boxShadow: "1px 0 0 rgba(0,0,0,0.35)",
        }}
      />

      <div className="absolute inset-0 flex justify-center items-end pb-[6vh] pointer-events-none">
        {/* Phone bezel — true rounded corners, hard pixel drop shadow */}
        <div
          className="relative pointer-events-auto"
          style={{
            height: "min(66vh, 620px)",
            aspectRatio: "9 / 19.5",
            maxWidth: "62vw",
            background: bezel,
            padding: "5px",
            borderRadius: "44px",
            // Hard offset pixel shadow + soft ambient.
            boxShadow:
              "8px 8px 0 rgba(0,0,0,0.55), 0 18px 40px rgba(0,0,0,0.45)",
            transform: "rotate(-2deg)",
            transformOrigin: "bottom center",
          }}
        >
          <div
            className="relative w-full h-full overflow-hidden flex flex-col"
            style={{ background: wallpaper, borderRadius: "38px" }}
          >
            {/* Dynamic island — clean rounded pill (sized so it never eats
                the time on the left or the cell/wifi/battery on the right). */}
            <div
              className="absolute left-1/2 -translate-x-1/2"
              style={{
                top: "4px",
                width: "26%",
                maxWidth: "100px",
                minWidth: "72px",
                height: "26px",
                background: "#000",
                borderRadius: "9999px",
                boxShadow: "0 0 0 2px #000",
                zIndex: 1,
              }}
            />
            {/* Status bar — pixel divs; z-index above the island so the
                cellular/wifi icons never get covered by it. */}
            <div
              className="flex items-center justify-between px-5 pt-2.5 text-white select-none relative"
              style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "-0.01em", zIndex: 2 }}
            >
              <span>9:41</span>
              <div className="flex items-end gap-2">
                {/* Wifi — stepped pixel-art arc */}
                <div className="relative" style={{ width: "14px", height: "10px" }}>
                  {/* outer arc */}
                  <div style={{ position: "absolute", top: 0, left: "2px",  width: "10px", height: "2px", background: "#fff" }} />
                  <div style={{ position: "absolute", top: "1px", left: 0,    width: "2px",  height: "2px", background: "#fff" }} />
                  <div style={{ position: "absolute", top: "1px", left: "12px",width: "2px",  height: "2px", background: "#fff" }} />
                  {/* middle arc */}
                  <div style={{ position: "absolute", top: "4px", left: "4px", width: "6px",  height: "2px", background: "#fff" }} />
                  <div style={{ position: "absolute", top: "5px", left: "3px", width: "1px",  height: "1px", background: "#fff" }} />
                  <div style={{ position: "absolute", top: "5px", left: "10px",width: "1px",  height: "1px", background: "#fff" }} />
                  {/* dot */}
                  <div style={{ position: "absolute", top: "8px", left: "6px", width: "2px",  height: "2px", background: "#fff" }} />
                </div>
                {/* Battery — rounded body + pixel cap + charging fill + bolt */}
                <div className="relative" style={{ width: "28px", height: "11px" }}>
                  {/* Body outline */}
                  <div
                    style={{
                      position: "absolute", top: 0, left: 0,
                      width: "22px", height: "11px",
                      border: "1px solid #fff",
                      borderRadius: "3px",
                      boxSizing: "border-box",
                    }}
                  />
                  {/* Nub */}
                  <div style={{ position: "absolute", top: "3px", left: "23px", width: "2px", height: "5px", background: "#fff", borderRadius: "1px" }} />
                  {/* Charging fill — Apple green to indicate plugged in */}
                  <div
                    style={{
                      position: "absolute", top: "2px", left: "2px",
                      width: "18px", height: "7px",
                      background: "#34c759",
                      borderRadius: "1px",
                    }}
                  />
                  {/* Lightning bolt overlay (pixel-art) */}
                  <div
                    style={{
                      position: "absolute",
                      top: "1px", left: "9px",
                      width: "6px", height: "9px",
                      // Zig-zag bolt clip-path
                      clipPath:
                        "polygon(60% 0, 0 55%, 38% 55%, 22% 100%, 100% 38%, 55% 38%, 80% 0)",
                      background: "#fff",
                    }}
                  />
                </div>
              </div>
            </div>
            {/* Date + name */}
            <div className="text-center pt-8 pb-4 select-none">
              <div className="text-white/70 text-[12px] font-semibold tracking-wide uppercase">
                Wednesday · 31
              </div>
              <div className="text-white font-bold tracking-tight mt-0.5" style={{ fontSize: "28px", letterSpacing: "-0.02em" }}>
                rohan.sah
              </div>
            </div>
            {/* App grid — proper squircle icons */}
            <div className="flex-1 flex items-start px-4 pt-2">
              <div className="grid grid-cols-3 gap-y-4 gap-x-3 w-full">
                {APP_LIST.map(app => {
                  const Icon = app.Icon;
                  return (
                    <button
                      key={app.id}
                      onClick={() => onOpen(app.id)}
                      className="flex flex-col items-center gap-1.5 group"
                    >
                      <div
                        className="flex items-center justify-center group-active:translate-y-px transition-transform"
                        style={{
                          width: "min(15vw, 56px)",
                          height: "min(15vw, 56px)",
                          background: app.bg,
                          // Pixel-art chamfered "squircle" — stepped corners.
                          clipPath:
                            "polygon(6px 0, calc(100% - 6px) 0, calc(100% - 3px) 3px, 100% 6px, 100% calc(100% - 6px), calc(100% - 3px) calc(100% - 3px), calc(100% - 6px) 100%, 6px 100%, 3px calc(100% - 3px), 0 calc(100% - 6px), 0 6px, 3px 3px)",
                          boxShadow: "3px 3px 0 rgba(0,0,0,0.45)",
                          imageRendering: "pixelated" as React.CSSProperties["imageRendering"],
                        }}
                      >
                        <Icon />
                      </div>
                      <span
                        className="text-white whitespace-nowrap"
                        style={{
                          fontSize: "clamp(8px, 2.4vw, 11px)",
                          fontWeight: 500,
                          textShadow: "0 1px 1px rgba(0,0,0,0.4)",
                        }}
                      >
                        {app.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Page dots */}
            <div className="flex justify-center gap-1.5 pb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
            </div>
            {/* Home indicator — proper iOS pill */}
            <div className="flex justify-center pb-2">
              <div className="bg-white rounded-full" style={{ width: "34%", height: "4px" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RainOverlay({ enableThunder }: { enableThunder: boolean }) {
  const drops = useMemo(() => {
    return Array.from({ length: 90 }, (_, i) => {
      const r1 = ((i * 9301 + 49297) % 233280) / 233280;
      const r2 = ((i * 7901 + 13127) % 233280) / 233280;
      const r3 = ((i * 5701 + 22817) % 233280) / 233280;
      return {
        left: r1 * 100,
        delay: r2 * 2.4,
        duration: 0.55 + r3 * 0.85,
        opacity: 0.25 + r3 * 0.45,
      };
    });
  }, []);

  return (
    <>
      <div
        className="absolute inset-x-0 top-0 pointer-events-none overflow-hidden"
        style={{ height: "63%" }}
      >
        {drops.map((d, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${d.left}%`,
              top: 0,
              width: "1px",
              height: "14px",
              background: `linear-gradient(to bottom, rgba(220,232,248,0) 0%, rgba(220,232,248,${d.opacity}) 100%)`,
              transform: "translateY(-10%)",
              animation: `rainfall ${d.duration}s linear ${d.delay}s infinite`,
            }}
          />
        ))}
      </div>
      {enableThunder && <Thunder />}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Thunder — random lightning flashes over the whole scene, with an
// occasional zigzag bolt drawn over the window area.
// Each strike: 5–12s wait, ~900ms flash, ~40% chance also of bolt.
// ─────────────────────────────────────────────────────────────
function Thunder() {
  const [strikeId, setStrikeId] = useState(0);
  const [bolt, setBolt] = useState<{ id: number; x: number } | null>(null);
  // Monotonic counter so each strike has a unique key even if two land in
  // the same millisecond (Date.now() can collide; React then complains).
  const counterRef = useRef(0);

  useEffect(() => {
    let timeout: number | undefined;
    let cancelled = false;
    const scheduleNext = () => {
      const wait = 5000 + Math.random() * 7000;
      timeout = window.setTimeout(() => {
        if (cancelled) return;
        counterRef.current += 1;
        const id = counterRef.current;
        setStrikeId(id);
        if (Math.random() < 0.45) {
          setBolt({ id, x: 10 + Math.random() * 80 });
          window.setTimeout(() => setBolt(null), 850);
        }
        scheduleNext();
      }, wait);
    };
    scheduleNext();
    return () => {
      cancelled = true;
      if (timeout !== undefined) clearTimeout(timeout);
    };
  }, []);

  return (
    <>
      {/* Full-screen flash overlay — re-mounts each strike so the keyframe replays */}
      {strikeId > 0 && (
        <div
          key={strikeId}
          className="absolute inset-0 pointer-events-none z-10 animate-lightning"
          style={{ mixBlendMode: "screen" }}
        />
      )}
      {/* Lightning bolt — short zigzag SVG in the window area */}
      {bolt && (
        <svg
          key={bolt.id}
          className="absolute pointer-events-none z-10 animate-bolt"
          style={{
            left: `${bolt.x}%`,
            top: "2%",
            width: "12%",
            height: "55%",
            filter: "drop-shadow(0 0 14px rgba(220,230,255,0.9))",
          }}
          viewBox="0 0 100 200"
          preserveAspectRatio="xMidYMin meet"
        >
          <polyline
            points="55,0 30,70 60,75 25,160 70,90 35,85 65,10"
            fill="none"
            stroke="#f4f8ff"
            strokeWidth="4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <polyline
            points="55,0 30,70 60,75 25,160 70,90 35,85 65,10"
            fill="none"
            stroke="rgba(180,210,255,0.5)"
            strokeWidth="10"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      )}
    </>
  );
}

const SCENE_LABELS: Record<SceneId, string> = {
  sf:    "SAN FRANCISCO",
  nyc:   "NEW YORK CITY",
  tokyo: "TOKYO",
};

function ScenePill({ scene }: { scene: SceneId }) {
  const [time, setTime] = useState<string>("");
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-US", {
      hour: "numeric", minute: "2-digit", hour12: true,
      timeZone: "America/Chicago",
    });
    const update = () => setTime(fmt.format(new Date()));
    update();
    const id = window.setInterval(update, 20_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="absolute z-30 pointer-events-none select-none"
      style={{
        top: "calc(env(safe-area-inset-top, 0px) + 14px)",
        left: "50%",
        transform: "translateX(-50%)",
      }}
    >
      <div
        className="flex items-center gap-3 px-4 py-1.5 rounded-full"
        style={{
          background: "rgba(10,10,12,0.42)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.14)",
          boxShadow: "0 6px 24px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.10)",
          color: "#f5f0e8",
        }}
      >
        <span
          style={{
            fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
            fontSize: "10.5px",
            letterSpacing: "0.32em",
            fontWeight: 600,
          }}
        >
          {SCENE_LABELS[scene]}
        </span>
        <span
          style={{
            width: "3px",
            height: "3px",
            borderRadius: "9999px",
            background: "rgba(245,240,232,0.55)",
          }}
        />
        <span
          style={{
            fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
            fontSize: "10.5px",
            letterSpacing: "0.14em",
            fontVariantNumeric: "tabular-nums",
            color: "rgba(245,240,232,0.85)",
          }}
        >
          {time} <span style={{ opacity: 0.6 }}>CDT</span>
        </span>
      </div>
    </div>
  );
}

function SceneToggle({ scene, onCycle }: { scene: SceneId; onCycle: () => void }) {
  const short: Record<SceneId, string> = { sf: "SF", nyc: "NYC", tokyo: "TYO" };
  return (
    <button
      onClick={onCycle}
      aria-label={`Scene: ${SCENE_LABELS[scene]} — click to cycle`}
      title={`View: ${SCENE_LABELS[scene]} (click to change)`}
      className="h-10 px-2.5 flex items-center justify-center gap-1.5
                 border border-transparent
                 hover:border-neutral-500 hover:rounded-md hover:bg-neutral-900/40
                 transition-all duration-150
                 text-neutral-300 hover:text-white"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="1" />
        <path d="M3 15l5-5 4 4 3-3 6 6" />
        <circle cx="16" cy="9" r="1.2" />
      </svg>
      <span style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: "10px", letterSpacing: "0.15em" }}>
        {short[scene]}
      </span>
    </button>
  );
}

function RainToggle({ raining, onToggle }: { raining: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label={raining ? "Stop rain" : "Make it rain"}
      className="w-10 h-10 flex items-center justify-center
                 border border-transparent
                 hover:border-neutral-500 hover:rounded-md hover:bg-neutral-900/40
                 transition-all duration-150
                 text-neutral-300 hover:text-white"
    >
      {raining ? (
        // Cloud-with-line icon — "stop the rain" (NOT a sun, so it doesn't
        // collide visually with the ThemeToggle's sun icon).
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 13a4 4 0 0 0 0-8 5 5 0 0 0-9.78-1A4.5 4.5 0 1 0 5 13h11Z" />
          <line x1="3" y1="20" x2="21" y2="20" />
        </svg>
      ) : (
        // Cloud + rain drops — make it rain
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 13a4 4 0 0 0 0-8 5 5 0 0 0-9.78-1A4.5 4.5 0 1 0 5 13h11Z" />
          <path d="M8 19l-1 2" />
          <path d="M12 19l-1 2" />
          <path d="M16 19l-1 2" />
        </svg>
      )}
    </button>
  );
}

function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle light/dark mode"
      className="w-10 h-10 flex items-center justify-center
                 border border-transparent
                 hover:border-neutral-500 hover:rounded-md hover:bg-neutral-900/40
                 transition-all duration-150
                 text-neutral-300 hover:text-white"
    >
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// TerminalOverlay — HTML/CSS text positioned over the monitor
// screen using percentages of the 640×400 canvas. Renders with
// real anti-aliased font for readability.
// ─────────────────────────────────────────────────────────────
function TerminalOverlay({
  rect, state, theme,
}: {
  rect: ScreenRect;
  state: { history: string[]; currentCmd: string; cursorOn: boolean };
  theme: Theme;
}) {
  const left   = (rect.x / CW) * 100;
  const top    = (rect.y / CH) * 100;
  const width  = (rect.w / CW) * 100;
  const height = (rect.h / CH) * 100;

  // Theme-aware color tokens for the readable HTML terminal.
  const t = theme === "light"
    ? {
        text: "#1a1a1a",
        muted: "#5a5a5a",
        dim: "#8a8a8a",
        prompt: "#7a4030",
        accent: "#1a1a1a",
        border: "#d0c8b8",
        cursor: "#1a1a1a",
        shadow: "0 0 0 transparent",
      }
    : {
        text: "#ffffff",
        muted: "#a3a3a3",
        dim: "#5a5a5a",
        prompt: "#a3a3a3",
        accent: "#ffffff",
        border: "#262626",
        cursor: "#ffffff",
        shadow: "0 0 4px rgba(255,255,255,0.18)",
      };

  return (
    <div
      className="absolute pointer-events-none font-mono overflow-hidden"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`,
        color: t.text,
        fontFamily: "var(--font-geist-mono), ui-monospace, Menlo, monospace",
        textShadow: t.shadow,
        padding: "1.4% 1.6%",
        lineHeight: 1.3,
        // Smaller upper bound + viewport-floor so long screens don't blow text up.
        fontSize: "clamp(9px, 1.0vw, 14px)",
        // Strictly clip — nothing can spill past the monitor's screen rect.
        contain: "paint",
      }}
    >
      <div
        className="text-[0.78em] uppercase tracking-[0.2em] mb-[0.6em] pb-[0.3em]"
        style={{ color: t.muted, borderBottom: `1px solid ${t.border}` }}
      >
        rohan@portfolio &nbsp; ~ &nbsp; zsh
      </div>
      {state.history.map((line, i) => (
        <div
          key={i}
          style={{ color: i === state.history.length - 1 ? t.accent : t.dim }}
        >
          {line}
        </div>
      ))}
      <div>
        <span style={{ color: t.prompt }}>rohan@portfolio:~$</span>{" "}
        <span style={{ color: t.accent }}>{state.currentCmd}</span>
        <span
          className="inline-block align-middle"
          style={{
            width: "0.55em",
            height: "1em",
            marginLeft: "0.1em",
            background: state.cursorOn ? t.cursor : "transparent",
            transform: "translateY(0.05em)",
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal — full-screen Apple-style window with section content.
// ─────────────────────────────────────────────────────────────
function SectionModal({
  id, onClose, theme,
}: { id: SectionId; onClose: () => void; theme: Theme }) {
  const s = SECTIONS[id];

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  // Theme-aware modal tokens.
  const m = theme === "light"
    ? {
        backdrop: "rgba(245,240,232,0.65)",
        windowBg: "#fafaf6",
        titleBar: "#ececea",
        titleBarBorder: "#d8d4cc",
        windowBorder: "#d0ccc4",
        cmd: "#8a8478",
        body: "#1a1a1a",
      }
    : {
        backdrop: "rgba(5,5,5,0.75)",
        windowBg: "#0d0d0d",
        titleBar: "#1a1a1a",
        titleBarBorder: "#262626",
        windowBorder: "#262626",
        cmd: "#737373",
        body: "#d4d4d4",
      };

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center p-6 sm:p-12 animate-fadein"
      style={{ background: m.backdrop, backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl h-[min(80vh,640px)] rounded-xl overflow-hidden shadow-2xl flex flex-col animate-popin"
        style={{ background: m.windowBg, border: `1px solid ${m.windowBorder}`, color: m.body }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{ background: m.titleBar, borderBottom: `1px solid ${m.titleBarBorder}` }}
        >
          <button onClick={onClose} className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-125" aria-label="close" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 font-mono text-[11px] tracking-widest uppercase" style={{ color: m.cmd }}>{s.cmd}</span>
        </div>
        <div className="flex-1 overflow-y-auto px-8 sm:px-12 py-10 font-mono">
          {id === "nowplaying" ? (
            <NowPlayingCard theme={theme} />
          ) : (
            <>
              <h1
                className="text-3xl sm:text-5xl font-semibold tracking-tight mb-6"
                style={{ color: s.accent }}
              >
                {s.title}
              </h1>
              <pre className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: m.body }}>
                {s.body}
              </pre>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// NowPlayingCard — Spotify-powered now-playing card.
// Polls /api/now-playing every 15s. The route calls Spotify's Web API
// server-side using a refresh token, so secrets never leak to the client.
// Falls back to a static Fast Car preview when the env isn't configured.
// ─────────────────────────────────────────────────────────────
interface NowPlayingState {
  title: string;
  artist: string;
  album: string;
  artworkUrl?: string;
  url?: string;
  durationSec: number;
  currentSec: number;
  isPlaying: boolean;
  live: boolean;
}

function useNowPlaying(): NowPlayingState {
  const fallback: NowPlayingState = {
    title: "",
    artist: "",
    album: "",
    durationSec: 0,
    currentSec: 0,
    isPlaying: false,
    live: false,  
  };
  const [state, setState] = useState<NowPlayingState>(fallback);

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const res = await fetch("/api/now-playing");
        if (!res.ok || cancelled) return;
        const data = await res.json() as {
          configured?: boolean;
          isPlaying?: boolean;
          title?: string;
          artist?: string;
          album?: string;
          artworkUrl?: string;
          url?: string;
          durationSec?: number;
          currentSec?: number;
        };
        if (!data.configured) return;   // no token configured — keep static preview
        if (!data.title) {
          // API works but there's no track to show. Flip to a real "nothing
          // playing" state instead of the Tracy Chapman static preview.
          setState({
            title: "",
            artist: "",
            album: "",
            durationSec: 0,
            currentSec: 0,
            isPlaying: false,
            live: true,
          });
          return;
        }
        setState({
          title: data.title,
          artist: data.artist ?? "",
          album: data.album ?? "",
          artworkUrl: data.artworkUrl,
          url: data.url,
          durationSec: data.durationSec ?? 0,
          currentSec: data.currentSec ?? 0,
          isPlaying: data.isPlaying ?? false,
          live: true,
        });
      } catch {
        /* network blip — keep last known state */
      }
    };
    fetchOnce();
    const id = window.setInterval(fetchOnce, 15000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, []);

  return state;
}

function NowPlayingCard({ theme = "dark" }: { theme?: Theme }) {
  const track = useNowPlaying();
  const pct = track.durationSec > 0 ? (track.currentSec / track.durationSec) * 100 : 0;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, "0")}`;
  const t = theme === "light"
    ? { title: "#1a1a1a", artist: "#5a5a5a", album: "#8a8a8a", bar: "#dcd8d0", time: "#8a8a8a", btn: "#1a1a1a", btnBg: "#1a1a1a", btnFg: "#fff", foot: "#8a8a8a" }
    : { title: "#fff", artist: "#a3a3a3", album: "#737373", bar: "#262626", time: "#737373", btn: "#fff", btnBg: "#fff", btnFg: "#000", foot: "#737373" };

  // Empty live state: Spotify returned no track. Render a minimal
  // "nothing playing" card instead of a fake track + progress bar.
  if (!track.title) {
    return (
      <div className="flex flex-col items-center gap-4 px-2 py-8">
        {/* Empty muted album frame */}
        <div
          className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl flex items-center justify-center"
          style={{
            background: theme === "light" ? "#ece8df" : "#1a1a1a",
            color: theme === "light" ? "#a8a39a" : "#3a3a3a",
            boxShadow: theme === "light" ? "0 6px 18px rgba(0,0,0,0.06)" : "inset 0 0 0 1px #262626",
          }}
        >
          <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <div className="text-center">
          <div className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: t.title }}>
            Nothing playing
          </div>
          <div className="text-sm mt-1.5" style={{ color: t.artist }}>
            Rohan isn&apos;t listening to anything right now.
          </div>
        </div>
        <div className="text-[10px] uppercase tracking-[0.25em] mt-4" style={{ color: t.foot }}>
          live · spotify
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:gap-8 px-2">
      <div
        className="w-44 h-44 sm:w-56 sm:h-56 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: track.artworkUrl
            ? `url(${track.artworkUrl}) center/cover no-repeat`
            : "linear-gradient(135deg, #2a3a5e 0%, #6a4080 45%, #c8506a 100%)",
          boxShadow: theme === "light"
            ? "0 18px 50px rgba(0,0,0,0.18)"
            : "0 20px 60px rgba(0,0,0,0.6), inset 0 0 80px rgba(255,255,255,0.04)",
        }}
      />
      <div className="text-center w-full">
        <div className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color: t.title }}>{track.title}</div>
        <div className="text-base mt-1" style={{ color: t.artist }}>{track.artist}</div>
        {track.album && (
          <div className="text-xs mt-0.5 uppercase tracking-widest" style={{ color: t.album }}>{track.album}</div>
        )}
      </div>
      {track.isPlaying ? (
        <div className="w-full max-w-sm">
          <div className="h-1 rounded-full overflow-hidden" style={{ background: t.bar }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "#1db954" }} />
          </div>
          <div className="flex justify-between text-xs mt-1.5 tabular-nums" style={{ color: t.time }}>
            <span>{fmt(track.currentSec)}</span>
            <span>-{fmt(Math.max(0, track.durationSec - track.currentSec))}</span>
          </div>
        </div>
      ) : (
        <div className="text-xs tabular-nums" style={{ color: t.time }}>{fmt(track.durationSec)}</div>
      )}
      <div className="text-[10px] uppercase tracking-[0.25em] mt-2" style={{ color: t.foot }}>
        {track.live
          ? (track.isPlaying
              ? (track.url
                  ? <a href={track.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#1db954]">▶ now playing · spotify ↗</a>
                  : "▶ now playing · spotify")
              : (track.url
                  ? <a href={track.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#1db954]">last played · spotify ↗</a>
                  : "last played · spotify"))
          : "Rohan isn't listening to anything right now."}
      </div>
    </div>
  );
}
