import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

export default function CursorParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const lastMouse = useRef({ x: -100, y: -100 });
  const isMoving = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const updateSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', updateSize);
    updateSize();

    // Theme colors: Ambers and light golds to match the #e8a33d aesthetic
    const colors = ['#e8a33d', '#f3b55c', '#d9922c', '#ffcf87'];

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      lastMouse.current = { x: e.clientX, y: e.clientY };
      isMoving.current = true;

      // Add particles proportional to movement speed, capped at max
      const numParticles = Math.min(Math.floor(dist / 4), 5);
      
      for (let i = 0; i < (numParticles > 0 ? numParticles : 1); i++) {
        particles.current.push({
          x: e.clientX + (Math.random() - 0.5) * 10,
          y: e.clientY + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5 - 0.2, // Slight upward float
          size: Math.random() * 3 + 1,
          life: 0,
          maxLife: Math.random() * 30 + 30, // 30-60 frames
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    };

    let moveTimeout: ReturnType<typeof setTimeout>;
    const handleMouseStop = () => {
      clearTimeout(moveTimeout);
      moveTimeout = setTimeout(() => {
        isMoving.current = false;
      }, 100);
    };

    window.addEventListener('mousemove', (e) => {
      handleMouseMove(e);
      handleMouseStop();
    });

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.current.length; i++) {
        const p = particles.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        const progress = p.life / p.maxLife;
        const opacity = Math.max(0, 1 - progress);
        const size = Math.max(0, p.size * (1 - progress));

        if (p.life >= p.maxLife) {
          particles.current.splice(i, 1);
          i--;
          continue;
        }

        ctx.globalAlpha = opacity;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Add a subtle glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
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
      className="fixed inset-0 pointer-events-none z-[100]"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
