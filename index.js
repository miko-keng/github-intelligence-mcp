import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import axios from "axios";

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
  version: "4.0.0",
}, {
  capabilities: { tools: {} },
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_user_profile",
      description: "Fetches GitHub profile data.",
      inputSchema: { type: "object", properties: { username: { type: "string" } }, required: ["username"] },
    },
    {
      name: "list_user_repos",
      description: "Lists all public repositories for a specific user.",
      inputSchema: { type: "object", properties: { username: { type: "string" } }, required: ["username"] },
    },
    {
      name: "analyze_repo_health",
      description: "Calculates health metrics for a repo.",
      inputSchema: {
        type: "object",
        properties: { owner: { type: "string" }, repo: { type: "string" } },
        required: ["owner", "repo"],
      },
    }
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;

  try {
    if (name === "get_user_profile") {
      const { username } = z.object({ username: z.string() }).parse(request.params.arguments);
      const response = await github.get(`/users/${username}`);
      return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
    }

    if (name === "list_user_repos") {
      const { username } = z.object({ username: z.string() }).parse(request.params.arguments);
      const response = await github.get(`/users/${username}/repos?sort=updated&per_page=50`);
      const repos = response.data.map(r => ({ name: r.name, description: r.description, stars: r.stargazers_count }));
      return { content: [{ type: "text", text: JSON.stringify(repos, null, 2) }] };
    }

    if (name === "analyze_repo_health") {
      const { owner, repo } = z.object({ owner: z.string(), repo: z.string() }).parse(request.params.arguments);
      
      const repoData = await github.get(`/repos/${owner}/${repo}`);
      let commits = { data: [] };
      try {
        commits = await github.get(`/repos/${owner}/${repo}/commits?per_page=1`);
      } catch (e) { /* Ignore commit errors for empty repos */ }

      const data = repoData.data;
      const healthScore = (data.stargazers_count / (data.network_count || 1)).toFixed(2);
      const lastCommitDate = commits.data[0]?.commit.author.date || "No recent commits";

      const analysis = {
        name: data.full_name,
        metrics: {
          stars: data.stargazers_count,
          forks: data.network_count,
          ratio: healthScore,
          last_active: lastCommitDate
        }
      };
      return { content: [{ type: "text", text: JSON.stringify(analysis, null, 2) }] };
    }
  } catch (error) {
    return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);