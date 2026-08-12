# vizdale-buildathon

npm workspaces monorepo.

```
apps/
  web/   React + Vite + TypeScript + Tailwind CSS (port 5173)
  api/   Express + Node + TypeScript (port 4000)
```

## Setup

```bash
npm install
```

## Development

```bash
npm run dev        # both apps
npm run dev:web    # web only
npm run dev:api    # api only
```

`/api/*` requests from the web dev server are proxied to the API.

## Build

```bash
npm run build
```

## Authentication

Sign-in uses a password and issues a bearer session token. This **replaces the
`x-user-id` header** described in `CONTRACT.md` section 5 — see
[AUTH.md](AUTH.md) for what other lanes need to change, the demo accounts, and
the limits of what is implemented.
