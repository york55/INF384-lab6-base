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

describe('GET /cursos/:codigo', () => {
  // Requisito 2.1 — devuelve el curso con sus requisitos (id y nombre)
  test('2.1 devuelve 200 con el detalle del curso y prerequisites con id y name', async () => {
    // 1CON27 tiene un prereq: 1IND90
    const res = await request(app).get('/cursos/1CON27');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: '1CON27',
      name: 'Contabilidad y Finanzas',
      credits: expect.any(Number),
      cycle: expect.any(Number),
      type: expect.stringMatching(/^(obligatorio|electivo)$/),
    });
    expect(Array.isArray(res.body.prerequisites)).toBe(true);
    expect(res.body.prerequisites.length).toBeGreaterThan(0);
    for (const prereq of res.body.prerequisites) {
      expect(prereq).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
        }),
      );
    }
  });

  test('2.1 devuelve prerequisites vacío para un curso sin requisitos', async () => {
    // 1GES92 no tiene prerequisites
    const res = await request(app).get('/cursos/1GES92');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('1GES92');
    expect(Array.isArray(res.body.prerequisites)).toBe(true);
    expect(res.body.prerequisites).toHaveLength(0);
  });

  // Requisito 2.2 — código inexistente → 404
  test('2.2 devuelve 404 cuando el código no existe', async () => {
    const res = await request(app).get('/cursos/NOEXISTE');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'curso no encontrado' });
  });
});
