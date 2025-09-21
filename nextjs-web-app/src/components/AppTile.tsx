"use client";

import { useState, useEffect, memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Editor from "@monaco-editor/react";
import {
  FaBootstrap,
  FaWind,
  FaLeaf,
  FaPalette,
  FaShieldAlt,
  FaCode,
} from "react-icons/fa";
import { IconType } from "react-icons";

interface AppTileProps {
  title: string;
  isSelected: boolean;
  onClick: () => void;
  isLoading?: boolean;
  theme: "light" | "dark";
}

interface FrameworkInfo {
  icon: IconType;
  description: string;
  rightIcon: IconType;
  framework: string;
  iconColor: string;
}

const frameworkMap: Record<string, FrameworkInfo> = {
  "Standard Version": {
    icon: FaBootstrap,
    description: "Built with Bootstrap for robust, responsive design",
    rightIcon: FaCode,
    framework: "bootstrap",
    iconColor: "#7952b3",
  },
  "Visual Focus": {
    icon: FaPalette,
    description: "Using Materialize for beautiful Material Design",
    rightIcon: FaCode,
    framework: "materialize",
    iconColor: "#eb7077",
  },
  "Minimalist Version": {
    icon: FaLeaf,
    description: "Pure CSS for lightweight, clean aesthetics",
    rightIcon: FaCode,
    framework: "pure",
    iconColor: "#3cb371",
  },
  "Creative Approach": {
    icon: FaWind,
    description: "Powered by Tailwind CSS for modern utility-first design",
    rightIcon: FaCode,
    framework: "tailwind",
    iconColor: "#38bdf8",
  },
  "Enhanced Version": {
    icon: FaShieldAlt,
    description: "Enterprise-ready with Bulma components",
    rightIcon: FaCode,
    framework: "Bulma",
    iconColor: "#06c",
  },
};

const AppTile = memo(function AppTile({
  title,
  isSelected,
  onClick,
  isLoading,
  theme,
}: AppTileProps) {
  const framework = frameworkMap[title];
  const LeftIcon = framework.icon;
  const RightIcon = framework.rightIcon;

  useEffect(() => {
    setEditedCode(code);
  }, [code]);

  const handleCodeChange = (value: string | undefined) => {
    if (value !== undefined) {
      setEditedCode(value);
      setPreviewKey((prev) => prev + 1);
      onChange?.(value);
    }
  };

  const getBgColor = useCallback(() => {
    if (isPlaceholder) {
      return theme === "dark"
        ? "bg-gray-800/50 hover:bg-gray-700/70 border-2 border-dashed border-gray-600"
        : "bg-white/80 hover:bg-gray-50/90 border-2 border-dashed border-gray-300";
    }
    if (isSelected) {
      return "bg-[#2563EB] shadow-lg shadow-blue-500/20";
    }
    return theme === "dark"
      ? "bg-gray-800 hover:bg-gray-700"
      : "bg-white hover:bg-gray-50 border border-gray-200";
  }, [isSelected, theme]);

  // Mac-style window controls handler
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      setShowDeleteConfirm(true);
    }
  };

  // Cancel delete confirmation
  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  // Confirm delete
  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
    setShowDeleteConfirm(false);
  };

  // Toggle style dropdown
  const handleToggleStyleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowStyleDropdown(!showStyleDropdown);
  };

  // Handle style selection
  const handleStyleSelect = (style: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStyle(style);
    setShowStyleDropdown(false);
    if (onStyleSelect) {
      onStyleSelect(style);
    }
  };

  // Handle generate with selected style
  const handleGenerateWithStyle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedStyle && onStyleSelect) {
      onStyleSelect(selectedStyle);
    }
    onClick();
  };

  // Handle preview button click without minimizing
  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewMode("preview");
  };

  // Handle code view button click without minimizing
  const handleCodeViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewMode("code");
  };

  // Handle deploy button click (coming soon feature)
  const handleDeployClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // This is a coming soon feature, so we'll just show an alert for now
    alert("Deploy feature coming soon!");
  };

  // If this is a placeholder tile, render it differently
  if (isPlaceholder) {
    return (
      <motion.div
        layout
        className={`relative rounded-lg cursor-pointer transition-all duration-200 ${getBgColor()} flex flex-col h-[300px]`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex flex-col items-center justify-center text-center p-6 flex-1">
          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center mb-3">
            <FaPlus className="text-white w-6 h-6" />
          </div>
          <h3
            className={`text-lg font-semibold ${
              theme === "dark" ? "text-gray-200" : "text-gray-700"
            }`}
          >
            Add New Design
          </h3>
          <p
            className={`mt-2 text-sm ${
              theme === "dark" ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Generate another design variation
          </p>

          {/* Style selection dropdown */}
          <div className="mt-4 relative w-full max-w-xs">
            <button
              onClick={handleToggleStyleDropdown}
              className={`w-full px-4 py-2 rounded-md flex items-center justify-between ${
                theme === "dark"
                  ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`}
            >
              <span>{selectedStyle || "Select Style"}</span>
              <FaChevronDown className="ml-2 w-3 h-3" />
            </button>

            <AnimatePresence>
              {showStyleDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`absolute top-full left-0 right-0 mt-1 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto ${
                    theme === "dark" ? "bg-gray-800" : "bg-white"
                  }`}
                >
                  {availableStyles.length > 0 ? (
                    availableStyles.map((style, index) => (
                      <div
                        key={index}
                        onClick={handleStyleSelect(style)}
                        className={`px-4 py-2 cursor-pointer ${
                          theme === "dark"
                            ? "hover:bg-gray-700 text-gray-200"
                            : "hover:bg-gray-100 text-gray-800"
                        } ${
                          selectedStyle === style
                            ? theme === "dark"
                              ? "bg-gray-700"
                              : "bg-gray-100"
                            : ""
                        }`}
                      >
                        {style}
                      </div>
                    ))
                  ) : (
                    <div
                      className={`px-4 py-2 ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      No styles available
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleGenerateWithStyle}
            className={`mt-4 px-4 py-2 rounded-md ${
              theme === "dark"
                ? "bg-blue-600 hover:bg-blue-500 text-white"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            Generate
          </button>
        </div>
      </motion.div>
    );
  }

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
            style={{ color: isSelected ? "#ffffff" : framework.iconColor }}
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
            {framework.description}
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
});

export default AppTile;
