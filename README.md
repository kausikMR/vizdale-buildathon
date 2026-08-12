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
