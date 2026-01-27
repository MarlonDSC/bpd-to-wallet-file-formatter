/**
 * DateFilterOption - Value object representing a date filter option
 */

export type DateFilterType =
  | 'all'
  | 'last-month'
  | 'by-month'
  | 'by-fortnightly-pay'
  | 'by-week'
  | 'last-week';

export interface DateFilterOptionMetadata {
  month?: number; // 1-12
  year?: number;
  weekNumber?: number;
  payPeriodDate?: Date; // For fortnightly pay periods
}

export class DateFilterOption {
  public readonly type: DateFilterType;
  public readonly label: string;
  public readonly isAvailable: boolean;
  public readonly unavailableReason?: string;
  public readonly metadata?: DateFilterOptionMetadata;

  constructor(params: {
    type: DateFilterType;
    label: string;
    isAvailable: boolean;
    unavailableReason?: string;
    metadata?: DateFilterOptionMetadata;
  }) {
    this.type = params.type;
    this.label = params.label;
    this.isAvailable = params.isAvailable;
    this.unavailableReason = params.unavailableReason;
    this.metadata = params.metadata;

    this.validate();
  }

  /**
   * Creates an "All" filter option
   */
  static createAll(isAvailable: boolean = true): DateFilterOption {
    return new DateFilterOption({
      type: 'all',
      label: 'All',
      isAvailable,
      unavailableReason: isAvailable ? undefined : 'No transactions available',
    });
  }

  /**
   * Creates a "Last month" filter option
   */
  static createLastMonth(
    isAvailable: boolean,
    unavailableReason?: string
  ): DateFilterOption {
    return new DateFilterOption({
      type: 'last-month',
      label: 'Last month',
      isAvailable,
      unavailableReason,
    });
  }

  /**
   * Creates a "By month" filter option
   */
  static createByMonth(
    month: number,
    year: number,
    isAvailable: boolean,
    unavailableReason?: string
  ): DateFilterOption {
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return new DateFilterOption({
      type: 'by-month',
      label: `${monthNames[month - 1]} ${year}`,
      isAvailable,
      unavailableReason,
      metadata: { month, year },
    });
  }

  /**
   * Creates a "By fortnightly pay" filter option
   */
  static createByFortnightlyPay(
    date: Date,
    isAvailable: boolean,
    unavailableReason?: string
  ): DateFilterOption {
    const year = date.getFullYear();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const label = `${year}_${month}_${day}`;

    return new DateFilterOption({
      type: 'by-fortnightly-pay',
      label,
      isAvailable,
      unavailableReason,
      metadata: { payPeriodDate: date },
    });
  }

  /**
   * Creates a "By week" filter option
   */
  static createByWeek(
    year: number,
    weekNumber: number,
    isAvailable: boolean,
    unavailableReason?: string
  ): DateFilterOption {
    return new DateFilterOption({
      type: 'by-week',
      label: `${year}_W${weekNumber}`,
      isAvailable,
      unavailableReason,
      metadata: { year, weekNumber },
    });
  }

  /**
   * Creates a "Last week" filter option
   */
  static createLastWeek(
    isAvailable: boolean,
    unavailableReason?: string
  ): DateFilterOption {
    return new DateFilterOption({
      type: 'last-week',
      label: 'Last week',
      isAvailable,
      unavailableReason,
    });
  }

  private validate(): void {
    if (!this.type) {
      throw new Error('DateFilterOption type is required');
    }
    if (!this.label) {
      throw new Error('DateFilterOption label is required');
    }
    this.validateMetadata();
  }

  private validateMetadata(): void {
    if (this.type === 'by-month') {
      this.validateByMonthMetadata();
    } else if (this.type === 'by-week') {
      this.validateByWeekMetadata();
    } else if (this.type === 'by-fortnightly-pay') {
      this.validateByFortnightlyPayMetadata();
    }
  }

  private validateByMonthMetadata(): void {
    if (!this.metadata) {
      return;
    }
    if (this.metadata.month === undefined || this.metadata.year === undefined) {
      throw new Error('By-month filter requires month and year in metadata');
    }
    if (this.metadata.month < 1 || this.metadata.month > 12) {
      throw new Error('Month must be between 1 and 12');
    }
  }

  private validateByWeekMetadata(): void {
    if (!this.metadata) {
      return;
    }
    if (this.metadata.year === undefined || this.metadata.weekNumber === undefined) {
      throw new Error('By-week filter requires year and weekNumber in metadata');
    }
    if (this.metadata.weekNumber < 1 || this.metadata.weekNumber > 53) {
      throw new Error('Week number must be between 1 and 53');
    }
  }

  private validateByFortnightlyPayMetadata(): void {
    if (!this.metadata?.payPeriodDate) {
      throw new Error('By-fortnightly-pay filter requires payPeriodDate in metadata');
    }
  }
}
