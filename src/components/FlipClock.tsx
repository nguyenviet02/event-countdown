import { memo, useEffect, useState } from "react";
import type { TimeLeft } from "../hooks/useCountdown";
import { cn } from "../lib/utils";

// Helper to pad numbers
const pad = (n: number | string) =>
  parseInt(String(n)) < 10 ? `0${parseInt(String(n))}` : n;

interface AnimatedCardProps {
  animation: string;
  digit: string | number;
}

const AnimatedCard = ({ animation, digit }: AnimatedCardProps) => {
  return (
    <div className={cn("flipCard", animation)}>
      <span>{digit}</span>
    </div>
  );
};

interface StaticCardProps {
  position: string;
  digit: string | number;
}

const StaticCard = ({ position, digit }: StaticCardProps) => {
  return (
    <div className={position}>
      <span>{digit}</span>
    </div>
  );
};

interface FlipUnitProps {
  digit: number;
  label: string;
}

const FlipUnit = memo(({ digit, label }: FlipUnitProps) => {
  // We need to track previous digit and shuffle state
  const [currentDigit, setCurrentDigit] = useState<string | number>(pad(digit));
  const [previousDigit, setPreviousDigit] = useState<string | number>(
    pad(digit)
  );
  const [shuffle, setShuffle] = useState(false);

  // Track the *actual* digit prop changes
  useEffect(() => {
    const paddedDigit = pad(digit);
    if (paddedDigit !== currentDigit) {
      setPreviousDigit(currentDigit);
      setCurrentDigit(paddedDigit);
      setShuffle((prev) => !prev);
    }
  }, [digit, currentDigit]);

  // Logic from user snippet:
  // digit1 = shuffle ? previous : current
  // digit2 = !shuffle ? previous : current
  // animation1 = shuffle ? fold : unfold
  // animation2 = !shuffle ? fold : unfold

  const digit1 = shuffle ? previousDigit : currentDigit;
  const digit2 = !shuffle ? previousDigit : currentDigit;

  const animation1 = shuffle ? "fold" : "unfold";
  const animation2 = !shuffle ? "fold" : "unfold";

  // In the user's logic:
  // Static Upper: Current
  // Static Lower: Previous
  // But standard mechanical flip is:
  // Upper Static = NEXT (So when flip is done, we see Next)
  // Lower Static = PREV (Whatever was there) -> Wait, if we reveal, we see Next on bottom.
  //
  // Let's stick strictly to User's snippet logic:
  // Static Upper: currentDigit
  // Static Lower: previousDigit

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flipUnitContainer">
        <StaticCard position="upperCard" digit={currentDigit} />
        <StaticCard position="lowerCard" digit={previousDigit} />
        <AnimatedCard digit={digit1} animation={animation1} />
        <AnimatedCard digit={digit2} animation={animation2} />
      </div>
      <span className="text-xs md:text-sm uppercase tracking-widest text-gray-500 dark:text-white/50 font-medium">
        {label}
      </span>
    </div>
  );
});

export const FlipClock = ({ timeLeft }: { timeLeft: TimeLeft }) => {
  if (timeLeft.isFinished) return null;

  return (
    <div className="flex flex-wrap justify-center gap-4 md:gap-8 px-4">
      <FlipUnit digit={timeLeft.days} label="Days" />
      <FlipUnit digit={timeLeft.hours} label="Hours" />
      <FlipUnit digit={timeLeft.minutes} label="Minutes" />
      <FlipUnit digit={timeLeft.seconds} label="Seconds" />
    </div>
  );
};
