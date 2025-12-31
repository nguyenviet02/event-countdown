import { motion } from "framer-motion";
import { FlipClock } from "./FlipClock";
import { useCountdown } from "../hooks/useCountdown";
import { cn } from "../lib/utils";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { X } from "lucide-react";
import Confetti from "react-confetti";

interface EventViewProps {
  event: {
    name: string;
    targetDate: string;
    mediaUrl: string;
    mediaType: "image" | "video";
    finishMediaUrl: string;
    finishMediaType: "image" | "video";
  };
  onReset?: () => void;
}

export const EventView = ({ event, onReset }: EventViewProps) => {
  const timeLeft = useCountdown(event.targetDate);
  const [showCelebration, setShowCelebration] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    if (timeLeft.isFinished) {
      setShowCelebration(true);
    }
  }, [timeLeft.isFinished]);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center text-white">
      {/* Confetti */}
      {showCelebration && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.3}
          initialVelocityY={20}
          colors={[
            "#FFD700",
            "#FF6B6B",
            "#4ECDC4",
            "#45B7D1",
            "#FFA07A",
            "#98D8C8",
            "#F7DC6F",
            "#BB8FCE",
          ]}
        />
      )}
      {/* Background Media */}
      <div className="absolute inset-0 z-0">
        {/* Dynamic Media Rendering */}
        {(() => {
          const currentUrl = showCelebration
            ? event.finishMediaUrl
            : event.mediaUrl;
          const currentType = showCelebration
            ? event.finishMediaType
            : event.mediaType;

          if (currentType === "video") {
            return (
              <video
                key={currentUrl} // Force re-render on change
                src={currentUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover transition-opacity duration-1000"
              />
            );
          } else {
            return (
              <img
                key={currentUrl}
                src={currentUrl}
                alt="Background"
                className="w-full h-full object-cover transition-opacity duration-1000"
              />
            );
          }
        })()}
        {/* Overlay */}
        <div
          className={cn(
            "absolute inset-0 bg-black/60 transition-opacity duration-1000",
            showCelebration ? "bg-black/30" : "bg-black/60"
          )}
        />
      </div>

      {/* Content */}
      <div className="z-10 flex flex-col items-center gap-8 md:gap-12 p-4 text-center max-w-5xl w-full">
        {!showCelebration && (
          <motion.h1
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-4xl md:text-7xl font-display font-black tracking-tight"
          >
            {event.name}
          </motion.h1>
        )}

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          {!showCelebration ? (
            <FlipClock timeLeft={timeLeft} />
          ) : (
            <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
              <div className="py-4 w-fit px-12 bg-black/40 backdrop-blur-[2px] rounded-xl border border-white/10 text-center space-y-4">
                <h3 className="text-2xl md:text-6xl font-bold text-white mb-8">
                  {event.name}
                </h3>
                <p className="text-white/80 font-semibold text-xl">
                  {format(new Date(event.targetDate), "dd/MM/yyyy HH:mm")}
                </p>
                {/* Controls */}
                <button
                  onClick={onReset}
                  className="absolute top-2 right-2 z-20 text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
};
