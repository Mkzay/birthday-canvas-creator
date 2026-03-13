import React from 'react';
import { cn } from '@/lib/utils';

interface AnimatedBackgroundProps {
  showStars?: boolean;
  showWaves?: boolean;
  className?: string;
  theme?: 'light' | 'dark' | 'auto';
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ 
  showStars = true, 
  showWaves = true, 
  className,
  theme = 'auto'
}) => {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      {showStars && (
        <div className="absolute inset-0">
          {Array.from({ length: 20 }).map((_, i) => {
            const size = Math.random() * 3 + 1;
            const left = Math.random() * 100;
            const top = Math.random() * 100;
            const delay = Math.random() * 5;
            const duration = Math.random() * 3 + 2;
            return (
              <div
                key={`star-${i}`}
                className="animate-falling-star absolute rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  left: `${left}%`,
                  top: `-5%`,
                  opacity: Math.random() * 0.7 + 0.3,
                  animation: `falling-star ${duration}s linear ${delay}s infinite`,
                }}
              />
            );
          })}
        </div>
      )}

      {showWaves && (
        <div className="absolute bottom-0 left-0 right-0 h-[30vh] opacity-30 mix-blend-overlay">
          <div 
            className="animate-wave absolute bottom-0 left-0 w-[200%] h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTIwMCAxMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgcHJlc2VydmVBc3BlY3RSYXRpbz0ibm9uZSI+PHBhdGggZD0iTTMyMS4zOSw1Ni40NEMyMjguNTUsMTQuNjgsMTMxLjEsMjEuNTcsNTMsNjAuMTRMMCwwVjEyMEgxMjAwVjBDMTExNi42LDUxLjgzLDEwMjguMjEsOTMuNzMsOTIwLjk1LDkxLjcyQzc4NS4zOCw4OS4xNCw3NTQuMzcsMzMuODUsNjQxLDMzLjg1QzUzMS42NywzMy44NSw0MzUuNDEsMTA3LjY0LDMyMS4zOSw1Ni40NFoiIGZpbGw9IiNmZmZmZmYiPjwvcGF0aD48L3N2Zz4=')] bg-repeat-x bg-[length:50%_100%]" 
            style={{ animationDuration: '15s' }}
          />
          <div 
            className="animate-wave-slow absolute bottom-0 left-0 w-[200%] h-[80%] bg-[url('data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTIwMCAxMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgcHJlc2VydmVBc3BlY3RSYXRpbz0ibm9uZSI+PHBhdGggZD0iTTMyMS4zOSw1Ni40NEMyMjguNTUsMTQuNjgsMTMxLjEsMjEuNTcsNTMsNjAuMTRMMCwwVjEyMEgxMjAwVjBDMTExNi42LDUxLjgzLDEwMjguMjEsOTMuNzMsOTIwLjk1LDkxLjcyQzc4NS4zOCw4OS4xNCw3NTQuMzcsMzMuODUsNjQxLDMzLjg1QzUzMS42NywzMy44NSw0MzUuNDEsMTA3LjY0LDMyMS4zOSw1Ni40NFoiIGZpbGw9IiNmZmZmZmYiPjwvcGF0aD48L3N2Zz4=')] bg-repeat-x bg-[length:50%_100%] opacity-50" 
            style={{ animationDuration: '20s', animationDirection: 'reverse' }}
          />
        </div>
      )}
    </div>
  );
};

export default AnimatedBackground;