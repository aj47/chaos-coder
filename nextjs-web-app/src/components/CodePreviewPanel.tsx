'use client';

import { useEffect, useState, useCallback, memo, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { FaExpand, FaDownload } from 'react-icons/fa';


const Editor = lazy(() => import('@monaco-editor/react'));

interface CodePreviewPanelProps {
  code: string;
  title?: string;
  onChange?: (newCode: string) => void;
  isLoading?: boolean;
  theme: "light" | "dark";
  deployButton?: React.ReactNode;
  showControls?: boolean;
  onMaximize?: () => void;
}

const CodePreviewPanel = memo(function CodePreviewPanel({
  code,
  title,
  onChange,
  isLoading = false,
  theme,
  deployButton,
  showControls = true,
  onMaximize
}: CodePreviewPanelProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [editedCode, setEditedCode] = useState(code);
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    setEditedCode(code);
  }, [code]);

  const handleCodeChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setEditedCode(value);
      setPreviewKey(prev => prev + 1);
      onChange?.(value);
    }
  }, [onChange]);

  const handleTabChange = useCallback((tab: 'preview' | 'code') => {
    setActiveTab(tab);
  }, []);

  const handleDownload = useCallback(() => {
    // Create a blob from the code
    const blob = new Blob([editedCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    // Generate filename from title or use default
    const filename = title
      ? `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`
      : `generated-app-${Date.now()}.html`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [editedCode, title]);

  return (
    <div className="h-full flex flex-col">
      {showControls && (
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            {onMaximize && (
              <motion.button
                onClick={onMaximize}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm ${
                  theme === "dark"
                    ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                }`}
                title="Maximize Preview"
              >
                <FaExpand className="w-3 h-3" />
                Maximize
              </motion.button>
            )}
            <motion.button
              onClick={handleDownload}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm ${
                theme === "dark"
                  ? "bg-green-700 hover:bg-green-600 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
              title="Download HTML"
              disabled={!editedCode || isLoading}
            >
              <FaDownload className="w-3 h-3" />
              Export
            </motion.button>
            {deployButton}
          </div>
          <div className="space-x-2">
            <button
              onClick={() => handleTabChange('preview')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'preview'
                  ? theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                  : theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => handleTabChange('code')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'code'
                  ? theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                  : theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Code
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0">
        {activeTab === 'preview' ? (
          <div key={previewKey} className="h-full">
            <iframe
              srcDoc={editedCode}
              className="w-full h-full border-0 bg-white"
              title="Preview"
            />
          </div>
        ) : (
          <div className="h-full">
            <Suspense fallback={
              <div className="h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Loading editor...</p>
                </div>
              </div>
            }>
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
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
});

export default CodePreviewPanel;
