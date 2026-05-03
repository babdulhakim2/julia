# Backend Foundation

This app should treat the current local React store as a prototype cache. The production source of truth should be Convex.

## Core Shape

- `users`: authenticated people. Store the Convex auth `tokenIdentifier`, profile fields, and default workspace.
- `workspaces`: SaaS tenant/account. A workspace owns entities, documents, folders, events, reminders, and chat threads.
- `memberships`: user access to a workspace, with `owner`, `admin`, `member`, and `viewer` roles for the future admin UI.
- `entities`: the things the secretary files against: businesses, properties, vehicles, and personal records. This maps to the onboarding entity setup.
- `folders`: per-entity document organization. Keep folders separate from documents so moving a file is a small patch.
- `captureSessions`: one user intake session. This supports "snap a page, add more snaps, then finish."
- `documentFiles`: raw files/pages stored in Convex storage via `storageId`. A logical document can have multiple pages/files.
- `documents`: the logical letter/fine/invoice/renewal after extraction. This powers inbox, needs-review, due-week, folders, and inspector UI.
- `documentTextChunks`: embedded OCR/plain-text chunks for chat retrieval through Convex vector search.
- `processingJobs`: durable queue records for OpenRouter/Gemini work, retries, and failure visibility.
- `promptVersions`: managed prompt registry so document extraction, entity matching, filing, and chat prompts can be versioned.
- `events`: user-created calendar entries plus deadlines derived from documents.
- `reminders`: scheduled reminder queue for daily cron scans and future WhatsApp/email notification dispatch.
- `chatThreads` and `chatMessages`: chat history with citations back to documents/entities.
- `integrations`: future WhatsApp, email, and Drive sync state.
- `usageEvents`: auditable metering for uploads, storage, document processing, embedding, and OpenRouter token usage.
- `auditLogs`: admin/debug history for important changes.

## Document Intake Pipeline

1. Client creates a `captureSession` in `draft`.
2. Client requests a Convex upload URL and uploads each photo/PDF page directly to Convex storage.
3. Client records each returned storage id in `documentFiles`, attached to the capture session.
4. User can add more pages while the session is still `draft`.
5. User taps finish; session moves to `processing` and a `processingJobs` row is queued.
6. The job calls OpenRouter model `google/gemini-2.5-flash` with the active `promptVersions` row for document extraction.
7. The result creates/updates `documents`, attaches `documentFiles.documentId`, extracts text chunks, embeds them, and inserts `documentTextChunks` rows for vector search.
8. If confidence is low or the entity match is ambiguous, the document lands in `needs_review`; otherwise it lands in `scheduled`, `due_soon`, or `done` based on due/payment state.

## Auth Direction

Clerk is the auth provider. Convex validates Clerk session JWTs through `convex/auth.config.ts` and `CLERK_JWT_ISSUER_DOMAIN`.

Use Convex auth identity server-side for all authorization checks. Convex functions should never accept `userId` from the client for ownership decisions. They should derive the current user via `ctx.auth.getUserIdentity()` and map `identity.tokenIdentifier` to `users.tokenIdentifier`.

Required environment variables:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_JWT_ISSUER_DOMAIN`
- `NEXT_PUBLIC_CONVEX_URL`

`CLERK_JWT_ISSUER_DOMAIN` must be the Clerk Frontend API URL from the Clerk Convex integration page.

## Vector Search Direction

Use Convex vector search to index each processed document. `documentTextChunks.embedding` is required and indexed by `by_embedding`, with filters for `workspaceId`, `entityId`, `documentId`, and `documentCategory`.

The initial embedding shape is `google/text-embedding-004` with 768 dimensions. Gemini Flash remains the extraction/chat model through OpenRouter; embeddings are a separate model because Convex vector indexes require a fixed vector length and currently allow dimensions up to 2048.

Chat retrieval should:

1. Embed the user question using the same embedding model.
2. Run `ctx.vectorSearch("documentTextChunks", "by_embedding", { vector, limit, filter })` from a Convex action.
3. Filter by `workspaceId` at minimum, and by `entityId`, `documentId`, or `documentCategory` when the user is asking in a narrower context.
4. Load matched chunks/documents by id and pass only that retrieved context into the answer prompt.

## LLM Direction

All OpenRouter calls go through `/api/ai/openrouter` so API keys stay server-side. The route supports:

- `GET /api/ai/openrouter` for admin configuration status.
- `POST /api/ai/openrouter` with `task: "health_check"` for admin monitoring.
- `POST /api/ai/openrouter` with `task: "chat"` for workspace-aware Ask responses.

Required OpenRouter environment variables:

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL` optional, defaults to `google/gemini-2.5-flash`
- `OPENROUTER_SITE_URL` optional
- `OPENROUTER_APP_NAME` optional

## Cron Direction

The first cron should be a daily reminder scan:

- Find `reminders` where `status = "pending"` and `remindAt <= now`.
- Create `notifications` for in-app UI.
- Later, dispatch WhatsApp/email when the relevant integration is active.
- Mark successful reminders as `sent`, failures as `failed`.

Avoid computing "due this week" by cron unless it needs side effects. The UI can query documents/events by `dueAt`/`startAt`; cron is for notifications and status transitions that must happen even when nobody has the app open.
