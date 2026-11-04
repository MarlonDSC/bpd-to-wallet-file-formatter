/**
 * AmountPresetDropdown - Preset selector for preview amount filtering
 */

import { useEffect, useRef, useState } from 'react';
import styles from '../styles/DateFilterDropdown.module.css';

export type AmountPreset = 'all' | 'income' | 'expenses' | 'custom';

const PRESET_OPTIONS: Array<{ value: AmountPreset; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'income', label: 'Income' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'custom', label: 'Custom' },
];

export interface AmountPresetDropdownProps {
  value: AmountPreset;
  onChange: (preset: AmountPreset) => void;
  disabled?: boolean;
}

export function AmountPresetDropdown({
  value,
  onChange,
  disabled = false,
}: Readonly<AmountPresetDropdownProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedLabel =
    PRESET_OPTIONS.find((option) => option.value === value)?.label ?? 'All';

  return (
    <div className={styles.dropdownContainer} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((open) => !open)}
        disabled={disabled}
        className={styles.dropdownButton}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Select amount preset"
      >
        <span>{selectedLabel}</span>
        <svg
          className={styles.chevronIcon}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu}>
          {PRESET_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`${styles.menuItem} ${
                value === option.value ? styles.menuItemSelected : ''
              }`}
            >
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
