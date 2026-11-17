# OMNIA AI

**One Platform. Infinite Intelligence.**

OMNIA is a multi-feature AI workspace: Super Chat with model routing, an Image Studio, a Video Studio (script and storyboard), deep research with citations, document intelligence, a coding lab, a voice assistant, optional memory, projects and a team of ten AI agents. It is a real application with accounts, a database, server-side provider integrations and an admin panel.

## Honest status

Every capability is either **connected to a real API** (when its key is configured) or **shown as "not connected"**. OMNIA never fabricates answers, images or search results.

| Capability | Status | Needs |
|---|---|---|
| Super Chat (text, files, images, edit, regenerate, export, copy) | Works with any connected chat provider | `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` or `GOOGLE_API_KEY` |
| Model routing (Auto / Reasoning / Fast / Creative / Research / Coding / Writing / Educational) | Works. Each reply records the provider and model that actually answered, and falls back to the next connected provider on error | Same as above |
| Image generation | Works (OpenAI Images API, files stored on the server) | `OPENAI_API_KEY` |
| Image editing, background removal, upscaling, references | **Not connected yet** | An image-editing provider |
| Video script, scenes, camera direction, image prompts | Works | Chat provider |
| Video clip rendering | **Not connected yet** | A video provider (e.g. Google Veo, Runway) |
| Deep research with numbered citations | Works with live web search. Without it, answers are labeled **unverified** | `BRAVE_SEARCH_API_KEY` |
| Document intelligence (PDF, DOCX, XLSX, PPTX, CSV, TXT, code) | Works. Legacy .doc/.xls/.ppt and audio/video are reported as unsupported | Chat provider |
| Coding lab | Generate, debug, explain, refactor, tests with AI. HTML/CSS/JS preview in a sandboxed iframe. Other languages are never executed on the server | Chat provider |
| Voice | Speech-to-text and text-to-speech use the browser's Web Speech API (Chrome, Edge, Safari) | Nothing server-side |
| Memory | Opt-in, off by default. View, edit, disable and delete items. Project-scoped memories | Nothing |
| AI agents (10 specialists + coordinator) | Works. Up to 4 agents per run, in the order selected | Chat provider |
| Projects (notes, tasks, chats, media, memory, activity) | Works | Nothing |
| Admin (users, roles, provider status, usage, errors, section visibility) | Works | First account is the admin |

**Not yet implemented:** token-by-token streaming, PostgreSQL (the database layer is SQLite via Node's built-in `node:sqlite`; the schema uses portable SQL types and is meant to be ported), object storage (files live on local disk under `data/`), payment and subscription billing, email verification and password reset, and server-side enforcement of hidden sections (admin visibility currently hides navigation entries).

## Quick start

Requirements: Node.js 22.13 or newer.

```bash
cd omnia-ai
npm install
cp .env.example .env.local   # then add at least one AI provider key
npm run build
npm start                    # http://localhost:3000
```

Open the app, create an account. **The first account created becomes the administrator.**

For development: `npm run dev`. Tests: `npm test`. Type check: `npm run typecheck`.

## Configuration

Keys are read only on the server. The browser never receives them, and the API reports only whether a provider is connected.

- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`: chat, vision and reasoning. Any one is enough. Order with `OMNIA_PROVIDER_PRIORITY` (default `anthropic,openai,google`).
- `OMNIA_MODEL_<PROVIDER>_<MODE>`: override the model for a provider and mode, for example `OMNIA_MODEL_ANTHROPIC_REASONING=claude-opus-5-5`. Defaults are in `src/lib/ai/gateway.ts`. Check them against your provider console before going live.
- `OMNIA_IMAGE_MODEL`: image model (default `gpt-image-1`).
- `BRAVE_SEARCH_API_KEY`: enables live web search for research.
- `*_BASE_URL`: point a provider at a proxy or regional endpoint.
- `OMNIA_DATA_DIR`: where the SQLite database and generated files are stored (default `./data`).

## Architecture

```
src/
  app/
    (app)/…            authenticated pages (chat, images, video, research, documents,
                       coding, voice, agents, projects, memory, dashboard, settings, admin)
    api/…              JSON API route handlers (validated with zod, errors never leak internals)
    login/             sign-in and account creation
  components/          UI: AppShell, ChatView, ImageStudio, VideoStudio, ResearchView, …
  lib/
    ai/providers.ts    REST adapters for Anthropic, OpenAI and Google (text, vision, images)
    ai/gateway.ts      mode catalog, intent routing, provider fallback, usage logging
    chat.ts            conversation history, attachments and memory-aware prompts
    research.ts        search → read → synthesize with citations limited to retrieved sources
    web.ts             Brave search client, page reader, private-address (SSRF) guard
    documents.ts       text extraction for PDF, DOCX, XLSX, PPTX and text formats
    media.ts           image generation and video storyboard planning
    auth.ts            scrypt password hashing, hashed session tokens, role checks
    db.ts              SQLite schema and connection
    rate-limit.ts      per-user request limits
  lib/client/          i18n (English and Arabic with RTL), API client, speech helpers
tests/                 unit tests for routing, parsing, the SSRF guard and document extraction
```

### Security notes

- Passwords hashed with scrypt; session tokens stored only as SHA-256 hashes in an HTTP-only, SameSite cookie.
- Every data route is scoped to the signed-in user (cross-user access returns 404). Admin routes require the admin role. Disabling a user revokes their sessions.
- Markdown is rendered as React elements without raw HTML, and only http(s) and mailto links are allowed.
- Research fetches refuse private, loopback and link-local addresses, including after redirects.
- Uploads are limited to 15 MB and validated by type. Generated and uploaded images are served only to their owner.
- Code runs only inside a sandboxed iframe with no same-origin access.
- Security headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, referrer and permissions policies.
- Rate limits apply to sign-in, chat, uploads, images, research and agent runs. The limiter is in-memory and per process; use shared storage when running several instances.

## Verification performed

- `npm test`: 13 unit tests (routing, model overrides, plan parsing, HTML stripping, SSRF guard, DOCX/XLSX/PPTX extraction).
- Production build with TypeScript checking.
- End-to-end API run against a local stand-in for the three provider APIs, covering auth, IDOR protection, routing, fallback after a provider failure, attachments, image generation, video planning, agents, projects, memory scoping and admin actions.
- Browser run (Playwright): no console errors or failed requests on the main pages, no horizontal overflow at phone width, Arabic RTL layout.

The provider adapters were exercised against local mocks, not live APIs, because this build environment cannot reach them. Verify each provider with a real key before relying on it.
