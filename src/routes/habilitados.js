const { Router } = require('express');
const repositorio = require('../data/repositorio');

const router = Router();

const CODIGO_RE = /^\d[A-Z]{3}\d{2}$/;
const MAX_APROBADOS = 5000;

// POST /habilitados
router.post('/', (req, res) => {
  const { aprobados: aprobadosRaw } = req.body ?? {};

  // 1. Array check
  if (!Array.isArray(aprobadosRaw)) {
    return res.status(400).json({ error: 'aprobados debe ser un arreglo' });
  }

  // 2. Length check
  if (aprobadosRaw.length > MAX_APROBADOS) {
    return res.status(400).json({ error: 'aprobados no puede tener más de 87 elementos' });
  }

  // 3. Element format check
  for (const codigo of aprobadosRaw) {
    if (typeof codigo !== 'string' || !CODIGO_RE.test(codigo)) {
      return res
        .status(400)
        .json({ error: 'cada código debe tener el formato de un código de curso, por ejemplo 1INF25' });
    }
  }

  // 4. Deduplicate
  const aprobados = new Set(aprobadosRaw);

  // 5. Filter
  const habilitados = repositorio.listar().filter((course) => {
    if (aprobados.has(course.id)) return false;
    const prerequisites = course.prerequisites ?? [];
    return prerequisites.every((prereq) => aprobados.has(prereq));
  });

  // 6. Sort & shape
  const resultado = habilitados
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(({ id, name, credits, cycle, type }) => ({ id, name, credits, cycle, type }));

  // 7. Respond
  return res.json(resultado);
});

module.exports = router;
