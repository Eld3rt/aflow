/**
 * Generate cron expression from schedule parameters.
 * Supports Hourly, Daily, Weekly, Monthly frequencies with intervals.
 * Timezone is fixed to GMT+03:00 (as per MVP requirements).
 */

export type FrequencyType = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface ScheduleConfig {
  frequencyType: FrequencyType;
  interval: number; // Positive integer
  startDate: string; // DD-MM-YYYY format
  timeOfDay: string; // HH:mm format (24-hour)
}

/**
 * Generate cron expression from schedule configuration.
 * @param config - Schedule configuration
 * @returns Cron expression string (5 fields: minute hour day month dayOfWeek)
 */
export function generateCronExpression(
  config: ScheduleConfig,
): string {
  const { frequencyType, interval, startDate, timeOfDay } = config;

  // Parse time of day
  const [hours, minutes] = timeOfDay.split(':').map(Number);
  const minute = minutes;
  const hour = hours;

  // Parse start date to get day of week and day of month
  const dateParts = startDate.split('-').map(Number);
  if (dateParts.length !== 3) {
    throw new Error('Invalid date format');
  }
  const [day, month, year] = dateParts;
  if (!day || !month || !year) {
    throw new Error('Invalid date values');
  }
  const startDateObj = new Date(year, month - 1, day);
  const dayOfWeek = startDateObj.getDay(); // 0 = Sunday, 6 = Saturday
  const dayOfMonth = day;

  switch (frequencyType) {
    case 'hourly': {
      // Every N hours: minute is fixed, hour uses interval
      // Format: "minute */interval * * *"
      if (interval < 1 || interval > 23) {
        throw new Error('Hourly interval must be between 1 and 23');
      }
      return `${minute} */${interval} * * *`;
    }

    case 'daily': {
      // Every N days at specific time
      // For interval=1: "minute hour * * *" (every day)
      // For interval>1: "minute hour */interval * *" (every N days starting from day 1)
      if (interval < 1) {
        throw new Error('Daily interval must be at least 1');
      }
      if (interval === 1) {
        return `${minute} ${hour} * * *`;
      }
      return `${minute} ${hour} */${interval} * *`;
    }

    case 'weekly': {
      // Every N weeks on specific day of week
      // Cron doesn't natively support "every N weeks", so we schedule weekly
      // and the interval is noted in the config for future enhancement
      // Format: "minute hour * * dayOfWeek"
      if (interval < 1) {
        throw new Error('Weekly interval must be at least 1');
      }
      // Cron day of week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      // For MVP, schedule weekly on the same day of week as start date
      // Note: True "every N weeks" would require additional scheduling logic
      return `${minute} ${hour} * * ${dayOfWeek}`;
    }

    case 'monthly': {
      // Every N months on specific day
      // For interval=1: "minute hour day * *" (every month)
      // For interval>1: "minute hour day */interval *" (every N months)
      if (interval < 1 || interval > 12) {
        throw new Error('Monthly interval must be between 1 and 12');
      }
      if (interval === 1) {
        return `${minute} ${hour} ${dayOfMonth} * *`;
      }
      return `${minute} ${hour} ${dayOfMonth} */${interval} *`;
    }

    default:
      throw new Error(`Unsupported frequency type: ${frequencyType}`);
  }
}

/**
 * Validate schedule configuration.
 * @param config - Schedule configuration to validate
 * @returns Error message if invalid, null if valid
 */
export function validateScheduleConfig(
  config: Partial<ScheduleConfig>,
): string | null {
  if (!config.frequencyType) {
    return 'Frequency type is required';
  }

  if (!['hourly', 'daily', 'weekly', 'monthly'].includes(config.frequencyType)) {
    return 'Invalid frequency type';
  }

  if (config.interval === undefined || config.interval === null) {
    return 'Interval is required';
  }

  if (!Number.isInteger(config.interval) || config.interval < 1) {
    return 'Interval must be a positive integer';
  }

  if (!config.startDate) {
    return 'Start date is required';
  }

  // Validate date format DD-MM-YYYY
  const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
  if (!dateRegex.test(config.startDate)) {
    return 'Start date must be in DD-MM-YYYY format';
  }

  // Validate date is valid
  const dateParts = config.startDate.split('-').map(Number);
  if (dateParts.length !== 3) {
    return 'Start date must be in DD-MM-YYYY format';
  }
  const [day, month, year] = dateParts;
  if (!day || !month || !year) {
    return 'Start date must be a valid date';
  }
  const date = new Date(year, month - 1, day);
  if (
    date.getDate() !== day ||
    date.getMonth() !== month - 1 ||
    date.getFullYear() !== year
  ) {
    return 'Start date must be a valid date';
  }

  if (!config.timeOfDay) {
    return 'Time of day is required';
  }

  // Validate time format HH:mm (24-hour)
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(config.timeOfDay)) {
    return 'Time of day must be in HH:mm format (24-hour)';
  }

  // Validate interval constraints based on frequency
  if (config.frequencyType === 'hourly' && config.interval > 23) {
    return 'Hourly interval cannot exceed 23 hours';
  }

  if (config.frequencyType === 'monthly' && config.interval > 12) {
    return 'Monthly interval cannot exceed 12 months';
  }

  return null;
}
