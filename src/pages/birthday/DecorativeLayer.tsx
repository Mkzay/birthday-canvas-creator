import { useState } from 'react';

export const DecorativeLayer = ({ colors }: { colors: readonly string[] }) => {
  const [bubbles] = useState(() =>
    Array.from({ length: 12 }, (_, index) => ({
      id: index,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 80 + Math.random() * 160,
      color: colors[index % colors.length],
    })),
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="absolute rounded-full blur-3xl"
          style={{
            left: `${bubble.left}%`,
            top: `${bubble.top}%`,
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            backgroundColor: bubble.color,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  );
};
