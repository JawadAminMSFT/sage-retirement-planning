/**
 * Quick WorkIQ MCP connectivity check.
 * Usage: node check.mjs "your question here"
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
  const question = process.argv[2] || "What meetings do I have today?";
  console.log(`\n🔍 Query: "${question}"\n`);
  console.log("⏳ Spawning WorkIQ MCP server...\n");

  // Use StdioClientTransport's built-in spawn
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["-y", "@microsoft/workiq", "mcp"],
  });

  const client = new Client({ name: "workiq-check", version: "1.0.0" }, { capabilities: {} });

  try {
    await client.connect(transport);
    console.log("✅ Connected to WorkIQ MCP\n");

    // List available tools
    const { tools } = await client.listTools();
    console.log(`📋 Available tools: ${tools.map((t) => t.name).join(", ")}\n`);

    // Find the ask tool
    const askTool = tools.find((t) => t.name.includes("ask") || t.name.includes("query"));
    if (!askTool) {
      console.log("❌ No 'ask' tool found. Available tools:");
      tools.forEach((t) => console.log(`   - ${t.name}: ${t.description?.slice(0, 80)}...`));
      process.exit(1);
    }

    console.log(`🛠️  Using tool: ${askTool.name}\n`);

    // Call the tool
    const result = await client.callTool({
      name: askTool.name,
      arguments: { question },
    });

    console.log("═".repeat(60));
    console.log("📄 RESPONSE:");
    console.log("═".repeat(60));

    if (result.content) {
      for (const item of result.content) {
        if (item.type === "text") {
          console.log(item.text);
        } else {
          console.log(JSON.stringify(item, null, 2));
        }
      }
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
    if (err.cause) console.error("   Cause:", err.cause);
  } finally {
    await transport.close().catch(() => {});
    process.exit(0);
  }
}

main();
