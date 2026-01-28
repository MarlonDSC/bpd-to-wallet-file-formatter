/**
 * Stepper - Component for displaying workflow steps
 */

import styles from '../styles/Stepper.module.css';

export interface StepperStep {
  id: string;
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: StepperStep[];
  currentStep: number;
  completedSteps?: number[];
}

export function Stepper({ steps, currentStep, completedSteps = [] }: Readonly<StepperProps>) {
  return (
    <nav className={styles.stepper} aria-label={`Step ${currentStep + 1} of ${steps.length}`}>
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(index) || index < currentStep;
        const isCurrent = index === currentStep;
        const isPast = index < currentStep;

        return (
          <div key={step.id} className={styles.stepContainer}>
            <div className={styles.stepContent}>
              {/* Step circle */}
              <div
                className={`${styles.stepCircle} ${
                  isCompleted ? styles.stepCircleCompleted : ''
                } ${isCurrent ? styles.stepCircleCurrent : ''} ${
                  isPast ? styles.stepCirclePast : ''
                }`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isCompleted && !isCurrent ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span className={styles.stepNumber}>{index + 1}</span>
                )}
              </div>

              {/* Step label */}
              <div className={styles.stepLabelContainer}>
                <span
                  className={`${styles.stepLabel} ${
                    isCurrent ? styles.stepLabelCurrent : ''
                  } ${isCompleted ? styles.stepLabelCompleted : ''}`}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span
                    className={`${styles.stepDescription} ${
                      isCurrent ? styles.stepDescriptionCurrent : ''
                    }`}
                  >
                    {step.description}
                  </span>
                )}
              </div>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={`${styles.connector} ${
                  isCompleted ? styles.connectorCompleted : ''
                }`}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
