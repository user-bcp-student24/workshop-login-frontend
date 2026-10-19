# Contrato de endpoints

Este documento describe lo que el frontend actual envía y consume. Los ejemplos de respuesta son ilustrativos, no respuestas capturadas de un backend real. Los endpoints apuntan a servicios locales de laboratorio; no se deben interpretar como configuración de producción.

## 1. Autenticación — `POST /auth/login`

### 1. Quién lo llama

El usuario activa `LoginComponent.login()`. El componente valida campos, delega el request a `AuthService.login()` y recibe la respuesta de Axios. La URL base viene de `src/environments/environment.ts` (`authApiUrl`).

### 2. Qué envía

URL completa: `http://localhost:8080/auth/login`.

| Parte | Campo | Valor o comportamiento |
|---|---|---|
| Método | — | `POST` |
| Headers configurados por `AuthService` | — | Ninguno explícito. El servicio pasa un objeto JavaScript como body a Axios. |
| Body | `username` | Texto ingresado en el campo Usuario. |
| Body | `password` | Texto ingresado en el campo Contraseña. |
| Body | `client` | Constante `angular-workshop`. |
| Configuración | `timeout` | 5000 ms. |

Ejemplo con credenciales de laboratorio documentadas en `README.md`:

```json
{
	"username": "student",
	"password": "Workshop123!",
	"client": "angular-workshop"
}
```

El código no construye un header `Authorization` para login. No fija un `Content-Type` manualmente; la serialización del objeto corresponde a Axios.

### 3. Qué espera recibir en éxito

El componente acepta una respuesta que Axios resuelva. No compara `response.status` con un código concreto. Con la política por defecto de Axios se resuelven respuestas 2xx; el código no establece cuál de esos códigos devuelve el backend.

| Campo en `response.data` | Tipo declarado | Uso |
|---|---|---|
| `token` | `string`, opcional en la interfaz | Si es truthy, se guarda en memoria por `SessionService` y habilita la navegación a `/dashboard`. |
| `user` | `SessionUser`, opcional | Se persiste como `workshop_user`; si falta o es null, el componente pasa `{}`. `username` y `displayName` son opcionales en el modelo. |

Ejemplo ilustrativo; el valor entre `<...>` es un marcador y no un token literal:

```json
{
	"token": "<token emitido por el backend>",
	"user": {
		"username": "student"
	}
}
```

Con token válido, el componente guarda también `workshop_preferences` y navega a `/dashboard`. La respuesta sin token no se considera login exitoso.

### 4. Cómo reacciona ante errores

| Caso | Reacción del código y UI |
|---|---|
| Usuario vacío o solo espacios | No hace request. Muestra `Ingrese un usuario.` |
| Contraseña vacía o solo espacios | No hace request. Muestra `Ingrese una contraseña.` |
| HTTP no exitoso, incluidas credenciales rechazadas | Axios rechaza la promesa; se muestra `No se pudo autenticar. Verifique el usuario y la contraseña.`. No se presenta el detalle recibido del backend; el error se envía a `console.error`. |
| Red/CORS/conexión sin respuesta | `getSafeHttpErrorMessage()` reconoce un error Axios sin `response` y muestra `No se pudo conectar con el servicio.` |
| Timeout | `AuthService` configura 5000 ms. Si Axios produce un error sin response, se muestra el mismo mensaje de conexión. |
| Respuesta resuelta sin `data.token` truthy | Muestra `El backend respondió sin token.` y no navega. |
| Respuesta resuelta con `data` ausente o forma inesperada | El acceso a `response.data.token` puede lanzar; el `catch` muestra el fallback genérico de autenticación. |
| Token presente pero `user` ausente | Continúa como éxito y guarda `{}` como usuario; el dashboard puede mostrar el username vacío. |
| Falla la navegación luego de guardar token | La navegación está dentro del `try`; si rechaza, el `catch` muestra el fallback de autenticación. La sesión ya pudo quedar establecida en memoria. |

Al terminar la petición, `finally` restablece `busy` dentro de `NgZone` y llama `detectChanges()`, para que la UI vuelva a habilitar el botón y muestre el mensaje.

### 5. Notas de seguridad

- El request contiene la contraseña y el endpoint usa HTTP local (`localhost`), sin TLS configurado por el frontend. Es un laboratorio; no enviar credenciales reales ni exponer este endpoint en producción.
- El token vive en memoria mediante `SessionService`; no se escribe en `localStorage`. Una recarga completa requiere autenticarse de nuevo.
- `workshop_user` y `workshop_preferences` sí se guardan en `localStorage`.
- Los mensajes se muestran con interpolación Angular, no con `[innerHTML]`. Los detalles del error no se muestran al usuario, aunque el objeto se registra en consola.

## 2. Consulta de tareas — `GET /api/tasks`

### 1. Quién lo llama

`DashboardComponent.ngOnInit()` obtiene token y usuario desde `SessionService`. Si tiene token, delega la llamada a `TasksService.getTasks(owner, token)`. La URL base viene de `src/environments/environment.ts` (`tasksApiUrl`).

### 2. Qué envía

URL completa: `http://localhost:8000/api/tasks?owner={username}`.

| Parte | Campo | Valor o comportamiento |
|---|---|---|
| Método | — | `GET` |
| Query param | `owner` | `user.username` o cadena vacía si no existe. El servicio concatena el valor a la URL; no aplica encoding explícito. |
| Header | `Authorization` | `Bearer {token}` tomado de `SessionService`. |
| Body | — | No se pasa body. |
| Configuración | `timeout` | El servicio no configura uno. No hay una duración de timeout definida en el código de la app. |

Ejemplo con usuario de laboratorio y token representativo:

```http
GET /api/tasks?owner=student
Authorization: Bearer <token en memoria>
```

### 3. Qué espera recibir en éxito

Al igual que en login, el componente no valida un código de estado específico; procesa la respuesta que Axios resuelva. Con la política por defecto de Axios esto corresponde a 2xx, pero el status exacto del backend no está especificado por el frontend.

`response.data` debe ser iterable como `Task[]`.

| Campo de cada tarea | Tipo declarado | Uso |
|---|---|---|
| `title` | `string`, opcional | Título mostrado en la tarjeta. |
| `description` | `string`, opcional | Descripción mostrada en la tarjeta. |
| `status` | `string`, opcional | Se usa para filtrar `ARCHIVED`, crear clase CSS y mostrar etiqueta traducida cuando está reconocida. |
| `priority` | `string`, opcional | Se usa para ordenar tareas en orden descendente por comparación de strings. |
| `owner` | `string`, opcional | Se usa junto con priority para crear la etiqueta local. |
| `label` | `string`, opcional/client-side | No es necesario que venga del backend: el dashboard lo calcula con `formatTaskLabel()`. |

Ejemplo de una tarea basado en los valores usados por la prueba del servicio/dashboard:

```json
[
	{
		"title": "Urgent",
		"status": "IN_PROGRESS",
		"priority": "URGENT",
		"owner": "student"
	}
]
```

El dashboard excluye tareas con status `ARCHIVED`, añade `label`, ordena las visibles y muestra una vista vacía si el arreglo no contiene tareas.

### 4. Cómo reacciona ante errores

| Caso | Reacción del código y UI |
|---|---|
| No hay token en memoria (por ejemplo, después de recargar) | No hace request; navega a `/login`. El usuario se carga desde `workshop_user` si está guardado, pero no restaura token. |
| Token inválido/revocado (por ejemplo, backend responde 401/403) | Axios rechaza; se muestra `No se pudo cargar el dashboard.`. El código no borra la sesión ni redirige automáticamente. |
| Otro status HTTP no exitoso | Mismo fallback visible: `No se pudo cargar el dashboard.`. No se expone `response.data.detail`. |
| Error de red sin response | Se muestra `No se pudo conectar con el servicio.` |
| Timeout | No hay timeout explícito en `TasksService`; por tanto la UI no define un plazo propio tras el cual deje de cargar. Mientras la promesa siga pendiente, `loading` sigue true. |
| Body resuelto no iterable o inesperado | Errores al iterarlo/procesarlo son capturados; se muestra el fallback correspondiente y `loading` pasa a false. |
| Campos opcionales ausentes | No necesariamente falla: `formatTaskLabel()` usa `NORMAL` y `SIN-ASIGNAR`; título/descripción pueden renderizarse vacíos, status desconocido se muestra tal como llega o vacío. |

En éxito y error, el componente actualiza estado dentro de `NgZone` y llama `ChangeDetectorRef.detectChanges()`.

### 5. Notas de seguridad

- El token Bearer solo vive en memoria, pero está disponible para JavaScript mientras dure la sesión. No se persiste para restaurarlo al recargar.
- El request se dirige a HTTP local; no hay TLS configurado en el frontend. No desplegar como está ni usar tokens reales fuera del laboratorio.
- El mensaje visible es genérico; el detalle de error del backend no se renderiza en la UI.
- `owner` se concatena a la URL sin encoding explícito. Confirmar si usernames pueden incluir caracteres reservados de URL antes de definir si el cliente debe codificarlo.

## Flujo de sesión relacionado (no es un endpoint)

No existe llamada HTTP de logout. `DashboardComponent.logout()` llama `SessionService.clearSession()`, que elimina el token en memoria y `workshop_user` de `localStorage`, conserva `workshop_preferences` y navega a `/login`.

## Preguntas abiertas para el backend

- ¿Cuál es el status HTTP exacto de éxito para login y tareas (por ejemplo, 200)? El cliente acepta respuestas resueltas por Axios, pero no comprueba un status concreto.
- ¿`user` puede omitirse en login y, si no, cuáles son sus campos garantizados? El frontend admite ausencia y usa `{}`.
- ¿Qué esquema y tipos garantiza cada elemento de tareas? El modelo TypeScript marca todos sus campos opcionales.
- ¿Debe configurarse un timeout para la consulta de tareas? Hoy no hay uno explícito y la UI puede permanecer cargando mientras la promesa no resuelva.
- ¿Se permiten caracteres reservados en `username`? El query param `owner` no se codifica explícitamente.
- La nota antigua de logout sobre `workshop_token` en `localStorage` no coincide con `SessionService`; el código actual mantiene ese token solo en memoria.

## Documentos y código consultados

- `README.md` — servicios locales y credenciales de laboratorio.
- `docs/GOOD_PRACTICES.md` — servicios, configuración, sesión y manejo de errores.
- `TESTING_ANTES.md` — catálogo y alcance de pruebas documentadas.
- `src/environments/environment.ts` — URLs base.
- `src/app/services/auth.service.ts`, `src/app/services/tasks.service.ts` — requests y configuración Axios.
- `src/app/models/auth.model.ts`, `src/app/models/task.model.ts`, `src/app/models/session.model.ts` — formas tipadas.
- `src/app/login/login.component.ts`, `src/app/login/login.component.html` — flujo de autenticación, errores y UI.
- `src/app/dashboard/dashboard.component.ts`, `src/app/dashboard/dashboard.component.html` — consulta, presentación de tareas, errores y logout.
- `src/app/services/session.service.ts` — token, usuario y preferencias.
- `src/app/utils/http-error.ts` — clasificación del mensaje de error.
- `src/app/services/auth.service.spec.ts`, `src/app/services/tasks.service.spec.ts` — expectativas del contrato HTTP.
