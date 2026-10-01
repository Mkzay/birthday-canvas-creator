import { useState } from 'react';
import {
  Sparkles,
  Share2,
  Mic,
  Gift,
  Play,
  Check,
  Copy,
  Music,
  ArrowRight,
  Heart,
  Palette,
  Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import WrappedStoryModal from '@/components/WrappedStoryModal';

const STEPS_DATA = [
  {
    step: '01',
    icon: Sparkles,
    tabLabel: '1. Pick Theme & Date',
    badge: 'Takes 60 secs ⚡',
    title: 'Create Your Canvas in Minutes',
    description:
      'Enter the birthday person’s name, choose their milestone date, pick a curated visual theme, and set an ambient acoustic soundtrack.',
    accent: 'bg-rose-50 text-rose-600 border-rose-200/80',
    doodle: 'No design skills needed ◡̈',
  },
  {
    step: '02',
    icon: Share2,
    tabLabel: '2. Share Secret Link',
    badge: 'Zero App or Signup 🚀',
    title: 'Send One Link on WhatsApp or Group Chats',
    description:
      'Drop your unique canvas link into family and friend group chats. Guests open it instantly on any phone without downloading an app or creating an account.',
    accent: 'bg-amber-50 text-amber-700 border-amber-200/80',
    doodle: 'Keep it a surprise 🤫',
  },
  {
    step: '03',
    icon: Mic,
    tabLabel: '3. Wishes & Audio Pour In',
    badge: 'Voice + Throwback Photos 🎙️',
    title: 'Watch Wishes & Voice Notes Pin Themselves',
    description:
      'Friends and family record heartfelt voice notes, attach throwback photos from school or vacations, and write personal birthday blessings.',
    accent: 'bg-purple-50 text-purple-600 border-purple-200/80',
    doodle: 'Hear grandma’s laughter ❤️',
  },
  {
    step: '04',
    icon: Gift,
    tabLabel: '4. The Midnight Reveal',
    badge: 'Tears Guaranteed 🥹',
    title: 'The Wax Seal Unlocks at Midnight',
    description:
      'At 12:00 AM on their birthday, the envelope unlocks. All gathered wishes and voices play as a cinematic Spotify Wrapped-style musical presentation.',
    accent: 'bg-emerald-50 text-emerald-600 border-emerald-200/80',
    doodle: 'The best birthday gift ever 🎁',
  },
];

const HowItWorksSection = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showWrappedModal, setShowWrappedModal] = useState(false);
  const [selectedThemePreview, setSelectedThemePreview] = useState<'twilight' | 'rose' | 'cosmic'>('twilight');

  const handleCopyLink = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  return (
    <section id="how-it-works" className="relative overflow-hidden bg-white py-20 px-4 sm:px-6 sm:py-28">
      {/* Background Subtle Sparkle Blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[5%] top-1/4 h-80 w-80 rounded-full bg-amber-500/5 blur-3xl" />
        <div className="absolute right-[5%] bottom-1/4 h-96 w-96 rounded-full bg-rose-500/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-10 border-b border-stone-200/60">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.25em] text-amber-800">
              The Journey
            </span>
            <h2 className="mt-3 font-playfair text-3xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
              How The Magic Happens
            </h2>
          </div>

          <div className="font-caveat text-xl sm:text-2xl text-slate-600 select-none sm:text-right">
            You share the link, everyone shows up ◡̈
          </div>
        </div>

        {/* PLAYFUL INTERACTIVE STEP NAVIGATOR TABS */}
        <div className="mt-10">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
            {STEPS_DATA.map((item, index) => {
              const Icon = item.icon;
              const isActive = activeStep === index;
              return (
                <button
                  key={item.step}
                  type="button"
                  onClick={() => setActiveStep(index)}
                  className={`btn-press group relative flex flex-col items-start rounded-2xl border p-4 text-left transition-[border-color,background-color,box-shadow] duration-200 ease-emil ${
                    isActive
                      ? 'border-slate-950 bg-[#FAF7F2] shadow-md ring-1 ring-slate-950/10'
                      : 'border-stone-200/80 bg-white hover:border-stone-300 hover:bg-stone-50/50'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl font-black text-xs transition-colors duration-150 ${
                        isActive
                          ? 'bg-slate-950 text-white'
                          : 'bg-stone-100 text-slate-600 group-hover:bg-stone-200'
                      }`}
                    >
                      {item.step}
                    </span>
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {item.badge.split(' ')[0]}
                    </span>
                  </div>

                  <p className="mt-3 font-bold text-sm text-slate-900 leading-snug">
                    {item.tabLabel}
                  </p>
                  
                  <span className="mt-1 font-caveat text-xs text-amber-800">
                    {item.doodle}
                  </span>

                  {/* Active Indicator Underline */}
                  {isActive && (
                    <div className="absolute inset-x-4 -bottom-px h-1 rounded-t-full bg-slate-950" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* INTERACTIVE STEP STAGE / DEMONSTRATION BOX */}
        <div className="mt-8 overflow-hidden rounded-[2.5rem] border border-amber-200/80 bg-gradient-to-br from-[#FFFDF9] via-[#FAF7F2] to-[#F5EFE6] p-6 sm:p-10 shadow-xl">
          <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
            
            {/* Left: Step Explanation & Micro Actions (Span 5) */}
            <div key={`info-${activeStep}`} className="tab-crossfade text-left lg:col-span-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-800 shadow-xs border border-stone-200/60">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white text-[10px]">
                  {STEPS_DATA[activeStep].step}
                </span>
                <span>{STEPS_DATA[activeStep].badge}</span>
              </div>

              <h3 className="mt-4 font-playfair text-2xl sm:text-4xl font-extrabold text-slate-950 leading-tight">
                {STEPS_DATA[activeStep].title}
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                {STEPS_DATA[activeStep].description}
              </p>

              {/* Step Navigation Controls */}
              <div className="mt-8 flex items-center gap-3">
                {activeStep > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setActiveStep((prev) => prev - 1)}
                    className="btn-press rounded-full border-stone-300 bg-white text-xs font-bold text-slate-700"
                  >
                    Back
                  </Button>
                )}

                {activeStep < STEPS_DATA.length - 1 ? (
                  <Button
                    onClick={() => setActiveStep((prev) => prev + 1)}
                    className="btn-press rounded-full bg-slate-950 px-6 text-xs font-bold text-white shadow-md hover:bg-slate-800"
                  >
                    <span>Next: {STEPS_DATA[activeStep + 1].tabLabel}</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowWrappedModal(true)}
                    className="btn-press rounded-full bg-slate-950 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-800"
                  >
                    <span>Experience The Midnight Reveal</span>
                    <Sparkles className="h-3.5 w-3.5 ml-1.5 inline" />
                  </button>
                )}
              </div>
            </div>

            {/* Right: Interactive Visual Simulation of the Step (Span 7) */}
            <div className="lg:col-span-7">
              <div key={`sim-${activeStep}`} className="tab-crossfade relative mx-auto w-full max-w-lg rounded-3xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-md">
                
                {/* STEP 1 SIMULATION: Theme & Date Picker */}
                {activeStep === 0 && (
                  <div className="space-y-4 text-left animate-fade-in">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                      <div>
                        <p className="text-xs font-bold text-slate-950">Choose Theme &amp; Mood</p>
                        <p className="text-[11px] text-slate-500">Preview changes in real time</p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-900">
                        Interactive Preview
                      </span>
                    </div>

                    {/* Theme Swatch Toggles */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedThemePreview('twilight')}
                        className={`btn-press rounded-xl border p-2.5 text-left transition-all ${
                          selectedThemePreview === 'twilight'
                            ? 'border-amber-500 bg-amber-50/50 shadow-xs ring-1 ring-amber-500'
                            : 'border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        <div className="h-4 w-full rounded-md bg-gradient-to-r from-amber-300 via-amber-100 to-rose-200 mb-1.5" />
                        <p className="text-xs font-bold text-slate-900">Twilight Gold</p>
                        <p className="text-[10px] text-slate-500">Champagne</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedThemePreview('rose')}
                        className={`btn-press rounded-xl border p-2.5 text-left transition-all ${
                          selectedThemePreview === 'rose'
                            ? 'border-rose-500 bg-rose-50/50 shadow-xs ring-1 ring-rose-500'
                            : 'border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        <div className="h-4 w-full rounded-md bg-gradient-to-r from-rose-300 via-pink-100 to-amber-100 mb-1.5" />
                        <p className="text-xs font-bold text-slate-900">Rose Velvet</p>
                        <p className="text-[10px] text-slate-500">Romantic</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedThemePreview('cosmic')}
                        className={`btn-press rounded-xl border p-2.5 text-left transition-all ${
                          selectedThemePreview === 'cosmic'
                            ? 'border-indigo-500 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500'
                            : 'border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        <div className="h-4 w-full rounded-md bg-gradient-to-r from-indigo-900 via-purple-800 to-slate-900 mb-1.5" />
                        <p className="text-xs font-bold text-slate-900">Cosmic Sky</p>
                        <p className="text-[10px] text-slate-500">Starlight</p>
                      </button>
                    </div>

                    {/* Result Preview Card */}
                    <div
                      className={`rounded-2xl border p-4 text-center transition-all ${
                        selectedThemePreview === 'twilight'
                          ? 'border-amber-200 bg-amber-50/40 text-amber-950'
                          : selectedThemePreview === 'rose'
                          ? 'border-rose-200 bg-rose-50/40 text-rose-950'
                          : 'border-indigo-900/40 bg-slate-900 text-white'
                      }`}
                    >
                      <span className="font-caveat text-sm">Theme active:</span>
                      <h4 className="font-playfair text-xl font-bold mt-1">
                        Happy Birthday, Kemi!
                      </h4>
                      <p className="text-xs opacity-75 mt-1">
                        Reveal Date: October 12, 2026 · Sound: Golden Hour (Piano)
                      </p>
                    </div>
                  </div>
                )}

                {/* STEP 2 SIMULATION: One Secret Link Share */}
                {activeStep === 1 && (
                  <div className="space-y-4 text-left animate-fade-in">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                      <div>
                        <p className="text-xs font-bold text-slate-950">WhatsApp Invite Card</p>
                        <p className="text-[11px] text-slate-500">Zero apps or passwords for guests</p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                        Ready To Share
                      </span>
                    </div>

                    {/* WhatsApp-Style Chat Bubble */}
                    <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                          💬
                        </div>
                        <span className="text-xs font-bold text-emerald-950">Family &amp; Friends Group</span>
                      </div>
                      <p className="text-xs text-slate-800 leading-relaxed">
                        &ldquo;Hey everyone! Kemi is turning 25 on Oct 12! Leave your audio voice notes, photos, and birthday blessings on this secret canvas before the midnight reveal! 🎂🤫&rdquo;
                      </p>
                      <div className="mt-2.5 inline-block rounded-lg bg-white px-2.5 py-1 text-[11px] font-mono font-bold text-emerald-700 shadow-xs border border-emerald-200">
                        wishcanvas.app/kemi-25
                      </div>
                    </div>

                    {/* Copy Link Action Button */}
                    <div className="flex items-center justify-between rounded-xl bg-stone-50 border border-stone-200 p-2.5">
                      <span className="text-xs font-mono text-slate-600 truncate mr-2">
                        https://wishcanvas.app/kemi-25
                      </span>
                      <Button
                        size="sm"
                        onClick={handleCopyLink}
                        className={`btn-press rounded-lg px-4 text-xs font-bold transition-all ${
                          copiedLink
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-slate-950 hover:bg-slate-800 text-white'
                        }`}
                      >
                        {copiedLink ? (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1" />
                            <span>Copied! 📋</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 mr-1" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 3 SIMULATION: Wishes & Audio Notes Arriving */}
                {activeStep === 2 && (
                  <div className="space-y-3 text-left animate-fade-in">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                      <div>
                        <p className="text-xs font-bold text-slate-950">Live Contribution Feed</p>
                        <p className="text-[11px] text-slate-500">Messages pin themselves to the canvas</p>
                      </div>
                      <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-800">
                        3 New Wishes
                      </span>
                    </div>

                    {/* Card 1: Auntie Folake with voice note */}
                    <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3 shadow-xs">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">Auntie Folake (London)</span>
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                          🎙️ Voice (0:48)
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        &ldquo;May the good Lord enlarge your coast Kem-Kem...&rdquo;
                      </p>
                    </div>

                    {/* Card 2: Tobi & Femi with photo */}
                    <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3 shadow-xs">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">Tobi &amp; Femi</span>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          📷 Photo Attached
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        &ldquo;UNILAG Convocation &apos;23! Brothers for life!&rdquo;
                      </p>
                    </div>

                    {/* Card 3: Chioma & Dayo */}
                    <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3 shadow-xs">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">Chioma (Abuja)</span>
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                          💌 Note
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        &ldquo;To more adventures and laughter this year!&rdquo;
                      </p>
                    </div>
                  </div>
                )}

                {/* STEP 4 SIMULATION: The Midnight Reveal Wax Seal */}
                {activeStep === 3 && (
                  <div className="space-y-4 text-center animate-fade-in py-2">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl shadow-inner border border-amber-200">
                      💌
                    </div>

                    <div>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
                        Midnight Wax Seal Locked 🔒
                      </span>
                      <h4 className="font-playfair text-xl font-bold text-slate-950 mt-2">
                        Reveals October 12, 12:00 AM
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                        Zero spoilers before the birthday. When midnight hits, the canvas unlocks with background music and a full-screen Spotify Wrapped slide experience.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowWrappedModal(true)}
                      className="btn-press rounded-full bg-slate-950 px-6 py-3 text-xs font-bold text-white shadow-lg hover:bg-slate-800"
                    >
                      <span>Break Wax Seal &amp; Test Reveal</span>
                      <Play className="h-3 w-3 fill-white ml-2 inline" />
                    </button>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>

        {/* 4 CELEBRATORY CONNECTED MILESTONE CARDS WITH PLAYFUL DOODLES */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS_DATA.map((s, index) => {
            const Icon = s.icon;
            return (
              <div
                key={s.step}
                className="card-lift relative flex flex-col items-center rounded-3xl border border-stone-200/80 bg-[#FAF7F2] p-7 text-center shadow-xs"
              >
                {/* Ribbon Connector on Desktop */}
                {index < 3 && (
                  <div
                    className="pointer-events-none absolute -right-4 top-12 z-10 hidden text-xl lg:block select-none opacity-40"
                    aria-hidden="true"
                  >
                    ⋯⋯
                  </div>
                )}

                {/* Icon Container */}
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border shadow-xs ${s.accent}`}>
                  <Icon className="h-6 w-6" />
                </div>

                {/* Step badge */}
                <span className="mt-4 rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-700 shadow-xs border border-stone-200/60">
                  Step {s.step}
                </span>

                {/* Title & Description */}
                <h3 className="mt-4 text-base font-extrabold text-slate-950">
                  {s.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500 font-medium">
                  {s.description}
                </p>

                {/* Handwritten micro doodle */}
                <span className="mt-4 font-caveat text-sm text-amber-800 select-none">
                  {s.doodle}
                </span>
              </div>
            );
          })}
        </div>

        {/* Big Showcase Banner with Wrapped Story Trigger */}
        <div className="mt-14 relative overflow-hidden rounded-[2.5rem] border border-stone-200/80 bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-purple-500/10 p-8 sm:p-14 text-center shadow-card">
          <div className="pointer-events-none absolute -top-10 -right-10 h-64 w-64 rounded-full bg-amber-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-64 w-64 rounded-full bg-rose-200/30 blur-3xl" />

          <div className="relative mx-auto max-w-2xl">
            <span className="font-caveat text-2xl text-slate-700 select-none">
              Real Celebrations, Real Smiles ◡̈
            </span>

            <h3 className="mt-3 font-playfair text-2xl sm:text-4xl font-extrabold text-slate-950">
              See How Collected Messages Turn Into An Unforgettable Reveal
            </h3>

            <p className="mt-3 text-sm text-slate-600 font-medium">
              Wishes unfold one by one with soft background music, full-screen slide transitions, and Polaroid memory photos.
            </p>

            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setShowWrappedModal(true)}
                className="group flex items-center gap-3 rounded-full bg-slate-950 px-8 py-4 text-sm font-bold text-white shadow-xl transition-all hover:bg-slate-800 hover:scale-105 active:scale-95"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-950 transition-transform group-hover:scale-110">
                  <Play className="h-3 w-3 fill-slate-950 ml-0.5" />
                </div>
                <span>Watch The Full Reveal Story</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* LIGHT THEMED AUTHENTIC WRAPPED MODAL */}
      <WrappedStoryModal
        isOpen={showWrappedModal}
        onClose={() => setShowWrappedModal(false)}
      />
    </section>
  );
};

export default HowItWorksSection;
