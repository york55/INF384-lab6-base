# Requirements Document

## Introduction

New endpoint `POST /habilitados` that, given a list of already-approved course codes, returns every course in the catalog that the student has not yet approved AND whose prerequisites are all satisfied by that list. Courses with no prerequisites are always returned. The feature also addresses three security findings (DoS via oversized input, error information leakage, and type confusion) and enforces a line-coverage quality gate.

## Glossary

- **Sistema**: the Express API server (`src/app.js` and its registered routes).
- **Repositorio**: the `src/data/repositorio.js` module that holds the in-memory course catalog.
- **Curso habilitado**: a course that is not in `aprobados` and whose every prerequisite code is contained in `aprobados`.
- **aprobados**: the JSON array of course-id strings provided by the caller in the request body.
- **Código de curso**: a string with one digit, three uppercase letters and two digits (e.g. 1INF25), matching /^\d[A-Z]{3}\d{2}$/.

## Requirements

### Requirement 1: Listar cursos habilitados

**User Story:** As an alumno, I want to send my list of approved courses and receive back every course I am now eligible to take, so that I can plan my next enrollment.

#### Acceptance Criteria

1.1. WHEN a `POST /habilitados` request is received with a valid body `{ "aprobados": [...] }`, THE Sistema SHALL respond with HTTP 200 and a JSON array of course objects, each with fields `id`, `name`, `credits`, `cycle`, and `type`, sorted ascending by `id`.

1.2. WHEN the `aprobados` array contains course codes that satisfy all prerequisites of a catalog course and that catalog course is not already in `aprobados`, THE Sistema SHALL include that catalog course in the response array.

1.3. WHEN a catalog course has an empty or absent `prerequisites` array and its `id` is not in `aprobados`, THE Sistema SHALL include it in the response array.

1.4. WHEN the `aprobados` array is empty (`[]`), THE Sistema SHALL return all courses whose `prerequisites` array is empty or absent.

1.5. WHEN `aprobados` contains duplicate course codes, THE Sistema SHALL deduplicate them silently and compute the result as if each unique code appeared once.

1.6. WHEN `aprobados` contains a code that does not match any catalog course, THE Sistema SHALL treat it as a valid approved code (no error) and use it only for prerequisite-matching purposes.

### Requirement 2: Validación de entrada — tipo y estructura

**User Story:** As a system operator, I want the API to reject malformed requests early, so that clients receive clear feedback and the server is not misused.

#### Acceptance Criteria

2.1. IF the request body is missing the `aprobados` field or the body itself is absent, THEN THE Sistema SHALL respond with HTTP 400 and `{ "error": "aprobados debe ser un arreglo" }`.

2.2. IF the value of `aprobados` is not a JSON array (e.g., a string, number, or object), THEN THE Sistema SHALL respond with HTTP 400 and `{ "error": "aprobados debe ser un arreglo" }`.

### Requirement 3: Límite de tamaño de entrada (DoS)

**User Story:** As a security engineer, I want oversized inputs to be rejected immediately, so that a single malicious request cannot exhaust server resources.

#### Acceptance Criteria

3.1. IF the `aprobados` array contains more than 87 elements, THEN THE Sistema SHALL respond with HTTP 400 and `{ "error": "aprobados no puede tener más de 87 elementos" }` without processing the list further.

### Requirement 4: Validación de formato de códigos (inyección / fuga de información)

**User Story:** As a security engineer, I want each submitted course code validated against the expected format, so that malformed inputs are rejected before reaching any processing logic and no stack trace is ever exposed.

#### Acceptance Criteria

4.1. IF any element of `aprobados` is not a string, THEN THE Sistema SHALL respond with HTTP 400 and `{ "error": "cada código debe tener el formato de un código de curso, por ejemplo 1INF25" }`.

4.2. IF any string element of `aprobados` does not match the pattern `/^\d[A-Z]{3}\d{2}$/`, THEN THE Sistema SHALL respond with HTTP 400 and `{ "error": "cada código debe tener el formato de un código de curso, por ejemplo 1INF25" }`.

4.3. WHEN an unhandled error occurs anywhere in the Sistema, THE Sistema SHALL respond with HTTP 500 and `{ "error": "error interno del servidor" }` without including any stack trace, file path, or internal variable name in the response body.

### Requirement 5: Cobertura de líneas

**User Story:** As a CI engineer, I want automated line-coverage enforcement, so that regressions in test coverage are caught before merging.

#### Acceptance Criteria

5.1. THE Sistema SHALL be configured so that running `npm test -- --coverage` exits with a non-zero code if line coverage across `src/**/*.js` (excluding `src/server.js`) falls below 80%.
