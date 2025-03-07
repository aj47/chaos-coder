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

    // Create a new sandbox instance
    const sandbox = await Sandbox.create();
    
    try {
      // Execute the code
      const execution = await sandbox.runCode(code);
      
      // Return the execution results
      return NextResponse.json({
        output: execution.text,
        error: execution.error
      });
    } finally {
      // Always close the sandbox to free resources
      await sandbox.kill();
    }
  } catch (error) {
    console.error("Error executing code:", error);
    return NextResponse.json(
      { error: "Failed to execute code" },
      { status: 500 }
    );
  }
} 