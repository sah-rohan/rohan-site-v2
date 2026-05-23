"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { CW, CH, DESK_TOP_Y, drawWall, drawFloor, drawDesk } from "./pixel/scene";
import { drawGuitar } from "./pixel/guitar";
import {
  drawMonitor, drawTerminalBackground, drawMacBook, drawKeyboard, drawMouse,
  drawBookshelf, drawPhone,
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
  // Keyboard on desk (experience)
  { id: "experience", x: 178, y: 258, w: 124, h: 18,  label: "EXPERIENCE" },
  // Hanging shoes under desk (interests)
  { id: "interests",  x: 408, y: 286, w: 88,  h: 60,  label: "INTERESTS" },
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
  const monitorSize = isCompact
    ? { screenW: 340, screenH: 210 }
    : { screenW: 220, screenH: 140 };
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screenRectRef = useRef<ScreenRect | null>(null);
  const [screenRect, setScreenRect] = useState<ScreenRect | null>(null);
  const [hover, setHover] = useState<SectionId | null>(null);
  const [active, setActive] = useState<SectionId | null>(null);
  const [typing, setTyping] = useState(false);

  const [terminal, setTerminal] = useState({
    history: [
      "welcome to rohan@portfolio.sh — type a command or click anything",
      "try: projects · education · music · contact · experience · interests · help · ls",
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
      sr = drawMonitor(ctx, MONITOR_CX, DESK_TOP_Y, monitorSize);
    }
    screenRectRef.current = sr;
    if (!screenRect || sr.x !== screenRect.x || sr.y !== screenRect.y) {
      setScreenRect(sr);
    }
    drawTerminalBackground(ctx, sr);

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
  }, [hover, screenRect, theme, wallImageReady, isCompact, monitorSize]);

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
      music: "music", guitar: "music",
      projects: "projects", proj: "projects", ls: "projects",
      education: "education", edu: "education", school: "education", books: "education",
      contact: "contact", email: "contact", phone: "contact",
      experience: "experience", exp: "experience", work: "experience", resume: "experience",
      interests: "interests", hobbies: "interests", run: "interests", running: "interests",
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
    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]">
      {/* Aspect-ratio-preserving stage. Canvas + overlays scale together so
          the scene never stretches; viewports that don't match get letterboxed. */}
      <div
        className="relative"
        style={{
          width: "min(100vw, calc(100vh * (640/400)))",
          aspectRatio: "640 / 400",
        }}
      >
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
        {screenRect && (
          <TerminalOverlay rect={screenRect} state={terminal} />
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
        <SectionModal id={active} onClose={() => setActive(null)} />
      )}
      {/* Theme toggle — bottom-right, à la Alex Young */}
      <ThemeToggle theme={theme} onToggle={() => setTheme(t => t === "dark" ? "light" : "dark")} />
    </div>
  );
}

function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle light/dark mode"
      className="absolute bottom-4 right-4 z-30 w-10 h-10
                 flex items-center justify-center
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
  rect, state,
}: {
  rect: ScreenRect;
  state: { history: string[]; currentCmd: string; cursorOn: boolean };
}) {
  const left   = (rect.x / CW) * 100;
  const top    = (rect.y / CH) * 100;
  const width  = (rect.w / CW) * 100;
  const height = (rect.h / CH) * 100;

  return (
    <div
      className="absolute pointer-events-none font-mono text-white overflow-hidden"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`,
        fontFamily: "var(--font-geist-mono), ui-monospace, Menlo, monospace",
        textShadow: "0 0 4px rgba(255,255,255,0.18)",
        padding: "1.4% 1.6%",
        lineHeight: 1.35,
        fontSize: "clamp(10px, 1.25vw, 18px)",
      }}
    >
      <div className="text-[0.78em] uppercase tracking-[0.2em] text-neutral-500 mb-[0.6em] border-b border-neutral-800 pb-[0.3em]">
        rohan@portfolio &nbsp; ~ &nbsp; zsh
      </div>
      {state.history.map((line, i) => (
        <div
          key={i}
          className={i === state.history.length - 1 ? "text-white" : "text-neutral-500"}
        >
          {line}
        </div>
      ))}
      <div>
        <span className="text-neutral-400">rohan@portfolio:~$</span>{" "}
        <span className="text-white">{state.currentCmd}</span>
        <span
          className="inline-block align-middle"
          style={{
            width: "0.55em",
            height: "1em",
            marginLeft: "0.1em",
            background: state.cursorOn ? "#ffffff" : "transparent",
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
function SectionModal({ id, onClose }: { id: SectionId; onClose: () => void }) {
  const s = SECTIONS[id];

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center p-6 sm:p-12 animate-fadein"
      style={{ background: "rgba(5,5,5,0.75)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl h-[min(80vh,640px)] rounded-xl overflow-hidden shadow-2xl border border-neutral-800 bg-[#0d0d0d] text-neutral-100 flex flex-col animate-popin"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] border-b border-neutral-800">
          <button onClick={onClose} className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-125" aria-label="close" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 font-mono text-[11px] tracking-widest text-neutral-500 uppercase">{s.cmd}</span>
        </div>
        <div className="flex-1 overflow-y-auto px-8 sm:px-12 py-10 font-mono">
          <h1
            className="text-3xl sm:text-5xl font-semibold tracking-tight mb-6"
            style={{ color: s.accent }}
          >
            {s.title}
          </h1>
          <pre className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-300">
            {s.body}
          </pre>
        </div>
      </div>
    </div>
  );
}
