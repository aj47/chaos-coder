'use client';

import { useEffect, useState, useCallback, memo, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { FaExpand } from 'react-icons/fa';


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
