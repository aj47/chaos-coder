"use client";
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
        className={`relative flex flex-col h-[100vh] items-center justify-center bg-zinc-50 dark:bg-zinc-900 text-slate-950 transition-bg overflow-hidden ${className}`}
        {...props}
      >
        {/* Background container */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Primary aurora */}
          <div className="absolute -inset-[10px] opacity-50">
            <div
              className="absolute inset-0 bg-gradient-to-r from-[#3B82F6] via-[#8B5CF6] to-[#EC4899]
                       animate-aurora blur-[100px]
                       after:absolute after:inset-0 
                       after:bg-gradient-to-t after:from-[#3B82F6] after:via-transparent after:to-transparent 
                       after:animate-aurora after:blur-[120px]"
            />
          </div>

          {/* Secondary aurora */}
          {/* <div className="absolute -inset-[10px] opacity-30">
            <div
              className="absolute inset-0 bg-gradient-to-l from-violet-500 via-indigo-500 to-blue-500
                       animate-aurora blur-[90px] 
                       after:absolute after:inset-0 
                       after:bg-gradient-to-b after:from-violet-500 after:via-transparent after:to-transparent 
                       after:animate-aurora after:blur-[100px]"
            />
          </div> */}

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-zinc-900 dark:via-zinc-900/80" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full">{children}</div>
      </div>
    </main>
  );
};
