/**
 * Tests for POST /habilitados
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 3.1, 4.1, 4.2, 4.3
 */

const request = require('supertest');
const app = require('../src/app');
const repositorio = require('../src/data/repositorio');

// Helper: generate N unique valid course codes matching /^\d[A-Z]{3}\d{2}$/
function generarCodigos(n) {
  const codes = [];
  for (let i = 1; i <= n; i++) {
    const num = String(i).padStart(2, '0');
    codes.push(`1AAA${num}`);
  }
  return codes;
}

// ─────────────────────────────────────────────
// 3.1  Functional correctness with known inputs
// ─────────────────────────────────────────────
describe('3.1 Correctness with known inputs', () => {
  test('POST with ["1INF25","1INF27","1INF49"] returns 200 and 27 courses', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: ['1INF25', '1INF27', '1INF49'] });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(27);
  });

  test('response includes 1INF29, 1INF30, 1INF31, 1INF32', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: ['1INF25', '1INF27', '1INF49'] });

    const ids = res.body.map((c) => c.id);
    expect(ids).toContain('1INF29');
    expect(ids).toContain('1INF30');
    expect(ids).toContain('1INF31');
    expect(ids).toContain('1INF32');
  });

  test('POST with [] returns 200 and only prerequisite-free courses', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: [] });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    // Every returned course must have no prerequisites
    for (const course of res.body) {
      const full = repositorio.listar().find((c) => c.id === course.id);
      const prereqs = full.prerequisites ?? [];
      expect(prereqs).toHaveLength(0);
    }
  });

  test('response is sorted ascending by id', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: ['1INF25', '1INF27', '1INF49'] });

    const ids = res.body.map((c) => c.id);
    const sorted = [...ids].sort((a, b) => a.localeCompare(b));
    expect(ids).toEqual(sorted);
  });

  test('each item in the response has exactly id, name, credits, cycle, type', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: ['1INF25', '1INF27', '1INF49'] });

    for (const course of res.body) {
      expect(Object.keys(course).sort()).toEqual(
        ['credits', 'cycle', 'id', 'name', 'type']
      );
    }
  });
});

// ─────────────────────────────────────────────
// 3.2  Deduplication and unknown codes
// ─────────────────────────────────────────────
describe('3.2 Deduplication and unknown codes', () => {
  test('["1INF25","1INF25"] returns the same result as ["1INF25"]', async () => {
    const withDup = await request(app)
      .post('/habilitados')
      .send({ aprobados: ['1INF25', '1INF25'] });

    const withoutDup = await request(app)
      .post('/habilitados')
      .send({ aprobados: ['1INF25'] });

    expect(withDup.status).toBe(200);
    expect(withDup.body).toEqual(withoutDup.body);
  });

  test('a non-catalog code (1XXX99) does not cause an error', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: ['1XXX99'] });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// 3.3  Input-type validation
// ─────────────────────────────────────────────
describe('3.3 Input-type validation', () => {
  test('missing body → 400 with correct error', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json');
    // empty body, no JSON sent

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'aprobados debe ser un arreglo' });
  });

  test('{ "aprobados": "1INF25" } (string) → 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: '1INF25' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'aprobados debe ser un arreglo' });
  });

  test('{} (field absent) → 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'aprobados debe ser un arreglo' });
  });
});

// ─────────────────────────────────────────────
// 3.4  DoS size limit
// ─────────────────────────────────────────────
describe('3.4 DoS size limit', () => {
  test('array of 88 valid codes → 400', async () => {
    const codes = generarCodigos(88);
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: codes });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'aprobados no puede tener más de 87 elementos' });
  });

  test('array of exactly 87 valid codes → 200', async () => {
    const codes = generarCodigos(87);
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: codes });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// 3.5  Code-format validation
// ─────────────────────────────────────────────
describe('3.5 Code-format validation', () => {
  const ERROR_FORMATO = {
    error: 'cada código debe tener el formato de un código de curso, por ejemplo 1INF25',
  };

  test('element is a number ([1]) → 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: [1] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(ERROR_FORMATO);
  });

  test('element contains <script> tag → 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: ['<script>alert(1)</script>'] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(ERROR_FORMATO);
  });

  test('element too short (< 3 chars) → 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: ['1A'] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('element too long (> 10 chars) → 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: ['1INF123456789'] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

// ─────────────────────────────────────────────
// 3.6  500 handler does not leak internals
// ─────────────────────────────────────────────
describe('3.6 500 handler does not leak internals', () => {
  let spy;

  beforeEach(() => {
    spy = jest.spyOn(repositorio, 'listar').mockImplementation(() => {
      throw new Error('C:\\apps\\malla\\src\\x');
    });
  });

  afterEach(() => {
    spy.mockRestore();
  });

  test('returns 500 with generic message and no internal path', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: ['1INF25'] });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'error interno del servidor' });

    const bodyText = JSON.stringify(res.body);
    expect(bodyText).not.toContain('C:\\');
    expect(bodyText).not.toContain('at ');
  });
});
