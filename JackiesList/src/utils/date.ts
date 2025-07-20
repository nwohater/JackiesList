export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${period}`;
}

export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

export function isTomorrow(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear()
  );
}

export function isPastDue(date: Date | string, time?: string): boolean {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : new Date(date);
  const now = new Date();

  if (time) {
    const [hours, minutes] = time.split(':');
    d.setHours(parseInt(hours, 10), parseInt(minutes, 10));
  } else {
    // If no time specified, consider it due at end of day (23:59)
    d.setHours(23, 59, 59, 999);
  }

  return d < now;
}

export function getDaysUntil(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  
  const diffTime = d.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getDateString(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTimeString(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}