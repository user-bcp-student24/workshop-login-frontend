# Contrato de endpoints observado

Contrato reconstruido desde las llamadas del frontend. Describe lo que el cliente envía y consume; no sustituye la especificación del backend.

## Autenticación

- Método y ruta: `POST http://localhost:8080/auth/login`
- Timeout del cliente: 5000 ms.
- JSON enviado: `username`, `password` y `client` con valor `angular-workshop`.
- Respuesta que el cliente espera: `data.token` y `data.user`. El dashboard espera que el usuario tenga `username`; la vista también puede mostrar `displayName`.
- Al recibir un token, el frontend lo mantiene en memoria durante la sesión; guarda `workshop_user` y `workshop_preferences` en `localStorage`, y navega a `/dashboard`. Una recarga requiere iniciar sesión de nuevo.
- Si la respuesta no contiene token, muestra un mensaje. Ante error, intenta leer `response.data.message` o `message`.

## Consulta de tareas

- Método y ruta: `GET http://localhost:8000/api/tasks?owner={username}`.
- Autorización: encabezado `Authorization: Bearer {token}`.
- Respuesta que el cliente consume: un arreglo en `data`; cada elemento usa al menos `status`, `priority`, `owner`, `title` y `description`.
- El dashboard excluye de la lista visible las tareas con estado `ARCHIVED`, calcula una etiqueta desde `priority` y `owner`, y ordena las visibles por prioridad descendente.
- Si no existe `workshop_token`, el cliente navega a `/login`. Los errores se muestran en el dashboard.

## Cierre de sesión

- No se observa una llamada HTTP de logout.
- El cliente elimina `workshop_token` y `workshop_user` de `localStorage` y navega a `/login`.
- `workshop_preferences` se conserva.

## Evidencia en el frontend

- Login, almacenamiento y navegación: `src/app/login/login.component.ts`.
- Lectura de sesión, consulta de tareas y logout: `src/app/dashboard/dashboard.component.ts`.
