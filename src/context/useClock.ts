import { useState, useEffect } from 'react';

/**
 * useClock — provides a live Date object that updates every second.
 *
 * Usage:
 *   const { currentTime } = useClock();
 *   currentTime.getHours()         // 14  (for 2 PM)
 *   currentTime.getMinutes()       // 30
 *   currentTime.getSeconds()       // 45
 *   currentTime.toLocaleTimeString() // "2:30:45 PM"
 */
export function useClock(): { currentTime: Date } {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return { currentTime };
}
