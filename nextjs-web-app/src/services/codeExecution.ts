/**
 * Service for executing Python code using the e2b sandbox
 */
export async function executeCode(code: string): Promise<{
  output: string;
  error?: string;
  errorDetails?: {
    name?: string;
    message?: string;
    traceback?: string;
  };
}> {
  try {
    const response = await fetch('/api/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    
    if (!response.ok) {
      let errorMessage = `HTTP Error: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
          
          // Log detailed error information if available
          if (errorData.details) {
            console.error("Detailed execution error:", errorData.details);
          }
        }
      } catch (parseError) {
        console.error("Failed to parse error response:", parseError);
      }
      
      return {
        output: '',
        error: errorMessage
      };
    }
    
    const data = await response.json();
    
    // Handle structured error information
    if (data.error && typeof data.error === 'object') {
      const errorObj = data.error;
      let formattedError = '';
      
      if (errorObj.name && errorObj.message) {
        formattedError = `${errorObj.name}: ${errorObj.message}`;
      } else if (errorObj.message) {
        formattedError = errorObj.message;
      } else {
        formattedError = 'Unknown execution error';
      }
      
      return {
        output: data.output || '',
        error: formattedError,
        errorDetails: errorObj
      };
    }
    
    return {
      output: data.output || '',
      error: data.error
    };
  } catch (error) {
    console.error("Code execution client error:", error);
    
    let errorMessage = "Failed to execute code";
    if (error instanceof Error) {
      errorMessage = `${error.name}: ${error.message}`;
    } else if (error !== null && error !== undefined) {
      errorMessage = String(error);
    }
    
    return {
      output: '',
      error: errorMessage
    };
  }
} 