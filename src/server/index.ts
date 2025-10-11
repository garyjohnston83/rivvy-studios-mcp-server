// src/server/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createVideoTool } from '../tools/createVideo';
import { startHttp } from './http';
import { log } from '../observability/logger';

async function main() {
    const server = new McpServer({ name: 'studio-mcp', version: '1.0.0', requestTimeoutMs: 300_000 });

    server.registerTool(
        'create_video',
        {
            title: 'Create Video',
            description: createVideoTool.description,
            inputSchema: createVideoTool.inputSchema, // ensure exported
        },
        async (args, _extra) => createVideoTool.handler(args as any)
    );

    await startHttp(server);
    log.info('Ready', { tools: ['create_video'] });
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
