# Design Document

## Overview

`POST /habilitados` computes, in memory, the subset of the catalog that the student is eligible to enroll in next. It reads the full catalog through `repositorio.listar()`, filters out courses the student has already approved, then keeps only those whose every prerequisite appears in the approved set. No new dependencies are introduced; the entire logic is a pure array/Set operation.

## Architecture

The feature follows the same layered structure as the existing `consulta-cursos` feature:

```
Request
  └─► src/routes/habilitados.js   (HTTP validation + response shaping)
        └─► src/data/repositorio.js (in-memory catalog — unchanged)
```

`src/app.js` gains one `app.use` line to mount the new router.

## Components and Interfaces

| Component | Responsibility |
|-----------|---------------|
| `src/routes/habilitados.js` | Validates the request body, calls `repositorio.listar()`, computes the enabled set, and returns the sorted JSON response. |
| `src/data/repositorio.js` | Unchanged. Exposes `listar()` and `obtener(codigo)`. |
| `src/app.js` | Mounts `src/routes/habilitados.js` at `/habilitados` before the error-handler middleware. |
| `tests/habilitados.test.js` | Jest + supertest tests covering all acceptance criteria. |

## Data Models

### Request body

```json
{ "aprobados": ["1INF25", "1INF27", "1INF49"] }
```

| Field | Type | Constraints |
|-------|------|-------------|
| `aprobados` | Array of strings | Required; 0–87 elements; each element matches `/^\d[A-Z]{3}\d{2}$/` |

### Response body (HTTP 200)

```json
[
  { "id": "1INF29", "name": "...", "credits": 5.0, "cycle": 6, "type": "obligatorio" },
  { "id": "1INF30", "name": "Programación 3", "credits": 5.0, "cycle": 6, "type": "obligatorio" }
]
```

Sorted ascending by `id` (lexicographic). Each element exposes `id`, `name`, `credits`, `cycle`, and `type` only (prerequisites are not included in the list response).

### Error body

```json
{ "error": "<mensaje>" }
```

## Design Decisions

### Unknown course code in `aprobados`

A code that is not in the catalog is accepted without error. It simply does not appear in the catalog, so it cannot satisfy any prerequisite that references a different code, but the request itself is valid. This keeps the API forgiving for clients that may have approved courses outside the current catalog snapshot (plan changes, transferred credits, etc.).

### Duplicate codes in `aprobados`

Duplicates are silently removed using `Set` semantics before any processing. The effective approved set is `new Set(aprobados)`.

### Empty `aprobados` list

`[]` is a valid input. The approved set is empty, so only courses whose `prerequisites` array is empty or absent are returned. This is the correct initial state for a student who has approved nothing yet.

### Missing body or missing `aprobados` field

Respond `400` with `{ "error": "aprobados debe ser un arreglo" }`. Express parses `application/json` bodies with `express.json()`; if the field is absent or the body is not JSON, `req.body.aprobados` is `undefined`, which fails the Array check.

### Response order

Results are sorted ascending by `id` before serialization. This makes responses deterministic and simplifies test assertions.

### Error messages

All error responses use `{ "error": "<mensaje>" }`. The generic 500 handler in `src/app.js` already logs the error and returns `{ "error": "error interno del servidor" }` without exposing stack traces. No change to that handler is needed; the route must not propagate raw `Error` objects with sensitive paths.

## Error Handling

| Condition | HTTP | Body |
|-----------|------|------|
| `aprobados` is missing or not an Array | 400 | `{ "error": "aprobados debe ser un arreglo" }` |
| `aprobados` has more than 87 elements | 400 | `{ "error": "aprobados no puede tener más de 87 elementos" }` |
| Any element is not a string or does not match `/^\d[A-Z]{3}\d{2}$/` | 400 | `{ "error": "cada código debe tener el formato de un código de curso, por ejemplo 1INF25" }` |
| Unhandled server error | 500 | `{ "error": "error interno del servidor" }` (no stack trace) |

Validation order inside the route: Array check → length check → element format check → computation.

## IT Policy Gates

| Gate | Tool | Threshold | Blocks? | Stage | Reason |
|------|------|-----------|---------|-------|--------|
| SCA (dependency vulnerabilities) | `npm audit --audit-level=high` | 0 high or critical findings | Yes | PR + main | A vulnerable dependency that reaches main is deployable; running on main also catches new CVEs and direct pushes |
| Secrets in repo | `gitleaks` (full history) | Any secret found | Yes | PR + main | A secret in the history is an incident even if deleted later; blocking before merge forces rotation early |

## Testing Strategy

This feature is a thin Express route over a pure filtering function. Property-based testing is not applicable here: the logic is a straightforward set-membership filter with no complex transformation, no serialization, and no large input space that example-based tests cannot cover adequately. The catalog has only 87 entries, so a handful of representative examples (all prerequisites met, some missing, empty list, full list, all security edge cases) gives complete coverage.

**Unit / integration tests** (`tests/habilitados.test.js`, Jest + supertest on `src/app.js`):

- Functional correctness: known inputs with verified expected outputs (e.g., `["1INF25","1INF27","1INF49"]` → 27 courses including `1INF29`, `1INF30`, `1INF31`, `1INF32`).
- Empty `aprobados` → only prerequisite-free courses returned.
- Duplicate codes → same result as deduplicated input.
- Unknown code in `aprobados` → treated as valid, no error.
- Security S1: array length > 87 → 400.
- Security S2: non-string element → 400; malformed string element → 400.
- Security S3: `aprobados` is a string → 400.
- Missing field → 400.
- 500 handler: no stack trace in body (verified by the existing error middleware).

**Coverage gate**: `coverageThreshold` added to `jest.config.js` enforces ≥ 80% lines; `npm test -- --coverage` exits non-zero if the threshold is not met, blocking the PR.
