<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Carai OS Command Center

A high-end, dark-themed control plane for Carai OS built with React, Vite, and TypeScript. This repository includes the full local development setup for the web app interface.

## Features

- Dashboard UI for managing Carai workflows
- Theme and accent customization
- Workflow and execution history panels
- Integrated logging and request trace view
- Safe send/disarm workflow support
- Connects to `https://hooks.carai.agency/webhook/carai-controller`

## Quick start

### Prerequisites

- Node.js 18+ (or compatible LTS)
- npm

### Install dependencies

```bash
npm install
```

### Start development server

```bash
npm run dev
```

Then open the local app in your browser. By default Vite runs on port `3000`.

## Available scripts

- `npm run dev` - start the app in development mode
- `npm run build` - build the production bundle
- `npm run preview` - preview the production build locally
- `npm run clean` - remove the `dist` output folder
- `npm run lint` - run TypeScript type checks

## Project structure

- `src/` - application source code
  - `App.tsx` - main UI and workflow logic
  - `main.tsx` - application bootstrapping
  - `index.css` - base styling
- `index.html` - Vite entry HTML
- `package.json` - project dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `vite.config.ts` - Vite configuration

## Notes

- The app currently uses a hardcoded `CARAI_AUTH_TOKEN` for demo requests.
- Update the webhook endpoint and auth token before using this in production.
