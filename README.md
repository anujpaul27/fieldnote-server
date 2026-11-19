# Secure Notes API

A backend-only REST API for a secure note-taking application. It uses Express, MongoDB/Mongoose, JWT access tokens, hashed refresh-token sessions, bcrypt password hashes, and role-based access control.

## Run locally

Requirements: Node.js 20.19+ and MongoDB.

```sh
npm ci
cp .env.example .env
# Set MONGODB_URI and a random JWT_SECRET of at least 32 bytes in .env
npm run dev
```

`npm start` runs the production entry point. The API listens on `0.0.0.0:${PORT}` (default `5000`). `GET /api/health` reports API/database readiness.

### Create the first administrator

Set `ADMIN_USERNAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in the environment (or `.env`), then run:

```sh
npm run seed:admin
```

The command creates one administrator and refuses to overwrite an account that already uses the configured username or email. Public registration always creates a `user`; it cannot grant admin privileges.

## Authentication

- `POST /api/auth/register` — `{ "username", "email", "password", "interests": [] }`
- `POST /api/auth/login` — `{ "username" | "email", "password" }`
- `POST /api/auth/refresh-token` — rotates the HttpOnly `refreshToken` cookie and returns a new access token
- `POST /api/auth/logout` — revokes the session and clears the cookie

Registration/login return a short-lived access token in JSON. Send it on protected calls as `Authorization: Bearer <token>`. Refresh tokens are only stored as SHA-256 hashes in MongoDB; access tokens are tied to a session so logout revokes them immediately. The refresh cookie is `HttpOnly`, `SameSite=Strict`, scoped to `/api/auth`, and `Secure` in production.

## API routes

All collection/list endpoints accept `?page=1&limit=20` (limit max 100), return `data` and `pagination` metadata, and sort newest-first unless noted.

| Method | Route | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/users/me` | User | Read own profile |
| PATCH | `/api/users/me` | User | Update own username, email, or interests |
| GET | `/api/notes` | User | Paginated list of own notes |
| POST | `/api/notes` | User | Create a note (`title`, `content`) |
| GET | `/api/notes/:noteId` | User/Admin | Read a note; users are limited to their own, admins may read any |
| PATCH | `/api/notes/:noteId` | Owner | Update own note |
| DELETE | `/api/notes/:noteId` | Owner | Delete own note |
| GET | `/api/posts` | Public | Paginated public post feed |
| GET | `/api/posts/:postId` | Public | Read a public post |
| POST | `/api/posts` | User | Create a public post (`title`, `content`) |
| PATCH | `/api/posts/:postId` | Owner | Update own post |
| DELETE | `/api/posts/:postId` | Owner | Delete own post |
| GET | `/api/users/:userId/posts` | Public | Paginated posts for one user, via one `$lookup` aggregation |
| GET | `/api/admin/users` | Admin | Paginated user list |
| POST | `/api/admin/users` | Admin | Add a user (admin may set `role`) |
| GET | `/api/admin/users/:userId` | Admin | Read one user |
| PATCH | `/api/admin/users/:userId` | Admin | Update username, email, interests, or role |
| DELETE | `/api/admin/users/:userId` | Admin | Remove user, notes, posts, and sessions |
| GET | `/api/admin/notes` | Admin | Paginated view of all notes |
| GET | `/api/admin/users/grouped-by-interest` | Admin | Users grouped by interest, with paginated groups |

Errors use `{ "message": "..." }` and appropriate 4xx/5xx status codes. Account usernames and emails are trimmed and stored in lowercase. Passwords must be at least 8 characters and no more than 72 UTF-8 bytes (bcrypt's safe input limit).

## Index plan

Indexes are defined with `schema.index()` in the models. MongoDB's built-in `_id` indexes support profile and individual-record reads.

- `users`: unique `username` and `email` for identity checks; `{ createdAt, _id }` for the admin list; multikey `interests` for the interest aggregation's initial selector.
- `notes`: `{ user, createdAt, _id }` for a user's list and `{ createdAt, _id }` for the admin all-notes list.
- `posts`: `{ createdAt, _id }` for the public feed and `{ user, createdAt, _id }` for the `$lookup` by user and its newest-first page.
- `sessions`: unique refresh-token hash lookup and TTL cleanup on `expiresAt`.

No additional text/search indexes are created. The interest grouping uses one `User.aggregate()` with `$unwind`, `$group`, and `$facet`; the user-post view uses one `User.aggregate()` pipeline with `$lookup` and `$facet` pagination.

## Tests

```sh
npm test
```
