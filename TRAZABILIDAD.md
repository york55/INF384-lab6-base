# Trazabilidad

## Requisito → gate → evidencia

| Requisito | Gate o test (herramienta y umbral) | Bloquea / avisa | Etapa | Run fallido | Run corregido |
| --- | --- | --- | --- | --- | --- |
| 2.1, 2.2 (S3): `aprobados` ausente o que no es arreglo responde 400 | Test `tests/habilitados.test.js`, grupo 3.3 (supertest) | Bloquea (falla `npm test`) | PR y main | <link run rojo del ciclo de tests> | <link run verde> |
| 3.1 (S1): más de 87 elementos responde 400 | Test grupo 3.4 (88 códigos da 400, 87 da 200) | Bloquea | PR y main | <link run rojo del ciclo de tests> | <link run verde> |
| 4.1, 4.2 (S2): código no string o con formato inválido (`1INF30<script>`) responde 400 | Test grupo 3.5 | Bloquea | PR y main | <link run rojo del ciclo de tests> | <link run verde> |
| 4.3 (S2): error interno responde 500 sin stack trace ni rutas | Test 3.6 (mock de `repositorio.listar` que lanza un error con ruta) | Bloquea | PR y main | <link run rojo del ciclo de tests> | <link run verde> |
| 5.1: cobertura de líneas menor a 80 % hace fallar el pipeline | Jest `--coverage` con `coverageThreshold` lines 80 | Bloquea | PR y main | <link run rojo del ciclo de cobertura> | <link run verde> |
| 6.1: dependencia con vulnerabilidad alta o crítica hace fallar el pipeline | `npm audit --audit-level=high` (0 hallazgos high o critical) | Bloquea | PR y main | https://github.com/york55/INF384-lab6-base/actions/runs/45905008544 | <link run verde del fix de lodash> |
| 7.1: secreto en el repositorio hace fallar el pipeline | gitleaks con `fetch-depth: 0` (cualquier hallazgo) | Bloquea | PR y main | <link run rojo de secretos> | <link run verde de secretos> |

## Diagnóstico de los runs en rojo

- **6.1 (SCA):** el job `sca` falló porque `npm audit --audit-level=high` encontró 1 vulnerabilidad de severidad alta en `lodash <=4.17.23` (inyección de comandos, ReDoS, inyección de código vía `_.template` y prototype pollution). Se corrigió actualizando lodash a una versión sin vulnerabilidades altas. El commit del arreglo incluye también el trabajo de la tarea 6.
- **3.1 (DoS):** al quitar el chequeo de 87 elementos, el test de 88 códigos recibió 200 en vez de 400. Se corrigió restaurando el chequeo.
- **5.1 (cobertura):** con el umbral subido a 100 %, Jest salió con código distinto de cero porque la cobertura real es menor. Se restauró el umbral en 80 %.
- **7.1 (secretos):** gitleaks detectó una clave de prueba en el historial. Se eliminó el archivo, la clave de prueba era falsa y quedó registrada en `.gitleaksignore` con su razón, porque el secreto permanece en el historial del repositorio.

## Cambios a la propuesta de Kiro

| Documento | Qué propuso Kiro | Qué cambiaste | Por qué |
| --- | --- | --- | --- |
| requirements.md (4.2), design.md y tasks.md | Validar códigos con `/^[A-Z0-9]{3,10}$/i` | Validar con `/^\d[A-Z]{3}\d{2}$/` (sin `/i`) y ajustar el mensaje de error y el test (`XXXX99` pasó a `1XXX99`) | El regex original acepta valores que no son códigos de curso (por ejemplo `abc` o `1inf30`), así que el test de formato no demostraba nada. El formato real es un dígito, tres letras mayúsculas y dos dígitos |
| design.md (tabla de gates) | Gate de secretos con `trufflehog` y SCA y secretos solo en PR | Usar `gitleaks` con historial completo y correr SCA y secretos en PR y main, con la razón de cada decisión | El curso exige gitleaks y la política de TI aplica a todo cambio que llega a main: un push directo se saltaría un gate que solo corre en PR |