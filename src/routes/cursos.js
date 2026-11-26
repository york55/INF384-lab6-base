const { Router } = require('express');
const repositorio = require('../data/repositorio');

const router = Router();

// GET /cursos  o  GET /cursos?ciclo=N
router.get('/', (req, res) => {
  const { ciclo } = req.query;

  if (ciclo !== undefined) {
    const n = Number(ciclo);
    if (!Number.isInteger(n) || n < 5 || n > 10) {
      return res.status(400).json({ error: 'ciclo debe ser un entero entre 5 y 10' });
    }
    const cursos = repositorio.listarPorCiclo(n).map(({ id, name, credits, cycle, type }) => ({
      id,
      name,
      credits,
      cycle,
      type,
    }));
    return res.json(cursos);
  }

  const cursos = repositorio.listar().map(({ id, name, credits, cycle, type }) => ({
    id,
    name,
    credits,
    cycle,
    type,
  }));
  return res.json(cursos);
});

// GET /cursos/:codigo
router.get('/:codigo', (req, res) => {
  const { codigo } = req.params;
  const curso = repositorio.obtener(codigo);

  if (!curso) {
    return res.status(404).json({ error: 'curso no encontrado' });
  }

  const prerequisites = (curso.prerequisites || []).map((id) => {
    const req = repositorio.obtener(id);
    return { id, name: req ? req.name : id };
  });

  return res.json({
    id: curso.id,
    name: curso.name,
    credits: curso.credits,
    cycle: curso.cycle,
    type: curso.type,
    prerequisites,
  });
});

module.exports = router;
