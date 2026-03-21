import DOMPurify from 'dompurify';

/** Matches server `sanitize-html` allowlist for wish messages (server/index.ts). */
export const WISH_MESSAGE_ALLOWED_TAGS = ['b', 'i', 'u', 'strong', 'em', 'ul', 'ol', 'li', 'br', 'p'] as const;

export function sanitizeWishHtmlForDisplay(message: string): string {
  if (typeof window === 'undefined') return message;
  return DOMPurify.sanitize(message, {
    ALLOWED_TAGS: [...WISH_MESSAGE_ALLOWED_TAGS],
    ALLOWED_ATTR: [],
  });
}

export function wishMessageHtmlWithQuotes(message: string): string {
  return `\u201C${sanitizeWishHtmlForDisplay(message)}\u201D`;
}

export function isRichHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

export function stripHtml(html: string): string {
  if (typeof window === 'undefined') return html;
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
}
