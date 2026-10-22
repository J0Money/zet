"use client";

import { useEffect, useState } from "react";

const COLORS = ["#4f46e5", "#818cf8", "#f59e0b", "#10b981", "#ef4444", "#ec4899"];

type Particle = { id: number; left: number; color: string; delay: number; duration: number; rotation: number };

function generateParticles(): Particle[] {
  return Array.from({ length: 36 }, (_, index) => ({
    id: index,
    left: Math.random() * 100,
    color: COLORS[index % COLORS.length],
    delay: Math.random() * 0.3,
    duration: 1.6 + Math.random() * 0.8,
    rotation: Math.random() * 360,
  }));
}

// Selve byggen: remountes med en ny `key` for hver fejring (se Confetti
// nedenfor), så partiklerne genereres friskt ved selve renderingen i stedet
// for i en effect, kun nedtællingen til at fjerne dem igen er en effect.
function ConfettiBurst() {
  const [visible, setVisible] = useState(true);
  const [particles] = useState(generateParticles);

  useEffect(() => {
    const timeout = setTimeout(() => setVisible(false), 2600);
    return () => clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map((particle) => (
        <span
          key={particle.id}
          style={{
            position: "absolute",
            top: "-10px",
            left: `${particle.left}%`,
            width: 8,
            height: 14,
            backgroundColor: particle.color,
            animation: `zet-confetti-fall ${particle.duration}s ease-in ${particle.delay}s forwards`,
            transform: `rotate(${particle.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}

// En lille, afhængighedsfri konfetti-animation (rene CSS-keyframes, se
// globals.css), ingen ekstern pakke nødvendig. `trigger` skal tælles op,
// hver gang konfettien skal vises igen, selve tallet bruges kun som key.
export function Confetti({ trigger }: { trigger: number }) {
  if (trigger === 0) return null;
  return <ConfettiBurst key={trigger} />;
}
