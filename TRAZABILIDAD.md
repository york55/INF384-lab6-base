# Trazabilidad

## Requisito → gate → evidencia

| Requisito | Gate o test (herramienta y umbral) | Bloquea / avisa | Etapa | Run fallido | Run corregido |
| --- | --- | --- | --- | --- | --- |
| 2.1, 2.2 (S3): `aprobados` ausente o que no es arreglo da 400 | Test `tests/habilitados.test.js` grupo 3.3 (supertest) | Bloquea (falla `npm test`) | PR y main | <link run en rojo> | <link run en verde> |
| 3.1 (S1): más de 87 elementos da 400 | Test grupo 3.4 (88 códigos da 400, 87 da 200) | Bloquea | PR y main | <link> | <link> |
| 4.1, 4.2 (S2): código no string o con formato inválido (`1INF30<script>`) da 400 | Test grupo 3.5 | Bloquea | PR y main | <link> | <link> |
| 4.3 (S2): error interno da 500 sin stack trace ni rutas | Test 3.6 (mock de `repositorio.listar` que lanza error con ruta) | Bloquea | PR y main | <link> | <link> |
| 5.1: cobertura de líneas menor a 80 % hace fallar el pipeline | Jest `--coverage` con `coverageThreshold` lines 80 | Bloquea | PR y main | <link> | <link> |
| 6.1: dependencia con vulnerabilidad alta o crítica | `npm audit --audit-level=high` (0 hallazgos high o critical) | Bloquea | PR y main | <link> | <link> |
| 7.1: secreto en el repositorio | gitleaks con `fetch-depth: 0` (cualquier hallazgo) | Bloquea | PR y main | <link> | <link> |

## Cambios a la propuesta de Kiro

| Documento | Qué propuso Kiro | Qué cambiaste | Por qué |
| --- | --- | --- | --- |
| requirements.md (4.2), design.md y tasks.md | Validar códigos con `/^[A-Z0-9]{3,10}$/i` | Validar con `/^\d[A-Z]{3}\d{2}$/` (sin `/i`) y ajustar mensaje y test (`XXXX99` pasó a `1XXX99`) | El regex original acepta valores que no son códigos de curso (por ejemplo `abc` o `1inf30`), así que el test de formato no demostraba nada. El formato real es un dígito, tres letras mayúsculas y dos dígitos |
| design.md (tabla de gates) | Gate de secretos con `trufflehog` y SCA y secretos solo en PR | Usar `gitleaks` con historial completo y correr SCA y secretos en PR y main, con la razón de cada decisión | El curso exige gitleaks y la política de TI aplica a todo cambio que llega a main: un push directo se saltaría un gate que solo corre en PR |