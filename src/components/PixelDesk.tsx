"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { CW, CH, DESK_TOP_Y, drawWall, drawFloor, drawDesk } from "./pixel/scene";
import {
  drawMonitor, drawTerminalBackground, drawMacBook, drawKeyboard, drawMouse,
  drawBookshelf, drawPhone, drawNotebook,
  drawHangingHeadphones, drawHangingShoes, drawTinyGuitar,
  drawChargerBrick, drawChargerCable,
  ScreenRect,
} from "./pixel/objects";
import { preloadSprites, drawSprite, SPRITE_DEFS } from "./pixel/sprites";
import { SECTIONS, SectionId } from "@/data/sections";

const SPRITE_IDS = Object.keys(SPRITE_DEFS) as (keyof typeof SPRITE_DEFS)[];

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
];

// Monitor center — true horizontal center of the canvas.
const MONITOR_CX = 320;

type Theme = "dark" | "light";

export default function PixelDesk() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    const param = new URLSearchParams(window.location.search).get("theme");
    return param === "light" ? "light" : "dark";
  });

  // Responsive monitor sizing — bigger on small viewports (so terminal stays
  // usable), smaller on big viewports (so more of the room shows).
  const [isCompact, setIsCompact] = useState(false);
  useEffect(() => {
    const update = () => setIsCompact(window.innerWidth < 820);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const monitorSize = useMemo(() => (
    isCompact
      ? { screenW: 340, screenH: 210 }
      : { screenW: 220, screenH: 140 }
  ), [isCompact]);

  // Weather — toggleable live rain in the window background.
  const [raining, setRaining] = useState(false);
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
  const [spritesReady, setSpritesReady] = useState(false);

  // Preload PNG sprites once. Missing files silently fall back to procedural.
  useEffect(() => {
    preloadSprites(SPRITE_IDS).then(() => setSpritesReady(true));
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
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    drawWall(ctx, theme); // dark: Bay Bridge dusk; light: Golden Gate sunset
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

    // Under-desk items — all in the floor area between the desk legs.
    drawBookshelf(ctx, 90, CH - 6);            // small bookshelf under desk (left)
    drawTinyGuitar(ctx, 180, CH - 8);          // tiny guitar under desk
    const underY = 290;                        // hook anchor row beneath desk lip
    drawHangingHeadphones(ctx, 340, underY);
    drawHangingShoes(ctx, 450, underY);

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
  }, [hover, screenRect, theme, wallImageReady, monitorSize]);

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
    };
    if (ALIASES[cmd]) {
      const id = ALIASES[cmd];
      setTerminal(t => ({
        history: [...t.history, `$ ${rawCmd}`, `> opening ${id}…`].slice(-6),
        currentCmd: "",
        cursorOn: t.cursorOn,
      }));
      setActive(id);
      return;
    }
    if (cmd === "help" || cmd === "?" ) {
      setTerminal(t => ({
        history: [...t.history, `$ ${rawCmd}`,
          "commands: projects, education, music, contact, experience, interests",
          "aliases: ls, work, resume, school, hobbies, running, guitar",
          "clear — wipe screen",
        ].slice(-6),
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
        history: [...t.history, `$ ${rawCmd}`, "rohan sah — student, builder, runner."].slice(-6),
        currentCmd: "",
        cursorOn: t.cursorOn,
      }));
      return;
    }
    // Unknown
    setTerminal(t => ({
      history: [...t.history, `$ ${rawCmd}`, `zsh: command not found: ${cmd} — try 'help'`].slice(-6),
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
      history: [...t.history, `$ ${s.cmd}`].slice(-5),
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

  return (
    <div className="absolute inset-0 bg-[#0a0a0a]">
      {/* Fill the full viewport — canvas stretches edge-to-edge on every device. */}
      <div className="absolute inset-0">
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          className="block w-full h-full"
          style={{ imageRendering: "pixelated", cursor: hover ? "pointer" : "crosshair" }}
          onMouseMove={e => {
            if (typing) return;
            const z = eventToZone(e.clientX, e.clientY);
            setHover(z ? z.id : null);
          }}
          onMouseLeave={() => setHover(null)}
          onClick={e => {
            if (typing || active) return;
            const z = eventToZone(e.clientX, e.clientY);
            if (z) playType(z.id);
          }}
        />
        <CarsOverlay theme={theme} />
        {raining && <RainOverlay enableThunder={theme === "dark"} />}
        {screenRect && (
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
      <div className="absolute bottom-4 right-4 z-30 flex items-center gap-1.5">
        <RainToggle raining={raining} onToggle={() => setRaining(r => !r)} />
        <ThemeToggle theme={theme} onToggle={() => setTheme(t => t === "dark" ? "light" : "dark")} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RainOverlay — pure CSS animated raindrops falling over the upper
// portion of the viewport (the "outside the window" area, above the desk).
// Each drop is a thin slanted line with random column, delay, and speed.
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// CarsOverlay — tiny cars driving across the Bay Bridge deck.
// Two lanes (left→right and right→left) with multiple cars, randomized
// speed + delay so they don't all move in lockstep. Positioned at the
// bridge-deck y-band of the canvas (~41% from top, accounting for the
// procedural drawBayBridge layout).
// ─────────────────────────────────────────────────────────────
function CarsOverlay({ theme }: { theme: Theme }) {
  const cars = useMemo(() => {
    // Deterministic pseudo-random so the cars don't reshuffle on every render.
    return Array.from({ length: 8 }, (_, i) => {
      const r1 = ((i * 9301 + 49297) % 233280) / 233280;
      const r2 = ((i * 7901 + 13127) % 233280) / 233280;
      return {
        dir: i % 2 === 0 ? "lr" as const : "rl" as const,
        duration: 14 + r1 * 12,
        delay: -r2 * 14,           // negative so cars are mid-route on mount
        offsetY: (r2 - 0.5) * 4,   // tiny vertical jitter for two-deck illusion
      };
    });
  }, []);

  // Cars drive on the bridge deck. The deck sits roughly at 0.66 × DESK_TOP_Y
  // of the canvas, and DESK_TOP_Y is ~63% of CH — so the deck band is at
  // ≈ 41.5% of the viewport height.
  const carColors = theme === "dark"
    ? ["#1a1a22", "#2a2438", "#1f1a2a", "#181620"]
    : ["#3a2418", "#4a2820", "#502a18", "#3a2218"];
  const headlight = theme === "dark" ? "#fff4c8" : "transparent";
  const taillight = theme === "dark" ? "#ff5a3a" : "transparent";

  return (
    <div
      className="absolute inset-x-0 pointer-events-none overflow-hidden"
      style={{
        top: "39%",
        height: "8%",
      }}
    >
      {cars.map((c, i) => {
        const carColor = carColors[i % carColors.length];
        return (
          <div
            key={i}
            className="absolute"
            style={{
              top: `${30 + c.offsetY * 8}%`,
              left: 0,
              // Bigger + viewport-relative so cars are visible on any screen.
              width: "2.5vw",
              minWidth: "30px",
              height: "1vw",
              minHeight: "12px",
              animation: `car-${c.dir} ${c.duration}s linear ${c.delay}s infinite`,
              willChange: "transform",
            }}
          >
            {/* car body */}
            <div
              className="absolute inset-0 rounded-[2px]"
              style={{ background: carColor, boxShadow: "0 1px 0 rgba(0,0,0,0.4)" }}
            />
            {/* roof / windshield highlight */}
            <div
              className="absolute"
              style={{
                top: "20%", left: "25%",
                width: "50%", height: "45%",
                background: theme === "dark" ? "#5a5a68" : "#9a6840",
                borderRadius: "1px",
              }}
            />
            {/* headlight (front of car, in the direction of motion) */}
            <div
              className="absolute rounded-full"
              style={{
                top: "35%",
                right: c.dir === "lr" ? "-2px" : "auto",
                left: c.dir === "rl" ? "-2px" : "auto",
                width: "3px", height: "3px",
                background: headlight,
                boxShadow: theme === "dark" ? "0 0 6px 2px #fff4c8" : "none",
              }}
            />
            {/* taillight */}
            <div
              className="absolute rounded-full"
              style={{
                top: "35%",
                left: c.dir === "lr" ? "-1px" : "auto",
                right: c.dir === "rl" ? "-1px" : "auto",
                width: "2px", height: "2px",
                background: taillight,
                boxShadow: theme === "dark" ? "0 0 4px #ff5a3a" : "none",
              }}
            />
          </div>
        );
      })}
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

  useEffect(() => {
    let timeout: number | undefined;
    let cancelled = false;
    const scheduleNext = () => {
      const wait = 5000 + Math.random() * 7000;
      timeout = window.setTimeout(() => {
        if (cancelled) return;
        const id = Date.now();
        setStrikeId(id);
        if (Math.random() < 0.45) {
          // Bolt strikes a random x in the window area.
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
        // Sun icon — stop the rain
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        // Cloud + rain icon — make it rain
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
        lineHeight: 1.35,
        fontSize: "clamp(10px, 1.25vw, 18px)",
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
    title: "Fast Car",
    artist: "Tracy Chapman",
    album: "Tracy Chapman",
    durationSec: 286,
    currentSec: 89,
    isPlaying: true,
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
        if (!data.configured) return; // keep showing the fallback preview
        if (!data.isPlaying || !data.title) {
          setState({ ...fallback, live: true, isPlaying: false });
          return;
        }
        setState({
          title: data.title ?? "—",
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
    // fallback is stable per render; intentional empty dep array
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div className="w-full max-w-sm">
        <div className="h-1 rounded-full overflow-hidden" style={{ background: t.bar }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "#1db954" }} />
        </div>
        <div className="flex justify-between text-xs mt-1.5 tabular-nums" style={{ color: t.time }}>
          <span>{fmt(track.currentSec)}</span>
          <span>-{fmt(Math.max(0, track.durationSec - track.currentSec))}</span>
        </div>
      </div>
      <div className="flex items-center gap-8" style={{ color: t.btn }}>
        <button className="text-2xl opacity-80 hover:opacity-100 transition" aria-label="previous">⏮</button>
        <button className="w-14 h-14 rounded-full flex items-center justify-center text-2xl hover:scale-105 transition"
                style={{ background: t.btnBg, color: t.btnFg }} aria-label="play/pause">
          {track.isPlaying ? "⏸" : "▶"}
        </button>
        <button className="text-2xl opacity-80 hover:opacity-100 transition" aria-label="next">⏭</button>
      </div>
      <div className="text-[10px] uppercase tracking-[0.25em] mt-4" style={{ color: t.foot }}>
        {track.live
          ? (track.url
              ? <a href={track.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#1db954]">live · spotify ↗</a>
              : "live · spotify")
          : "preview · configure SPOTIFY_REFRESH_TOKEN in .env.local"}
      </div>
    </div>
  );
}
