"use client";
import { cn } from "@/lib/utils";
import React, { ReactNode, useEffect, useState } from "react";
import { isLowEndDevice } from "@/utils/performance";

interface EfficientBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
}

export const EfficientBackground = ({
  className,
  children,
  ...props
}: EfficientBackgroundProps) => {
  const [shouldAnimate, setShouldAnimate] = useState(true);

  useEffect(() => {
    // Check if device has limited resources and disable animations if needed
    const isLowEnd = isLowEndDevice();
    setShouldAnimate(!isLowEnd);
  }, []);

  return (
    <main className="min-h-screen w-full">
      <div
        className={cn(
          "relative flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-900 text-slate-950 transition-bg",
          className
        )}
        {...props}
      >
        {/* Efficient background container */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Primary gradient layer - no blur for better performance */}
          <div className="absolute inset-0 opacity-30">
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-br from-blue-400/20 via-purple-500/15 to-pink-400/20",
                shouldAnimate && "animate-efficient-gradient"
              )}
            />
          </div>

          {/* Secondary gradient layer */}
          <div className="absolute inset-0 opacity-20">
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-tl from-indigo-400/15 via-violet-400/10 to-blue-500/15",
                shouldAnimate && "animate-efficient-gradient-reverse"
              )}
            />
          </div>

          {/* Subtle mesh pattern for texture */}
          <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.15)_1px,transparent_0)] bg-[length:20px_20px]" />
          </div>

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/90 to-transparent dark:from-zinc-900 dark:via-zinc-900/90" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full">{children}</div>
      </div>
    </main>
  );
};

// Keep the old component for backward compatibility during transition
export const AuroraBackground = EfficientBackground;
