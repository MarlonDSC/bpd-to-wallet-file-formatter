/**
 * FilterInfoTooltip - Component for displaying info tooltips on disabled filter options
 */

import { useState, useRef, useEffect } from 'react';
import styles from '../styles/FilterInfoTooltip.module.css';

export interface FilterInfoTooltipProps {
  reason: string;
}

export function FilterInfoTooltip({
  reason,
}: Readonly<FilterInfoTooltipProps>) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && containerRef.current && tooltipRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      // Position tooltip below the icon, aligned to the left
      let top = containerRect.bottom + 8;
      let left = containerRect.left;
      
      // Ensure tooltip doesn't go off-screen on mobile
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 16; // 1rem padding from viewport edges
      
      // Adjust horizontal position if tooltip would overflow right edge
      if (left + tooltipRect.width > viewportWidth - padding) {
        left = Math.max(padding, viewportWidth - tooltipRect.width - padding);
      }
      
      // Adjust vertical position if tooltip would overflow bottom edge
      if (top + tooltipRect.height > viewportHeight - padding) {
        // Position above instead if there's not enough space below
        top = containerRect.top - tooltipRect.height - 8;
        if (top < padding) {
          // If still doesn't fit, position at top of viewport
          top = padding;
        }
      }
      
      tooltipRef.current.style.top = `${top}px`;
      tooltipRef.current.style.left = `${left}px`;
      tooltipRef.current.style.right = 'auto';
    }
  }, [isVisible]);

  if (!reason) {
    return null;
  }

  return (
    <button
      ref={containerRef}
      type="button"
      className={styles.tooltipContainer}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      tabIndex={0}
      aria-label={`Info: ${reason}`}
    >
      <svg
        className={styles.infoIcon}
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
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
      {isVisible && (
        <div ref={tooltipRef} className={styles.tooltip} role="tooltip">
          {reason}
        </div>
      )}
    </button>
  );
}
