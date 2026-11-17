'use client';

import { useSyncExternalStore } from 'react';

type Format = 'date' | 'datetime' | 'time' | 'long';

const OPTIONS: Record<Format, Intl.DateTimeFormatOptions> = {
  date: { year: 'numeric', month: 'short', day: 'numeric' },
  datetime: { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
  time: { hour: '2-digit', minute: '2-digit' },
  long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
};

const noopSubscribe = () => () => {};

/**
 * Shows a date in the viewer's own time zone. The server renders UTC and the
 * browser switches to local time when it hydrates (no hydration mismatch).
 */
export function LocalTime({ value, format = 'date' }: { value: Date | string; format?: Format }) {
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const date = typeof value === 'string' ? new Date(value) : value;
  const text = isClient
    ? date.toLocaleString(undefined, OPTIONS[format])
    : date.toLocaleString('en-GB', { ...OPTIONS[format], timeZone: 'UTC' });

  return <time dateTime={date.toISOString()}>{text}</time>;
}
