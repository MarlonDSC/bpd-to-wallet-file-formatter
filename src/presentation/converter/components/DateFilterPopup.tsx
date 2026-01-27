/**
 * DateFilterPopup - Popup component for multi-selection of date filters
 */

import { useState, useEffect, useRef } from 'react';
import type { DateFilterDto } from '../../../application/excel/dtos/DateFilterDto';
import styles from '../styles/DateFilterPopup.module.css';

export interface DateFilterPopupProps {
  filters: DateFilterDto[];
  selectedFilters: DateFilterDto[];
  onApply: (selectedFilters: DateFilterDto[]) => void;
  onCancel: () => void;
  title: string;
}

export function DateFilterPopup({
  filters,
  selectedFilters: initialSelectedFilters,
  onApply,
  onCancel,
  title,
}: Readonly<DateFilterPopupProps>) {
  const [selectionMode, setSelectionMode] = useState<'all' | 'select'>(
    initialSelectedFilters.length === filters.length ? 'all' : 'select'
  );
  const [selectedFilters, setSelectedFilters] = useState<DateFilterDto[]>(
    initialSelectedFilters
  );
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onCancel]);

  // Update selected filters when mode changes
  useEffect(() => {
    if (selectionMode === 'all') {
      setSelectedFilters(filters.filter((f) => f.isAvailable));
    } else {
      // Keep current selections when switching to select mode
      setSelectedFilters(
        initialSelectedFilters.filter((f) =>
          filters.some((filter) => filter.label === f.label)
        )
      );
    }
  }, [selectionMode, filters, initialSelectedFilters]);

  const handleToggleFilter = (filter: DateFilterDto) => {
    if (!filter.isAvailable) return;

    setSelectedFilters((prev) => {
      const isSelected = prev.some((f) => f.label === filter.label);
      if (isSelected) {
        return prev.filter((f) => f.label !== filter.label);
      } else {
        return [...prev, filter];
      }
    });
    setSelectionMode('select');
  };

  const handleApply = () => {
    const filtersToApply =
      selectionMode === 'all'
        ? filters.filter((f) => f.isAvailable)
        : selectedFilters;
    onApply(filtersToApply);
  };

  const availableFilters = filters.filter((f) => f.isAvailable);

  return (
    <div className={styles.popupOverlay} aria-modal="true" aria-labelledby="popup-title">
      <div className={styles.popup} ref={popupRef}>
        <div className={styles.popupHeader}>
          <h3 id="popup-title" className={styles.popupTitle}>{title}</h3>
          <button
            type="button"
            onClick={onCancel}
            className={styles.closeButton}
            aria-label="Close popup"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.popupContent}>
          {/* All section */}
          <div className={styles.section}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="selection-mode"
                checked={selectionMode === 'all'}
                onChange={() => setSelectionMode('all')}
                className={styles.radioInput}
              />
              <span className={styles.radioText}>All</span>
            </label>
            <span className={styles.count}>
              ({availableFilters.length} {availableFilters.length === 1 ? 'item' : 'items'})
            </span>
          </div>

          {/* Select section */}
          <div className={styles.section}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="selection-mode"
                checked={selectionMode === 'select'}
                onChange={() => setSelectionMode('select')}
                className={styles.radioInput}
              />
              <span className={styles.radioText}>Select</span>
            </label>
            <span className={styles.count}>
              ({selectedFilters.length} of {availableFilters.length} selected)
            </span>
          </div>

          {/* Checklist */}
          {selectionMode === 'select' && (
            <div className={styles.checklist}>
              {filters.map((filter) => {
                const isSelected = selectedFilters.some((f) => f.label === filter.label);
                return (
                  <label
                    key={filter.label}
                    className={`${styles.checkboxLabel} ${
                      filter.isAvailable ? '' : styles.checkboxLabelDisabled
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleFilter(filter)}
                      disabled={!filter.isAvailable}
                      className={styles.checkboxInput}
                    />
                    <span className={styles.checkboxText}>{filter.label}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.popupFooter}>
          <button
            type="button"
            onClick={onCancel}
            className={styles.cancelButton}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className={styles.applyButton}
            disabled={selectionMode === 'select' && selectedFilters.length === 0}
          >
            Apply ({selectionMode === 'all' ? availableFilters.length : selectedFilters.length})
          </button>
        </div>
      </div>
    </div>
  );
}
