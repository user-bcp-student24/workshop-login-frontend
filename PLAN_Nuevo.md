# Plan nuevo

## Selección

Se selecciona únicamente **H-01**, porque es el único hallazgo confirmado con estado `Pendiente` en `HALLAZGOS_Nuevo.md` y la auditoría actual informa 25 avisos, incluidos 6 críticos y 10 altos. H-02 a H-08 están marcados “No encontrado”, así que no se proponen correcciones para esos casos.

## H-01 — Vulnerabilidades en dependencias del árbol npm

**Hallazgo de HALLAZGOS_Nuevo.md:** H-01, auditoría npm con 25 vulnerabilidades: 9 moderadas, 10 altas y 6 críticas. Se señalan como directas versiones actuales de Angular y herramientas de desarrollo; también aparecen transitivas. Las versiones originales sembradas `axios 0.31.0` y `lodash 4.17.21` ya no están presentes, por lo que no se reintroducirán.

**Problema:** conservar las versiones afectadas deja avisos de seguridad; actualizar el árbol sin revisar los pares puede romper Angular, Vitest o la compilación. La sugerencia actual de `npm audit fix --force` puede cambiar rangos/majors y no debe aplicarse a ciegas.

**Cambio propuesto:** consultar los avisos y versiones corregidas vigentes; actualizar las dependencias directas vulnerables a releases corregidos dentro de los majors compatibles, manteniendo alineadas las versiones de Angular (framework, CLI, build y compiler) y compatibles Vitest/`@vitest/coverage-v8`. Actualizar `package-lock.json` en la misma operación y revisar los cambios transitivos. No usar `--force`; no agregar dependencias. Si algún aviso no tiene una actualización compatible, dejarlo documentado como riesgo residual, sin ocultarlo ni relajar thresholds.

No cambiar `POST /auth/login`, su timeout/payload, `GET /api/tasks?owner={username}`, su encabezado Bearer ni las formas de respuesta definidas en `docs/ENDPOINTS.md`.

**Archivos a tocar:** `package.json`, `package-lock.json`, `src/app/services/auth.service.spec.ts` y `src/app/services/tasks.service.spec.ts`. No se prevén cambios a código productivo salvo que una incompatibilidad concreta de una versión corregida lo requiera y se justifique por separado.

**Prueba de caracterización antes de tocarlos:** ampliar primero las pruebas existentes de `AuthService` y `TasksService` para comprobar que cada método devuelve sin transformación el response simulado de Axios, además de las aserciones actuales de URL, verbo, payload, timeout, query `owner` y encabezado `Authorization: Bearer`. Ejecutar `npm test`, `npm run test:coverage` y `npm run build` antes de actualizar; registrar el baseline. Tras actualizar, repetir esos mismos comandos y `npm run audit:workshop`. Mantener los thresholds de 85% en statements, branches, functions y lines.

**Riesgos funcionales y mitigación:** versiones incompatibles podrían romper la compilación o la ejecución de tests; mantener Angular alineado, Vitest/coverage compatibles y comparar contra el baseline limita ese riesgo. Los tests HTTP usan mocks y no validan disponibilidad de backends reales; la comprobación de integración queda fuera de esta actualización de paquetes.
