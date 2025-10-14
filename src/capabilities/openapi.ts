// src/capabilities/openapi.ts
import { request } from 'undici';
import { log } from '../observability/logger.js';

export async function fetchSpringOpenApi(baseUrl: string, apiKey: string): Promise<any> {
    const { statusCode, body } = await request(`${baseUrl.replace(/\/$/, '')}/v3/api-docs`, {
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        }
    });
    const text = await body.text();
    if (statusCode >= 200 && statusCode < 300) {
        try { return JSON.parse(text); } catch (e) { throw new Error('Invalid OpenAPI JSON'); }
    }
    throw new Error(`OpenAPI fetch failed: HTTP ${statusCode}`);
}

type CapabilityInputField = {
    name: string;
    type: string;
    required?: boolean;
    description?: string;
    enumValues?: string[];
};

export type Capability = {
    id: string;
    kind: 'chat' | 'video' | 'job' | 'utility';
    title: string;
    description: string;
    inputs: CapabilityInputField[];
    examples: string[];
    latency_hint?: 'short' | 'medium' | 'long';
    auth_required?: string[];
    source: 'spring';
    version?: string;
    http?: { method: string; path: string };
};

export function mapOpenApiToCapabilities(doc: any): Capability[] {
    const caps: Capability[] = [];
    const version = doc?.info?.version || '1.0.0';
    const paths = doc?.paths || {};

    for (const [path, ops] of Object.entries<any>(paths)) {
        for (const [method, op] of Object.entries<any>(ops)) {
            const tags: string[] = op?.tags || [];
            if (!tags.includes('rivvy-capability')) continue;

            const x = op?.['x-rivvy'] || {};
            const reqSchema = op?.requestBody?.content?.['application/json']?.schema || {};
            const props = reqSchema?.properties || {};
            const required: string[] = reqSchema?.required || [];

            const inputs: CapabilityInputField[] = Object.entries<any>(props).map(([name, p]) => ({
                name,
                type: Array.isArray(p?.type) ? (p.type[0] || 'object') : (p?.type || 'object'),
                required: required.includes(name),
                description: p?.description,
                enumValues: p?.enum
            }));

            caps.push({
                id: `spring.${op.operationId || `${method}_${path}`}`,
                kind: (x.kind as any) || 'utility',
                title: op.summary || op.operationId || `${method.toUpperCase()} ${path}`,
                description: op.description || '',
                inputs,
                examples: x.examples || [],
                latency_hint: x.latency_hint || 'medium',
                auth_required: x.auth_required || [],
                source: 'spring',
                version,
                http: { method, path }
            });
        }
    }

    log.info('Mapped OpenAPI -> capabilities', { count: caps.length });
    return caps;
}