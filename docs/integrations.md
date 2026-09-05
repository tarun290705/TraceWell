# Real-project integrations

TraceWell has been integrated into three real, independently-built projects, across two languages and three frameworks, each on a dedicated `tracewell-integration` branch — the base project's `main` branch is never modified.

## Reliable Job Queue (FastAPI + PostgreSQL)

**Instrumented:** `POST /jobs` (with `build_job`/`db_write` sub-spans), `GET /jobs/{id}`, `GET /dead-letters`, `POST /dead-letters/{id}/replay` (with `fetch_job`/`eligibility_check`/`db_write` sub-spans), `GET /queue/stats`, `GET /queue/inflight`.

**Not instrumented:** the background worker's retry/backoff loop (deliberately scoped out — this integration covers API-triggered request tracing, not the async dispatch process).

**Verification:** the project's original concurrency guarantee — that `SKIP LOCKED` dispatch never allows two workers to claim the same job — was re-tested after instrumentation with 10 concurrent worker threads racing to drain a seeded queue. Result: zero duplicate claims, all seeded jobs claimed exactly once, confirming the added tracing overhead (middleware + automatic SQL capture on every query) does not affect this timing-sensitive guarantee.

## CoWrite (Django + DRF + Channels)

**Instrumented, REST:** `save_version` (with `fetch_note`/`permission_check`/`db_write`), `note_versions`, `version_detail` (same depth), `ShareNoteView` (with `fetch_note`/`validate_and_share`).

**Instrumented, WebSocket (`NoteConsumer`):** `connect()` broken into `resolve_user`, `check_access`, `resolve_role`, `fetch_note` — each with its own automatically-captured SQL query, proven correct across `sync_to_async`'s thread-pool boundary. `receive()` broken into `persist_update` (real-time content save, with its `UPDATE` query captured) and `broadcast_update`.

**Security verification:** all three previously-fixed vulnerabilities (unauthenticated `save_version`, IDOR on `note_versions`/`version_detail`, unhandled exceptions in `CollaborationSerializer`) were re-tested after instrumentation, with trace data confirming each fix's behavior — e.g. a permission-denied request visibly stops at `permission_check` with no `db_write` span, rather than just returning the right status code with no visibility into why.

## SkyConnect (Express + MongoDB/Mongoose)

**Instrumented:** `POST /api/bookings`, broken into `verify_passenger`, `verify_flight`, `create_booking` — each with an automatically-captured MongoDB command via driver-level command monitoring.

**Design note:** MongoDB command capture records the collection name and field keys involved, never actual field values — a deliberate, permanent design choice (see main README), not something enabled per-project.

## What "instrumented" means in practice

Each integration required, per project:
1. `pip install -e` / `npm install` of the relevant agent package
2. One middleware registration line
3. Manual `tracer.span()` / `tracer.aspan()` calls around whichever operations were judged worth naming

No project required changes to its own business logic beyond adding these calls — the only exception was a genuine, unrelated bug found and fixed in CoWrite's frontend (a debounced-edit race condition that could silently drop the last keystroke on fast navigation), discovered while testing the collaboration tracing and fixed on CoWrite's `main` branch separately from the TraceWell integration.