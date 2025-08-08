import express from "express";
import fetch from "node-fetch";

/*
 * Simple remote MCP server for TickTick
 *
 * Exposes two tools via the Model Context Protocol:
 *  - search: search TickTick tasks by query string
 *  - fetch: fetch a single task by its id
 *
 * Provides a minimal OAuth flow to obtain user tokens. Tokens are stored in
 * memory keyed by a placeholder user identifier. Replace this with a proper
 * per‑user store when running in production.
 */

const app = express();
app.use(express.json());

// In‑memory token store. In production use a persistent store keyed by user id.
const userTokens = new Map();

// Kick off the OAuth flow by redirecting the user to the provider's authorization page.
app.get("/oauth/start", (req, res) => {
  const state = crypto.randomUUID();
  const authUrl = new URL(process.env.OAUTH_AUTH_URL);
  authUrl.searchParams.set("client_id", process.env.OAUTH_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", process.env.OAUTH_REDIRECT);
  authUrl.searchParams.set("response_type", "code");
  // Optionally request scopes via OAUTH_SCOPE environment variable
  if (process.env.OAUTH_SCOPE) {
    authUrl.searchParams.set("scope", process.env.OAUTH_SCOPE);
  }
  authUrl.searchParams.set("state", state);
  return res.redirect(authUrl.toString());
});

// Handle the OAuth callback by exchanging the authorization code for tokens.
app.get("/oauth/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send("Missing authorization code");
  }
  try {
    const tokenRes = await fetch(process.env.OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: String(code),
        client_id: process.env.OAUTH_CLIENT_ID,
        client_secret: process.env.OAUTH_CLIENT_SECRET,
        redirect_uri: process.env.OAUTH_REDIRECT,
      }),
    });
    const tokens = await tokenRes.json();
    // Associate tokens with a placeholder user id. Replace 'default' with actual user context.
    userTokens.set("default", tokens);
    return res.send("Authorization complete. You may close this window.");
  } catch (e) {
    console.error(e);
    return res.status(500).send("Failed to exchange authorization code");
  }
});

// Health check endpoint for deployment platforms
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// SSE endpoint: handshake for remote MCP. Sends an endpoint event per spec.
app.get("/mcp", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.write(`event: endpoint\ndata: {}\n\n`);
});

// JSON‑RPC endpoint for MCP method calls
app.post("/mcp", async (req, res) => {
  const { id, method, params } = req.body || {};
  const reply = (result) => res.json({ jsonrpc: "2.0", id, result });
  const error = (code, message) => res.json({ jsonrpc: "2.0", id, error: { code, message } });

  // Provide tool definitions to the model
  if (method === "tools/list") {
    return reply({
      tools: [
        {
          name: "search",
          description: "Search TickTick tasks by query",
          inputSchema: {
            type: "object",
            properties: { q: { type: "string" } },
            required: ["q"],
          },
        },
        {
          name: "fetch",
          description: "Fetch a TickTick task by id",
          inputSchema: {
            type: "object",
            properties: { id: { type: "string" } },
            required: ["id"],
          },
        },
      ],
    });
  }

  // Handle tool invocation
  if (method === "tools/call") {
    const { name, arguments: args } = params || {};
    const tokens = userTokens.get("default");
    if (!tokens) {
      return error(-32000, "Not authorized with TickTick");
    }
    try {
      if (name === "search") {
        const resp = await fetch(
          `https://api.ticktick.com/open/v1/task?search=${encodeURIComponent(args.q)}`,
          { headers: { Authorization: `Bearer ${tokens.access_token}` } }
        );
        const data = await resp.json();
        return reply({ content: [{ type: "json", text: JSON.stringify(data) }] });
      }
      if (name === "fetch") {
        const resp = await fetch(
          `https://api.ticktick.com/open/v1/task/${encodeURIComponent(args.id)}`,
          { headers: { Authorization: `Bearer ${tokens.access_token}` } }
        );
        const data = await resp.json();
        return reply({ content: [{ type: "json", text: JSON.stringify(data) }] });
      }
      return error(-32601, "Unknown tool");
    } catch (e) {
      return error(-32001, e?.message || "TickTick API error");
    }
  }

  // Optional: advertise additional offerings (none for now)
  if (method === "server/listOfferings") {
    return reply({ offerings: [] });
  }

  return error(-32601, "Method not found");
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`MCP server listening on port ${PORT}`);
});
