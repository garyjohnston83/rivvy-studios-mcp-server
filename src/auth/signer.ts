import { env } from '../config/env.js';

/** Returns headers for calling the Spring backend. */
export function springAuthHeaders() {
    return { Authorization: `Bearer ${env.studioApiKey}` };
}