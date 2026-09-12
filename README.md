# StackIt — A Minimal Q&A Forum Platform

A full-stack Q&A community: ask questions with tags, post rich-text answers,
vote once per answer, accept the best answer, comment, `@mention` users, get
notifications, and moderate as admin. Built per the provided wireframes
(Home list + filters + pagination, Ask form, Question detail with answers).

- **Frontend:** React 19 + Vite + React Router 7 + Tailwind CSS + react-quill-new editor (Quill 2, React 19 compatible) + lucide-react icons + Bebas Neue display / Inter body fonts
- **Theme:** dual theme (default light/Airbnb `light.txt`, toggleable dark/Beehiiv `uistyle.txt`) via CSS-variable tokens + persisted switcher
- **Backend:** Node.js + Express REST API, JWT auth, bcrypt hashing, sanitized rich text, image uploads
- **Database:** MySQL on Aiven (production) with automatic local file-DB fallback for development (zero-config)
- **Deploy:** Render free-tier compatible (Web Service + Static Site)

## Project structure

```
.
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── api/client.js   # axios instance + error normalizer
│   │   ├── components/     # Navbar, QuestionCard, VoteControls, TagInput, …
│   │   ├── context/AuthContext.jsx
│   │   ├── editor/RichEditor.jsx   # Quill: bold/italic/strike/lists/link/image/align/emoji
│   │   ├── pages/          # Home, QuestionDetail, AskQuestion, Auth, Notifications, Admin
│   │   ├── App.jsx         # routes + guards
│   │   └── index.css       # fonts, theme (solid colors only — no gradients)
│   └── .env.example
├── server/                 # Express backend
│   ├── src/
│   │   ├── app.js / server.js
│   │   ├── config/db.js        # MySQL pool (Aiven TLS) or file fallback
│   │   ├── config/filestore.js # local JSON DB (dev only)
│   │   ├── db/index.js         # domain data-access (works on both backends)
│   │   ├── db/schema.sql       # MySQL migrations
│   │   ├── routes/             # auth, questions, answers, tags, comments, notifications, admin, upload
│   │   ├── middleware/         # JWT auth, admin guard, responses
│   │   ├── utils/              # validation, sanitize, mentions
│   │   └── scripts/migrate.js / seed.js
│   ├── uploads/                # local image uploads (dev)
│   └── .env.example
└── render.yaml
```

## Features & roles

- **Guest:** browse/search/filter questions, read answers. Voting/answering prompts a quick login/signup popup.
- **User:** register/login/logout, ask (title + rich description + 1–5 tags), answer, one vote per answer (toggle/switch), accept own question's answer (single accepted), comment on answers, `@username` mentions, notification bell with unread count + dropdown + mark-read.
- **Admin:** `/admin` dashboard — review questions/answers, search, confirmed delete. All checks enforced server-side.

Rich text supports bold, italic, strikethrough, ordered/bullet lists, emoji picker,
link dialog, image upload with preview, and left/center/right alignment. HTML is
sanitized on the server (`sanitize-html`) and client (`DOMPurify`).

## Local setup

Requirements: Node 18+, npm. MySQL optional for local dev (file DB is automatic).

```bash
# 1. backend
cd server
npm install
cp .env.example .env        # fill JWT_SECRET at minimum
npm run setup               # migrate (MySQL) or init file DB + seed demo data
npm run dev                 # http://localhost:5000

# 2. frontend (new terminal)
cd client
npm install
cp .env.example .env        # leave VITE_API_URL empty for local proxy
npm run dev                 # http://localhost:5173
```

Demo accounts (seeded): `alice@example.com / password123`, `bob@example.com / password123`, admin `admin@stackit.local / admin123`.

Useful scripts — server: `npm run dev|start|migrate|seed|setup`; client: `npm run dev|build|preview`.

## Database setup (Aiven MySQL)

1. Aiven console → Create service → **MySQL** (choose region, free plan if available) → Create.
2. Open service **Overview** → copy: Host, Port, Database, Username, Password. Under **Connection information**, note TLS/SSL is required (default on Aiven).
3. Local `.env` (server):
   ```env
   DB_HOST=<aiven host>
   DB_PORT=<aiven port, e.g. 16434>
   DB_NAME=defaultdb
   DB_USER=avnadmin
   DB_PASSWORD=<aiven password>
   # keep TLS on for Aiven (leave DB_SSL empty)
   ```
   Or single URL: `DATABASE_URL=mysql://avnadmin:<pw>@<host>:<port>/defaultdb?ssl-mode=REQUIRED`
4. `npm run migrate` (applies `src/db/schema.sql`), then `npm run seed`, then `npm run dev` and confirm `[db] Connected to MySQL.`
5. Local MySQL without TLS: set `DB_SSL=false`.

Env mapping: Aiven Host→`DB_HOST`, Port→`DB_PORT`, Database→`DB_NAME`, User→`DB_USER`, Password→`DB_PASSWORD`. Never commit `.env`.

## Render deployment

`render.yaml` defines both services. Or create manually:

**Backend (Web Service):** root `server/`, build `npm install`, start `npm start` (listens on `$PORT`). Env: `NODE_ENV=production`, `JWT_SECRET=<random>`, `CLIENT_URL=https://<frontend>.onrender.com`, plus `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD` from Aiven, `ADMIN_EMAILS=admin@stackit.local`. Run `npm run migrate` + `npm run seed` once (Render Shell).

**Frontend (Static Site):** root `client/`, build `npm install && npm run build`, publish `dist`, env `VITE_API_URL=https://<backend>.onrender.com/api`. SPA fallback: rewrite `/* → /index.html`.

Data flow: `React → HTTPS → Express on Render → secure MySQL/TLS → Aiven`. Images: local `/uploads` in dev; set `CLOUDINARY_*` for persistent storage in production.

## Security notes

Passwords hashed with bcrypt; JWT (7d) via `Authorization: Bearer`; ownership + admin role verified server-side on every protected route; parameterized queries; rich-text sanitized; uploads restricted to image MIME ≤5MB with random filenames; rate-limited auth; CORS allow-listed to `CLIENT_URL`; consistent `{success,data|error}` responses with no stack traces or secrets.

## Wireframes

`StackIt – A Minimal Q&A Forum Platform - 8 hours.svg` (Excalidraw) was used as the visual source of truth: top nav with brand/search/bell, filter pills (Newest/Unanswered/more), question cards (title, ans count, tags, author, description), pagination, Ask form (Title/Description/Tags/Submit), detail breadcrumb + answers + vote-once + guest login popup, mobile layout.
