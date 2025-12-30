import { motion } from "framer-motion";
import { FlipClock } from "./FlipClock";
import { useCountdown } from "../hooks/useCountdown";
import { cn } from "../lib/utils";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { X } from "lucide-react";

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

  useEffect(() => {
    if (timeLeft.isFinished) {
      setShowCelebration(true);
    }
  }, [timeLeft.isFinished]);

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center text-white">
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
              <div className="py-6 px-8 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-center space-y-4">
                <h3 className="text-2xl md:text-6xl font-bold text-white mb-4">
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

        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            {/* Could add confetti here */}
          </motion.div>
        )}
      </div>
    </div>
  );
};
