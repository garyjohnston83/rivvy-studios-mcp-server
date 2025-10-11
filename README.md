# studio-mcp (TypeScript)

MCP server that exposes a single tool, **create_video**, which forwards to your Spring **POST /video** endpoint as defined by your OpenAPI spec.

## Tools
- `create_video@v1` — input schema mirrors `VideoCreationRequest`:
- required: `prompt`, `serviceProvider`
- optional: `model`, `durationSeconds`, `fps`, `aspectRatio`, `outputFormat`, `negativePrompt`, `seed`, `extraParams`, `pollIntervalSeconds`, `maxAttempts`
- `serviceProvider` enum: `GEMINI | RUNWAY_ML | ELEVEN_LABS | TOPAZ_LABS | MID_JOURNEY`

## Environment
- `STUDIO_API_BASE` — base URL of Spring server (e.g., `http://localhost:8080`)
- `STUDIO_API_KEY` — bearer the MCP uses to call Spring
- `INBOUND_MCP_TOKEN` — bearer the LLM host must present to call this MCP
- `PORT` — HTTP port (default 3333)

## Run (dev)
```bash
cp .env.example .env
npm i
npm run dev
```

## Deploy
- Containerized; expose `PORT` over HTTPS (API gateway). Set `INBOUND_MCP_TOKEN` per environment.

## Notes on the OpenAPI mapping
- This project was generated from your `openapi.yaml`:
- Request fields & descriptions map to `src/schemas/createVideo.v1.json` and `CreateVideoZ`.
- Response uses `{ filePaths: string[], message?: string }`.
- Errors map to RFC7807-like `ProblemDetails` for logging.

## Versioning
- Future breaking changes → bump schema file to `createVideo.v2.json` and register `create_video@v2` alongside v1 during migration.