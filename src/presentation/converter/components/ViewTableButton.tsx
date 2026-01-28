/**
 * ViewTableButton - Eye icon button to open the data preview sidebar
 */

import styles from '../styles/ViewTableButton.module.css';

export interface ViewTableButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function ViewTableButton({ onClick, disabled = false }: Readonly<ViewTableButtonProps>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={styles.viewTableButton}
      aria-label="View data table in sidebar"
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
        aria-hidden="true"
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </button>
  );
}
