import { Sandbox } from '@e2b/code-interpreter';
import { NextResponse, NextRequest } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json(
        { error: "No code provided" },
        { status: 400 }
      );
    }

    const e2bApiKey = process.env.E2B_API_KEY;
    if (!e2bApiKey) {
      return NextResponse.json(
        { error: "E2B_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Create a new sandbox instance with API key
    const sandbox = await Sandbox.create({
      apiKey: e2bApiKey
    });
    
    try {
      // Execute the code
      const execution = await sandbox.runCode(code);
      console.log(execution);
      
      // Properly handle execution errors
      let errorOutput = null;
      if (execution.error) {
        // Extract detailed error information
        errorOutput = {
          name: execution.error.name,
          message: execution.error.value,
          traceback: execution.error.traceback
        };
        console.log("Execution error details:", errorOutput);
      }
      
      // Return the execution results
      return NextResponse.json({
        output: execution.text || '',
        error: errorOutput
      });
    } finally {
      // Always close the sandbox to free resources
      await sandbox.kill();
    }
  } catch (error) {
    console.error("Error executing code:", error);
    
    // Improved error handling
    let errorMessage = "Failed to execute code";
    let errorDetails = null;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack;
    } else if (typeof error === 'object' && error !== null) {
      try {
        errorMessage = JSON.stringify(error);
      } catch {
        errorMessage = "Unserializable error object";
        errorDetails = Object.getOwnPropertyNames(error).map(prop => 
          `${prop}: ${String(error[prop as keyof typeof error])}`
        ).join(', ');
      }
    }
    
    console.error("Detailed execution error:", { message: errorMessage, details: errorDetails });
    
    return NextResponse.json(
      { error: errorMessage, details: errorDetails },
      { status: 500 }
    );
  }
} 