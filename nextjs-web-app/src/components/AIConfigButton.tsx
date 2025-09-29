"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";
import { useAIConfig } from "@/hooks/useAIConfig";
import AIConfigModal from "./AIConfigModal";
import { FaCog, FaCheck, FaExclamationTriangle } from "react-icons/fa";

interface AIConfigButtonProps {
  className?: string;
  showLabel?: boolean;
}

export default function AIConfigButton({ className = "", showLabel = true }: AIConfigButtonProps) {
  const { theme } = useTheme();
  const { currentProvider, isConfigValid } = useAIConfig();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <motion.button
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
          theme === 'dark'
            ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
        } ${className}`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        title={`AI Provider: ${currentProvider.name} (${isConfigValid ? 'Valid' : 'Invalid'})`}
      >
        <div className="flex items-center gap-1">
          <FaCog className="w-3 h-3" />
          {isConfigValid ? (
            <FaCheck className="w-2 h-2 text-green-500" />
          ) : (
            <FaExclamationTriangle className="w-2 h-2 text-red-500" />
          )}
        </div>
        
        {showLabel && (
          <span className="text-sm">
            {currentProvider.name}
          </span>
        )}
      </motion.button>

      <AIConfigModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
