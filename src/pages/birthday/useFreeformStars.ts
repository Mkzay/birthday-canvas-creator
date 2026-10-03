import { useEffect, type RefObject } from 'react';

export function useFreeformStars(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  sectionRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) return;

    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    type ShootingStar = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      length: number;
      size: number;
      glow: number;
      life: number;
      maxLife: number;
      phase: number;
      alphaScale: number;
      isFast: boolean;
    };

    type StarBurstParticle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      size: number;
      glow: number;
      alphaScale: number;
      drag: number;
      gravity: number;
    };

    type StarBurst = {
      particles: StarBurstParticle[];
    };

    const stars: ShootingStar[] = [];
    const bursts: StarBurst[] = [];
    let rafId = 0;
    let lastTime = 0;
    let width = 0;
    let height = 0;

    const random = (min: number, max: number) => Math.random() * (max - min) + min;
    const targetCount = () => Math.max(10, Math.round(width / 170));

    const createStar = (): ShootingStar => {
      const spawnBand = Math.max(width * 0.35, 220);
      const x = random(-spawnBand, width + spawnBand * 0.08);
      const y = random(-Math.max(height * 0.4, 180), Math.max(height * 0.2, 120));
      const angle = random(24, 36) * (Math.PI / 180);
      const isFast = Math.random() < 0.2;
      const speed = isFast ? random(240, 330) : random(120, 210);
      return {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: isFast ? random(90, 150) : random(55, 105),
        size: isFast ? random(1.6, 2.3) : random(1.1, 1.8),
        glow: isFast ? random(16, 26) : random(8, 16),
        life: 0,
        maxLife: random(3.2, 5.4),
        phase: random(0, Math.PI * 2),
        alphaScale: isFast ? random(0.85, 1) : random(0.55, 0.85),
        isFast,
      };
    };

    const spawnExplosion = (star: ShootingStar) => {
      const count = star.isFast ? 14 : 9;
      const particles: StarBurstParticle[] = [];
      const baseAngle = Math.atan2(star.vy, star.vx);

      for (let i = 0; i < count; i += 1) {
        const spread = random(-0.9, 0.9);
        const angle = baseAngle + Math.PI + spread;
        const speed = random(24, star.isFast ? 120 : 80);
        particles.push({
          x: star.x,
          y: star.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: random(0.35, 0.75),
          size: random(1, star.isFast ? 2.4 : 1.8),
          glow: random(6, 14),
          alphaScale: random(0.65, 1),
          drag: random(1.8, 2.8),
          gravity: random(28, 54),
        });
      }

      bursts.push({ particles });
    };

    const isStarOut = (star: ShootingStar) => {
      const margin = 120;
      return (
        star.life >= star.maxLife ||
        star.x > width + margin ||
        star.y > height + margin
      );
    };

    const setupCanvas = () => {
      const rect = section.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(320, rect.width);
      height = Math.max(320, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    const drawStar = (star: ShootingStar, nowSeconds: number) => {
      const lifeRatio = Math.min(1, star.life / star.maxLife);
      const fadeIn = Math.min(1, star.life / 0.35);
      const fadeOut = Math.max(0, 1 - lifeRatio);
      const twinkle = 0.82 + Math.sin(nowSeconds * 6 + star.phase) * 0.18;
      const alpha = Math.max(0, Math.min(1, fadeIn * fadeOut * twinkle * star.alphaScale));
      if (alpha <= 0.005) return;

      const norm = Math.hypot(star.vx, star.vy) || 1;
      const tailX = star.x - (star.vx / norm) * star.length;
      const tailY = star.y - (star.vy / norm) * star.length;

      const gradient = ctx.createLinearGradient(tailX, tailY, star.x, star.y);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
      gradient.addColorStop(
        0.65,
        star.isFast
          ? `rgba(224, 242, 254, ${0.45 * alpha})`
          : `rgba(254, 240, 138, ${0.35 * alpha})`,
      );
      gradient.addColorStop(
        1,
        star.isFast
          ? `rgba(255, 255, 255, ${0.98 * alpha})`
          : `rgba(255, 251, 235, ${0.94 * alpha})`,
      );

      ctx.save();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = star.size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(star.x, star.y);
      ctx.stroke();

      ctx.shadowBlur = star.glow;
      ctx.shadowColor = star.isFast
        ? `rgba(186, 230, 253, ${0.95 * alpha})`
        : `rgba(253, 224, 71, ${0.85 * alpha})`;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size * 1.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawBurstParticle = (particle: StarBurstParticle) => {
      const lifeRatio = particle.life / particle.maxLife;
      const alpha = Math.max(0, (1 - lifeRatio) * particle.alphaScale);
      if (alpha <= 0.01) return;

      const glow = ctx.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        particle.size * 3.4,
      );
      glow.addColorStop(0, `rgba(255, 255, 255, ${0.95 * alpha})`);
      glow.addColorStop(0.4, `rgba(191, 219, 254, ${0.65 * alpha})`);
      glow.addColorStop(1, 'rgba(191, 219, 254, 0)');

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowBlur = particle.glow;
      ctx.shadowColor = `rgba(196, 232, 255, ${0.75 * alpha})`;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const tick = (now: number) => {
      const nowSeconds = now * 0.001;
      if (!lastTime) lastTime = now;
      const dt = Math.min(0.05, (now - lastTime) * 0.001);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      for (let i = stars.length - 1; i >= 0; i -= 1) {
        const star = stars[i];
        star.life += dt;
        star.x += star.vx * dt;
        star.y += star.vy * dt;

        if (isStarOut(star)) {
          spawnExplosion(star);
          stars[i] = createStar();
          continue;
        }

        drawStar(star, nowSeconds);
      }

      for (let i = bursts.length - 1; i >= 0; i -= 1) {
        const burst = bursts[i];

        for (let j = burst.particles.length - 1; j >= 0; j -= 1) {
          const particle = burst.particles[j];
          particle.life += dt;
          particle.vx *= 1 - dt * particle.drag;
          particle.vy = particle.vy * (1 - dt * particle.drag) + particle.gravity * dt;
          particle.x += particle.vx * dt;
          particle.y += particle.vy * dt;

          if (particle.life >= particle.maxLife) {
            burst.particles.splice(j, 1);
            continue;
          }

          drawBurstParticle(particle);
        }

        if (burst.particles.length === 0) {
          bursts.splice(i, 1);
        }
      }

      while (stars.length < targetCount()) {
        stars.push(createStar());
      }

      rafId = window.requestAnimationFrame(tick);
    };

    const handleResize = () => {
      setupCanvas();
      const wanted = targetCount();
      if (stars.length > wanted) {
        stars.length = wanted;
      }
      while (stars.length < wanted) {
        stars.push(createStar());
      }
    };

    setupCanvas();
    const initialStars = Math.max(8, Math.round(targetCount() * 0.85));
    for (let i = 0; i < initialStars; i += 1) {
      const star = createStar();
      star.life = random(0, star.maxLife * 0.75);
      stars.push(star);
    }

    rafId = window.requestAnimationFrame(tick);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      ctx.clearRect(0, 0, width, height);
    };
  }, [canvasRef, enabled, sectionRef]);
}
