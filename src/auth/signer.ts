import { env } from '../config/env';

/** Returns headers for calling the Spring backend. */
export function springAuthHeaders() {
    return { Authorization: `Bearer ${env.studioApiKey}` };
}