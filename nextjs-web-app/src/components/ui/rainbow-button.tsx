import React from "react";

import { cn } from "@/lib/utils";
interface RainbowButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function RainbowButton({
  children,
  className,
  ...props
}: RainbowButtonProps) {
  return (
    <button
      className={cn(
        "group relative inline-flex h-10 sm:h-11 cursor-pointer items-center justify-center rounded-xl border-0 bg-[length:200%] px-6 sm:px-8 py-2 font-medium text-sm sm:text-base text-gray-900 dark:text-white transition-all duration-300 [background-clip:padding-box,border-box,border-box] [background-origin:border-box] [border:calc(0.08*1rem)_solid_transparent] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:scale-[1.02]",

        // background gradient
        "bg-gradient-to-r from-blue-100 via-blue-300 to-pink-200 dark:from-blue-400 dark:via-indigo-400 dark:to-pink-300",

        // before styles (glow effect)
        "before:absolute before:bottom-[-15%] before:left-1/2 before:z-[-1] before:h-[85%] before:w-[90%] before:-translate-x-1/2 before:rounded-full before:bg-gradient-to-r before:from-blue-100 before:via-blue-300 before:to-pink-200 before:blur-xl before:dark:from-blue-400 before:dark:via-indigo-400 before:dark:to-pink-300 before:opacity-50",

        className
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
}
