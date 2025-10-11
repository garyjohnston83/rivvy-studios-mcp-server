import { env } from '../config/env.js';

/** Very simple bearer token check for inbound requests from the LLM host. */
export function verifyInboundAuth(headers: Record<string, string | string[] | undefined>): void {
    const auth = (headers['authorization'] ?? headers['Authorization']) as string | undefined;
    if (!auth || !auth.startsWith('Bearer ')) throw new Error('Unauthorized: missing bearer token');
    const token = auth.substring('Bearer '.length);
    if (token !== env.inboundMcpToken) throw new Error('Unauthorized: invalid token');
}