export function extractPlainTextFromRichHtml(html: string) {
  if (!html) return '';

  const parserHost = document.createElement('div');
  parserHost.innerHTML = html;

  return (parserHost.textContent || parserHost.innerText || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatNairaInputWithCommas(raw: string) {
  const cleaned = raw.replace(/,/g, '').replace(/[^\d.]/g, '');
  if (!cleaned) return '';

  const [integerPartRaw = '', decimalRaw = ''] = cleaned.split('.');
  const integerPart = integerPartRaw.replace(/^0+(?=\d)/, '') || '0';
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const decimalPart = decimalRaw.slice(0, 2);

  return cleaned.includes('.') ? `${groupedInteger}.${decimalPart}` : groupedInteger;
}

export function formatKobo(value: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value / 100);
}

export function calculateTotalChargeKobo(contributionAmountKobo: number) {
  const platformFeeKobo = Math.round(contributionAmountKobo * 0.015);
  return contributionAmountKobo + platformFeeKobo;
}
