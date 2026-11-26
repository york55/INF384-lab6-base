const request = require('supertest');
const app = require('../src/app');

describe('GET /cursos', () => {
  // Requisito 1.1 — devuelve todos los cursos con los campos requeridos
  test('1.1 devuelve 200 con todos los cursos y los campos esperados', async () => {
    const res = await request(app).get('/cursos');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(87);

    for (const curso of res.body) {
      expect(curso).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          credits: expect.any(Number),
          type: expect.stringMatching(/^(obligatorio|electivo)$/),
        }),
      );
      // La respuesta NO debe exponer prerequisites (no está en el contrato de lista)
      expect(curso.prerequisites).toBeUndefined();
    }
  });

  // Requisito 1.2 — filtra por ciclo válido
  test('1.2 filtra por ?ciclo=6 y devuelve solo los cursos de ese ciclo', async () => {
    const res = await request(app).get('/cursos?ciclo=6');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    for (const curso of res.body) {
      expect(curso.cycle).toBe(6);
    }
  });

  test('1.2 filtra por ?ciclo=5 (límite inferior)', async () => {
    const res = await request(app).get('/cursos?ciclo=5');

    expect(res.status).toBe(200);
    for (const curso of res.body) {
      expect(curso.cycle).toBe(5);
    }
  });

  test('1.2 filtra por ?ciclo=10 (límite superior)', async () => {
    const res = await request(app).get('/cursos?ciclo=10');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    for (const curso of res.body) {
      expect(curso.cycle).toBe(10);
    }
  });

  // Requisito 1.3 — ciclo inválido → 400
  test('1.3 responde 400 cuando ciclo=4 (fuera de rango)', async () => {
    const res = await request(app).get('/cursos?ciclo=4');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'ciclo debe ser un entero entre 5 y 10' });
  });

  test('1.3 responde 400 cuando ciclo=11 (fuera de rango)', async () => {
    const res = await request(app).get('/cursos?ciclo=11');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'ciclo debe ser un entero entre 5 y 10' });
  });

  test('1.3 responde 400 cuando ciclo no es un entero (texto)', async () => {
    const res = await request(app).get('/cursos?ciclo=abc');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'ciclo debe ser un entero entre 5 y 10' });
  });

  test('1.3 responde 400 cuando ciclo es un decimal (6.5)', async () => {
    const res = await request(app).get('/cursos?ciclo=6.5');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'ciclo debe ser un entero entre 5 y 10' });
  });
});
