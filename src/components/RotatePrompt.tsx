import { Smartphone } from "lucide-react";

export const RotatePrompt = () => {
  return (
    <div className="fixed inset-0 z-10000 bg-[#121212] flex flex-col items-center justify-center text-white md:hidden portrait:flex landscape:hidden p-6 text-center">
      <div className="bg-white/5 p-8 rounded-full mb-8 animate-bounce">
        <Smartphone className="w-16 h-16 rotate-90 text-indigo-500" />
      </div>
      <h2 className="text-3xl font-display font-bold mb-4 bg-clip-text text-transparent bg-linear-to-r from-indigo-500 to-purple-500">
        Landscape Mode Required
      </h2>
      <p className="text-white/60 text-lg max-w-xs mx-auto leading-relaxed">
        Please rotate your device to landscape for the most immersive countdown
        experience.
      </p>
      <div className="mt-10 flex gap-2">
        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse delay-75"></div>
        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse delay-150"></div>
      </div>
    </div>
  );
};
