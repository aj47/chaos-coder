'use client';

import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';

interface CodeExecutionPanelProps {
  code: string;
  onChange?: (newCode: string) => void;
  isLoading?: boolean;
  theme: "light" | "dark";
  showControls?: boolean;
}

export default function CodeExecutionPanel({ 
  code, 
  onChange, 
  isLoading = false,
  theme,
  showControls = true
}: CodeExecutionPanelProps) {
  const [activeTab, setActiveTab] = useState<'terminal' | 'code'>('code');
  const [editedCode, setEditedCode] = useState(code);
  const [output, setOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    setEditedCode(code);
  }, [code]);

  const handleCodeChange = (value: string | undefined) => {
    if (value !== undefined) {
      setEditedCode(value);
      onChange?.(value);
    }
  };

  const executeCode = async () => {
    setIsExecuting(true);
    setOutput('Executing code...');
    
    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: editedCode }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        setOutput(`Error: ${data.error}\n\n${data.output || ''}`);
      } else {
        setOutput(data.output || 'No output');
      }
    } catch (error) {
      setOutput(`Failed to execute code: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {showControls && (
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={executeCode}
              disabled={isExecuting}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                isExecuting
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : theme === 'dark' 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {isExecuting ? 'Executing...' : 'Run Code'}
            </button>
          </div>
          <div className="space-x-2">
            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'code'
                  ? theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                  : theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Code
            </button>
            <button
              onClick={() => setActiveTab('terminal')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'terminal'
                  ? theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                  : theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Terminal
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0">
        {activeTab === 'code' ? (
          <div className="h-full">
            <Editor
              height="100%"
              defaultLanguage="python"
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
        ) : (
          <div className={`h-full overflow-auto p-4 font-mono text-sm ${
            theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-black text-green-400'
          }`}>
            <pre className="whitespace-pre-wrap">{output}</pre>
          </div>
        )}
      </div>
    </div>
  );
} 