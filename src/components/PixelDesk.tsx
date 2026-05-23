"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { CW, CH, DESK_TOP_Y, drawWall, drawWindow, drawFloor, drawDesk } from "./pixel/scene";
import { drawGuitar } from "./pixel/guitar";
import {
  drawMonitor, drawTerminal, drawMacBook, drawKeyboard, drawMouse,
  drawBookshelf, drawPhone, drawRunningShoes, drawFan,
  ScreenRect, TerminalState,
} from "./pixel/objects";
import { SECTIONS, SectionId } from "@/data/sections";

interface Zone {
  id: SectionId;
  x: number; y: number; w: number; h: number;
  label: string;
}

// Hit zones — tuned to where each object lands in the 640×400 canvas.
const ZONES: Zone[] = [
  { id: "music",      x: 100, y: 14,  w: 84, h: 218, label: "MUSIC" },
  { id: "projects",   x: 462, y: 198, w: 100, h: 60, label: "PROJECTS" },
  { id: "education",  x: 14,  y: 30,  w: 84, h: 220, label: "EDUCATION" },
  { id: "contact",    x: 384, y: 256, w: 22, h: 42,  label: "CONTACT" },
  { id: "experience", x: 226, y: 256, w: 172, h: 18, label: "EXPERIENCE" },
  { id: "interests",  x: 256, y: 332, w: 80, h: 30,  label: "INTERESTS" },
];

export default function PixelDesk() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screenRectRef = useRef<ScreenRect | null>(null);
  const [hover, setHover] = useState<SectionId | null>(null);
  const [active, setActive] = useState<SectionId | null>(null);
  const [typing, setTyping] = useState(false);

  const termRef = useRef<TerminalState>({
    history: ["welcome to rohan@portfolio", "type or click an object →"],
    currentCmd: "",
    cursorOn: true,
  });

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

    // Wall items (drawn before desk-top items so monitor overlaps slightly)
    drawGuitar(ctx, 142, 18, { strap: true });
    drawGuitar(ctx, 226, 22, { dreadnought: true });
    drawBookshelf(ctx, 14, DESK_TOP_Y);

    // Desk-top items
    drawFan(ctx, 326, DESK_TOP_Y);                  // fan left of monitor (smaller foot)
    drawPhone(ctx, 395, DESK_TOP_Y);
    screenRectRef.current = drawMonitor(ctx, 360, DESK_TOP_Y); // hero
    drawMacBook(ctx, 530, DESK_TOP_Y);
    drawKeyboard(ctx, 312, DESK_TOP_Y);
    drawMouse(ctx, 460, DESK_TOP_Y);

    // Floor item
    drawRunningShoes(ctx, 296, CH - 36);

    // Terminal inside monitor
    if (screenRectRef.current) {
      drawTerminal(ctx, screenRectRef.current, termRef.current);
    }

    // Hover outline — single-pixel pulsing rim around active hit zone
    if (hover) {
      const z = ZONES.find(zz => zz.id === hover)!;
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1;
      ctx.strokeRect(z.x + 0.5, z.y + 0.5, z.w - 1, z.h - 1);
      // tiny label tag in top-left of zone
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(z.x, z.y - 9, z.label.length * 5 + 6, 9);
      ctx.fillStyle = "#f4f4f4";
      ctx.font = "7px ui-monospace, Menlo, monospace";
      ctx.textBaseline = "top";
      ctx.fillText(z.label, z.x + 3, z.y - 8);
    }
  }, [hover]);

  // Initial paint + repaint on hover change.
  useEffect(() => { repaint(); }, [repaint]);

  // Cursor blink (re-render terminal area only via full repaint, cheap at this res).
  useEffect(() => {
    const id = window.setInterval(() => {
      termRef.current.cursorOn = !termRef.current.cursorOn;
      repaint();
    }, 520);
    return () => window.clearInterval(id);
  }, [repaint]);

  // Animate typing a command into the terminal, then open modal.
  const playType = useCallback(async (id: SectionId) => {
    setTyping(true);
    const s = SECTIONS[id];
    termRef.current.history = [
      ...termRef.current.history.slice(-3),
      `> opening ${s.title.toLowerCase()}…`,
    ];
    termRef.current.currentCmd = "";
    repaint();
    for (let i = 1; i <= s.cmd.length; i++) {
      termRef.current.currentCmd = s.cmd.slice(0, i);
      repaint();
      await new Promise(r => setTimeout(r, 40 + Math.random() * 50));
    }
    await new Promise(r => setTimeout(r, 280));
    termRef.current.history = [
      ...termRef.current.history,
      `$ ${s.cmd}`,
    ].slice(-5);
    termRef.current.currentCmd = "";
    repaint();
    setActive(id);
    setTyping(false);
  }, [repaint]);

  // Map a DOM pointer event to a hit zone in canvas-space.
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
        style={{
          imageRendering: "pixelated",
          cursor: hover ? "pointer" : "crosshair",
        }}
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
      {active && (
        <SectionModal id={active} onClose={() => setActive(null)} />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal — full-screen Apple-style window with section content.
// ─────────────────────────────────────────────────────────────
function SectionModal({ id, onClose }: { id: SectionId; onClose: () => void }) {
  const s = SECTIONS[id];

  // ESC to close
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
        {/* Title bar */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] border-b border-neutral-800">
          <button onClick={onClose} className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-125" aria-label="close" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 font-mono text-[11px] tracking-widest text-neutral-500 uppercase">{s.cmd}</span>
        </div>
        {/* Body */}
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
