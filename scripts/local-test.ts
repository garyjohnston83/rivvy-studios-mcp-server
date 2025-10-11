// scripts/local-test.ts
import 'dotenv/config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function main() {
    const url = new URL(process.env.MCP_URL ?? 'http://localhost:3333/mcp');
    const token = process.env.INBOUND_MCP_TOKEN ?? '';

    const transport = new StreamableHTTPClientTransport(url, {
        requestInit: {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json, text/event-stream',
            },
        },
    });

    const client = new Client({ name: 'local-test', version: '0.1.0' });
    await client.connect(transport); // <-- connect is on Client

    // List tools (high-level API). If your SDK is older and lacks listTools, see raw request below.
    if ((client as any).listTools) {
        const tools = await (client as any).listTools();
        console.log('tools/list →', JSON.stringify(tools, null, 2));
    } else {
        // Raw JSON-RPC as a fallback
        const tools = await (client as any).request({
            jsonrpc: '2.0',
            id: '1',
            method: 'tools/list',
        });
        console.log('tools/list →', JSON.stringify(tools, null, 2));
    }

    // Call your tool end-to-end
    const call = await client.callTool({
        name: 'create_video',
        arguments: {
            serviceProvider: 'RUNWAY_ML',
            prompt: 'An aerial shot of a sunny beach in Southern Spain (the beach is narrow i.e. water is quite close to a beach path). The beach path backs onto a few beach restaurants, and there are customers outside on the path with tables and chairs.  The camera zooms into one of those outside tables with 4 people eating seafood.',
            model: 'veo3',
            durationSeconds: 8,
            aspectRatio: '1280:720',
            seed: 12345,
            pollIntervalSeconds: 5,
            maxAttempts: 240
        },
    });
    console.log('tools/call →', JSON.stringify(call, null, 2));

    // tidy up
    await client.close?.();
    transport.close?.();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});