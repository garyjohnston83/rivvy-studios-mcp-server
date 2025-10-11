import 'dotenv/config';

function required(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var ${name}`);
    return v;
}

export const env = {
    port: parseInt(process.env.PORT ?? '3333', 10),
    studioApiBase: required('STUDIO_API_BASE'),
    studioApiKey: required('STUDIO_API_KEY'),
    inboundMcpToken: required('INBOUND_MCP_TOKEN'),
    publicUrl: process.env.MCP_PUBLIC_URL ?? 'http://localhost:3333'
};