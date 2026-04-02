# House CRM — Migration Guide (Monolith to Modular SPA)

## Quick Start

```bash
cd house-crm
npm install
cp .env.example .env   # Edit with real credentials
npm run dev             # Opens localhost:3000
```

## Step-by-step Migration

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Copy `.env.example` to `.env` and fill in real values:
```env
VITE_SUPA_URL=https://keasjfg...supabase.co
VITE_SUPA_KEY=eyJhbGci...
VITE_GID=83033717934-...apps.googleusercontent.com
VITE_CLOUD_NAME=dfelsbmbo
VITE_CLOUD_PRESET=fichas_unsigned
```

### 3. Extract CSS
The original HTML had all CSS in a `<style>` tag. Copy it to `src/styles.css`:
```bash
# The CSS is identical to the original — just the <style> content
```

### 4. Run development server
```bash
npm run dev
```
Opens at `http://localhost:3000`. Vite serves ES modules with HMR.

### 5. Build for production
```bash
npm run build
```
Output in `dist/`. Deploy to any static host.

### 6. Deploy
**Vercel:**
```bash
npx vercel --prod
```
Set env vars in Vercel dashboard.

**Netlify:**
- Build command: `npm run build`
- Publish directory: `dist`
- Add env vars in site settings.

### 7. Update Google OAuth
In Google Cloud Console, update Authorized JavaScript Origins to include production URL.

## Architecture Summary

```
Original: 1 HTML file, ~4000 lines, all globals
    |
    v (9 steps of refactoring)

New: 55+ modular ES files

src/
├── main.js              ← Entry point
├── App.js               ← Shell (header, sidebar, sections)
├── router.js            ← Hash-based SPA routing
├── styles.css           ← Extracted from original <style>
├── config/
│   ├── supabase.js      ← Singleton client
│   └── cloudinary.js    ← Upload config
├── core/
│   ├── auth.js          ← Google + credentials login
│   ├── user.js          ← Reactive user store (replaces U)
│   └── notifications.js ← Alert system (noti)
├── utils/
│   ├── sanitizer.js     ← XSS protection (escapeHtml, safeUrl, etc.)
│   └── dom-helper.js    ← Safe DOM creation helpers
├── components/
│   ├── LoginView.js     ← Login screen
│   └── ProtectedRoute.js← Auth guard
├── views/
│   ├── InventoryView.js ← Hero + Filters + Grid
│   ├── PipelineView.js  ← Nav + Kanban board
│   ├── RegistrationView.js ← 5-step wizard
│   └── AgendaView.js    ← Day/Week calendar
└── features/
    ├── inventory/       ← Store, service, 4 components
    ├── pipeline/        ← Store, service, 3 components
    ├── property-registration/ ← Store, service, wizard + 5 steps
    └── agenda/          ← Store, service, 4 components
```

## What changed

| Before | After |
|--------|-------|
| 1 HTML file, 4000+ lines | 55+ focused modules |
| Credentials hardcoded | .env variables via Vite |
| 30+ innerHTML XSS vulnerabilities | escapeHtml/escapeAttr on all DB fields |
| 40+ global variables | Reactive stores with subscriptions |
| No build step | Vite dev server + production build |
| Single `<script>` block | ES modules with imports |

## What was preserved

- All CSS classes and visual design (pixel-perfect)
- Business logic: pipeline states, freshness timers, notification matrix
- HOUSE-XXX code generation algorithm (untouched)
- Google One Tap + credential auth flow
- Cloudinary upload with progress
- Drag-and-drop in pipeline
- Mobile swipe on carousels
- Dark mode toggle
- All original function names available via window.* backward compat
