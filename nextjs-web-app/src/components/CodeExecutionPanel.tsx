'use client';

import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { executeCode } from '@/services/codeExecution';

interface CodeExecutionPanelProps {
  code: string;
  onChange?: (newCode: string) => void;
  isLoading?: boolean;
  theme: "light" | "dark";
  showControls?: boolean;
  initialOutput?: string;
  initialError?: string;
  errorDetails?: {
    name?: string;
    message?: string;
    traceback?: string;
  };
}

export default function CodeExecutionPanel({ 
  code, 
  onChange, 
  isLoading = false,
  theme,
  showControls = true,
  initialOutput = '',
  initialError,
  errorDetails
}: CodeExecutionPanelProps) {
  const [activeTab, setActiveTab] = useState<'split' | 'code' | 'terminal'>('split');
  const [editedCode, setEditedCode] = useState(code);
  const [output, setOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    setEditedCode(code);
  }, [code]);

  useEffect(() => {
    // Format output with error information if available
    let formattedOutput = initialOutput || '';
    
    if (initialError) {
      let errorText = `Error: ${initialError}\n`;
      
      // Add traceback if available
      if (errorDetails?.traceback) {
        errorText += `\n${errorDetails.traceback}\n`;
      }
      
      formattedOutput = errorText + (formattedOutput ? `\n${formattedOutput}` : '');
    }
    
    setOutput(formattedOutput);
  }, [initialOutput, initialError, errorDetails]);

  const handleCodeChange = (value: string | undefined) => {
    if (value !== undefined) {
      setEditedCode(value);
      onChange?.(value);
    }
  };

  const executeCodeHandler = async () => {
    setIsExecuting(true);
    setOutput('Executing code...');
    
    try {
      const result = await executeCode(editedCode);
      
      let formattedOutput = result.output || '';
      
      if (result.error) {
        let errorText = `Error: ${result.error}\n`;
        
        // Add traceback if available
        if (result.errorDetails?.traceback) {
          errorText += `\n${result.errorDetails.traceback}\n`;
        }
        
        formattedOutput = errorText + (formattedOutput ? `\n${formattedOutput}` : '');
      } else {
        formattedOutput = formattedOutput || 'No output';
      }
      
      setOutput(formattedOutput);
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
              onClick={executeCodeHandler}
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
              onClick={() => setActiveTab('split')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'split'
                  ? theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                  : theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Split View
            </button>
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
        {activeTab === 'split' ? (
          <div className="h-full flex">
            <div className="w-1/2 h-full border-r border-gray-700">
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
            <div className={`w-1/2 h-full overflow-auto p-4 font-mono text-sm ${
              theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-black text-green-400'
            }`}>
              <pre className="whitespace-pre-wrap">{output}</pre>
            </div>
          </div>
        ) : activeTab === 'code' ? (
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