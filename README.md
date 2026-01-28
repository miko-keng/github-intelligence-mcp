# GitHub Analyst Pro (MCP Server)

A high-performance **Model Context Protocol (MCP)** server built to provide LLMs with real-time, engineered insights into GitHub repositories.

## 🚀 Key Features
- **Health Metrics:** Calculates star-to-fork ratios to judge project utility vs. hype.
- **Activity Tracking:** Uses recency filters to determine project "velocity" (active vs. stale).
- **Parallel Orchestration:** Implements `Promise.all` for optimized API latency.
- **Schema Validation:** Powered by **Zod** to ensure robust, self-healing tool calls.

## 🛠️ Technical Stack
- **Runtime:** Node.js
- **Protocol:** Model Context Protocol (MCP)
- **Validation:** Zod
- **API Client:** Axios (REST)

## 📦 Installation
1. Clone this repo.
2. Run `npm install`.
3. Add the server path to your Claude Desktop config.
