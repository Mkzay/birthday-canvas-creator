export function extractYouTubeId(url: string | null | undefined) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i);
  return match ? match[1] : null;
}

export function formatMediaTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function formatNairaFromKobo(amountKobo: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format((Number(amountKobo) || 0) / 100);
}

export function formatNairaNumberFromKobo(amountKobo: number) {
  return new Intl.NumberFormat('en-NG', {
    maximumFractionDigits: 0,
  }).format((Number(amountKobo) || 0) / 100);
}

export function normalizeHexColor(value?: string | null) {
  if (!value) return null;
  const normalized = value.trim();
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized) ? normalized : null;
}

export function mixHue(a: number, b: number) {
  const delta = ((b - a + 540) % 360) - 180;
  return (a + delta / 2 + 360) % 360;
}
