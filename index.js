import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod"; // Industrial standard for validation
import axios from "axios";

// 1. Setup GitHub Instance (Professional approach)
const github = axios.create({
  baseURL: 'https://api.github.com',
  timeout: 5000,
  headers: {
    // This pulls the token from the environment variable
    'Authorization': `token ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'github-analyst-pro' // GitHub requires a User-Agent header
  },
});

const server = new Server({
  name: "github-analyst-pro",
  version: "3.0.0",
}, {
  capabilities: { tools: {} },
});

// 2. Define Advanced Tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "analyze_repo_health",
      description: "Calculates health metrics for a repo.",
      inputSchema: {
        type: "object",
        properties: {
          owner: { type: "string" },
          repo: { type: "string" }
        },
        required: ["owner", "repo"],
      },
    },
    {
      name: "get_user_profile",
      description: "Fetches GitHub profile data for a specific username.",
      inputSchema: {
        type: "object",
        properties: {
          username: { type: "string" }
        },
        required: ["username"],
      },
    }
  ],
}));

// 3. Logic Layer
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "analyze_repo_health") {
    // ... (Keep your existing repo health code here)
  }

  if (name === "get_user_profile") {
    const { username } = z.object({ username: z.string() }).parse(args);
    try {
      const response = await github.get(`/users/${username}`);
      return {
        content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
      };
    } catch (error) {
      return { content: [{ type: "text", text: `User not found: ${error.message}` }], isError: true };
    }
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);