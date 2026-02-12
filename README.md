# PNP Inventory System

A lightweight inventory management system built with React, TypeScript, Vite, and Supabase.

## Project Structure

`PNP---Inventory/
 src/
    components/      # Reusable React components
    pages/          # Page-level components
    utils/          # Utilities (security, validation, storage, error handling)
    lib/            # Supabase client
    images/         # Static images
    App.tsx         # Main component
    main.tsx        # Entry point
 public/             # Static assets
 supabase/           # Supabase config
 docs/               # Documentation
 vite.config.ts      # Vite config
 tailwind.config.js  # Tailwind setup
 .env.local          # Environment (create from .env.example)`

## Quick Start

### 1. Install Dependencies

\\\ash
npm install
\\\

### 2. Configure Supabase

\\\ash
cp .env.example .env.local
\\\
Update \.env.local\ with your Supabase credentials.

### 3. Run Development Server

\\\ash
npm run dev
\\\

## Build for Production

\\\ash
npm run build
\\\

## Security

Minimal, essential security only:

- **CSP Headers** Prevents script injection
- **Input Validation** Email, phone, URL validators
- **XSS Prevention** Input sanitization
- **Secure Headers** CSRF tokens, secure fetch
- **Server-Side Auth** Supabase handles auth & rate-limiting

See [docs/SECURITY_SUMMARY.md](docs/SECURITY_SUMMARY.md) for details.

## Key Files

| File                            | Purpose            |
| ------------------------------- | ------------------ |
| \src/utils/security.ts\         | Security utilities |
| \src/utils/validation.ts\       | Input validation   |
| \docs/SECURITY_SUMMARY.md\      | Security guide     |
| \docs/DEPLOYMENT_CHECKLIST.md\  | Pre-deployment     |

## Documentation

- **Data Flow:** See [docs/DATA_FLOW.md](docs/DATA_FLOW.md) — How data moves through the app
- **Security:** See `docs/` folder — Security implementation details
- **Deployment:** Check `docs/DEPLOYMENT_CHECKLIST.md` — Pre-deployment checklist

## Technologies

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Supabase
- ESLint

## Contributing

Place new features in appropriate folders:

- \src/components/\ Reusable components
- \src/pages/\ Page components
- \src/utils/\ Utilities
