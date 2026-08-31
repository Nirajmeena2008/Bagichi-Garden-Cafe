import React, { useEffect, useRef } from 'react';

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  speed: number;
}

export default function BackgroundRipples() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ripples = useRef<Ripple[]>([]);
  const lastMouse = useRef({ x: -100, y: -100 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;

    const updateSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', updateSize);
    updateSize();

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Spawn a new ripple for every ~40px of movement to create a continuous wake
      if (dist > 40) {
        ripples.current.push({
          x: e.clientX,
          y: e.clientY,
          radius: 0,
          maxRadius: 80 + Math.random() * 40,
          life: 0,
          maxLife: 60 + Math.random() * 30, // Frames
          speed: 1 + Math.random() * 0.5,
        });
        lastMouse.current = { x: e.clientX, y: e.clientY };
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < ripples.current.length; i++) {
        const r = ripples.current[i];
        r.life++;
        // Smooth ease-out growth for the ripple
        r.radius += (r.maxRadius - r.radius) * 0.05 * r.speed;

        const progress = r.life / r.maxLife;
        // Faster fade out towards the end
        const opacity = Math.max(0, 1 - Math.pow(progress, 1.5));

        if (r.life >= r.maxLife) {
          ripples.current.splice(i, 1);
          i--;
          continue;
        }

        // Draw outer wave crest (Amber color)
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(232, 163, 61, ${opacity * 0.1})`;
        ctx.lineWidth = 1 + opacity * 1.5;
        ctx.stroke();

        // Draw inner wave trough for depth
        if (r.radius > 15) {
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius - 12, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(232, 163, 61, ${opacity * 0.05})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        
        // Soft glowing center for the liquid "wake" effect
        const gradient = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.radius);
        gradient.addColorStop(0, `rgba(232, 163, 61, ${opacity * 0.015})`);
        gradient.addColorStop(1, 'rgba(232, 163, 61, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[5]"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
