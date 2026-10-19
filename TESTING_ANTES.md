# Plan de pruebas unitarias

Este documento enumera la suite unitaria que se puede ejecutar en el frontend. Distingue las pruebas que ya existen de los casos recomendados que todavía no están implementados. No es un reporte de ejecución.

## Ejecución

Requisito del proyecto: Node.js 22.12 o superior y dependencias instaladas.

```bash
npm test
npm run test:coverage
```

Vitest usa el entorno `node` y encuentra `src/**/*.spec.ts`. El gate de cobertura pide al menos 85% en statements, branches, functions y lines. Las llamadas HTTP de estas pruebas deben usar mocks; no requieren que los backends de autenticación o tareas estén levantados.

## Suite existente

| Archivo | Casos cubiertos actualmente |
|---|---|
| `src/app/login/login.component.spec.ts` | POST de login con URL, payload y timeout; almacenamiento del token solo en sesión; persistencia de usuario/preferencias; validaciones de credenciales vacías; respuesta sin token; error sin filtrar usuario/detalle ni renderizar HTML; reset de `busy` en éxito/error; respuesta sin usuario; actualización de estado dentro de `NgZone` y `ChangeDetectorRef`. |
| `src/app/dashboard/dashboard.component.spec.ts` | GET de tareas con query `owner` y Bearer; exclusión de `ARCHIVED`; etiqueta y orden por prioridad, incluyendo empate; logout; sesión en memoria no restaurada tras recarga; redirección cuando falta token; mensaje genérico ante error del backend. |
| `src/app/services/session.service.spec.ts` | Token en memoria y no en almacenamiento; usuario/preferencias persistidos; limpieza de sesión sin borrar preferencias; defaults de preferencias; JSON corrupto, formas inválidas y tipos incorrectos en el usuario guardado. |
| `src/app/services/auth.service.spec.ts` | Verbo, URL, body y timeout de login. |
| `src/app/services/tasks.service.spec.ts` | Verbo, URL/query y encabezado `Authorization: Bearer`. |
| `src/app/utils/http-error.spec.ts` | Mensaje genérico para fallo de red; fallback para errores HTTP o desconocidos sin revelar detalles. |
| `src/app/utils/legacy-format.spec.ts` | Formato normal, tarea nula y prioridad/owner ausentes. |

La última ejecución registrada en esta sesión fue 27 pruebas aprobadas en 7 archivos. Para el resultado actual, volver a ejecutar `npm test`; no asumir que este documento ejecutó pruebas.

## Casos adicionales recomendados

Estos casos complementan las pruebas existentes; añádelos a las suites indicadas para evitar archivos de test duplicados.

### AuthService

- Verificar que `login()` devuelve sin transformar la misma respuesta Axios recibida, además de comprobar el request existente.
- Verificar que un rechazo de Axios se propaga al consumidor, sin convertir el error dentro del servicio.

### TasksService

- Verificar que `getTasks()` devuelve la respuesta Axios sin transformar.
- Verificar que un rechazo de Axios se propaga al consumidor.

### LoginComponent

- Verificar que la navegación a `/dashboard` ocurre solo cuando la respuesta tiene token.
- Verificar que, ante un error HTTP con un mensaje interno, el mensaje visible es el fallback genérico y no incluye ese detalle.
- Verificar que el estado de carga se actualiza en la zona y dispara detección también en respuesta exitosa y respuesta sin token; la regresión del error ya cubre el camino fallido.

### DashboardComponent

- Verificar que el estado cambia a carga terminada al recibir una lista vacía.
- Verificar que un error de red muestra el mensaje de conexión genérico y termina la carga.
- Verificar que una respuesta vacía produce lista visible vacía sin error.

### SessionService

- Verificar que errores de `localStorage` al leer o guardar se manejan según la política deseada. Si se decide tolerarlos, definir primero el resultado esperado; no ocultar fallos de escritura silenciosamente sin una decisión explícita.
- Verificar que `clearSession()` invalida un token ya establecido y que una sesión nueva no puede reutilizarlo.

### getSafeHttpErrorMessage

- Verificar un error Axios con respuesta y sin detalle, que debe usar el fallback.
- Verificar un valor no-error (por ejemplo, `null` o una cadena) para confirmar que tampoco expone contenido arbitrario.

### formatTaskLabel

- Verificar prioridad/owner en minúsculas, strings vacíos y valores faltantes, manteniendo los fallbacks definidos.

## Gates no unitarios

Para una validación completa posterior, ejecutar también `npm run build`. La auditoría de dependencias se ejecuta con `npm run audit:workshop` y es un gate de seguridad separado; no sustituye las pruebas unitarias ni debe ocultarse si falla.
