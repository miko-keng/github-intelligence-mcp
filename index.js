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
      description: "Calculates health metrics for a repo (stars-to-forks ratio and recent activity).",
      inputSchema: {
        type: "object",
        properties: {
          owner: { type: "string" },
          repo: { type: "string" }
        },
        required: ["owner", "repo"],
      },
    }
  ],
}));

// 3. Logic Layer: Data Science Insights
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "analyze_repo_health") {
    // Validate arguments using Zod
    const schema = z.object({ owner: z.string(), repo: z.string() });
    const { owner, repo } = schema.parse(request.params.arguments);

    try {
      const [repoData, commits] = await Promise.all([
        github.get(`/repos/${owner}/${repo}`),
        github.get(`/repos/${owner}/${repo}/commits?per_page=10`)
      ]);

      const data = repoData.data;
      
      // Feature Engineering: Calculate custom metrics
      const healthScore = (data.stargazers_count / (data.network_count || 1)).toFixed(2);
      const lastCommitDate = commits.data[0]?.commit.author.date;

      const analysis = {
        name: data.full_name,
        description: data.description,
        metrics: {
          stars: data.stargazers_count,
          forks: data.network_count,
          star_to_fork_ratio: healthScore, // Shows if users just 'like' it or actually 'use' it
          is_active: new Date(lastCommitDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        },
        insight: `This repo has a ${healthScore} star/fork ratio. ${data.stargazers_count > 1000 ? 'High authority project.' : 'Growing project.'}`
      };

      return { content: [{ type: "text", text: JSON.stringify(analysis, null, 2) }] };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Analysis Failed: ${error.message}` }],
        isError: true,
      };
    }
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);