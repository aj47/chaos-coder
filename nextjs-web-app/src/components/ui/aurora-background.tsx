"use client";
import { cn } from "@/lib/utils";
import React, { ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
}

// GPU-efficient static gradient background to replace the animated Aurora
export const AuroraBackground = ({
  className,
  children,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <main className="min-h-screen w-full">
      <div
        className={cn(
          "relative flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-900 text-slate-950 transition-bg",
          className
        )}
        {...props}
      >
        {/* Static gradient background - GPU efficient */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Primary static gradient */}
          <div className="absolute inset-0 opacity-40">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/15 to-pink-500/20" />
          </div>

          {/* Secondary gradient for depth */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0 bg-gradient-to-tl from-indigo-500/10 via-transparent to-violet-500/15" />
          </div>

          {/* Subtle radial gradient for center focus */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-radial-gradient from-white/10 via-transparent to-transparent dark:from-zinc-700/20" />
          </div>

          {/* Overlay gradient for content readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/90 to-white/70 dark:from-zinc-900 dark:via-zinc-900/90 dark:to-zinc-900/70" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full">{children}</div>
      </div>
    </main>
  );
};
