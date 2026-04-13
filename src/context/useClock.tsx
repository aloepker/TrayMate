import { useContext } from 'react';
import { ClockContext } from './ClockContext';

export const useClock = () => {
  const context = useContext(ClockContext);
  if (!context) {
    throw new Error('useClock must be used within a ClockProvider');
  }
  return context;
};