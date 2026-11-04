/**
 * DateRangeCalendar - Monthly calendar for selecting an inclusive preview date range
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from '../styles/DateRangeCalendar.module.css';

export interface DateRangeValue {
  startDate: Date;
  endDate: Date;
}

export interface DateRangeCalendarProps {
  value: DateRangeValue | null;
  onChange: (range: DateRangeValue) => void;
  disabled?: boolean;
  /** Inclusive selectable date bounds (typically full transaction span) */
  bounds?: DateRangeValue | null;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDdMmYyyy(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatMonthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month, 1));
}

function getMondayBasedWeekday(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

function monthKey(year: number, month: number): number {
  return year * 12 + month;
}

export function DateRangeCalendar({
  value,
  onChange,
  disabled = false,
  bounds = null,
}: Readonly<DateRangeCalendarProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingStart, setPendingStart] = useState<Date | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const boundStart = bounds ? startOfDay(bounds.startDate) : null;
  const boundEnd = bounds ? startOfDay(bounds.endDate) : null;

  const initialMonth = value?.startDate ?? boundStart ?? new Date();
  const [viewYear, setViewYear] = useState(initialMonth.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialMonth.getMonth());

  const valueStartTime = value?.startDate.getTime() ?? null;
  const valueEndTime = value?.endDate.getTime() ?? null;

  const isDayOutOfBounds = (day: Date): boolean => {
    if (!boundStart || !boundEnd) {
      return false;
    }
    const time = startOfDay(day).getTime();
    return time < boundStart.getTime() || time > boundEnd.getTime();
  };

  const minMonthKey = boundStart
    ? monthKey(boundStart.getFullYear(), boundStart.getMonth())
    : null;
  const maxMonthKey = boundEnd
    ? monthKey(boundEnd.getFullYear(), boundEnd.getMonth())
    : null;
  const currentMonthKey = monthKey(viewYear, viewMonth);
  const canGoPreviousMonth =
    minMonthKey === null || currentMonthKey > minMonthKey;
  const canGoNextMonth =
    maxMonthKey === null || currentMonthKey < maxMonthKey;

  useEffect(() => {
    if (valueStartTime === null || valueEndTime === null || !value) {
      return;
    }
    setViewYear(value.startDate.getFullYear());
    setViewMonth(value.startDate.getMonth());
    setPendingStart(null);
  }, [value, valueStartTime, valueEndTime]);

  useEffect(() => {
    if (disabled && isOpen) {
      setIsOpen(false);
      setPendingStart(null);
    }
  }, [disabled, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setPendingStart(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  const days = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startOffset = getMondayBasedWeekday(firstOfMonth);
    const gridStart = new Date(viewYear, viewMonth, 1 - startOffset);
    const cells: Date[] = [];
    for (let index = 0; index < 42; index += 1) {
      const cell = new Date(gridStart);
      cell.setDate(gridStart.getDate() + index);
      cells.push(cell);
    }
    return cells;
  }, [viewYear, viewMonth]);

  const rangeLabel = value
    ? `${formatDdMmYyyy(value.startDate)} – ${formatDdMmYyyy(value.endDate)}`
    : 'Select date range';

  const handleDayClick = (day: Date) => {
    if (isDayOutOfBounds(day)) {
      return;
    }

    const clicked = startOfDay(day);

    if (!pendingStart) {
      setPendingStart(clicked);
      return;
    }

    const start = pendingStart <= clicked ? pendingStart : clicked;
    const end = pendingStart <= clicked ? clicked : pendingStart;
    onChange({ startDate: start, endDate: end });
    setPendingStart(null);
    setIsOpen(false);
  };

  const goToPreviousMonth = () => {
    if (!canGoPreviousMonth) {
      return;
    }
    if (viewMonth === 0) {
      setViewYear((year) => year - 1);
      setViewMonth(11);
      return;
    }
    setViewMonth((month) => month - 1);
  };

  const goToNextMonth = () => {
    if (!canGoNextMonth) {
      return;
    }
    if (viewMonth === 11) {
      setViewYear((year) => year + 1);
      setViewMonth(0);
      return;
    }
    setViewMonth((month) => month + 1);
  };

  const isInSelectedRange = (day: Date): boolean => {
    if (!value) {
      return false;
    }
    const time = startOfDay(day).getTime();
    return time >= startOfDay(value.startDate).getTime() && time <= startOfDay(value.endDate).getTime();
  };

  return (
    <div className={`${styles.wrapper} ${disabled ? styles.wrapperDisabled : ''}`} ref={wrapperRef}>
      <span className={styles.label}>Date range</span>
      <div className={styles.triggerRow}>
        <button
          type="button"
          className={styles.trigger}
          onClick={() => {
            if (!disabled) {
              setIsOpen((open) => !open);
            }
          }}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label="Select preview date range"
        >
          <span>{rangeLabel}</span>
          <span aria-hidden="true">▾</span>
        </button>
      </div>

      {isOpen && !disabled && (
        <div className={styles.popover} role="dialog" aria-label="Date range calendar">
          <div className={styles.monthHeader}>
            <button
              type="button"
              className={styles.navButton}
              onClick={goToPreviousMonth}
              disabled={!canGoPreviousMonth}
              aria-label="Previous month"
            >
              ‹
            </button>
            <span className={styles.monthLabel}>{formatMonthLabel(viewYear, viewMonth)}</span>
            <button
              type="button"
              className={styles.navButton}
              onClick={goToNextMonth}
              disabled={!canGoNextMonth}
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className={styles.weekdays} aria-hidden="true">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday} className={styles.weekday}>
                {weekday}
              </span>
            ))}
          </div>

          <div className={styles.days}>
            {days.map((day) => {
              const inCurrentMonth = day.getMonth() === viewMonth;
              const outOfBounds = isDayOutOfBounds(day);
              const isStart = Boolean(
                (pendingStart && sameDay(day, pendingStart)) ||
                  (value && !pendingStart && sameDay(day, value.startDate))
              );
              const isEnd = Boolean(value && !pendingStart && sameDay(day, value.endDate));
              const inRange = !pendingStart && isInSelectedRange(day) && !(isStart && isEnd);

              const classNames = [styles.day];
              if (!inCurrentMonth) {
                classNames.push(styles.dayOutside);
              }
              if (outOfBounds) {
                classNames.push(styles.dayDisabled);
              }
              if (inRange && !outOfBounds) {
                classNames.push(styles.dayInRange);
              }
              if (isStart && !outOfBounds) {
                classNames.push(styles.dayStart);
              }
              if (isEnd && !outOfBounds) {
                classNames.push(styles.dayEnd);
              }

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  className={classNames.join(' ')}
                  onClick={() => handleDayClick(day)}
                  disabled={outOfBounds}
                  aria-label={
                    outOfBounds
                      ? `${formatDdMmYyyy(day)} unavailable`
                      : `Select ${formatDdMmYyyy(day)}`
                  }
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <p className={styles.hint}>
            {pendingStart
              ? `Start ${formatDdMmYyyy(pendingStart)} — click end date`
              : boundStart && boundEnd
                ? `Available ${formatDdMmYyyy(boundStart)} – ${formatDdMmYyyy(boundEnd)}`
                : 'Click start date, then end date'}
          </p>
        </div>
      )}
    </div>
  );
}
