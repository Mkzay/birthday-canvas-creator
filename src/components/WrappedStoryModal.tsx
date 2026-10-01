import { useState, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  Music4,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Heart,
  Sparkles,
} from 'lucide-react';

export interface WrappedStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WRAPPED_SAMPLE_SLIDES = [
  {
    id: 'slide-1',
    author: 'Ebube & Angel',
    relation: 'Best Friends since UNILAG',
    avatar: 'TF',
    avatarGradient: 'from-amber-400 to-orange-500',
    quote:
      'Happy 23rd birthday Chi! From late night coding jams in Akoka to surviving third mainland bridge traffic together, having you as a brother is one of life’s greatest gifts. Keep winning!',
    photoUrl:
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80',
    photoCaption: 'Convocation Day ’23 · UNILAG',
    hasAudio: true,
    audioDuration: '0:38',
    sticker: '🎓',
    themeName: 'Twilight Gold',
  },
  {
    id: 'slide-2',
    author: 'Stephanie',
    relation: 'Lagos, Nigeria · Family',
    avatar: 'AF',
    avatarGradient: 'from-rose-400 to-pink-500',
    quote:
      'Happy 23rd my dearest Chi-Chi! May the good Lord enlarge your coast, grant you peace, and fill your days with boundless laughter and divine favor. You make all of us so proud.',
    photoUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    photoCaption: 'Family Sunday Brunch · Lagos, Nigeria',
    hasAudio: true,
    audioDuration: '0:48',
    sticker: '🌹',
    themeName: 'Rose Velvet',
  },
  {
    id: 'slide-3',
    author: 'Purple',
    relation: 'Friends',
    avatar: 'DS',
    avatarGradient: 'from-purple-400 to-indigo-500',
    quote:
      'Happy birthday to the most dependable teammate anyone could ask for! Your energy lifts every room you walk into. Here is to another milestone year of incredible breakthroughs!',
    photoUrl:
      'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80',
    photoCaption: 'Product Launch Party · Victoria Island',
    hasAudio: false,
    audioDuration: '',
    sticker: '🎉',
    themeName: 'Pastel Party',
  },
];

export default function WrappedStoryModal({ isOpen, onClose }: WrappedStoryModalProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioTimer, setAudioTimer] = useState(12);
  const [isMuted, setIsMuted] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(24);

  const activeSlide = WRAPPED_SAMPLE_SLIDES[currentSlideIndex];

  // Simulated voice note progression
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlayingAudio) {
      interval = setInterval(() => {
        setAudioTimer((prev) => (prev >= 38 ? 0 : prev + 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlayingAudio]);

  // Reset audio when slide changes
  useEffect(() => {
    setIsPlayingAudio(false);
    setAudioTimer(8);
    setLiked(false);
  }, [currentSlideIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setCurrentSlideIndex((prev) => (prev < WRAPPED_SAMPLE_SLIDES.length - 1 ? prev + 1 : 0));
      }
      if (e.key === 'ArrowLeft') {
        setCurrentSlideIndex((prev) => (prev > 0 ? prev - 1 : WRAPPED_SAMPLE_SLIDES.length - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Spotify Wrapped style birthday story preview"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 sm:p-6 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      {/* Modal Container: Warm champagne Festivo aesthetic, matching DesktopStorySection */}
      <div
        className="modal-scale-in relative flex flex-col w-full max-w-4xl max-h-[96vh] sm:max-h-[92vh] overflow-hidden rounded-[1.5rem] sm:rounded-[2.5rem] border border-amber-200/60 bg-[#FAF7F2] text-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP STORY HEADER (True to DesktopStorySection.tsx) */}
        <div className="relative border-b border-stone-200/80 bg-white/80 px-4 py-3 sm:px-6 sm:py-4 backdrop-blur-sm">
          {/* Segmented Story Progress Bars */}
          <div className="flex gap-2 mb-3">
            {WRAPPED_SAMPLE_SLIDES.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setCurrentSlideIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className="group relative h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200"
              >
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    idx === currentSlideIndex
                      ? 'w-full bg-amber-500'
                      : idx < currentSlideIndex
                      ? 'w-full bg-stone-400'
                      : 'w-0'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Spinning Vinyl Soundtrack Indicator */}
              <div className="flex items-center gap-2 rounded-full border border-stone-200/80 bg-amber-50/80 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-semibold text-amber-900 shadow-xs max-w-[180px] sm:max-w-none">
                <Music4 className="h-3.5 w-3.5 text-amber-600 animate-spin shrink-0" style={{ animationDuration: '6s' }} />
                <span className="truncate"><span className="hidden sm:inline">Soundtrack: </span>Golden Hour (Piano)</span>
              </div>

              {/* Mute button */}
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="btn-press flex h-8 w-8 items-center justify-center rounded-full border border-stone-200/80 bg-white text-slate-600 hover:text-slate-900 shadow-xs"
                title={isMuted ? 'Unmute' : 'Mute'}
                aria-label={isMuted ? 'Unmute soundtrack' : 'Mute soundtrack'}
              >
                {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Slide Index & Close */}
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-slate-600">
                Wish {currentSlideIndex + 1} of {WRAPPED_SAMPLE_SLIDES.length}
              </span>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close story preview"
                className="btn-press flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white text-slate-500 hover:bg-stone-100 hover:text-slate-900 shadow-xs"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* MAIN SLIDE STAGE: Responsive 2-column layout matching DesktopStorySection */}
        <div className="relative flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scrollbar-hide">
          <div key={currentSlideIndex} className="tab-crossfade grid gap-6 lg:grid-cols-12 lg:items-center">
            
            {/* LEFT COLUMN: The Wish Card (Span 7) */}
            <div className="lg:col-span-7">
              <div className="relative rounded-[1.5rem] sm:rounded-[2rem] border border-amber-200/80 bg-white p-4 sm:p-6 lg:p-8 shadow-card">
                {/* Washi Tape Header Decoration */}
                <div
                  className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 h-4 w-24 rounded-xs bg-amber-200/80 shadow-xs rotate-[-1deg]"
                  aria-hidden="true"
                />

                {/* Eyebrow & Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${activeSlide.avatarGradient} text-white font-bold text-xs shadow-xs`}
                    >
                      {activeSlide.avatar}
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-900">
                        {activeSlide.author}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {activeSlide.relation}
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-amber-100/80 px-2.5 py-1 text-[10px] font-bold text-amber-900">
                    Letter {currentSlideIndex + 1}
                  </span>
                </div>

                {/* Heartfelt Wish Quote in Playfair Display Serif */}
                <blockquote className="mt-4 font-playfair text-base sm:text-xl lg:text-2xl leading-relaxed text-slate-900 font-medium">
                  &ldquo;{activeSlide.quote}&rdquo;
                </blockquote>

                {/* Voice Note Player (True to FreeformSection / DesktopStorySection) */}
                {activeSlide.hasAudio && (
                  <div className="mt-4 sm:mt-6 rounded-xl sm:rounded-2xl border border-amber-200/80 bg-amber-50/70 p-3 sm:p-4 text-left">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                        Voice Note from {activeSlide.author}
                      </span>
                      <span className="text-[10px] font-bold text-amber-800">
                        0:{audioTimer < 10 ? `0${audioTimer}` : audioTimer} / {activeSlide.audioDuration}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                        aria-label={isPlayingAudio ? 'Pause voice note' : 'Play voice note'}
                        className="btn-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white shadow-md hover:bg-slate-800"
                      >
                        {isPlayingAudio ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4 ml-0.5" />
                        )}
                      </button>

                      {/* Animated Bouncing Waveform Volume Bars */}
                      <div className="flex h-6 flex-1 items-center gap-1">
                        {[30, 65, 95, 45, 80, 100, 55, 90, 40, 75, 85, 50, 70, 95, 60, 40, 85, 65, 45, 90].map(
                          (barH, i) => (
                            <span
                              key={i}
                              className={`w-1 rounded-full transition-all duration-150 ${
                                isPlayingAudio && i <= (audioTimer / 38) * 20
                                  ? 'bg-amber-600'
                                  : isPlayingAudio
                                  ? 'bg-amber-400'
                                  : 'bg-stone-300'
                              }`}
                              style={{
                                height: isPlayingAudio
                                  ? `${Math.max(25, (barH * Math.sin(i + audioTimer)) % 100)}%`
                                  : `${barH * 0.45}%`,
                              }}
                            />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Reactions Bar */}
                <div className="mt-5 flex items-center justify-between pt-3 border-t border-stone-200/60 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-xl select-none">{activeSlide.sticker}</span>
                    <span className="font-semibold text-slate-500">Theme: {activeSlide.themeName}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setLiked(!liked);
                      setLikeCount((c) => (liked ? c - 1 : c + 1));
                    }}
                    className={`btn-press flex items-center gap-1.5 rounded-full px-3 py-1 font-bold transition-all ${
                      liked
                        ? 'bg-rose-100 text-rose-600'
                        : 'bg-stone-100 text-slate-600 hover:bg-stone-200'
                    }`}
                  >
                    <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-rose-500 text-rose-500' : ''}`} />
                    <span>{likeCount}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Polaroid Photo Keepsake (Span 5) */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-[240px] sm:max-w-sm rounded-[1.5rem] sm:rounded-[2rem] border border-stone-200/80 bg-white p-3 sm:p-4 shadow-xl rotate-0 sm:rotate-[1.5deg] transition-[transform,box-shadow] duration-250 ease-emil hover:rotate-0">
                {/* Polaroid Top Tape */}
                <div
                  className="pointer-events-none absolute -top-3.5 left-1/2 -translate-x-1/2 h-4 w-28 rounded-xs bg-rose-200/80 shadow-xs rotate-[-2deg]"
                  aria-hidden="true"
                />

                {/* Photo frame */}
                <div className="aspect-[16/10] sm:aspect-[4/3] overflow-hidden rounded-lg sm:rounded-xl bg-stone-100 shadow-inner">
                  <img
                    src={activeSlide.photoUrl}
                    alt={activeSlide.photoCaption}
                    className="h-full w-full object-cover transition-transform duration-300 ease-emil hover:scale-105"
                    loading="lazy"
                  />
                </div>

                {/* Polaroid Caption */}
                <div className="pt-3 pb-1 text-center">
                  <p className="font-caveat text-xl text-slate-800 font-bold">
                    {activeSlide.photoCaption}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">
                    Attached with love by {activeSlide.author}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* FOOTER CONTROLS BAR */}
        <div className="flex items-center justify-between border-t border-stone-200/80 bg-white px-4 py-3 sm:px-6 sm:py-4">
          <button
            type="button"
            onClick={() =>
              setCurrentSlideIndex((prev) =>
                prev > 0 ? prev - 1 : WRAPPED_SAMPLE_SLIDES.length - 1
              )
            }
            className="btn-press flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-stone-100 shadow-xs"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>

          <span className="hidden sm:inline-block text-xs font-medium text-slate-400">
            Use arrow keys or click next to experience each slide
          </span>

          <button
            type="button"
            onClick={() =>
              setCurrentSlideIndex((prev) =>
                prev < WRAPPED_SAMPLE_SLIDES.length - 1 ? prev + 1 : 0
              )
            }
            className="btn-press flex items-center gap-1.5 rounded-full bg-slate-950 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 shadow-sm"
          >
            <span>Next Wish</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
