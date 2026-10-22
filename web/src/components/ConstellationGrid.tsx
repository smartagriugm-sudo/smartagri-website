import { useEffect, useRef } from "react";

// Interactive node mesh for the landing hero background: a grid of field
// "sensor" nodes held in place by springs. Moving the pointer pushes them away
// (harder the faster it moves), lights them mint and shows a small radar ring
// with a coordinate readout. Fills its positioned parent; draws a single static
// frame for visitors who prefer reduced motion and pauses while off screen.

type Node = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseX: number;
  baseY: number;
  radius: number;
  label: string;
  pulse: number;
};

const BG = "#08313A";
const NODE = "255, 255, 255";
const MINT = "69, 223, 177";

const SPACING = 55;
const MAX_CONN = 75;
const SPRING_K = 18;
const DAMPING = 0.82;
const POINTER_RADIUS = 220;

export default function ConstellationGrid({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let nodes: Node[] = [];
    let frameId = 0;
    let running = false;
    let lastTime = performance.now();

    const pointer = { x: -1000, y: -1000, prevX: -1000, prevY: -1000 };

    const initNodes = () => {
      nodes = [];
      cols = Math.ceil(width / SPACING) + 1;
      rows = Math.ceil(height / SPACING) + 1;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * SPACING;
          const y = j * SPACING;
          nodes.push({
            x,
            y,
            vx: 0,
            vy: 0,
            baseX: x,
            baseY: y,
            radius: Math.random() * 1.2 + 1.2,
            label: `${(i * 7).toString(16).toUpperCase()}:${(j * 11).toString(16).toUpperCase()}`,
            pulse: Math.random() * Math.PI * 2,
          });
        }
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initNodes();
      if (!running) draw(0);
    };

    const line = (a: Node, b: Node) => {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const distSq = dx * dx + dy * dy;
      if (distSq >= MAX_CONN * MAX_CONN) return;
      const alpha = (1 - Math.sqrt(distSq) / MAX_CONN) * 0.16;
      ctx.strokeStyle = `rgba(${NODE}, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    };

    const draw = (dt: number) => {
      const pvx = dt ? (pointer.x - pointer.prevX) / (dt * 1000) : 0;
      const pvy = dt ? (pointer.y - pointer.prevY) / (dt * 1000) : 0;
      pointer.prevX = pointer.x;
      pointer.prevY = pointer.y;
      const speed = Math.min(Math.sqrt(pvx * pvx + pvy * pvy), 20);

      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, width, height);

      // Spring-mass-damper: pointer pushes nodes out, springs pull them home.
      for (const n of nodes) {
        n.pulse += dt * 3;
        const dx = pointer.x - n.x;
        const dy = pointer.y - n.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < POINTER_RADIUS && dist > 0) {
          const force = (1 - dist / POINTER_RADIUS) * (1500 + speed * 150);
          n.vx -= (dx / dist) * force * dt;
          n.vy -= (dy / dist) * force * dt;
        }
        n.vx += (n.baseX - n.x) * SPRING_K * dt;
        n.vy += (n.baseY - n.y) * SPRING_K * dt;
        n.vx *= DAMPING;
        n.vy *= DAMPING;
        n.x += n.vx * dt * 60;
        n.y += n.vy * dt * 60;
      }

      // Connections: nodes live on a grid, so only grid neighbours can be in range.
      ctx.lineWidth = 0.7;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const n = nodes[i * rows + j];
          if (j + 1 < rows) line(n, nodes[i * rows + j + 1]);
          if (i + 1 < cols) {
            line(n, nodes[(i + 1) * rows + j]);
            if (j + 1 < rows) line(n, nodes[(i + 1) * rows + j + 1]);
            if (j > 0) line(n, nodes[(i + 1) * rows + j - 1]);
          }
        }
      }

      ctx.font = "500 9px Inter, system-ui, sans-serif";
      for (const n of nodes) {
        const dx = pointer.x - n.x;
        const dy = pointer.y - n.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const near = dist < POINTER_RADIUS;
        const alpha = near ? 0.95 : 0.25 + Math.sin(n.pulse) * 0.1;
        ctx.fillStyle = `rgba(${near ? MINT : NODE}, ${alpha})`;
        const r = near ? n.radius * 2.2 : n.radius + Math.sin(n.pulse) * 0.3;
        ctx.beginPath();
        ctx.arc(n.x, n.y, Math.max(0.5, r), 0, Math.PI * 2);
        ctx.fill();

        // Radar ring and coordinate readout right around the pointer.
        if (dist < 90) {
          const ring = ((n.pulse * 20) % 30) + 4;
          ctx.strokeStyle = `rgba(${MINT}, ${(1 - ring / 34) * 0.4})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(n.x, n.y, ring, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = 0.7;
          ctx.fillStyle = `rgba(${MINT}, 0.85)`;
          ctx.fillText(n.label, n.x + 10, n.y - 10);
        }
      }
    };

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      draw(dt);
      frameId = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running || reduced) return;
      running = true;
      lastTime = performance.now();
      frameId = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frameId);
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    };
    const onPointerLeave = () => {
      pointer.x = -1000;
      pointer.y = -1000;
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(parent);
    const visibility = new IntersectionObserver(([entry]) =>
      entry.isIntersecting ? start() : stop(),
    );
    visibility.observe(canvas);
    if (!reduced) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onPointerLeave);
    }

    return () => {
      stop();
      resizeObserver.disconnect();
      visibility.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`absolute inset-0 block select-none ${className}`}
    />
  );
}
