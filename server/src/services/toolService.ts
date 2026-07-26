import { mcpServer } from './mcpService.js';

export interface ToolExecutionResult {
  success: boolean;
  result: any;
  error?: string;
}

/**
 * Executes an AI tool dynamically using Model Context Protocol (MCP) Protocol Engine.
 */
export async function executeTool(
  toolName: string,
  inputArgs: Record<string, any>,
  workspaceId: string,
): Promise<ToolExecutionResult> {
  try {
    const mcpResponse = await mcpServer.executeMcpToolHandler(toolName, inputArgs, workspaceId);

    if (mcpResponse.isError) {
      const errorText = mcpResponse.content.map((c) => c.text).join('\n');
      return {
        success: false,
        result: null,
        error: errorText || `MCP Tool "${toolName}" execution failed.`,
      };
    }

    const rawText = mcpResponse.content.map((c) => c.text).join('\n');
    let parsedResult: any = rawText;

    try {
      parsedResult = JSON.parse(rawText);
    } catch {
      // Return raw string if not JSON
    }

    return {
      success: true,
      result: parsedResult,
    };
  } catch (err: any) {
    return {
      success: false,
      result: null,
      error: err?.message || `MCP Tool "${toolName}" execution failed.`,
    };
  }
}
