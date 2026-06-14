# Coffee Book

Coffee Book is a full-stack demo for a coffee-and-reading space. Phase 10-1 separates the public web app, admin app, and backend API while keeping the existing Vue UI, Design System styles, Node.js API, MySQL schema, JWT auth, local fallback data, and smoke tests.

## Architecture

```text
coffee-book/
├── apps/
│   ├── web/              Public storefront Vue app
│   │   ├── src/
│   │   ├── index.html
│   │   ├── vite.config.js
│   │   ├── package.json
│   │   └── .env.example
│   └── admin/            Admin Vue app
│       ├── src/
│       ├── index.html
│       ├── vite.config.js
│       ├── package.json
│       └── .env.example
├── server/               Node.js API, routes, services, MySQL scripts
├── scripts/              Automation and smoke-test scripts
├── package.json          Root orchestration scripts
├── package-lock.json
├── .env.example          Backend environment template
└── README.md
```

## Ports

- Backend API: `http://127.0.0.1:4173`
- Public web app: `http://127.0.0.1:5173`
- Admin app: `http://127.0.0.1:5174`

Both frontend apps call the backend through `VITE_API_BASE_URL`.

## Environment

Create a local root `.env` from `.env.example`. Do not commit `.env`.

Root `.env.example` is for the backend:

```text
NODE_ENV=development
SERVER_PORT=4173
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=coffee
DB_USER=your_user
DB_PASSWORD=your_password
JWT_SECRET=replace_with_a_long_random_secret
CORS_ORIGIN=http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5174,http://localhost:5174
SMOKE_ADMIN_USERNAME=admin
SMOKE_ADMIN_PASSWORD=admin123456
```

Frontend templates:

```text
apps/web/.env.example
VITE_API_BASE_URL=http://127.0.0.1:4173/api

apps/admin/.env.example
VITE_API_BASE_URL=http://127.0.0.1:4173/api
```

The database name must remain `coffee`.

## Development

```bash
npm run dev:server
npm run dev:web
npm run dev:admin
```

Or start all three processes:

```bash
npm run dev:all
```

## Database

```bash
npm run db:init
npm run db:seed
```

`db:init` creates the `coffee` database and tables. `db:seed` creates demo books, products, events, spaces, posts, users, and the default admin account.

Default admin account for local testing:

```text
username: admin
password: admin123456
```

## Build And Preview

```bash
npm run build:web
npm run build:admin
npm run build
npm run preview:web
npm run preview:admin
```

Production build output is written to:

```text
dist/web
dist/admin
```

## Backend

```bash
npm run start
npm run server
```

The `server/` directory remains independent and keeps the existing API routes, services, JWT auth, CORS handling, database schema, seed data, and smoke test compatibility.

## Route Split

Public web app keeps public and member routes only:

```text
/ /coffee /coffee/:slug /books /books/:slug /cart /checkout
/events /events/:slug /community /community/posts/:id /booking
/login /register /account /account/orders /403 /404
```

The web app no longer mounts `/admin` routes.

Admin app keeps admin routes only:

```text
/ /login /dashboard /books /products /orders /events
/community /bookings /403 /404
```

`/` redirects to `/dashboard`. Admin pages require a logged-in user with `role=admin`. Unauthenticated users are redirected to `/login`; ordinary users are sent to `/403`.

## Store Split

The web app keeps public/member stores: `auth`, `app`, `ui`, `books`, `products`, `cart`, `checkout`, `orders`, `events`, `community`, `booking`, `membership`, `notifications`, and `search`.

The admin app keeps `auth`, `app`, `ui`, `admin`, plus the existing `orders`, `events`, and `booking` stores used by the admin dashboard summaries.

## API Split

The web app exports public APIs: `auth`, `books`, `products`, `cart`, `orders`, `events`, `community`, and `booking`.

The admin app exports `auth` and `admin`; it also keeps the minimal `orders`, `events`, and `booking` API clients required by retained dashboard stores.

## Smoke Test

Start the backend first, then run:

```bash
npm run smoke:api
```

The smoke test checks health, admin login, `/auth/me`, public lists, admin dashboard permissions, ordinary-user 403 behavior, cart flow, order flow, event list, community list, and space list.

## Deployment Notes

Deploy the backend from `server/` with the root environment variables. Deploy `dist/web` and `dist/admin` as separate static apps, each configured with its own `VITE_API_BASE_URL` at build time. Configure `CORS_ORIGIN` with every deployed frontend origin.

## Not Yet Connected To Real Third-Party Services

The project intentionally does not include real third-party payment, recommendation algorithms, WebSocket realtime updates, file upload storage, SMS, or email delivery. Payment flows are simulated by backend status transitions for demo and coursework purposes.
