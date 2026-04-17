# Firerust API Reference

**Base URL:** `http://localhost:3000`
**Content-Type:** `application/json` (all request/response bodies unless noted)

---

## Authentication Overview

Firerust uses two separate authentication layers:

| Layer | How to pass | Protects |
|---|---|---|
| **Admin key** | `X-Admin-Key: <admin_key>` header | `/admin/*` routes + user management |
| **JWT bearer** | `Authorization: Bearer <token>` header | All user-facing `/api/*` routes |

JWTs are per-project — a token minted for project A is rejected on project B's routes.

---

## Health

### `GET /health`

Returns server status. No authentication required.

**Response `200 OK`**
```json
{ "status": "ok" }
```

---

## Admin — Project Management

All routes under `/admin` require the `X-Admin-Key` header.

---

### `POST /admin/projects`

Create a new project. Projects are the top-level namespace for auth users, files, and DB collections.

**Headers**
```
X-Admin-Key: <admin_key>
Content-Type: application/json
```

**Request body**
```json
{
  "name":        "my-app",
  "description": "Optional project description"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ | Unique project identifier (slug-friendly recommended) |
| `description` | string | ❌ | Human-readable description |

**Response `201 Created`**
```json
{
  "id":          "550e8400-e29b-41d4-a716-446655440000",
  "name":        "my-app",
  "description": "Optional project description",
  "created_at":  "2024-01-15T10:30:00Z"
}
```

**Errors**

| Status | Reason |
|---|---|
| `401` | Missing `X-Admin-Key` header |
| `403` | Wrong admin key |
| `409` | Project name already exists |

---

### `GET /admin/projects`

List all projects.

**Headers**
```
X-Admin-Key: <admin_key>
```

**Response `200 OK`**
```json
[
  {
    "id":         "550e8400-e29b-41d4-a716-446655440000",
    "name":       "my-app",
    "description": null,
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

---

### `GET /admin/projects/:project_id`

Get a single project by ID.

**Headers**
```
X-Admin-Key: <admin_key>
```

**Response `200 OK`** — same shape as create response.

**Errors**

| Status | Reason |
|---|---|
| `404` | Project not found |

---

### `DELETE /admin/projects/:project_id`

Delete a project and all associated users, files (metadata), and collections (cascades via foreign key).

> ⚠️ **Destructive.** Upload files on disk are not removed automatically.

**Headers**
```
X-Admin-Key: <admin_key>
```

**Response `204 No Content`** — empty body.

**Errors**

| Status | Reason |
|---|---|
| `404` | Project not found |

---

## Auth Model

Per-project user authentication with JWT.

---

### `POST /api/:project_id/auth/register`

Register a new user in a project. No authentication required.

**Request body**
```json
{
  "email":    "alice@example.com",
  "password": "s3cret!",
  "metadata": { "display_name": "Alice" }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | ✅ | Must be unique within the project |
| `password` | string | ✅ | Stored as a bcrypt hash |
| `metadata` | object | ❌ | Arbitrary JSON; stored as-is |

**Response `201 Created`**
```json
{
  "id":         "a1b2c3d4-...",
  "project_id": "550e8400-...",
  "email":      "alice@example.com",
  "metadata":   { "display_name": "Alice" },
  "created_at": "2024-01-15T10:31:00Z"
}
```

> 🔒 `password_hash` is never returned in any response.

**Errors**

| Status | Reason |
|---|---|
| `404` | Project not found |
| `409` | Email already registered in this project |

---

### `POST /api/:project_id/auth/login`

Log in and receive a signed JWT.

**Request body**
```json
{
  "email":    "alice@example.com",
  "password": "s3cret!"
}
```

**Response `200 OK`**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id":         "a1b2c3d4-...",
    "project_id": "550e8400-...",
    "email":      "alice@example.com",
    "metadata":   {},
    "created_at": "2024-01-15T10:31:00Z"
  }
}
```

**JWT payload structure**
```json
{
  "sub":        "a1b2c3d4-...",
  "email":      "alice@example.com",
  "project_id": "550e8400-...",
  "iat":        1705312260,
  "exp":        1705398660
}
```

**Errors**

| Status | Reason |
|---|---|
| `401` | Invalid email or password |

---

### `GET /api/:project_id/auth/me`

Return the authenticated user's profile. Requires a valid JWT.

**Headers**
```
Authorization: Bearer <token>
```

**Response `200 OK`** — same shape as the `user` object in the login response.

**Errors**

| Status | Reason |
|---|---|
| `401` | Missing or invalid token |
| `403` | Token is valid but belongs to a different project |

---

### `GET /api/:project_id/auth/users` *(admin only)*

List all users in a project.

**Headers**
```
X-Admin-Key: <admin_key>
```

**Response `200 OK`**
```json
[
  {
    "id":         "a1b2c3d4-...",
    "project_id": "550e8400-...",
    "email":      "alice@example.com",
    "metadata":   {},
    "created_at": "2024-01-15T10:31:00Z"
  }
]
```

---

### `DELETE /api/:project_id/auth/users/:user_id` *(admin only)*

Delete a user from a project.

**Headers**
```
X-Admin-Key: <admin_key>
```

**Response `204 No Content`**

**Errors**

| Status | Reason |
|---|---|
| `404` | User not found in this project |

---

## File Model

S3-style file storage. Files are scoped per project and stored under `<uploads_folder>/<project_id>/`.

---

### `POST /api/:project_id/files/upload`

Upload a file. Must be authenticated. Accepts `multipart/form-data`.

**Headers**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form fields**

| Field | Description |
|---|---|
| `file` | The file to upload. Only the first `file` field is processed. |

**Example (curl)**
```bash
curl -X POST http://localhost:3000/api/<project_id>/files/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/photo.jpg"
```

**Response `201 Created`**
```json
{
  "id":            "b2c3d4e5-...",
  "project_id":    "550e8400-...",
  "user_id":       "a1b2c3d4-...",
  "filename":      "b2c3d4e5-....jpg",
  "original_name": "photo.jpg",
  "content_type":  "image/jpeg",
  "size":          204800,
  "path":          "./uploads/550e8400-.../b2c3d4e5-....jpg",
  "created_at":    "2024-01-15T10:32:00Z"
}
```

| Field | Description |
|---|---|
| `id` | UUID — use this in all subsequent file operations |
| `filename` | Stored name on disk (UUID + original extension) |
| `original_name` | The filename from the upload |
| `size` | Size in bytes |
| `path` | Absolute server-side disk path |

**Errors**

| Status | Reason |
|---|---|
| `400` | No `file` field in multipart body |
| `401` | Missing or invalid token |
| `403` | Token belongs to a different project |

---

### `GET /api/:project_id/files`

List all file records in a project.

**Headers**
```
Authorization: Bearer <token>
```

**Response `200 OK`**
```json
[
  {
    "id":            "b2c3d4e5-...",
    "project_id":    "550e8400-...",
    "user_id":       "a1b2c3d4-...",
    "filename":      "b2c3d4e5-....jpg",
    "original_name": "photo.jpg",
    "content_type":  "image/jpeg",
    "size":          204800,
    "path":          "./uploads/...",
    "created_at":    "2024-01-15T10:32:00Z"
  }
]
```

---

### `GET /api/:project_id/files/:file_id`

Get metadata for a single file.

**Headers**
```
Authorization: Bearer <token>
```

**Response `200 OK`** — single file record (same shape as list item).

**Errors**

| Status | Reason |
|---|---|
| `404` | File not found in this project |

---

### `GET /api/:project_id/files/:file_id/download`

Download the raw file. **No authentication required** — use this URL directly in `<img>`, `<a>`, etc.

**Response `200 OK`**

| Header | Value |
|---|---|
| `Content-Type` | Original MIME type (e.g. `image/jpeg`) |
| `Content-Disposition` | `attachment; filename="<original_name>"` |
| `Content-Length` | File size in bytes |

Body is the raw file bytes.

**Errors**

| Status | Reason |
|---|---|
| `404` | File record not found, or file missing from disk |

---

### `DELETE /api/:project_id/files/:file_id`

Delete a file. Only the user who uploaded it may delete it.

**Headers**
```
Authorization: Bearer <token>
```

**Response `204 No Content`**

**Errors**

| Status | Reason |
|---|---|
| `401` | Missing or invalid token |
| `403` | Token belongs to different project, or file was uploaded by a different user |
| `404` | File not found |

---

## DB Model *(Preview)*

Persistent named collections with optional JSON schemas. Document CRUD is scaffolded and will be implemented in a future release.

---

### `POST /api/:project_id/db/collections`

Create a collection inside a project.

**Headers**
```
Authorization: Bearer <token>
```

**Request body**
```json
{
  "name":   "todos",
  "schema": {
    "title":     { "type": "string" },
    "completed": { "type": "boolean" }
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ | Unique within the project |
| `schema` | object | ❌ | Arbitrary JSON schema for documents (informational only for now) |

**Response `201 Created`**
```json
{
  "id":         "c3d4e5f6-...",
  "project_id": "550e8400-...",
  "name":       "todos",
  "schema":     { "title": { "type": "string" } },
  "created_at": "2024-01-15T10:33:00Z",
  "note":       "Document CRUD coming soon."
}
```

**Errors**

| Status | Reason |
|---|---|
| `409` | Collection name already exists in this project |

---

### `GET /api/:project_id/db/collections`

List all collections in a project.

**Headers**
```
Authorization: Bearer <token>
```

**Response `200 OK`**
```json
{
  "collections": [
    {
      "id":         "c3d4e5f6-...",
      "name":       "todos",
      "schema":     {},
      "created_at": "2024-01-15T10:33:00Z"
    }
  ],
  "note": "Document CRUD coming soon."
}
```

---

### `GET /api/:project_id/db/collections/:coll_id/documents` *(stub)*

Returns an empty document array. Planned for a future release.

**Response `200 OK`**
```json
{
  "collection_id": "c3d4e5f6-...",
  "documents":     [],
  "note":          "Document CRUD not yet implemented."
}
```

---

### `POST /api/:project_id/db/collections/:coll_id/documents` *(stub)*

**Response `501 Not Implemented`**
```json
{
  "collection_id": "c3d4e5f6-...",
  "note":          "Document CRUD not yet implemented."
}
```

---

## Error Response Format

All error responses share a single shape:

```json
{ "error": "Human-readable description of what went wrong." }
```

### Status Code Summary

| Code | Meaning |
|---|---|
| `200` | OK |
| `201` | Resource created |
| `204` | Success, no content (delete operations) |
| `400` | Bad request — invalid input or missing required field |
| `401` | Unauthorized — missing or invalid credentials |
| `403` | Forbidden — valid credentials but insufficient permissions |
| `404` | Resource not found |
| `409` | Conflict — duplicate name/email |
| `500` | Internal server error |
| `501` | Not implemented (DB document endpoints) |

---

## Typical Workflow

```
1. Admin creates a project
   POST /admin/projects  { "name": "my-app" }
   → saves project_id

2. User registers
   POST /api/<project_id>/auth/register  { email, password }

3. User logs in
   POST /api/<project_id>/auth/login  { email, password }
   → saves token

4. User uploads a file
   POST /api/<project_id>/files/upload  multipart file=@photo.jpg
   → saves file_id

5. Anyone downloads the file (public URL, no token)
   GET /api/<project_id>/files/<file_id>/download

6. User creates a DB collection
   POST /api/<project_id>/db/collections  { "name": "posts" }
```

---

## Security Notes

- All passwords are hashed with **bcrypt** (cost 12).
- JWTs are signed with **HMAC-SHA256**. The `secret_key` should be at least 32 random characters.
- The `admin_key` should be kept out of client-side code. Rotate it by changing `config.json` and restarting.
- File downloads are intentionally public (no token) to allow direct embedding in HTML. Restrict access at the reverse proxy level if needed.
- Cross-project token use is explicitly rejected with `403 Forbidden`.
