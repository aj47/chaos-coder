"use client";

import { motion } from "framer-motion";
import {
  FaCode,
  FaLaptop,
  FaGlasses,
  FaLayerGroup,
  FaMoon,
  FaSquare,
  FaBuilding,
  FaShoppingCart,
  FaPaintBrush,
  FaNewspaper,
} from "react-icons/fa";
import { MdOutlineDesignServices } from "react-icons/md";
import { IconType } from "react-icons";

interface AppTileProps {
  title: string;
  isSelected: boolean;
  onClick: () => void;
  isLoading?: boolean;
  theme: "light" | "dark";
}

interface VibeInfo {
  icon: IconType;
  description: string;
  rightIcon: IconType;
  framework: string;
  iconColor: string;
}

const vibeMap: Record<string, VibeInfo> = {
  "Modern SaaS": {
    icon: FaLaptop,
    description: "Clean, professional UI with SaaS-focused components",
    rightIcon: FaCode,
    framework: "modern-saas",
    iconColor: "#3B82F6",
  },
  "Aeroglass/Glassmorphism": {
    icon: FaGlasses,
    description: "Sleek glass-like UI with blur effects and transparency",
    rightIcon: FaCode,
    framework: "glassmorphism",
    iconColor: "#8B5CF6",
  },
  "Neumorphism": {
    icon: MdOutlineDesignServices,
    description: "Soft UI with subtle shadows and dimensional effects",
    rightIcon: FaCode,
    framework: "neumorphism",
    iconColor: "#9CA3AF",
  },
  "Material Design": {
    icon: FaLayerGroup,
    description: "Google's material design principles with depth and motion",
    rightIcon: FaCode,
    framework: "material",
    iconColor: "#EF4444",
  },
  "Dark Mode": {
    icon: FaMoon,
    description: "Sleek dark-themed UI optimized for night viewing",
    rightIcon: FaCode,
    framework: "dark-mode",
    iconColor: "#1F2937",
  },
  "Flat Design": {
    icon: FaSquare,
    description: "Minimalist UI with simple elements and bright colors",
    rightIcon: FaCode,
    framework: "flat",
    iconColor: "#10B981",
  },
  "Corporate Professional": {
    icon: FaBuilding,
    description: "Business-oriented design with formal UI elements",
    rightIcon: FaCode,
    framework: "corporate",
    iconColor: "#2563EB",
  },
  "E-commerce Marketplace": {
    icon: FaShoppingCart,
    description: "Optimized for product listings and shopping experiences",
    rightIcon: FaCode,
    framework: "ecommerce",
    iconColor: "#F59E0B",
  },
  "Portfolio/Creative": {
    icon: FaPaintBrush,
    description: "Artistic design for showcasing creative work",
    rightIcon: FaCode,
    framework: "portfolio",
    iconColor: "#EC4899",
  },
  "Blog/Editorial": {
    icon: FaNewspaper,
    description: "Content-focused design with strong typography",
    rightIcon: FaCode,
    framework: "blog",
    iconColor: "#6366F1",
  },
};

export default function AppTile({
  title,
  isSelected,
  onClick,
  isLoading,
  theme,
}: AppTileProps) {
  const vibe = vibeMap[title];
  const LeftIcon = vibe?.icon || FaCode;
  const RightIcon = vibe?.rightIcon || FaCode;

  const getBgColor = () => {
    if (isSelected) {
      return "bg-[#2563EB] shadow-lg shadow-blue-500/20";
    }
    return theme === "dark"
      ? "bg-gray-800 hover:bg-gray-700"
      : "bg-white hover:bg-gray-50 border border-gray-200";
  };

  return (
    <motion.div
      onClick={onClick}
      className={`relative p-6 mb-1 rounded-lg cursor-pointer transition-all duration-200 ${getBgColor()}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      style={{
        boxShadow: isSelected
          ? "0 8px 24px rgba(37, 99, 235, 0.15)"
          : "0 4px 20px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <LeftIcon
            className="w-6 h-6"
            style={{ color: isSelected ? "#ffffff" : vibe?.iconColor }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className={`text-lg font-semibold mb-1 ${
              isSelected
                ? "text-white"
                : theme === "dark"
                ? "text-gray-100"
                : "text-gray-900"
            }`}
          >
            {title}
          </h3>
          <p
            className={`text-sm ${
              isSelected
                ? "text-blue-50"
                : theme === "dark"
                ? "text-gray-400"
                : "text-gray-600"
            }`}
          >
            {vibe?.description}
          </p>
          {isLoading && (
            <div className="mt-2">
              <motion.div
                className={`h-1 w-full rounded-full ${
                  isSelected ? "bg-blue-400" : "bg-blue-200"
                }`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>
          )}
        </div>
        <div className="flex-shrink-0">
          <RightIcon
            className={`w-5 h-5 ${
              isSelected
                ? "text-white"
                : theme === "dark"
                ? "text-gray-400"
                : "text-gray-500"
            }`}
          />
        </div>
      </div>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-800/50 rounded-lg flex items-center justify-center backdrop-blur-sm">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </motion.div>
  );
}
