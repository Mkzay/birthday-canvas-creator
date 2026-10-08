import { differenceInDays } from 'date-fns';
import { parseLocalDate } from '@/lib/date';
import type { BirthdayPage } from './types';

export type DashboardStatusBadge = {
  label: string;
  className: string;
};

/** Status pill for owned pages on the dashboard (live list, not the fixed "Revealed" archived label). */
export function getDashboardStatusBadge(page: BirthdayPage): DashboardStatusBadge {
  const birthdayDate = parseLocalDate(page.birthday_date);
  const closeDate = page.close_date ? parseLocalDate(page.close_date) : birthdayDate;
  const daysUntilBirthday = differenceInDays(birthdayDate, new Date());
  const daysSinceBirthday = differenceInDays(new Date(), birthdayDate);
  const collectionWindowClosed = differenceInDays(closeDate, new Date()) < 0 && daysUntilBirthday > 0;

  if (page.status === 'delivered' || daysSinceBirthday > 3) {
    return { label: 'Delivered', className: 'bg-slate-900/8 text-slate-700' };
  }
  if (collectionWindowClosed) {
    return { label: 'Collection closed', className: 'bg-destructive/10 text-destructive' };
  }
  if (daysUntilBirthday <= 0) {
    return { label: 'Ready to reveal', className: 'bg-emerald-100 text-emerald-700' };
  }
  if (daysUntilBirthday <= 7) {
    return {
      label: `${daysUntilBirthday} day${daysUntilBirthday === 1 ? '' : 's'} left`,
      className: 'bg-amber-100 text-amber-700',
    };
  }

  return { label: 'Collecting wishes', className: 'bg-primary/10 text-primary' };
}
