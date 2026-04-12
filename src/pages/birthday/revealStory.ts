import type { Message, RevealSlide } from './types';

export function getMessagePhotos(message: Message) {
  if (message.photos?.length) {
    return message.photos;
  }

  if (message.photo_url) {
    return [
      {
        id: `legacy-${message.id}`,
        photo_url: message.photo_url,
        caption: null,
        sort_order: 0,
      },
    ];
  }

  return [];
}

export function getSlideDuration(slide: RevealSlide | undefined) {
  if (!slide) return 6800;

  switch (slide.kind) {
    case 'cover':
      return 7800;
    case 'stats':
      return 7000;
    case 'organizer':
      return 8200;
    case 'wish': {
      const photoCount = getMessagePhotos(slide.message).length;
      const hasAudio = Boolean(slide.message.audio_url);
      if (hasAudio && photoCount >= 1) return 10600;
      if (hasAudio) return 10000;
      if (photoCount >= 3) return 9000;
      if (photoCount >= 1) return 8200;
      return 7400;
    }
    case 'closing':
      return 9200;
    default:
      return 6800;
  }
}

export function getStoryMotionDuration(slide: RevealSlide | undefined) {
  if (!slide) return 720;

  switch (slide.kind) {
    case 'cover':
      return 820;
    case 'stats':
      return 700;
    case 'organizer':
      return 760;
    case 'wish':
      return slide.message.audio_url ? 860 : 780;
    case 'closing':
      return 840;
    default:
      return 720;
  }
}

export function getMobileSectionLabel(slide: RevealSlide) {
  switch (slide.kind) {
    case 'cover':
      return 'Opening page';
    case 'stats':
      return 'Collected pieces';
    case 'organizer':
      return 'Organizer note';
    case 'wish':
      return `Letter ${slide.index + 1}`;
    case 'closing':
      return 'Final note';
    default:
      return 'Keepsake';
  }
}

export function getMobileSectionCaption(slide: RevealSlide) {
  switch (slide.kind) {
    case 'cover':
      return 'The first keepsake out of the envelope';
    case 'stats':
      return 'What made it into the birthday bundle';
    case 'organizer':
      return 'A note waiting between the pages';
    case 'wish':
      return 'One more piece of the story';
    case 'closing':
      return 'The last page of the reveal';
    default:
      return 'Another page in the story';
  }
}

export function getMobileSectionMarker(slide: RevealSlide) {
  switch (slide.kind) {
    case 'cover':
      return '✦';
    case 'stats':
      return '◌';
    case 'organizer':
      return '♥';
    case 'wish':
      return '✉';
    case 'closing':
      return '✺';
    default:
      return '•';
  }
}

export function getMobileSectionTone(slide: RevealSlide, isDarkExperience: boolean) {
  if (isDarkExperience) {
    switch (slide.kind) {
      case 'cover':
        return {
          lineClass: 'bg-[linear-gradient(90deg,transparent,rgba(255,214,153,0.55),transparent)]',
          badgeClass: 'border-white/16 bg-white/10 text-white/88',
        };
      case 'stats':
        return {
          lineClass: 'bg-[linear-gradient(90deg,transparent,rgba(196,181,253,0.55),transparent)]',
          badgeClass: 'border-white/16 bg-white/10 text-white/88',
        };
      case 'organizer':
        return {
          lineClass: 'bg-[linear-gradient(90deg,transparent,rgba(251,113,133,0.5),transparent)]',
          badgeClass: 'border-white/16 bg-white/10 text-white/88',
        };
      case 'wish':
        return {
          lineClass: 'bg-[linear-gradient(90deg,transparent,rgba(147,197,253,0.5),transparent)]',
          badgeClass: 'border-white/16 bg-white/10 text-white/88',
        };
      case 'closing':
        return {
          lineClass: 'bg-[linear-gradient(90deg,transparent,rgba(253,224,71,0.55),transparent)]',
          badgeClass: 'border-white/16 bg-white/10 text-white/88',
        };
      default:
        return {
          lineClass: 'bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)]',
          badgeClass: 'border-white/16 bg-white/10 text-white/88',
        };
    }
  }

  switch (slide.kind) {
    case 'cover':
      return {
        lineClass: 'bg-[linear-gradient(90deg,transparent,rgba(245,158,11,0.4),transparent)]',
        badgeClass: 'border-amber-200/80 bg-amber-50/90 text-amber-900',
      };
    case 'stats':
      return {
        lineClass: 'bg-[linear-gradient(90deg,transparent,rgba(96,165,250,0.32),transparent)]',
        badgeClass: 'border-sky-200/80 bg-sky-50/92 text-sky-900',
      };
    case 'organizer':
      return {
        lineClass: 'bg-[linear-gradient(90deg,transparent,rgba(251,113,133,0.32),transparent)]',
        badgeClass: 'border-rose-200/80 bg-rose-50/92 text-rose-900',
      };
    case 'wish':
      return {
        lineClass: 'bg-[linear-gradient(90deg,transparent,rgba(192,132,252,0.32),transparent)]',
        badgeClass: 'border-fuchsia-200/80 bg-fuchsia-50/92 text-fuchsia-900',
      };
    case 'closing':
      return {
        lineClass: 'bg-[linear-gradient(90deg,transparent,rgba(34,197,94,0.28),transparent)]',
        badgeClass: 'border-emerald-200/80 bg-emerald-50/92 text-emerald-900',
      };
    default:
      return {
        lineClass: 'bg-[linear-gradient(90deg,transparent,rgba(15,23,42,0.14),transparent)]',
        badgeClass: 'border-white/70 bg-white/84 text-foreground',
      };
  }
}
