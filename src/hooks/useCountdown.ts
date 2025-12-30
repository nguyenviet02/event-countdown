import { useState, useEffect } from "react";
import { differenceInSeconds } from "date-fns";

export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isFinished: boolean;
}

export const useCountdown = (targetDate: Date | string | null): TimeLeft => {
  const calculateTimeLeft = (): TimeLeft => {
    if (!targetDate) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isFinished: false };
    }

    const target = new Date(targetDate);
    const now = new Date();
    const diff = differenceInSeconds(target, now);

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isFinished: true };
    }

    const days = Math.floor(diff / (3600 * 24));
    const hours = Math.floor((diff % (3600 * 24)) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = Math.floor(diff % 60);

    return { days, hours, minutes, seconds, isFinished: false };
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  useEffect(() => {
    if (!targetDate) return;

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      if (newTimeLeft.isFinished) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return timeLeft;
};
