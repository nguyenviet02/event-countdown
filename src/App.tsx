import { useState, useEffect } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { EventForm } from "./components/EventForm";
import { EventView } from "./components/EventView";
import { createEvent, getEvents } from "./lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { RotatePrompt } from "./components/RotatePrompt";
import { Analytics } from "@vercel/analytics/react";

interface AppEvent {
  name: string;
  targetDate: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  finishMediaUrl: string;
  finishMediaType: "image" | "video";
}

function App() {
  const [event, setEvent] = useState<AppEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const fetchLatestEvent = async () => {
      try {
        const events = await getEvents();
        if (events && events.length > 0) {
          const latestEvent = events[0] as AppEvent;
          setEvent(latestEvent);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchLatestEvent();

    function onFullscreenChange() {
      const isStandalone =
        (window.navigator as any).standalone ||
        window.matchMedia("(display-mode: standalone)").matches;
      setIsFullScreen(Boolean(document.fullscreenElement) || isStandalone);
    }

    onFullscreenChange(); // Initial check
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("orientationchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullScreen = async () => {
    const doc = document as any;
    const docEl = document.documentElement as any;

    const requestFullScreen =
      docEl.requestFullscreen ||
      docEl.mozRequestFullScreen ||
      docEl.webkitRequestFullScreen ||
      docEl.msRequestFullscreen;

    const cancelFullScreen =
      doc.exitFullscreen ||
      doc.mozCancelFullScreen ||
      doc.webkitExitFullscreen ||
      doc.msExitFullscreen;

    if (
      !doc.fullscreenElement &&
      !doc.mozFullScreenElement &&
      !doc.webkitFullscreenElement &&
      !doc.msFullscreenElement
    ) {
      if (requestFullScreen) {
        await requestFullScreen.call(docEl);
        if (
          window.screen &&
          (window.screen as any).orientation &&
          (window.screen as any).orientation.lock
        ) {
          (window.screen as any).orientation.lock("landscape").catch(() => {});
        }
      }
    } else {
      if (cancelFullScreen) {
        cancelFullScreen.call(doc);
      }
    }
  };

  const handleCreateEvent = async (formData: FormData) => {
    setIsLoading(true);
    try {
      const newEvent = await createEvent(formData);
      setEvent({
        name: newEvent.name,
        targetDate: newEvent.targetDate,
        mediaUrl: newEvent.mediaUrl,
        mediaType: newEvent.mediaType as "image" | "video",
        finishMediaUrl: newEvent.finishMediaUrl,
        finishMediaType: newEvent.finishMediaType as "image" | "video",
      });

      // Enter full screen mode automatically
      const doc = document as any;
      const docEl = document.documentElement as any;

      const requestFullScreen =
        docEl.requestFullscreen ||
        docEl.mozRequestFullScreen ||
        docEl.webkitRequestFullScreen ||
        docEl.msRequestFullscreen;

      if (
        !doc.fullscreenElement &&
        !doc.mozFullScreenElement &&
        !doc.webkitFullscreenElement &&
        !doc.msFullscreenElement &&
        requestFullScreen
      ) {
        await requestFullScreen.call(docEl);
        if (
          window.screen &&
          (window.screen as any).orientation &&
          (window.screen as any).orientation.lock
        ) {
          (window.screen as any).orientation.lock("landscape").catch(() => {});
        }
      }
    } catch (error) {
      console.error("Failed to create event", error);
      alert("Failed to create event. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    localStorage.removeItem("events");
    setEvent(null);

    const doc = document as any;
    const cancelFullScreen =
      doc.exitFullscreen ||
      doc.mozCancelFullScreen ||
      doc.webkitExitFullscreen ||
      doc.msExitFullscreen;

    if (
      (doc.fullscreenElement ||
        doc.mozFullScreenElement ||
        doc.webkitFullscreenElement ||
        doc.msFullscreenElement) &&
      cancelFullScreen
    ) {
      cancelFullScreen.call(doc);
    }
  };

  return (
    <div className="dark max-w-screen w-full min-h-screen bg-[#121212] flex items-center justify-center text-white relative">
      {event && <RotatePrompt />}
      {!(
        (window.navigator as any).standalone ||
        window.matchMedia("(display-mode: standalone)").matches
      ) && (
        <button
          onClick={toggleFullScreen}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/50 hover:text-white transition-colors backdrop-blur-sm"
          title="Toggle Full Screen"
        >
          {isFullScreen ? (
            <Minimize2 className="w-5 h-5" />
          ) : (
            <Maximize2 className="w-5 h-5" />
          )}
        </button>
      )}
      <AnimatePresence mode="wait">
        {!event ? (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center justify-center p-4 bg-linear-to-br from-indigo-900/20 to-purple-900/20 w-full min-h-screen"
          >
            <div className="z-10 w-full max-w-md">
              <div className="text-center mb-10">
                <h1 className="text-5xl font-display font-black mb-2 bg-clip-text text-transparent bg-linear-to-r from-indigo-600 to-purple-600 dark:from-white dark:to-white/50">
                  Countdown
                </h1>
                <p className="text-gray-500 dark:text-white/50">
                  Create your moment.
                </p>
              </div>
              <EventForm onSubmit={handleCreateEvent} isLoading={isLoading} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <EventView event={event} onReset={handleReset} />
          </motion.div>
        )}
      </AnimatePresence>
      <Analytics />
    </div>
  );
}

export default App;
