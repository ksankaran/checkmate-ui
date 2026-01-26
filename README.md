# Checkmate UI

Frontend for Checkmate - AI-powered QA testing platform.

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8000` |

## Tech Stack

- Next.js 15 + React 19
- Tailwind CSS + shadcn/ui
- TypeScript
- Framer Motion

## Backend

The backend API lives in a separate repository: [checkmate](https://github.com/ksankaran/checkmate)

```bash
# Start the backend first
cd /path/to/checkmate
uv run uvicorn api.main:app --port 8000
```
