"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Editor from '@monaco-editor/react';
import {
  FaCode,
  FaTimes,
  FaPlus,
  FaChevronDown,
  FaRocket,
  FaEye
} from "react-icons/fa";

interface AppTileProps {
  title: string;
  isSelected: boolean;
  onClick: () => void;
  onDelete?: () => void;
  isLoading?: boolean;
  theme: "light" | "dark";
  children?: React.ReactNode;
  isPlaceholder?: boolean;
  availableStyles?: string[];
  onStyleSelect?: (style: string) => void;
  isExpanded?: boolean;
  code?: string;
  onChange?: (newCode: string) => void;
}

export default function AppTile({
  title,
  isSelected,
  onClick,
  onDelete,
  isLoading,
  theme,
  children,
  isPlaceholder = false,
  availableStyles = [],
  onStyleSelect,
  isExpanded = false,
  code = '',
  onChange
}: AppTileProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStyleDropdown, setShowStyleDropdown] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [editedCode, setEditedCode] = useState(code);
  const [previewKey, setPreviewKey] = useState(0);
  
  useEffect(() => {
    setEditedCode(code);
  }, [code]);

  const handleCodeChange = (value: string | undefined) => {
    if (value !== undefined) {
      setEditedCode(value);
      setPreviewKey(prev => prev + 1);
      onChange?.(value);
    }
  };
  
  const getBgColor = () => {
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
  };

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
    setViewMode('preview');
  };

  // Handle code view button click without minimizing
  const handleCodeViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewMode('code');
  };

  // Handle deploy button click (coming soon feature)
  const handleDeployClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // This is a coming soon feature, so we'll just show an alert for now
    alert('Deploy feature coming soon!');
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
          <h3 className={`text-lg font-semibold ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
            Add New Design
          </h3>
          <p className={`mt-2 text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
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
                        } ${selectedStyle === style ? (theme === "dark" ? "bg-gray-700" : "bg-gray-100") : ""}`}
                      >
                        {style}
                      </div>
                    ))
                  ) : (
                    <div className={`px-4 py-2 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
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
      layout
      className={`relative rounded-lg cursor-pointer transition-all duration-200 overflow-hidden ${getBgColor()} ${
        isExpanded ? 'col-span-2 row-span-2' : ''
      }`}
      whileHover={{ scale: isExpanded ? 1 : 1.02 }}
      whileTap={{ scale: isExpanded ? 1 : 0.98 }}
      style={{
        boxShadow: isSelected
          ? "0 8px 24px rgba(37, 99, 235, 0.15)"
          : "0 4px 20px rgba(0, 0, 0, 0.1)",
        height: isExpanded ? '80vh' : '300px'
      }}
    >
      {/* Mac-style window header - make entire header clickable except for red button */}
      <div className="flex items-center px-3 py-2 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 relative">
        <div className="flex items-center space-x-2 z-10">
          {/* Red close button */}
          <div 
            onClick={handleDeleteClick}
            className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center cursor-pointer transition-colors duration-150 group"
          >
            {onDelete && <FaTimes className="text-red-800 opacity-0 group-hover:opacity-100 w-2 h-2" />}
          </div>
          {/* Yellow minimize button (just for show) */}
          <div 
            className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 cursor-pointer transition-colors duration-150"
          ></div>
          {/* Green expand button */}
          <div 
            onClick={onClick}
            className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 cursor-pointer transition-colors duration-150 group flex items-center justify-center"
          >
            <FaCode className="text-green-800 opacity-0 group-hover:opacity-100 w-2 h-2" />
          </div>
        </div>
        {/* Make the title area clickable for maximizing */}
        <div 
          onClick={onClick}
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
        >
          <span className={`text-xs font-medium truncate select-none px-12 ${
            theme === "dark" ? "text-gray-300" : "text-gray-600"
          }`}>
            {title}
          </span>
        </div>
        
        {/* View mode and deploy buttons toolbar */}
        {isSelected && isExpanded && (
          <div className="flex items-center space-x-2 z-10 ml-auto">
            <button
              onClick={handlePreviewClick}
              className={`px-2 py-1 text-xs rounded ${
                viewMode === 'preview' 
                  ? 'bg-blue-500 text-white' 
                  : theme === 'dark' 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <FaEye className="inline mr-1 w-3 h-3" /> Preview
            </button>
            <button
              onClick={handleCodeViewClick}
              className={`px-2 py-1 text-xs rounded ${
                viewMode === 'code' 
                  ? 'bg-blue-500 text-white' 
                  : theme === 'dark' 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <FaCode className="inline mr-1 w-3 h-3" /> Code
            </button>
            <button
              onClick={handleDeployClick}
              className={`px-2 py-1 text-xs rounded ${
                theme === 'dark' 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <FaRocket className="inline mr-1 w-3 h-3" /> Deploy
            </button>
          </div>
        )}
      </div>
      
      {/* Content area with integrated code preview functionality */}
      <div className={`overflow-hidden ${isExpanded ? 'h-[600px]' : 'h-[250px]'}`}>
        {isLoading ? (
          <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            <div className="p-6 flex flex-col items-center">
              <div className="relative mb-6">
                {/* Multi-layered spinner with different colors and animations */}
                <div className="w-16 h-16 border-[3px] border-blue-400/10 border-t-blue-500/80 rounded-full animate-spin"></div>
                <div className="absolute top-0 left-0 w-16 h-16 border-[3px] border-transparent border-r-indigo-400/70 rounded-full animate-spin animate-[spin_1.5s_linear_infinite_0.2s]"></div>
                <div className="absolute top-[3px] left-[3px] w-[58px] h-[58px] border-[3px] border-transparent border-b-purple-400/60 rounded-full animate-spin animate-[spin_2s_linear_infinite_0.3s] origin-center"></div>
                <div className="absolute top-[6px] left-[6px] w-[52px] h-[52px] border-[3px] border-transparent border-l-rose-400/50 rounded-full animate-spin animate-[spin_2.5s_linear_infinite_0.4s] origin-center"></div>
                
                {/* Pulsing dot in the center */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-pulse"></div>
              </div>
              
              <p className={`text-base font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-700"} mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400`}>
                Generating {title}...
              </p>
              
              {/* Animated progress bar */}
              <div className="w-48 h-2 bg-gray-200/30 dark:bg-gray-700/30 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 animate-shimmer"></div>
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 animate-pulse">
                Creating your design...
              </p>
            </div>
          </div>
        ) : code ? (
          <div className="h-full">
            {viewMode === 'preview' ? (
              <div key={previewKey} className="h-full" onClick={onClick}>
                <iframe
                  srcDoc={editedCode}
                  className="w-full h-full border-0 bg-white"
                  title="Preview"
                />
              </div>
            ) : (
              <div className="h-full" onClick={(e) => e.stopPropagation()}>
                <Editor
                  height="100%"
                  defaultLanguage="html"
                  theme={theme === 'dark' ? "vs-dark" : "light"}
                  value={editedCode}
                  onChange={handleCodeChange}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    readOnly: isLoading,
                    automaticLayout: true,
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="h-full overflow-auto" onClick={onClick}>
            {children}
          </div>
        )}
      </div>
      
      {/* Delete confirmation modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10"
            onClick={handleCancelDelete}
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl max-w-[80%]"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-2 dark:text-white">Delete App?</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">Are you sure you want to delete this app? This action cannot be undone.</p>
              <div className="flex justify-end space-x-3">
                <button 
                  onClick={handleCancelDelete}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
