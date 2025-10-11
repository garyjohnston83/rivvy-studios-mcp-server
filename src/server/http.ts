// src/server/http.ts
import express, { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { randomUUID } from 'node:crypto';
import type { StreamableHTTPServerTransportOptions } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { env } from '../config/env';
import { log } from '../observability/logger';

export async function startHttp(server: McpServer) {
    const app = express();

    // Create ONE transport for the whole process (sessions & init state live here)
    const options: StreamableHTTPServerTransportOptions = {
        enableJsonResponse: true,
        sessionIdGenerator: () => randomUUID(),
    };
    const transport = new StreamableHTTPServerTransport(options);

    // Connect the MCP server to the transport once
    await server.connect(transport);

    // Health check (simple text ok)
    app.get('/health', (_req, res) => res.status(200).send('ok'));

    // Do NOT use express.json() on /mcp; let the transport read the raw stream.
    app.post('/mcp', async (req: Request, res: Response) => {
        const auth = req.header('authorization') || req.header('Authorization');
        if (!auth || !auth.startsWith('Bearer ') || auth.slice(7) !== env.inboundMcpToken) {
            res.status(401).send('Unauthorized');
            return;
        }

        try {
            // Let the shared transport handle the request (initialize + follow-ups)
            await transport.handleRequest(req, res);
        } catch (err) {
            log.error('Transport error', { err: (err as Error)?.message });
            // Best-effort error; transport may have already written the response
            if (!res.headersSent) {
                res.status(500).json({ error: 'internal_error' });
            }
        }
    });

    // If you need JSON parsing for OTHER routes, add it after /mcp:
    // app.use(express.json());
    // app.post('/some-other-route', express.json(), ...)

    app.listen(env.port, () => {
        log.info('MCP HTTP server started', { port: env.port, path: '/mcp' });
    });
}