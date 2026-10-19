# Plan de corrección

## Alcance y selección

Se incluyen H-01 a H-07 porque figuran como hallazgos confirmados y pendientes en `HALLAZGOS.md`. H-01 se prioriza por los avisos altos de dependencias; H-02 y H-03 por los riesgos de seguridad; H-04 a H-07 porque son problemas verificables de responsabilidades, tipos, cobertura y complejidad. H-08 no se selecciona: su descripción indica “No encontrado”, aunque su columna de estado diga “Pendiente”.

Las pruebas indicadas se escribirán primero con Vitest, el runner existente en entorno `node`, antes de tocar la implementación correspondiente. Se usarán mocks y APIs disponibles; no se propone añadir dependencias de prueba. Los cambios se harán por pasos revisables y se buscará cobertura igual o superior al 85% del código modificado.

## H-01 — Dependencias directas vulnerables según auditoría

**Hallazgo de HALLAZGOS.md:** H-01, avisos de severidad alta para `axios` 0.31.0 y `lodash` 4.17.21; la auditoría también reportó dependencias transitivas vulnerables.

**Problema:** actualizar a ciegas puede introducir incompatibilidades; `npm audit fix --force` propone versiones fuera de los rangos actuales. Mantener versiones afectadas conserva los avisos verificados.

**Cambio propuesto:** revisar los avisos vigentes y actualizar a versiones compatibles sin avisos. No ejecutar una actualización forzada sin revisar sus cambios de rango. Evaluar retirar Lodash reemplazando `merge` por una combinación nativa adecuada para las preferencias planas actuales; conservarlo si se demuestra que hace falta la semántica de merge profundo. Mantener la forma de las llamadas HTTP y ejecutar la auditoría después del cambio.

**Archivos a tocar:** `package.json`, `package-lock.json`; si se elimina Lodash, `src/app/login/login.component.ts`.

**Prueba de caracterización antes de tocarlos:** crear o ampliar `src/app/login/login.component.spec.ts` y `src/app/dashboard/dashboard.component.spec.ts` para registrar el payload del POST, el GET con query `owner` y encabezado Bearer, y la carga/formato de tareas. Añadir un caso para la combinación de preferencias, en particular los valores por defecto que sobreviven cuando no se guardan. Ejecutar esas pruebas y `npm run audit:workshop` antes de actualizar.

## H-02 — Token de sesión almacenado en `localStorage`

**Hallazgo de HALLAZGOS.md:** H-02, token persistente y accesible a JavaScript del mismo origen.

**Problema:** si código JavaScript no confiable se ejecuta en la aplicación, puede leer y reutilizar el token. Moverlo a `sessionStorage` no impediría ese acceso; una cookie `HttpOnly` requeriría soporte del backend y queda fuera del contrato y alcance actuales.

**Cambio propuesto:** centralizar la sesión en `SessionService` y mantener el token solo en memoria durante la sesión activa. El servicio expondrá operaciones tipadas para establecer, consultar y limpiar la sesión. Se conserva el header `Authorization: Bearer {token}` y el flujo login-dashboard-logout; tras una recarga completa se pedirá iniciar sesión de nuevo. Esto reduce la persistencia, pero no protege contra JavaScript malicioso mientras la aplicación está activa. La preferencia y los datos no secretos podrán mantener su persistencia actual, centralizada en el servicio.

**Archivos a tocar:** crear `src/app/services/session.service.ts` y `src/app/services/session.service.spec.ts`; modificar `src/app/login/login.component.ts`, `src/app/dashboard/dashboard.component.ts` y sus pruebas. Actualizar la nota de almacenamiento en `docs/ENDPOINTS.md` al implementar, sin cambiar ningún endpoint, método, payload, query ni header HTTP.

**Prueba de caracterización antes de tocarlos:** en pruebas de login y dashboard, fijar el comportamiento actual: login guarda token y usuario, el GET de tareas usa ese token como Bearer y logout elimina token/usuario sin eliminar preferencias. Al implementar la alternativa en memoria, conservar las aserciones del header y navegación, y sustituir las aserciones de persistencia por otras que comprueben que el token no se escribe en almacenamiento y que logout lo invalida.

## H-03 — Mensaje dinámico enlazado mediante `[innerHTML]`

**Hallazgo de HALLAZGOS.md:** H-03, mensajes de login con contenido del usuario y del error enlazados como HTML.

**Problema:** el uso de un sink HTML obliga a confiar en contenido dinámico y puede renderizar marcado no previsto. Angular sanitiza el binding por defecto, por lo que el código revisado no demuestra ejecución de JavaScript; no se necesita preservar formato HTML para comunicar el error.

**Cambio propuesto:** guardar mensajes como texto plano y mostrarlos con interpolación Angular. No concatenar etiquetas HTML ni usar `DomSanitizer`; presentar el error con mensajes consistentes que no expongan detalles internos del backend.

**Archivos a tocar:** `src/app/login/login.component.ts`, `src/app/login/login.component.html`, `src/app/login/login.component.spec.ts`.

**Prueba de caracterización antes de tocarlos:** cubrir mensajes para usuario vacío, contraseña vacía, respuesta sin token y error del servidor, con un usuario y mensaje que contengan texto parecido a etiquetas. Registrar el contenido que debe comunicarse al usuario y añadir la expectativa de que esos datos se traten como texto, no como marcado. El template debe quedar con interpolación y pasar `npm run build`.

## H-04 — Componentes acoplados a HTTP, sesión, URLs y navegación

**Hallazgo de HALLAZGOS.md:** H-04, los componentes realizan llamadas HTTP, manipulan sesión, contienen URLs y gestionan navegación.

**Problema:** un cambio de endpoint o de sesión afecta directamente a componentes visuales, y las responsabilidades mezcladas dificultan probar cada operación.

**Cambio propuesto:** crear `AuthService` para el POST de autenticación y `TasksService` para el GET de tareas; `SessionService` será el único propietario del estado de sesión/almacenamiento. Mantener validación de formulario y navegación en los componentes. Centralizar las URLs en `src/environments/environment.ts`, de acuerdo con las buenas prácticas existentes. No introducir otra biblioteca HTTP ni cambiar `POST /auth/login`, su JSON y timeout, `GET /api/tasks?owner={username}`, el header Bearer o las formas de respuesta consumidas.

**Archivos a tocar:** crear `src/environments/environment.ts`; crear `src/app/services/auth.service.ts`, `src/app/services/tasks.service.ts` y sus pruebas; modificar `src/app/login/login.component.ts`, `src/app/dashboard/dashboard.component.ts` y sus pruebas; reutilizar `src/app/services/session.service.ts` del H-02 si se implementa en el mismo ciclo.

**Prueba de caracterización antes de tocarlos:** probar con Axios simulado que login hace POST a la URL/ruta y con el body actual, y que una respuesta con token navega al dashboard. Probar que el dashboard envía el usuario en `owner`, adjunta el token Bearer, filtra `ARCHIVED`, etiqueta y ordena tareas; verificar también el redirect sin token y el logout. Estas pruebas fijan el contrato antes de mover las llamadas a servicios.

## H-05 — Uso extensivo de `any`

**Hallazgo de HALLAZGOS.md:** H-05, `any` en estado, respuestas, errores, tareas y utilidad de formato.

**Problema:** se pierden comprobaciones estáticas sobre los datos que atraviesan login, tareas y vistas, permitiendo errores de forma y acceso a propiedades inválidas.

**Cambio propuesto:** definir interfaces propias para request/response de login, usuario, preferencia y tarea; tipar el estado de los componentes y el resultado de `formatTaskLabel`. Manejar errores externos como `unknown` y estrecharlos mediante funciones auxiliares, sin convertirlos a `any`. Reutilizar esos tipos en `AuthService` y `TasksService`.

**Archivos a tocar:** crear `src/app/models/auth.model.ts`, `src/app/models/task.model.ts` y `src/app/models/session.model.ts` (o archivos equivalentes agrupados si son pequeños); modificar `src/app/login/login.component.ts`, `src/app/dashboard/dashboard.component.ts` y `src/app/utils/legacy-format.ts`; actualizar sus pruebas y las de servicios.

**Prueba de caracterización antes de tocarlos:** ampliar `src/app/utils/legacy-format.spec.ts` con prioridad/owner ausentes y tarea nula; en las pruebas de login y dashboard, fijar las formas observadas de respuesta y los campos consumidos. Después del tipado, ejecutar pruebas y build para detectar incompatibilidades sin alterar el contrato de los endpoints.

## H-06 — Cobertura de pruebas limitada a una utilidad

**Hallazgo de HALLAZGOS.md:** H-06, solo `formatTaskLabel` tiene prueba; no hay pruebas de los flujos de autenticación, tareas o logout.

**Problema:** los cambios de seguridad y arquitectura podrían romper el flujo real sin que la prueba existente lo detecte.

**Cambio propuesto:** ampliar gradualmente las pruebas unitarias con Vitest y mocks, empezando por los caminos funcionales y errores. No añadir un entorno de navegador ni dependencias sin necesidad; probar la lógica de componentes/servicios en el entorno `node` configurado y comprobar la compilación de templates con el build de Angular. Configurar umbrales de cobertura para el código modificado solo cuando la suite mida el flujo de forma fiable, manteniendo la meta de REGLAS.md.

**Archivos a tocar:** crear `src/app/login/login.component.spec.ts`, `src/app/dashboard/dashboard.component.spec.ts` y pruebas para los servicios que se extraigan; ampliar `src/app/utils/legacy-format.spec.ts`; posiblemente `vitest.config.ts` para umbrales justificados.

**Prueba de caracterización antes de tocarlos:** antes de refactorizar, escribir pruebas que cubran login válido, validaciones vacías, respuesta sin token, error HTTP, carga de tareas con y sin token, filtrado/orden, logout y formato de etiqueta. Ejecutar `npm test` y `npm run test:coverage`, guardar el baseline y usarlo para verificar la meta de al menos 85% en el código que se modifique.

## H-07 — Condicionales anidados en la validación del login

**Hallazgo de HALLAZGOS.md:** H-07, validación de usuario y contraseña con ramas anidadas.

**Problema:** el flujo de validación y autenticación requiere seguir varios niveles de `if`, lo que hace más difícil razonar sobre estados y salidas.

**Cambio propuesto:** usar retornos anticipados para usuario vacío y contraseña vacía; ejecutar la petición solo después de ambas validaciones. Mantener una única ruta de limpieza de `busy` con `finally` y evitar duplicar mensajes o llamadas.

**Archivos a tocar:** `src/app/login/login.component.ts` y `src/app/login/login.component.spec.ts`.

**Prueba de caracterización antes de tocarlos:** probar que usuario vacío muestra su validación y no llama al endpoint; contraseña vacía muestra su validación y tampoco llama; credenciales no vacías realizan exactamente una petición con el body establecido; tanto éxito como error restablecen `busy`. Estas pruebas protegen el comportamiento al aplanar las ramas.

## Orden sugerido

1. Escribir pruebas de caracterización comunes para los flujos y guardar el baseline.
2. Remediar H-01 con actualizaciones compatibles verificadas, sin `--force` automático.
3. Implementar H-02 y H-03 como cambios de seguridad acotados, manteniendo los contratos HTTP.
4. Extraer servicios y centralizar configuración/sesión para H-04.
5. Aplicar tipado estricto y simplificar validación para H-05 y H-07.
6. Ejecutar la suite, build, auditoría y cobertura; ajustar las pruebas de flujo y verificar la meta de cobertura de REGLAS.md.
