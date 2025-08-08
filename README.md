# TickTick MCP Server

This repository contains a simple [Model Context Protocol](https://platform.openai.com/docs/plugins/mcp/overview) (MCP) server that exposes a subset of the TickTick API to OpenAI models. It implements the required `search` and `fetch` tools and wires up an OAuth flow to obtain user authorisation tokens.

## Features

- ✅ **Remote MCP implementation** — speaks JSON‑RPC over HTTP and Server‑Sent Events (SSE).
- 🔍 **Search tasks** — call the `search` tool to retrieve tasks matching a query string.
- 📄 **Fetch tasks** — call the `fetch` tool to fetch a single task by its ID.
- 🔑 **OAuth** — includes endpoints to start and complete the OAuth code flow for TickTick. Tokens are stored in memory keyed to a placeholder user. Extend this to use a real user store in production.
- 🚑 **Health check** — responds to `/health` for deployment platforms.
- 🐳 **Docker** & **Render** — provides a `Dockerfile` and `render.yaml` for easy deployment.

## Getting Started

### Prerequisites

1. Create a TickTick developer application to obtain your `client_id` and `client_secret`.
2. Register a **redirect URI** for OAuth. For local testing you might use `http://localhost:8080/oauth/callback`. In production set this to your hosted domain plus `/oauth/callback`.

### Local Development

```
bash
git clone https://github.com/your-org/ticktick-mcp-server.git
cd ticktick-mcp-server

cp .env.example .env
# Fill in the environment variables in `.env`

npm install
npm start

# Visit http://localhost:8080/health to check the server
# Start the OAuth flow at http://localhost:8080/oauth/start
```

### Deployment on Render

This repository includes a `render.yaml` file for one‑click deployment on [Render](https://render.com/). To deploy:

1. Create a new Web Service on Render and connect it to your GitHub repository.
2. Render will automatically detect the `render.yaml` and configure the service.
3. Define the OAuth environment variables (`OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, `OAUTH_AUTH_URL`, `OAUTH_TOKEN_URL`, `OAUTH_SCOPE`, `OAUTH_REDIRECT`) in the Render dashboard. You can mark sensitive values as secrets.
4. Deploy the service. Once live, your MCP Server URL will be `https://<your-service>.onrender.com/mcp`.

## Usage as an OpenAI Connector

1. In the ChatGPT **Connectors (Beta)** menu, create a new connector.
2. Provide the URL of your deployed MCP server (e.g. `https://<your-service>.onrender.com/mcp`).
3. Set the authentication type to **OAuth** and enter your TickTick client credentials and endpoints.
4. After saving, ChatGPT will ask you to authenticate. Complete the OAuth flow. You are ready to search and fetch TickTick tasks via ChatGPT!

## Extending

To add more capabilities, edit `server.js` and add new tool definitions in the `tools/list` handler and corresponding logic in the `tools/call` handler. For example, you could implement tools to create, update or complete tasks.

## License

This project is provided under the MIT License. See [LICENSE](LICENSE) for details.
