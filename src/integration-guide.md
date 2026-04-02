# Integration Guide — Auth Module

## Architecture

```
src/
├── core/
│   ├── auth.js          ← initAuth, loginWithCredentials, logout, hashPwd, getSupabase
│   └── user.js          ← userStore (replaces global U)
├── components/
│   ├── LoginView.js     ← Login UI (replaces div#lov in HTML)
│   └── ProtectedRoute.js ← Auth guard (show/hide login vs app)
└── utils/
    └── sanitizer.js     ← XSS protection (from Step 3)
```

## Data flow

```
App Start
    │
    ├─→ ProtectedRoute.init()
    │       │
    │       ├─→ initAuth()
    │       │       ├─→ userStore.restore() from sessionStorage
    │       │       └─→ Google One Tap initialize
    │       │
    │       ├─ Has session? ──YES──→ onAuthenticated(user) → load()
    │       │
    │       └─ No session? ──→ LoginView.show()
    │                              │
    │                              ├─→ Google button click → hLog → userStore.set()
    │                              └─→ Credential submit → loginWithCredentials() → userStore.set()
    │                                                          │
    │                                                          └─→ AUTH_EVENTS.LOGIN_SUCCESS
    │                                                                   │
    │                                                                   └─→ onAuthenticated(user) → load()
    │
    └─→ userStore.subscribe() keeps window.U in sync (backward compat)
```

## How to connect to the existing HTML (migration)

### Step 1: Add the module scripts (before the main `<script>`)

```html
<!-- NEW: Auth modules (add BEFORE the main <script>) -->
<script src="src/utils/sanitizer.js"></script>
<script src="src/utils/dom-helper.js"></script>
<script type="module">
  // Inject env vars for non-Vite mode
  window.__ENV__ = {
    VITE_SUPA_URL: 'https://keasjfgcjkskvdcudoml.supabase.co',
    VITE_SUPA_KEY: 'eyJhbGci...the-key...',
    VITE_GID: '83033717934-h2ptv...apps.googleusercontent.com',
    VITE_CLOUD_NAME: 'dfelsbmbo',
    VITE_CLOUD_PRESET: 'fichas_unsigned',
  };

  import { ProtectedRoute } from './src/components/ProtectedRoute.js';

  ProtectedRoute.init({
    onAuthenticated: (user) => {
      // This replaces the original sApp() + load() call chain
      sApp();
      load();
    },
    onLogout: () => {
      // Already handled by logout() → location.reload()
    }
  });
</script>
```

### Step 2: Remove from the main `<script>` block

Delete these blocks (now in modules):

```
// DELETE: Hardcoded credentials (now in .env / __ENV__)
const SUPA_URL = '...';
const SUPA_KEY = '...';
const GID = '...';

// DELETE: Auth functions (now in auth.js)
function iAuth() { ... }
async function hLog(r) { ... }
async function loginCred() { ... }
function logout() { ... }
async function hashPwd(pwd) { ... }

// DELETE: The DOMContentLoaded auth initialization
window.addEventListener('DOMContentLoaded', () => {
  // ... iTh(); iAuth(); ...  ← DELETE this
});
```

### Step 3: Keep in main `<script>` (still needed)

```js
// KEEP — these use window.U which is auto-synced by userStore
const SB = getSupabase();  // ← now from auth.js
let D = [], MIS = [], ALS = [], ALU = [];
// ... rest of app logic (render, rPipe, oM, etc.)
```

### Step 4: Replace `U` references gradually

The backward compat layer keeps `window.U` working, so nothing breaks.
But for new code, prefer:

```js
// Old way (still works):
if (U && U.rol === 'admin') { ... }

// New way (preferred):
import { userStore } from './core/user.js';
if (userStore.isAdmin()) { ... }
```

### Step 5: Replace permission checks

```js
// Old way:
const esMio = U && p.captador_id === U.id;
const canEdit = esMio || U.rol === 'admin' || U.rol === 'oficina';

// New way:
const canEdit = userStore.canEditProperty(p);
const canSeeAddr = userStore.canSeeRealAddress(p);
```

## What changed vs original (exact mapping)

| Original (HTML) | New Module | Notes |
|---|---|---|
| `const SUPA_URL = '...'` | `.env` + `auth.js getEnv()` | Credentials out of source |
| `const SUPA_KEY = '...'` | `.env` + `auth.js getEnv()` | |
| `const GID = '...'` | `.env` + `auth.js getEnv()` | |
| `let U = null` | `userStore` (user.js) | Reactive, subscribable |
| `function iAuth()` | `initAuth()` (auth.js) | Same logic, modular |
| `async function hLog(r)` | `_handleGoogleCredential()` (auth.js) | Internal, same logic |
| `async function loginCred()` | `loginWithCredentials()` (auth.js) | Returns result, no DOM |
| `function logout()` | `logout()` (auth.js) | Same: clear + reload |
| `async function hashPwd()` | `hashPwd()` (auth.js) | Exported, same algo |
| `sessionStorage 'hcrm'` | `userStore.restore/persist` (user.js) | Same key, auto |
| `div#lov` (HTML) | `LoginView` (LoginView.js) | Dynamic DOM, same markup |
| `if(!U) show login` | `ProtectedRoute.init()` | Declarative auth guard |

## What was NOT changed

- Password hashing algorithm (SHA-256 + salt) — identical
- Google One Tap flow — identical
- SessionStorage key ('hcrm') — identical
- Error messages — identical ("Acceso denegado", "Error de conexión", etc.)
- Logo SVG — pixel-perfect copy
- CSS classes — all original classes preserved
- sApp() function — still called by onAuthenticated callback
- load() function — still called after auth

## Future improvements (not in this step)

1. Move hashPwd to a Supabase Edge Function (server-side bcrypt)
2. Add Supabase Auth (proper JWT sessions instead of custom)
3. Replace sessionStorage with httpOnly cookies
4. Add refresh token rotation
5. Rate limiting on login attempts
