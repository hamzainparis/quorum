# Quorum

Quorum is a no-login sprint poker tool for agile teams: real-time planning poker estimation, a Jira-style sprint backlog board, live team chat, and optional Google sign-in — all synced across teammates in the same room over WebSockets. No accounts, no installs for participants: a facilitator opens a room and shares the code or invite link.

## Stack

- **Frontend**: Angular (standalone components, signals), served by `quorum-web`.
- **Backend**: NestJS, served by `quorum-api`, with a Socket.IO gateway for real-time room state.
- **Monorepo**: Nx, with shared domain types in `libs/shared/domain` and feature/UI libraries under `libs/web/*`, backend modules under `libs/api/*`.
- **Package manager**: pnpm.

## Prerequisites

- Node.js 22+
- pnpm

Install dependencies from the repo root:

```bash
pnpm install
```

## Running locally

Quorum needs both the API and the web app running. In two terminals:

```bash
npx nx serve quorum-api   # http://localhost:3000 (REST under /api, Socket.IO at the root)
npx nx serve quorum-web   # http://localhost:4200
```

Open `http://localhost:4200`, create or join a room, and share the room code/invite link with teammates to test real-time sync (open a second browser tab/window or share the link with someone else).

## Configuration

### Google sign-in (optional)

Google sign-in degrades gracefully if unconfigured — the rest of the app (room creation/joining, poker, board, chat, Jira import) works without it.

To enable it:

1. Create an OAuth 2.0 Client ID (web application) in the Google Cloud Console, with `http://localhost:4200` as an authorized JavaScript origin.
2. Backend: set `GOOGLE_CLIENT_ID` in the environment that runs `quorum-api` (e.g. via a `.env` file at the repo root, loaded automatically by `@nestjs/config`).
3. Frontend: set the same client ID as `googleClientId` in `apps/quorum-web/src/environments/environment.ts`.

If `GOOGLE_CLIENT_ID` is not set on the backend, the sign-in endpoint returns a clear 500 error instead of silently failing.

### Jira import

Facilitators can import tickets directly from a live Jira site via **Sprint Backlog → Import from Jira**, by supplying their Jira site URL, account email, and an API token for that request.

These credentials are **never persisted** — not written to a database, disk, or logs. They are sent once per import request to the backend, used immediately to call the Jira REST API server-side (avoiding browser CORS/CSP restrictions), and then discarded. The import modal states this explicitly to the user.

### Other environment variables

- `PORT` — port for `quorum-api` (default `3000`).

## Project structure

```
apps/
  quorum-web/             Angular application shell (routing, environments)
  quorum-api/             NestJS application shell (Nest module wiring, main.ts)

libs/
  shared/domain/          Types and pure logic shared by frontend and backend
                           (Ticket, Player, VoteValue, RoomSnapshot, vote-stats math, etc.)

  api/
    auth/                 Google ID token verification
    jira/                 Live Jira REST API import (client, mapper, controller)
    room/                 Room state machine + Socket.IO gateway (join, vote, reveal,
                           reset, skip, chat, ticket import/selection)

  web/
    ui/                   Design-system components (buttons, cards, badges, avatars)
    data-access/          HTTP/WebSocket services shared across features
                           (room socket client, client identity, app config token)
    feature-lobby/        Create/join room screen
    feature-room-shell/   Top-level room layout, routing, responsive panel switching
    feature-board/        Sprint backlog board panel
    feature-poker/        Planning poker voting stage
    feature-chat/         Team chat panel
    feature-jira-import/  Jira import modal
```

## Real-time architecture notes

- All room state lives server-side in `RoomStateService` and is broadcast to every client in the room as a `RoomSnapshot` whenever it changes.
- Vote values are intentionally hidden from **everyone**, including the voter, until the facilitator reveals — the snapshot's `votes` map is empty pre-reveal. The `votedPlayerIds` field is the only pre-reveal signal of who has voted. The frontend tracks the current player's own pending pick optimistically on the client until the server confirms the round has changed.

## Deployment

In production, `quorum-api` serves the built Angular app as static files (via `@nestjs/serve-static`) alongside its REST API and Socket.IO gateway, all from one process on one origin. This avoids any CORS or cross-origin WebSocket configuration — only a single host is needed.

### Render (recommended, free tier)

This repo includes a `render.yaml` Blueprint:

1. Push this repo to GitHub.
2. In the Render dashboard, choose **New > Blueprint** and point it at this repo. Render reads `render.yaml` and provisions a single free web service that builds both `quorum-api` and `quorum-web` and serves them together.
3. (Optional) To enable Google sign-in in production, set `GOOGLE_CLIENT_ID` on the service in the Render dashboard, and add the deployed URL as an authorized JavaScript origin for that OAuth client in the Google Cloud Console.
4. Once deployed, the app is reachable at the URL Render assigns (e.g. `https://quorum.onrender.com`) — the UI, REST API, and WebSocket gateway are all served from that same origin.

As with local development, Jira credentials supplied through the import modal are never persisted in production either — see [Jira import](#jira-import) above.

## Useful commands

```bash
pnpm nx run-many -t lint test build          # lint, test, and build every project
pnpm nx run-many -t lint test build -p quorum-web   # ...just one project
pnpm nx graph                                # visualize the project dependency graph
```
