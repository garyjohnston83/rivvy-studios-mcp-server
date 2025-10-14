// src/server/http.ts
import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { randomUUID } from 'node:crypto';
import type { StreamableHTTPServerTransportOptions } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { env } from '../config/env.js';
import { log } from '../observability/logger.js';

// NEW: OpenAPI fetch + mapper for Spring capabilities
import { fetchSpringOpenApi, mapOpenApiToCapabilities } from '../capabilities/openapi.js';

export async function startHttp(server: McpServer) {
    const app = express();

    // Auth guard reused for protected routes
    function authGuard(req: Request, res: Response, next: NextFunction) {
        const auth = req.header('authorization') || req.header('Authorization');
        if (!auth || !auth.startsWith('Bearer ') || auth.slice(7) !== env.inboundMcpToken) {
            return res.status(401).json({ error: 'unauthorized' });
        }
        next();
    }

    // One transport instance for the whole process
    const options: StreamableHTTPServerTransportOptions = {
        enableJsonResponse: true,
        sessionIdGenerator: () => randomUUID(),
        // We rely on Node HTTP server timeouts; transport itself does not add an extra limit
    };
    const transport = new StreamableHTTPServerTransport(options);

    // Connect the MCP server to the transport once
    await server.connect(transport);

    // Health check
    app.get('/health', (_req, res) => res.status(200).send('ok'));

    // IMPORTANT: do NOT use express.json() before this route; transport needs raw body
    app.post('/mcp', authGuard, async (req: Request, res: Response) => {
        // Per-request timeout, complements the server.requestTimeout below
        req.setTimeout(6 * 60 * 1000); // 6 minutes

        try {
            await transport.handleRequest(req, res);
        } catch (err) {
            log.error('Transport error', { err: (err as Error)?.message });
            if (!res.headersSent) {
                res.status(500).json({ error: 'internal_error' });
            }
        }
    });

    // JSON parsing is safe AFTER the /mcp raw-body route
    app.use(express.json());

    // NEW: Capabilities discovery endpoint for the Gateway
    app.get('/mcp/capabilities', authGuard, async (_req: Request, res: Response) => {
        try {
            // Requires env.studioApiBase (e.g., http://localhost:8080) and env.studioApiKey
            const doc = await fetchSpringOpenApi(env.studioApiBase, env.studioApiKey);
            const caps = mapOpenApiToCapabilities(doc);
            res.json({ capabilities: caps });
        } catch (e: any) {
            log.error('Failed to build capabilities', { err: e?.message });
            res.status(500).json({ error: 'capabilities_failed', detail: e?.message });
        }
    });

    // Node HTTP server with extended timeouts (prevents long jobs from being cut off)
    const serverHttp = createServer(app);

    const REQUEST_TIMEOUT_MS = 6 * 60 * 1000;      // 6 minutes
    const HEADERS_TIMEOUT_MS = REQUEST_TIMEOUT_MS + 60 * 1000; // 7 minutes

    serverHttp.requestTimeout = REQUEST_TIMEOUT_MS;
    serverHttp.headersTimeout = HEADERS_TIMEOUT_MS;

    serverHttp.listen(env.port, () => {
        log.info('MCP HTTP server started', {
            port: env.port,
            path: '/mcp',
            requestTimeoutMs: REQUEST_TIMEOUT_MS
        });
    });
}