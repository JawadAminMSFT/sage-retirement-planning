/**
 * WorkIQ MCP query script for backend integration.
 * Outputs JSON to stdout for Python subprocess consumption.
 * Modeled on the working check.mjs approach.
 * 
 * Usage: node query.mjs "your question here"
 * Output: { "success": true, "response": "...", "error": null }
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const TIMEOUT_MS = 90000;

async function query(question) {
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["-y", "@microsoft/workiq", "mcp"],
  });

  const client = new Client(
    { name: "sage-workiq", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);

    const { tools } = await client.listTools();
    const askTool = tools.find((t) => t.name === "ask_work_iq");

    if (!askTool) {
      return { success: false, response: null, error: "No ask_work_iq tool found" };
    }

    const result = await client.callTool({
      name: askTool.name,
      arguments: { question },
    });

    let responseText = "";
    if (result.content) {
      for (const item of result.content) {
        if (item.type === "text") {
          responseText += item.text;
        }
      }
    }

    return { success: true, response: responseText, error: null };
  } catch (err) {
    return { success: false, response: null, error: err.message };
  } finally {
    await transport.close().catch(() => {});
  }
}

async function main() {
  const question = process.argv[2];
  if (!question) {
    console.log(JSON.stringify({ success: false, response: null, error: "No question provided" }));
    process.exit(1);
  }

  const timeoutId = setTimeout(() => {
    console.log(JSON.stringify({ success: false, response: null, error: "Query timed out" }));
    process.exit(1);
  }, TIMEOUT_MS);

  const result = await query(question);
  clearTimeout(timeoutId);

  console.log(JSON.stringify(result));
  process.exit(result.success ? 0 : 1);
}

main();
