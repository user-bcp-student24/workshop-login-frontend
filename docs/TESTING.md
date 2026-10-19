# Pruebas unitarias de login y tareas

## Alcance

La suite usa Vitest en entorno `node` y simula Axios y `localStorage`. No llama a los backends reales ni requiere que estén levantados. El código fuente completo y ejecutable de cada prueba vive en los archivos indicados más abajo; los fragmentos de esta guía ilustran casos clave, no reemplazan esas fuentes.

| flujo | caso | tipo | resultado esperado |
|---|---|---|---|
| Login | Credenciales válidas, recibe token y usuario | Camino feliz | Envía `POST /auth/login` con username, password, `client: angular-workshop` y timeout 5000 ms; guarda token en memoria, usuario/preferencias según el contrato y navega a `/dashboard`. |
| Login → tareas | Login seguido de consulta al dashboard | Camino feliz | El `GET /api/tasks?owner=student` recibe `Authorization: Bearer token-1`; tareas visibles quedan cargadas, etiquetadas y ordenadas. El token no se escribe en `localStorage`. |
| Login | Usuario vacío o solo espacios | Borde | No envía POST; muestra `Ingrese un usuario.` y no deja el botón ocupado. |
| Login | Contraseña vacía o solo espacios | Borde | No envía POST; muestra `Ingrese una contraseña.` y no deja el botón ocupado. |
| Login | Respuesta resuelta sin token | Borde | Muestra `El backend respondió sin token.`; no establece sesión ni navega al dashboard. |
| Login | Respuesta exitosa sin `data` | Error / respuesta inesperada | El acceso a `data.token` cae al catch; muestra el fallback genérico de autenticación y limpia `busy`. |
| Login | Backend sin respuesta (`ERR_NETWORK`) | Error / backend caído | Muestra `No se pudo conectar con el servicio.` y limpia `busy`. Caso Axios simulado; no comprueba disponibilidad real del puerto 8080. |
| Login | Axios timeout `ECONNABORTED` | Error / timeout | Muestra `No se pudo conectar con el servicio.` y limpia `busy`. El test simula el error; no espera 5 segundos reales. |
| Login | Error HTTP con detalle interno | Error / seguridad | Muestra el mensaje genérico, no el detalle del backend ni texto HTML suministrado en el error. |
| Login | Fallo de navegación luego de guardar token | Error | Muestra el fallback genérico y limpia `busy`; la sesión ya puede haberse establecido en memoria antes de fallar la navegación. |
| Tareas | Respuesta con tareas activas y archivadas | Camino feliz | Filtra `ARCHIVED`, genera etiquetas y ordena las tareas visibles; apaga `loading`. |
| Tareas | Respuesta `data: []` | Borde | No presenta error, deja lista vacía y apaga `loading`. La plantilla muestra el estado vacío. |
| Tareas | Token ausente tras recarga | Borde / sesión | No envía GET y navega a `/login`; la sesión de token no se restaura desde almacenamiento. |
| Tareas | Token inválido; backend responde 401 | Error / autorización | Muestra `No se pudo cargar el dashboard.`, apaga `loading`, conserva la sesión local y no redirige automáticamente. |
| Tareas | Backend sin respuesta (`ERR_NETWORK`) | Error / backend caído | Muestra `No se pudo conectar con el servicio.`, apaga `loading` y conserva la sesión. Caso Axios simulado; no comprueba disponibilidad real del puerto 8000. |
| Tareas | Respuesta resuelta con body no iterable | Error / respuesta inesperada | La iteración falla, el catch muestra el fallback genérico y apaga `loading`. |

## Código de los tests

Fuentes ejecutables (no copiar estos casos a una segunda suite):

- `src/app/login/login.component.spec.ts`: 13 casos de login, bordes, errores y detección Angular.
- `src/app/dashboard/dashboard.component.spec.ts`: 9 casos de consulta, sesión y errores.
- `src/app/flows/auth-tasks.flow.spec.ts`: 1 caso integrando login, token en memoria y consulta de tareas con servicios reales y Axios simulado.
- `src/app/services/auth.service.spec.ts`: request de autenticación, body y timeout.
- `src/app/services/tasks.service.spec.ts`: query y encabezado Bearer.
- `src/app/services/session.service.spec.ts`: token en memoria, persistencia/limpieza de usuario y preferencias.
- `src/app/utils/http-error.spec.ts`: mensaje de red y fallback de errores.
- `src/app/utils/legacy-format.spec.ts`: formato de etiqueta y valores ausentes.

Extracto del test del flujo feliz; la implementación completa está en `src/app/flows/auth-tasks.flow.spec.ts`:

```ts
it('logs in, carries the in-memory token to the tasks request, and displays tasks', async () => {
  const tasks = [
    { title: 'Urgent', status: 'IN_PROGRESS', priority: 'URGENT', owner: 'student' }
  ];
  const post = vi.spyOn(axios, 'post').mockResolvedValue({
    data: { token: 'token-1', user: { username: 'student' } }
  } as never);
  const get = vi.spyOn(axios, 'get').mockResolvedValue({ data: tasks } as never);
  const router = { navigate: vi.fn().mockResolvedValue(true) } as unknown as Router;
  const zone = { run: (callback: () => unknown) => callback() } as unknown as NgZone;
  const changeDetector = { detectChanges: vi.fn() } as unknown as ChangeDetectorRef;
  const session = new SessionService();
  const login = new LoginComponent(router, session, new AuthService(), zone, changeDetector);
  login.username = 'student';
  login.password = 'Workshop123!';

  await login.login();

  const dashboard = new DashboardComponent(
    router,
    changeDetector,
    zone,
    session,
    new TasksService()
  );
  await dashboard.ngOnInit();

  expect(post).toHaveBeenCalledWith(
    'http://localhost:8080/auth/login',
    { username: 'student', password: 'Workshop123!', client: 'angular-workshop' },
    { timeout: 5000 }
  );
  expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  expect(get).toHaveBeenCalledWith('http://localhost:8000/api/tasks?owner=student', {
    headers: { Authorization: 'Bearer token-1' }
  });
  expect(dashboard.visibleTasks.map((task) => task.title)).toEqual(['Urgent']);
  expect(dashboard.loading).toBe(false);
  expect(storage.has('workshop_token')).toBe(false);
});
```

Extracto exacto de la prueba de token inválido en `src/app/dashboard/dashboard.component.spec.ts`:

```ts
it('shows a generic error for an invalid token without clearing the session', async () => {
  const session = new SessionService();
  session.setSession('expired-token', { username: 'student' });
  vi.spyOn(axios, 'get').mockRejectedValue({
    isAxiosError: true,
    response: { status: 401, data: { detail: 'invalid token' } }
  });
  const { component, router } = createDashboard(session);

  await component.ngOnInit();

  expect(component.error).toBe('No se pudo cargar el dashboard.');
  expect(component.loading).toBe(false);
  expect(session.getToken()).toBe('expired-token');
  expect(router.navigate).not.toHaveBeenCalled();
});
```

El caso de backend caído y el de timeout de login también están en `login.component.spec.ts`; el caso de backend de tareas caído está en `dashboard.component.spec.ts`. Sus respuestas son mocks de Axios con `ERR_NETWORK` o `ECONNABORTED`, respectivamente.

## Comandos y resultados ejecutados

Directorio de trabajo del repositorio: `C:\Users\Usuario\Documents\T34107-luis-sanchez\reqflow-workspace\workshop-login-frontend`.

| comando ejecutado | código de salida | resultado real |
|---|---:|---|
| `npm --prefix "C:\Users\Usuario\Documents\T34107-luis-sanchez\reqflow-workspace\workshop-login-frontend" test` | 0 | Vitest: 8 archivos aprobados, 36 pruebas aprobadas. |
| `npm --prefix "C:\Users\Usuario\Documents\T34107-luis-sanchez\reqflow-workspace\workshop-login-frontend" run test:coverage` | 0 | 8 archivos, 36 pruebas; statements 88.76%, branches 88.88%, functions 88%, lines 88.76%. Se cumplieron los thresholds de 85% configurados en `vitest.config.ts`. |
| `npm --prefix "C:\Users\Usuario\Documents\T34107-luis-sanchez\reqflow-workspace\workshop-login-frontend" run build` | 0 | Angular compiló correctamente. |

Estos resultados corresponden a la ejecución tras añadir los tests de backend caído, timeout, token inválido, respuesta vacía y body no iterable. Los mocks verifican la reacción del frontend, no la operación real de los servicios externos.

## Fallos

Ninguno en la última ejecución de `npm test`, `npm run test:coverage` o `npm run build`.

## Pendientes

- `TasksService` no configura timeout. No existe un timeout de tareas que probar sin cambiar el comportamiento del producto; la suite no inventa uno.
- Los tests de backend caído, timeout y 401 son simulados. No se verificó una respuesta real de Quarkus ni de la API Python.
- El backend debe confirmar el status exacto de éxito y el esquema completo de las respuestas; el frontend no especifica esos contratos.

## Pruebas propuestas

- Cuando ambos backends estén disponibles, añadir una prueba de integración separada que confirme el contrato real de login y tareas; no sustituir ni volver frágiles los unit tests con red externa.
- Si se define un timeout para tareas en un cambio de producto, añadir una prueba de `TasksService` y una de UI que comprueben el mensaje y el fin de `loading` para ese timeout.
