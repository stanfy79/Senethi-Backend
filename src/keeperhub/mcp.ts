import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { env } from "../config.js";

export class KeeperHubMcp {
  private client: Client | null = null;

  private async connect() {
    if (this.client) return this.client;

    const client = new Client(
      { name: "keeper-agent-backend", version: "0.1.0" },
      { capabilities: {} }
    );

    const transport = new StreamableHTTPClientTransport(
      new URL(env.KEEPERHUB_MCP_URL),
      {
        requestInit: {
          headers: {
            Authorization: `Bearer ${env.KEEPERHUB_API_KEY}`
          }
        }
      }
    );

    await client.connect(transport);
    this.client = client;
    return client;
  }

  async listTools() {
    const client = await this.connect();
    return client.listTools();
  }

  async callTool(name: string, args: Record<string, unknown>) {
    const client = await this.connect();
    return client.callTool({ name, arguments: args });
  }

  async searchProtocolActions(query: string) {
    return this.callTool("search_protocol_actions", { query });
  }

  async executeProtocolAction(args: Record<string, unknown>) {
    return this.callTool("execute_protocol_action", args);
  }

  async getWalletIntegration() {
    return this.callTool("get_wallet_integration", {});
  }

  async listActionSchemas() {
    return this.callTool("list_action_schemas", {});
  }
}
