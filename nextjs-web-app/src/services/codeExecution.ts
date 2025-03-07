/**
 * Service for executing Python code using the e2b sandbox
 */
export async function executeCode(code: string): Promise<{
  output: string;
  error?: string;
}> {
  try {
    const response = await fetch('/api/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return {
        output: '',
        error: errorData.error || `Error: ${response.status} ${response.statusText}`
      };
    }
    
    const data = await response.json();
    return {
      output: data.output || '',
      error: data.error
    };
  } catch (error) {
    return {
      output: '',
      error: error instanceof Error ? error.message : String(error)
    };
  }
} 