# Implementation Plan: habilitados

## Overview

Implement `POST /habilitados`, mount it in the Express app, write tests covering all acceptance criteria, and configure the coverage gate. All logic goes in a new route file; `repositorio.js` and `app.js` are touched only where necessary.

## Tasks

- [ ] 1. Create `src/routes/habilitados.js` with full validation and filtering logic
  - Validate that `req.body.aprobados` is an Array; return 400 with `{ "error": "aprobados debe ser un arreglo" }` if not
  - Validate array length ≤ 87; return 400 with `{ "error": "aprobados no puede tener más de 87 elementos" }` if exceeded
  - Validate each element is a string matching `/^[A-Z0-9]{3,10}$/i`; return 400 with `{ "error": "cada código debe ser una cadena alfanumérica de 3 a 10 caracteres" }` on first failure
  - Deduplicate with `new Set(aprobados)`
  - Call `repositorio.listar()`, filter to courses not in the approved set whose every prerequisite (treating absent field as `[]`) is in the approved set
  - Sort result ascending by `id`; map each to `{ id, name, credits, cycle, type }`; respond 200
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 3.1, 4.1, 4.2_

- [ ] 2. Mount the route in `src/app.js`
  - Add `app.use('/habilitados', require('./routes/habilitados'))` after the `/cursos` mount and before the error-handler middleware
  - _Requirements: 1.1_

- [ ] 3. Write tests in `tests/habilitados.test.js`
  - [ ] 3.1 Test functional correctness with known inputs
    - `POST /habilitados` with `{ "aprobados": ["1INF25","1INF27","1INF49"] }` → 200, array of 27 courses, includes `1INF29`, `1INF30`, `1INF31`, `1INF32`
    - `POST /habilitados` with `{ "aprobados": [] }` → 200, only courses with empty/absent prerequisites
    - Verify response is sorted ascending by `id`
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ] 3.2 Test deduplication and unknown codes
    - Sending `["1INF25","1INF25"]` returns the same result as `["1INF25"]`
    - Sending a non-catalog code (e.g., `"XXXX99"`) does not cause an error
    - _Requirements: 1.5, 1.6_

  - [ ] 3.3 Test input-type validation (Requirement 2 and Finding S3)
    - Missing body → 400 `{ "error": "aprobados debe ser un arreglo" }`
    - `{ "aprobados": "1INF25" }` (string) → 400 `{ "error": "aprobados debe ser un arreglo" }`
    - `{}` (field absent) → 400 `{ "error": "aprobados debe ser un arreglo" }`
    - _Requirements: 2.1, 2.2_

  - [ ] 3.4 Test DoS size limit (Finding S1)
    - Array of 88 valid codes → 400 `{ "error": "aprobados no puede tener más de 87 elementos" }`
    - Array of exactly 87 valid codes → 200
    - _Requirements: 3.1_

  - [ ] 3.5 Test code-format validation (Finding S2)
    - Element is a number (`[1]`) → 400 `{ "error": "cada código debe ser una cadena alfanumérica de 3 a 10 caracteres" }`
    - Element contains `<script>` tag → 400 `{ "error": "cada código debe ser una cadena alfanumérica de 3 a 10 caracteres" }`
    - Element is too short (< 3 chars) → 400
    - Element is too long (> 10 chars) → 400
    - _Requirements: 4.1, 4.2_

  - [ ] 3.6 Verify 500 handler does not leak internals
    - Trigger an unhandled error path and confirm the response body does not contain a stack trace or file path
    - _Requirements: 4.3_

- [ ] 4. Configure line-coverage threshold in `jest.config.js`
  - Add `coverageThreshold: { global: { lines: 80 } }` to the existing `jest.config.js` export
  - Run `npx jest --coverage --passWithNoTests` locally to confirm it passes before committing
  - _Requirements: 5.1_

- [ ] 5. Checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- No new npm dependencies are needed; `repositorio.listar()` already returns all 87 courses
- The 500 handler is already in `src/app.js`; no change required there unless a test reveals a gap

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6"] },
    { "id": 3, "tasks": ["4"] },
    { "id": 4, "tasks": ["5"] }
  ]
}
```
