import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import axios from "axios";

// 1. Setup GitHub Instance
const github = axios.create({
  baseURL: 'https://api.github.com',
  timeout: 5000,
  headers: {
    'Authorization': `token ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'github-analyst-pro'
  },
});

const server = new Server({
  name: "github-analyst-pro",
  version: "3.0.0",
}, {
  capabilities: { tools: {} },
});

// 2. Define All Available Tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "analyze_repo_health",
      description: "Calculates health metrics for a repo (stars-to-forks ratio and recent activity).",
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

// 3. Logic Layer: Handling Tool Calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;

  // --- REPO HEALTH LOGIC ---
  if (name === "analyze_repo_health") {
    const { owner, repo } = z.object({ owner: z.string(), repo: z.string() }).parse(request.params.arguments);

    try {
      const [repoData, commits] = await Promise.all([
        github.get(`/repos/${owner}/${repo}`),
        github.get(`/repos/${owner}/${repo}/commits?per_page=10`)
      ]);

      const data = repoData.data;
      const healthScore = (data.stargazers_count / (data.network_count || 1)).toFixed(2);
      const lastCommitDate = commits.data[0]?.commit.author.date;

      const analysis = {
        name: data.full_name,
        metrics: {
          stars: data.stargazers_count,
          forks: data.network_count,
          star_to_fork_ratio: healthScore,
          is_active: new Date(lastCommitDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      };

      return { content: [{ type: "text", text: JSON.stringify(analysis, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Repo Analysis Failed: ${error.message}` }], isError: true };
    }
  }

  // --- USER PROFILE LOGIC ---
  if (name === "get_user_profile") {
    const { username } = z.object({ username: z.string() }).parse(request.params.arguments);
    try {
      const response = await github.get(`/users/${username}`);
      return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `User not found: ${error.message}` }], isError: true };
    }
  }

  throw new Error(`Tool not found: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);