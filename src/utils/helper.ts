
// src/utils/helpers.ts

/**
 * Formats a duration in seconds into a human-readable string (e.g., "1h 30m", "45m", "30s").
 * @param totalSeconds The total duration in seconds.
 * @returns A formatted string representing the duration.
 */
export const formatVideoDuration = (totalSeconds: number): string => {
    if (isNaN(totalSeconds) || totalSeconds < 0) {
      return "0s";
    }
  
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
  
    let formattedDuration = "";
  
    if (hours > 0) {
      formattedDuration += `${hours}h `;
    }
    if (minutes > 0 || hours > 0) { // Show minutes if hours are present or minutes > 0
      formattedDuration += `${minutes}m `;
    }
    if (hours === 0 && minutes === 0) { // Only show seconds if duration is less than a minute
       formattedDuration += `${seconds}s`;
    } else if (seconds > 0 && hours === 0) { // Show seconds if no hours and minutes are present
       formattedDuration += `${seconds}s`;
    }
  
  
    return formattedDuration.trim() || "0s"; // Fallback for 0 seconds
  };
  
  /**
   * Formats a Date object into a user-friendly string for session display.
   * Shows "Today, HH:MM", "Tomorrow, HH:MM", or "ShortWeekday, ShortMonth Day, HH:MM".
   * @param date The Date object to format.
   * @returns A formatted string representing the date and time.
   */
  export const formatDateForSession = (date: Date | undefined | null): string => {
    if (!date) return "N/A";
  
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
  
    const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
  
    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString([], timeOptions)}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow, ${date.toLocaleTimeString([], timeOptions)}`;
    } else {
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      };
      return `${date.toLocaleDateString([], dateOptions)}, ${date.toLocaleTimeString([], timeOptions)}`;
    }
  };
  
  /**
   * Generates a simple unique ID.
   * Note: For truly globally unique IDs in a distributed system, consider libraries like UUID.
   * This is sufficient for simple client-side key generation.
   * @returns A string representing a unique ID.
   */
  export const generateUniqueId = (): string => {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
  };
  
  /**
   * Debounce function to limit the rate at which a function can fire.
   * @param func The function to debounce.
   * @param delay The delay in milliseconds.
   * @returns A debounced version of the function.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function debounce<T extends (...args: any[]) => void>(func: T, delay: number): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout | null = null;
    return (...args: Parameters<T>) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        func(...args);
      }, delay);
    };
  }
  
  
  
  
  
  
  