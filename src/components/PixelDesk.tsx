"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { CW, CH, DESK_TOP_Y, drawWall, drawWindow, drawFloor, drawDesk } from "./pixel/scene";
import { drawGuitar } from "./pixel/guitar";
import {
  drawMonitor, drawTerminalBackground, drawMacBook, drawKeyboard, drawMouse,
  drawBookshelf, drawPhone, drawRunningShoes, drawFan,
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
  { id: "music",      x: 94,  y: 8,   w: 58,  h: 226, label: "MUSIC" },
  { id: "projects",   x: 484, y: 196, w: 110, h: 64,  label: "PROJECTS" },
  { id: "education",  x: 14,  y: 30,  w: 80,  h: 220, label: "EDUCATION" },
  { id: "contact",    x: 90,  y: 258, w: 22,  h: 44,  label: "CONTACT" },
  { id: "experience", x: 200, y: 258, w: 168, h: 20,  label: "EXPERIENCE" },
  { id: "interests",  x: 240, y: 332, w: 100, h: 32,  label: "INTERESTS" },
];

// Monitor center — true horizontal center of the canvas.
const MONITOR_CX = 320;

export default function PixelDesk() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screenRectRef = useRef<ScreenRect | null>(null);
  const [screenRect, setScreenRect] = useState<ScreenRect | null>(null);
  const [hover, setHover] = useState<SectionId | null>(null);
  const [active, setActive] = useState<SectionId | null>(null);
  const [typing, setTyping] = useState(false);

  const [terminal, setTerminal] = useState({
    history: ["welcome to rohan@portfolio", "type or click an object →"],
    currentCmd: "",
    cursorOn: true,
  });
  const [spritesReady, setSpritesReady] = useState(false);

  // Preload PNG sprites once. Missing files silently fall back to procedural.
  useEffect(() => {
    preloadSprites(SPRITE_IDS).then(() => setSpritesReady(true));
  }, []);

  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    drawWall(ctx);
    drawWindow(ctx);
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

    // Wall items — single hero guitar (music section), bookshelf (education).
    orProc("bookshelf", 14, DESK_TOP_Y - 2, () => drawBookshelf(ctx, 14, DESK_TOP_Y));
    orProc("guitar-music", 122, 14, () => drawGuitar(ctx, 122, 14, { strap: true }));

    // Desk-top items.
    orProc("phone", 100, DESK_TOP_Y, () => drawPhone(ctx, 100, DESK_TOP_Y));
    orProc("fan", 130, DESK_TOP_Y, () => drawFan(ctx, 130, DESK_TOP_Y));

    // Monitor — sprite version still needs to expose a screen rect for the
    // terminal overlay. If a sprite exists, the screen rect is derived from
    // SPRITE_DEFS bounds (tuned by user); otherwise the procedural drawer
    // returns the inner screen rect directly.
    let sr: ScreenRect;
    if (drawSprite(ctx, "monitor", MONITOR_CX, DESK_TOP_Y)) {
      const def = SPRITE_DEFS.monitor;
      // Convention: sprite's inner screen takes 90% W, 75% H, top-aligned with bezel offset.
      sr = {
        x: MONITOR_CX - def.w / 2 + 16,
        y: DESK_TOP_Y - def.h + 14,
        w: def.w - 32,
        h: def.h - 60,
      };
    } else {
      sr = drawMonitor(ctx, MONITOR_CX, DESK_TOP_Y);
    }
    screenRectRef.current = sr;
    if (!screenRect || sr.x !== screenRect.x || sr.y !== screenRect.y) {
      setScreenRect(sr);
    }
    drawTerminalBackground(ctx, sr);

    orProc("macbook", 540, DESK_TOP_Y, () => drawMacBook(ctx, 540, DESK_TOP_Y));
    orProc("keyboard", 282, DESK_TOP_Y, () => drawKeyboard(ctx, 282, DESK_TOP_Y));
    orProc("mouse", 440, DESK_TOP_Y, () => drawMouse(ctx, 440, DESK_TOP_Y));

    // Floor
    orProc("shoes", 290, CH - 36, () => drawRunningShoes(ctx, 290, CH - 36));

    // Hover overlay
    if (hover) {
      const z = ZONES.find(zz => zz.id === hover)!;
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1;
      ctx.strokeRect(z.x + 0.5, z.y + 0.5, z.w - 1, z.h - 1);
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(z.x, z.y - 9, z.label.length * 5 + 6, 9);
      ctx.fillStyle = "#f4f4f4";
      ctx.font = "7px ui-monospace, Menlo, monospace";
      ctx.textBaseline = "top";
      ctx.fillText(z.label, z.x + 3, z.y - 8);
    }
  }, [hover, screenRect]);

  // Repaint when hover changes OR sprites finish loading.
  useEffect(() => { repaint(); }, [repaint, spritesReady]);

  // Cursor blink — state only, no canvas repaint needed (text is HTML overlay).
  useEffect(() => {
    const id = window.setInterval(() => {
      setTerminal(t => ({ ...t, cursorOn: !t.cursorOn }));
    }, 520);
    return () => window.clearInterval(id);
  }, []);

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
    <>
      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        className="absolute inset-0 w-full h-full"
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
      {active && (
        <SectionModal id={active} onClose={() => setActive(null)} />
      )}
    </>
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
      className="absolute pointer-events-none font-mono text-[#86d896] overflow-hidden"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`,
        fontFamily: "var(--font-geist-mono), ui-monospace, Menlo, monospace",
        textShadow: "0 0 6px rgba(74,222,128,0.35)",
        padding: "1.4% 1.6%",
        lineHeight: 1.35,
        fontSize: "clamp(10px, 1.25vw, 18px)",
      }}
    >
      <div className="text-[0.78em] uppercase tracking-[0.2em] text-[#3a7a4a] mb-[0.6em] border-b border-[#1a3a2a] pb-[0.3em]">
        rohan@portfolio &nbsp; ~ &nbsp; zsh
      </div>
      {state.history.map((line, i) => (
        <div
          key={i}
          className={i === state.history.length - 1 ? "text-[#86d896]" : "text-[#3a7a4a]"}
        >
          {line}
        </div>
      ))}
      <div>
        <span className="text-[#5dc97e]">rohan@portfolio:~$</span>{" "}
        <span>{state.currentCmd}</span>
        <span
          className="inline-block align-middle"
          style={{
            width: "0.55em",
            height: "1em",
            marginLeft: "0.1em",
            background: state.cursorOn ? "#86d896" : "transparent",
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
