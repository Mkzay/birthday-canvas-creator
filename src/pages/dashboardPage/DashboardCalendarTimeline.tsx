import { useEffect, useRef, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  subMonths,
} from 'date-fns';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { parseLocalDate } from '@/lib/date';
import type { BirthdayPage } from './types';

type DashboardCalendarTimelineProps = {
  pages: BirthdayPage[];
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
  onSelectPage: (page: BirthdayPage) => void;
};

export function DashboardCalendarTimeline({
  pages,
  selectedDate,
  onSelectDate,
  onSelectPage,
}: DashboardCalendarTimelineProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isGridExpanded, setIsGridExpanded] = useState<boolean>(false);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const timelineRef = useRef<HTMLDivElement>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Map celebrations by date string (yyyy-MM-dd)
  const pagesByDate = pages.reduce<Record<string, BirthdayPage[]>>((accumulator, page) => {
    const date = parseLocalDate(page.birthday_date);
    const key = format(date, 'yyyy-MM-dd');
    if (!accumulator[key]) {
      accumulator[key] = [];
    }
    accumulator[key].push(page);
    return accumulator;
  }, {});

  const handlePrevMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));
  const handleResetMonth = () => {
    setCurrentMonth(new Date());
    onSelectDate(null);
  };

  const handleScroll = (offset: number) => {
    if (timelineRef.current) {
      timelineRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const updateScrollProgress = () => {
    const element = timelineRef.current;
    if (!element) return;
    const maxScroll = element.scrollWidth - element.clientWidth;
    if (maxScroll <= 0) {
      setScrollProgress(0);
      return;
    }
    const current = element.scrollLeft;
    setScrollProgress(Math.min(100, Math.max(0, (current / maxScroll) * 100)));
  };

  useEffect(() => {
    updateScrollProgress();
  }, [monthDays]);

  const monthCelebrationsCount = pages.filter((page) => {
    const pageDate = parseLocalDate(page.birthday_date);
    return isSameMonth(pageDate, currentMonth);
  }).length;

  return (
    <section className="rounded-3xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-card space-y-4">
      {/* Calendar Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-100 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-amber-200/80 bg-amber-50 text-base shadow-xs">
            📅
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg sm:text-xl font-bold text-slate-950">
                {format(currentMonth, 'MMMM yyyy')} Celebration Timeline
              </h3>
              {monthCelebrationsCount > 0 && (
                <span className="rounded-full border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                  {monthCelebrationsCount} {monthCelebrationsCount === 1 ? 'Milestone' : 'Milestones'}
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500">
              Click any pinned birthday chip to highlight and inspect its canvas below.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-slate-950 transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleResetMonth}
            className="rounded-xl border border-stone-200 px-3 py-1.5 font-bold text-slate-700 hover:bg-stone-50 transition-colors"
          >
            Current Month
          </button>

          <button
            type="button"
            onClick={handleNextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-slate-950 transition-colors"
            title="Next Month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsGridExpanded((prev) => !prev)}
            className="ml-1.5 flex items-center gap-1 rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-1.5 font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <span>{isGridExpanded ? 'Collapse' : 'Full Month'}</span>
            {isGridExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {selectedDate && (
            <button
              type="button"
              onClick={() => onSelectDate(null)}
              className="ml-1 text-xs font-bold text-rose-600 hover:underline"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* HORIZONTAL TIMELINE STRIP (Native OS Scrollbar Hidden) */}
      <div className="relative group/timeline">
        <div
          ref={timelineRef}
          onScroll={updateScrollProgress}
          className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide scroll-smooth"
        >
          {monthDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayPages = pagesByDate[dateKey] || [];
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
            const isCurrentDay = isToday(day);

            if (dayPages.length > 0) {
              // Milestone Celebration Chip
              const primaryPage = dayPages[0];
              const isLive = primaryPage.status === 'active';

              return (
                <div
                  key={dateKey}
                  onClick={() => {
                    onSelectDate(isSelected ? null : day);
                    onSelectPage(primaryPage);
                  }}
                  className={`flex-1 min-w-[140px] sm:min-w-[160px] p-2.5 rounded-2xl border-2 cursor-pointer transition-all duration-200 text-left relative overflow-hidden shadow-xs hover:shadow-md ${
                    isSelected
                      ? 'border-amber-500 bg-gradient-to-br from-amber-100/90 to-rose-100/80 -translate-y-0.5'
                      : isLive
                      ? 'border-amber-300/90 bg-gradient-to-br from-amber-50/90 via-white to-rose-50/60 hover:border-amber-400'
                      : 'border-stone-200 bg-stone-50/80'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="uppercase text-amber-900">
                      {format(day, 'EEE · MMM d')}
                    </span>
                    {isLive ? (
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    ) : (
                      <span className="text-[10px]">✨</span>
                    )}
                  </div>

                  <p className="mt-1 truncate font-serif text-sm font-bold text-slate-950">
                    {primaryPage.recipient_name}&apos;s Day 🎂
                  </p>

                  <div className="mt-1 flex items-center justify-between text-[10px]">
                    <span className={isLive ? 'font-bold text-emerald-800' : 'font-semibold text-stone-500'}>
                      {isLive ? 'Active Collection' : 'Delivered'}
                    </span>
                    <span className="font-semibold text-stone-600">
                      {primaryPage.message_count || 0} {(primaryPage.message_count || 0) === 1 ? 'wish' : 'wishes'}
                    </span>
                  </div>
                </div>
              );
            }

            // Regular Day Chip
            return (
              <div
                key={dateKey}
                onClick={() => onSelectDate(isSelected ? null : day)}
                className={`flex-1 min-w-[65px] sm:min-w-[75px] p-2 rounded-2xl border text-center cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold'
                    : isCurrentDay
                    ? 'border-emerald-300 bg-emerald-50/70 text-emerald-950 font-semibold'
                    : 'border-stone-200/70 bg-stone-50/40 text-stone-400 hover:bg-stone-50 hover:text-stone-700'
                }`}
              >
                <span className="text-[10px] uppercase font-bold text-stone-400">
                  {format(day, 'EEE')}
                </span>
                <p className={`mt-0.5 text-xs font-bold ${isCurrentDay ? 'text-emerald-700' : ''}`}>
                  {format(day, 'd')}
                </p>
              </div>
            );
          })}
        </div>

        {/* CUSTOM ARCHITECTURAL TIMELINE SCRUBBER (Replaces Ugly OS Scrollbar) */}
        <div className="mt-3 flex items-center gap-3 px-1">
          <button
            type="button"
            onClick={() => handleScroll(-220)}
            className="h-6 w-6 rounded-full border border-stone-200 bg-stone-50/80 text-stone-500 hover:bg-stone-100 hover:text-slate-950 flex items-center justify-center shrink-0 transition-colors"
            title="Scroll backward"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          {/* Minimalist Scrub Track */}
          <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden relative border border-stone-200/60">
            <div
              className="h-full bg-slate-900 rounded-full transition-all duration-75"
              style={{
                width: '24%',
                marginLeft: `${scrollProgress * 0.76}%`,
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => handleScroll(220)}
            className="h-6 w-6 rounded-full border border-stone-200 bg-stone-50/80 text-stone-500 hover:bg-stone-100 hover:text-slate-950 flex items-center justify-center shrink-0 transition-colors"
            title="Scroll forward"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* FULL MONTH CALENDAR MATRIX (TOGGLEABLE) */}
      {isGridExpanded && (
        <div className="pt-3 border-t border-stone-100">
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold text-stone-400 mb-2">
            <span>SUN</span>
            <span>MON</span>
            <span>TUE</span>
            <span>WED</span>
            <span>THU</span>
            <span>FRI</span>
            <span>SAT</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-xs">
            {monthDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayPages = pagesByDate[dateKey] || [];
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={`matrix-${dateKey}`}
                  onClick={() => {
                    onSelectDate(isSelected ? null : day);
                    if (dayPages.length > 0) {
                      onSelectPage(dayPages[0]);
                    }
                  }}
                  className={`min-h-[64px] p-1.5 rounded-xl border cursor-pointer transition-all ${
                    dayPages.length > 0
                      ? 'border-amber-300 bg-gradient-to-br from-amber-50 via-white to-rose-50 shadow-xs'
                      : isSelected
                      ? 'border-amber-500 bg-amber-50'
                      : isCurrentDay
                      ? 'border-emerald-300 bg-emerald-50/60'
                      : 'border-stone-200/70 bg-white hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-bold ${isCurrentDay ? 'text-emerald-700' : 'text-slate-800'}`}>
                      {format(day, 'd')}
                    </span>
                    {dayPages.length > 0 && <span className="text-[10px]">🎂</span>}
                  </div>

                  {dayPages.map((page) => (
                    <p
                      key={page.id}
                      className="mt-1 truncate font-serif text-[11px] font-bold text-amber-900"
                    >
                      {page.recipient_name}
                    </p>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
