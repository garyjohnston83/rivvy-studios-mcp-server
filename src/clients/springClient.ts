import { env } from '../config/env';
import { springAuthHeaders } from '../auth/signer';
import { request } from 'undici';

export type VideoCreationRequest = {
    prompt: string;
    model?: string | null;
    durationSeconds?: number | null;
    fps?: number | null;
    aspectRatio?: string | null;
    outputFormat?: string | null;
    negativePrompt?: string | null;
    seed?: number | null;
    extraParams?: Record<string, unknown> | null;
    pollIntervalSeconds?: number | null;
    maxAttempts?: number | null;
    serviceProvider: 'GEMINI' | 'RUNWAY_ML' | 'ELEVEN_LABS' | 'TOPAZ_LABS' | 'MID_JOURNEY';
};

export type VideoCreationResponse = {
    filePaths: string[];
    message?: string;
};

export type ProblemDetails = {
    type?: string;
    title?: string;
    status?: number;
    detail?: string;
    instance?: string;
};

export async function postVideo(reqBody: VideoCreationRequest): Promise<VideoCreationResponse> {
    const url = new URL('/video/', env.studioApiBase).toString();
    const { body, statusCode } = await request(url, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            ...springAuthHeaders()
        },
        body: JSON.stringify(reqBody)
    });

    const text = await body.text();
    if (statusCode >= 200 && statusCode < 300) {
        return JSON.parse(text) as VideoCreationResponse;
    }
    let problem: ProblemDetails | undefined;
    try { problem = JSON.parse(text); } catch {}
    const msg = problem?.detail || problem?.title || `HTTP ${statusCode}`;
    throw new Error(`Spring /video error: ${msg}`);
}