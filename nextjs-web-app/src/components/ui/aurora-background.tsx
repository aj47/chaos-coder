"use client";
import { cn } from "@/lib/utils";
import React, { ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
}

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
        {/* Efficient Background container */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Static gradient base */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-rose-50 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900" />

          {/* Subtle animated gradient overlay */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-100/20 via-purple-100/20 to-pink-100/20 dark:from-blue-900/10 dark:via-purple-900/10 dark:to-pink-900/10 animate-gentle-shift" />
          </div>

          {/* Optional subtle particles for visual interest */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-indigo-300/40 rounded-full animate-float-slow" />
            <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-rose-300/40 rounded-full animate-float-delayed" />
            <div className="absolute bottom-1/4 left-2/3 w-1.5 h-1.5 bg-purple-300/40 rounded-full animate-float-gentle" />
          </div>

          {/* Content overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-white/60 to-transparent dark:from-zinc-900/90 dark:via-zinc-900/60" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full">{children}</div>
      </div>
    </main>
  );
};
