// Calendar helpers. Every date in the app is a local midnight, so days compare with +a === +b.
export const MS_DAY = 864e5;

/** Today at local midnight. Can be pinned (setToday) for the design preview and tests. */
let pinned: Date | null = null;
export const setToday = (d: Date | null) => { pinned = d ? midnight(d) : null; };
export const today = () => pinned ?? midnight(new Date());

export const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const daysBetween = (a: Date, b: Date) => Math.round((+midnight(b) - +midnight(a)) / MS_DAY);
/** Monday of the week containing d. */
export const weekStart = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));
export const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
export const monthEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

/** yyyy-mm-dd, used to store a workout's date. */
export const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fromKey = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };

const f = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-US', o);
export const shortDate = (d: Date) => f(d, { month: 'short', day: 'numeric' });          // Sep 25
export const weekdayShort = (d: Date) => f(d, { weekday: 'short' });                       // Fri
export const monthName = (d: Date) => f(d, { month: 'long' });                              // September
/** "Friday, 25 September" for screen headers. */
export const longDate = (d: Date) => `${f(d, { weekday: 'long' })}, ${d.getDate()} ${monthName(d)}`;
/** Today / Yesterday / weekday name this week / Sep 12. */
export function relativeDay(d: Date, now = today()) {
  const n = daysBetween(d, now);
  return n === 0 ? 'Today' : n === 1 ? 'Yesterday' : n > 1 && n < 7 ? f(d, { weekday: 'long' }) : shortDate(d);
}
/** "21–27 Sep", or "29 Sep – 5 Oct" across months. */
export function rangeLabel(a: Date, b: Date) {
  const m = (d: Date) => f(d, { month: 'short' });
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${m(b)}` : `${a.getDate()} ${m(a)} – ${b.getDate()} ${m(b)}`;
}
