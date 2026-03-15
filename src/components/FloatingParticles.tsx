import { useState } from 'react';

interface FloatingParticlesProps {
  hue: number;
  saturation: number;
  count?: number;
}

interface Particle {
  id: number;
  left: number;
  top: number;
  size: number;
  opacity: number;
  delay: number;
  duration: number;
  kind: 'circle' | 'ring';
}

const FloatingParticles = ({ hue, saturation, count = 18 }: FloatingParticlesProps) => {
  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 4 + Math.random() * 12,
      opacity: 0.12 + Math.random() * 0.22,
      delay: Math.random() * 8,
      duration: 6 + Math.random() * 10,
      kind: Math.random() > 0.65 ? 'ring' : 'circle',
    })),
  );

  const s = Math.min(saturation, 60);

  return (
    <div className="particle-field pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          className="particle-drift absolute rounded-full"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            background:
              p.kind === 'circle'
                ? `hsl(${hue} ${s}% 78%)`
                : 'transparent',
            border:
              p.kind === 'ring'
                ? `1.5px solid hsl(${hue} ${s}% 72% / 0.5)`
                : 'none',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
};

export default FloatingParticles;
