import { z } from 'zod';
import { postVideo, type VideoCreationRequest } from '../clients/springClient.js';

// Build a Zod schema from JSON schema (manual mapping for clarity)
const CreateVideoZ = z.object({
    prompt: z.string(),
    model: z.string().nullable().optional(),
    durationSeconds: z.number().int().min(1).nullable().optional(),
    fps: z.number().int().min(12).max(60).nullable().optional(),
    aspectRatio: z.string().nullable().optional(),
    outputFormat: z.string().nullable().optional(),
    negativePrompt: z.string().nullable().optional(),
    seed: z.number().int().nullable().optional(),
    extraParams: z.record(z.any()).nullable().optional(),
    pollIntervalSeconds: z.number().int().min(1).nullable().optional(),
    maxAttempts: z.number().int().min(1).nullable().optional(),
    serviceProvider: z.enum(["GEMINI","RUNWAY_ML","ELEVEN_LABS","TOPAZ_LABS","MID_JOURNEY"]) as unknown as z.ZodEnum<["GEMINI","RUNWAY_ML","ELEVEN_LABS","TOPAZ_LABS","MID_JOURNEY"]>
});

export type CreateVideoInput = z.infer<typeof CreateVideoZ>;

export const createVideoTool = {
    name: 'create_video',
    description: 'Create a video via the studio pipeline (forwards to POST /video).',
    inputSchema: CreateVideoZ.shape,
    handler: async (args: z.infer<typeof CreateVideoZ>) => {
        const parsed = CreateVideoZ.parse(args);
        const res = await postVideo(parsed as VideoCreationRequest);

        return {
            content: [
                { type: 'text' as const, text: `Video job created. Downloaded ${res.filePaths.length} artefact(s).` },
                { type: 'text' as const, text: JSON.stringify(res) }
            ]
        };
    }
};
