"use client";

import { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface GlassCard3DProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  glow?: boolean;
}

export function GlassCard3D({ children, className, intensity = 7, glow = false }: GlassCard3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [tiltStyle, setTiltStyle] = useState<React.CSSProperties>({});
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const tiltX = (x - 0.5) * intensity;
    const tiltY = (y - 0.5) * -intensity;
    setTiltStyle({
      transform: `perspective(900px) rotateX(${tiltY}deg) rotateY(${tiltX}deg) translateZ(8px)`,
      transition: "transform 0.08s ease",
    });
    setGlowPos({ x: x * 100, y: y * 100 });
  }, [intensity]);

  const handleMouseLeave = useCallback(() => {
    setTiltStyle({
      transform: "perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0px)",
      transition: "transform 0.55s ease",
    });
  }, []);

  return (
    <div
      ref={ref}
      style={tiltStyle}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn("relative rounded-2xl overflow-hidden cursor-default", className)}
    >
      {/* Glow overlay on hover */}
      {glow && (
        <div
          className="pointer-events-none absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-2xl"
          style={{
            background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, oklch(var(--primary-raw, 0.52 0.16 345) / 0.12), transparent 60%)`,
          }}
        />
      )}
      {children}
    </div>
  );
}
