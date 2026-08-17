# FitClase API — Flujos y casos de uso

> Descripción end-to-end de los principales flujos de negocio, flujos de seguridad y flujos de datos de la API FitClase.  
> Este documento está dirigido a desarrolladores backend y mobile que necesitan entender cómo funciona el sistema internamente.

---

## Tabla de contenidos

1. [Autenticación e identidad](#1-autenticación-e-identidad)
2. [Sincronización de usuario](#2-sincronización-de-usuario)
3. [Asignación de roles](#3-asignación-de-roles)
4. [Inscripción por invitación](#4-inscripción-por-invitación)
5. [Gestión de gimnasios](#5-gestión-de-gimnasios)
6. [Gestión de disciplinas](#6-gestión-de-disciplinas)
7. [Gestión de clases](#7-gestión-de-clases)
8. [Flujo de reservas](#8-flujo-de-reservas)
9. [Flujo de asistencia](#9-flujo-de-asistencia)
10. [Multi-tenancy y aislamiento por tenant](#10-multi-tenancy-y-aislamiento-por-tenant)
11. [Flujos de seguridad](#11-flujos-de-seguridad)
12. [Flujo de manejo de errores](#12-flujo-de-manejo-de-errores)
13. [Contratos de respuesta y seguridad](#13-contratos-de-respuesta-y-seguridad)

---

## 1. Autenticación e identidad

La API **no** implementa su propio sistema de usuario/contraseña. Delega la autenticación a **Firebase Authentication** y mantiene la fuente de verdad de roles y membresía de gimnasio en **PostgreSQL**.

```
App móvil
    │
    │ Inicio de sesión con Firebase SDK
    ▼
Firebase Auth
    │
    │ Devuelve Firebase ID Token
    ▼
App móvil
    │
    │ Petición HTTP con Authorization: Bearer <idToken>
    ▼
API
    │
    ├─ FirebaseAuthGuard
    │     └─ verifyIdToken(<idToken>)
    │           └─ decodedToken { uid, email, ... }
    │
    ├─ Cargar User desde PostgreSQL donde firebase_uid = uid
    │
    └─ request.user = { uid, id, email, name, role, gymId }
```

### Reglas importantes

- El token **solo prueba identidad**.
- `role` y `gymId` siempre provienen del registro de usuario en PostgreSQL.
- Los custom claims de Firebase se actualizan por conveniencia, pero el servidor **los ignora** para autorizar.
- El servidor nunca toma `uid` o `email` del body de la petición.

### Endpoints involucrados

- `POST /api/v1/users/sync` — crea o actualiza el registro local del usuario autenticado de Firebase.
- `GET /api/v1/users/me` — devuelve el perfil del usuario actual.

---

## 2. Sincronización de usuario

Se llama después de que un usuario inicia sesión o se registra. Garantiza que la base de datos local tenga una fila que coincida con el usuario de Firebase.

```
POST /api/v1/users/sync
Authorization: Bearer <idToken>
```

### Flujo

1. El guard verifica el token de Firebase y extrae `uid` y `email`.
2. El controlador llama a `UsersService.syncUser(uid, email, name, roleClaim?)`.
3. El servicio busca un usuario existente por `firebase_uid`.
4. Si no existe el usuario:
   - Se crea una nueva fila `User`.
   - Si el token de Firebase tiene un custom claim `role`, se usa ese rol; de lo contrario se usa `STUDENT`.
5. Si el usuario existe:
   - Se actualizan `email` y `name` si cambiaron en Firebase.
   - `role` y `gymId` **no** se modifican por este endpoint.

### Notas

- Este es el único lugar donde los custom claims de Firebase pueden influir en la BD, y solo en la primera creación.
- Después de la creación, la BD es la fuente autoritativa.

---

## 3. Asignación de roles

Solo un `SUPER_ADMIN` puede asignar roles directamente. Se usa típicamente para crear owners o teachers iniciales.

```
POST /api/v1/users/assign-role
Authorization: Bearer <idToken de SUPER_ADMIN>
Body: { "uid": "<firebase-uid>", "role": "OWNER_GYM", "gymId": "<gym-uuid>" }
```

### Flujo

1. `RolesGuard` verifica que el llamador sea `SUPER_ADMIN`.
2. El servicio valida el rol solicitado y el usuario objetivo.
3. Se actualiza el registro de BD con `role` y `gymId`.
4. Se actualizan los custom claims de Firebase para que coincidan, pero es solo un paso de conveniencia.

### Validación

- El rol `SUPER_ADMIN` puede asignarse sin `gymId`.
- Cualquier otro rol requiere un `gymId`.

---

## 4. Inscripción por invitación

Los estudiantes se unen a un gimnasio mediante una invitación creada por un `OWNER_GYM` o `SUPER_ADMIN`. Esto evita la auto-inscripción en gimnasios ajenos.

### 4.1 Crear invitación

```
POST /api/v1/invitations
Authorization: Bearer <idToken de OWNER_GYM o SUPER_ADMIN>
Body: { "gymId": "<gym-uuid>", "email": "student@example.com", "expiresInHours": 24 }
```

#### Flujo

1. Se autentica al llamador.
2. `RolesGuard` verifica el rol (`OWNER_GYM` o `SUPER_ADMIN`).
3. Si es `OWNER_GYM`, el servicio verifica que el gimnasio le pertenezca (`gym.ownerId === user.id`).
4. Se crea una fila `Invitation` con estado `PENDING`, el email solicitado y una fecha de expiración opcional.
5. Se devuelve el UUID de la invitación.

La respuesta es `InvitationResponseDto`. Su `id` sigue siendo el token de invitación; `usedByUserId` y otras columnas internas no se devuelven.

### 4.2 Aceptar invitación

```
POST /api/v1/users/auto-assign-student
Authorization: Bearer <idToken del estudiante>
Body: { "invitationToken": "<invitation-uuid>" }
```

#### Flujo

1. El guard verifica el token de Firebase del estudiante.
2. El servicio carga la invitación por su UUID.
3. La invitación debe:
   - existir,
   - estar en estado `PENDING`,
   - no estar expirada,
   - coincidir con el email de Firebase del estudiante.
4. El registro del estudiante en BD se crea o actualiza con:
   - `role = STUDENT`
   - `gymId = invitation.gymId`
5. La invitación se marca como `USED` y se vincula al estudiante.
6. Se actualizan los custom claims de Firebase como paso de conveniencia.

La respuesta pública es `AutoAssignStudentResponseDto` (`uid`, `email`, `role`, `gymId`). `uid` se conserva por compatibilidad móvil; el campo interno `firebase_uid` nunca se expone con ese nombre.

### Notas de seguridad

- El email de la invitación debe coincidir con el email de Firebase del estudiante autenticado.
- Una invitación usada o expirada no puede reutilizarse.
- El estudiante no puede elegir el gimnasio; se toma de la invitación.

---

## 5. Gestión de gimnasios

### 5.1 Crear gimnasio

```
POST /api/v1/gyms
Authorization: Bearer <idToken de OWNER_GYM o SUPER_ADMIN>
Body: { "name": "FitGym", "address": "...", "contact": "..." }
```

#### Flujo

1. `RolesGuard` verifica `OWNER_GYM` o `SUPER_ADMIN`.
2. El servicio crea el gimnasio con `ownerId = user.id` de la BD.
3. La respuesta devuelve un DTO sanitizado del gimnasio.

El DTO contiene únicamente `id`, `name`, `address`, `contact`, `ownerId`, `createdAt` y `updatedAt`; no incluye owner, usuarios, clases ni emails de propietarios.

### 5.2 Listar gimnasios

```
GET /api/v1/gyms
Authorization: Bearer <idToken>
```

#### Flujo

1. Solo `SUPER_ADMIN` puede listar todos los gimnasios.
2. La respuesta contiene una lista sanitizada sin detalles del owner, usuarios ni clases.

### 5.3 Obtener gimnasio

```
GET /api/v1/gyms/:id
Authorization: Bearer <idToken>
```

#### Flujo

1. Cualquier usuario autenticado puede solicitar un gimnasio.
2. El servicio verifica acceso:
   - `SUPER_ADMIN` — siempre permitido.
   - `OWNER_GYM` — permitido si `gym.ownerId === user.id`.
   - `TEACHER` / `STUDENT` — permitido si `gym.id === user.gymId`.
3. La respuesta devuelve un DTO sanitizado del gimnasio.

### 5.4 Actualizar / eliminar gimnasio

```
PATCH /api/v1/gyms/:id
DELETE /api/v1/gyms/:id
Authorization: Bearer <idToken de OWNER_GYM o SUPER_ADMIN>
```

#### Flujo

1. `RolesGuard` verifica el rol.
2. Si es `OWNER_GYM`, el servicio verifica la propiedad.
3. El gimnasio se actualiza o elimina.
4. La respuesta devuelve un DTO sanitizado (actualización) o `204` (eliminación).

---

## 6. Gestión de disciplinas

Las disciplinas pertenecen a un solo gimnasio y no pueden transferirse a otro (`gymId` es inmutable en la actualización).

### 6.1 Crear disciplina

```
POST /api/v1/disciplines
Authorization: Bearer <idToken de OWNER_GYM o SUPER_ADMIN>
Body: { "name": "Yoga", "description": "...", "gymId": "<gym-uuid>" }
```

#### Flujo

1. `RolesGuard` verifica `OWNER_GYM` o `SUPER_ADMIN`.
2. Si es `OWNER_GYM`, el `gymId` del llamador debe coincidir con el `gymId` del body.
3. El servicio verifica que no exista otra disciplina con el mismo nombre en ese gimnasio.
4. Se crea la disciplina.

### 6.2 Listar / obtener disciplinas

```
GET /api/v1/disciplines?gymId=<gym-uuid>&name=yoga
GET /api/v1/disciplines/:id
GET /api/v1/disciplines/gym/:gymId
Authorization: Bearer <idToken>
```

#### Flujo

1. `SUPER_ADMIN` puede leer cualquier disciplina.
2. Los demás roles solo pueden leer disciplinas donde `discipline.gymId === user.gymId`.
3. Las respuestas están sanitizadas: no incluyen el objeto `gym` ni la lista `classes`.

`DisciplineResponseDto` nunca incluye `deletedAt`.

### 6.3 Actualizar / eliminar disciplina

```
PATCH /api/v1/disciplines/:id
DELETE /api/v1/disciplines/:id
Authorization: Bearer <idToken de OWNER_GYM o SUPER_ADMIN>
```

#### Flujo

1. `RolesGuard` verifica el rol.
2. El servicio carga la disciplina y verifica el acceso por `gymId`.
3. En la actualización, cualquier `gymId` en el body se ignora para evitar transferencias.
4. En la eliminación, la disciplina no debe tener clases asociadas.

---

## 7. Gestión de clases

Las clases vinculan un gimnasio, una disciplina y un profesor. Tienen capacidad y horario.

### 7.1 Crear clase

```
POST /api/v1/classes
Authorization: Bearer <idToken de OWNER_GYM o SUPER_ADMIN>
Body: {
  "gymId": "<gym-uuid>",
  "disciplineId": "<discipline-uuid>",
  "teacherId": "<teacher-uuid>",
  "date": "2030-01-01",
  "startTime": "09:00",
  "endTime": "10:00",
  "capacity": 20
}
```

#### Flujo

1. `RolesGuard` verifica el rol.
2. El servicio verifica:
   - que el gimnasio exista y pertenezca al llamador (si es `OWNER_GYM`),
   - que la disciplina pertenezca al mismo gimnasio,
   - que el profesor exista, tenga rol `TEACHER` y pertenezca al mismo gimnasio,
   - que `startTime < endTime`.
3. Se crea la clase.
4. El controlador recarga la clase con sus relaciones y devuelve un DTO sanitizado.

### 7.2 Listar / obtener clases

```
GET /api/v1/classes?gymId=<gym-uuid>&date=2030-01-01&disciplineId=<uuid>&page=1&limit=10
GET /api/v1/classes/:id
GET /api/v1/classes/:id/teacher-classes
Authorization: Bearer <idToken>
```

#### Flujo

1. `SUPER_ADMIN` ve todas las clases.
2. `OWNER_GYM` solo ve clases de gimnasios que posee.
3. `TEACHER` / `STUDENT` solo ven clases de su propio gimnasio.
4. Un filtro explícito de `gymId` se valida contra los permisos del usuario.
5. Las respuestas están sanitizadas: no incluyen `reservations` ni el objeto completo `gym`.

Las clases exponen solo resúmenes controlados de `discipline` y `teacher`. Las listas no cargan reservas porque no calculan `availableSpots`.

### 7.3 Actualizar / eliminar clase

```
PATCH /api/v1/classes/:id
DELETE /api/v1/classes/:id
Authorization: Bearer <idToken de OWNER_GYM o SUPER_ADMIN>
```

#### Flujo

1. `RolesGuard` verifica el rol.
2. El servicio carga la clase y verifica la propiedad del gimnasio.
3. La disciplina y el profesor actualizados deben seguir perteneciendo al gimnasio de la clase.
4. La respuesta devuelve un DTO sanitizado.

---

## 8. Flujo de reservas

Solo los estudiantes pueden hacer reservas. El sistema protege contra reservas duplicadas, sobreventa y reservas en gimnasios ajenos.

### 8.1 Crear reserva

```
POST /api/v1/reservations
Authorization: Bearer <idToken de STUDENT>
Body: { "classId": "<class-uuid>" }
```

#### Flujo

```
Estudiante solicita reserva
        │
        ▼
RolesGuard verifica role === STUDENT
        │
        ▼
El servicio inicia una transacción de TypeORM
        │
        ├─ Bloquea la fila de la clase con pessimistic_write
        │
        ├─ Verifica que la clase exista y class.gymId === student.gymId
        │
        ├─ Verifica que la clase sea futura
        │
        ├─ Verifica que el estudiante no tenga una reserva activa (RESERVED) para esta clase
        │
        ├─ Cuenta las reservas activas de la clase
        │   └─ Si count >= capacity → rechaza
        │
        └─ Inserta la reserva con estado RESERVED
              ├─ Si hay conflicto de índice único → "ya tienes una reserva"
              └─ Si tiene éxito → devuelve ReservationResponseDto sanitizado
```

### Protección contra concurrencia

- La fila de la clase se bloquea con `pessimistic_write`.
- Un índice único parcial sobre `(classId, studentId)` donde `status = 'RESERVED'` evita reservas activas duplicadas a nivel de base de datos.
- La capacidad se verifica dentro de la transacción después del bloqueo.
- Los tests e2e verifican que con capacidad `1`, exactamente una de dos peticiones simultáneas tiene éxito.

### 8.2 Listar mis reservas

```
GET /api/v1/reservations/my-reservations
Authorization: Bearer <idToken de STUDENT>
```

#### Flujo

1. `RolesGuard` verifica `STUDENT`.
2. El servicio carga las reservas donde `studentId === user.id`.
3. Cada reserva incluye un resumen limitado de la clase.
4. La respuesta es una lista sanitizada.

### 8.3 Cancelar reserva

```
PUT /api/v1/reservations/:id/cancel
Authorization: Bearer <idToken de STUDENT, OWNER_GYM o SUPER_ADMIN>
```

#### Flujo

1. El servicio carga la reserva con su clase.
2. Verifica autorización:
   - `STUDENT` solo puede cancelar su propia reserva.
   - `OWNER_GYM` solo puede cancelar reservas de clases en gimnasios que posee.
   - `SUPER_ADMIN` puede cancelar cualquier reserva.
3. La reserva debe estar en estado `RESERVED`.
4. Los estudiantes no pueden cancelar dentro de las 2 horas previas al inicio de la clase.
5. El estado cambia a `CANCELED`.

La respuesta usa `ReservationResponseDto` y no incluye el estudiante, el gimnasio completo ni otras reservas.

### 8.4 Re-reserva

Después de la cancelación, el índice único parcial ya no aplica (el estado es `CANCELED`), por lo que el estudiante puede crear una nueva reserva `RESERVED` para la misma clase, sujeta a capacidad.

---

## 9. Flujo de asistencia

La asistencia solo puede ser marcada por `OWNER_GYM`, `TEACHER` o `SUPER_ADMIN`.

```
PUT /api/v1/reservations/:classId/students/:studentId/attendance?attended=true
Authorization: Bearer <idToken de OWNER_GYM, TEACHER o SUPER_ADMIN>
```

### Flujo

1. `RolesGuard` verifica el rol.
2. El servicio carga la reserva por `classId` y `studentId` con estado `RESERVED`.
3. Verifica autorización:
   - `TEACHER` — solo si `class.teacherId === user.id`.
   - `OWNER_GYM` — solo si `class.gym.ownerId === user.id`.
   - `SUPER_ADMIN` — cualquier clase.
4. El estado de la reserva se actualiza a `ATTENDED` o `MISSED`.

La respuesta usa `ReservationResponseDto` y solo puede incluir un resumen controlado de la clase.

---

## 10. Multi-tenancy y aislamiento por tenant

Cada gimnasio es un tenant. Los usuarios solo pueden interactuar con recursos de su propio gimnasio, salvo que sean `SUPER_ADMIN`.

### Reglas de aislamiento

| Recurso     | Regla de aislamiento                                                                |
| ----------- | ----------------------------------------------------------------------------------- |
| Gimnasios   | `OWNER_GYM` posee gimnasios; `TEACHER`/`STUDENT` solo acceden a su gimnasio.        |
| Disciplinas | Siempre filtradas por `gymId`. El acceso a disciplinas de otro gimnasio se rechaza. |
| Clases      | Filtradas por el gimnasio del usuario o por propiedad del gimnasio.                 |
| Reservas    | Los estudiantes solo pueden reservar clases de su gimnasio.                         |
| Asistencia  | Profesores/owners solo marcan asistencia en sus propias clases/gimnasios.           |

### Dónde se aplica

- `RolesGuard` proporciona una primera capa cuando `gymId` está presente en params/body/query.
- Cada servicio realiza la verificación autoritativa de tenant antes de leer o escribir.
- Los tests e2e verifican explícitamente escenarios de IDOR/BOLA entre gimnasios.

### Ejemplo: estudiante del Gimnasio A intenta leer una clase del Gimnasio B

```
GET /api/v1/classes/<class-id-gym-b>
Authorization: Bearer <token-estudiante-a>
        │
        ▼
RolesGuard permite (el endpoint solo requiere autenticación)
        │
        ▼
ClassesService.findOne carga la clase con gymId = Gimnasio B
        │
        ▼
El servicio verifica: user.role !== SUPER_ADMIN && class.gymId !== user.gymId
        │
        ▼
Devuelve 403 Forbidden
```

---

## 11. Flujos de seguridad

### 11.1 Protección contra mass assignment

- Todos los DTOs de entrada usan decoradores de `class-validator`.
- El `ValidationPipe` global usa `whitelist: true` y `forbidNonWhitelisted: true`.
- Los campos desconocidos en el body se rechazan con `400 Bad Request`.
- Campos protegidos como `ownerId`, `gymId` (donde es inmutable), `role`, `createdAt`, `updatedAt` e `id` no pueden ser inyectados por el cliente.

### 11.2 Validación de entrada

- UUIDs: `ParseUUIDPipe` en parámetros de ruta y `@IsUUID` en DTOs.
- Emails: `@IsEmail`.
- Enums: `@IsEnum`.
- Fechas: `@IsDateString`.
- Strings: `@MaxLength`.
- Paginación: `page` positivo, `limit <= 100`.
- Tamaño de body: limitado a `100 kb`.

### 11.3 Rate limiting

- `@nestjs/throttler` está configurado globalmente como `APP_GUARD`.
- Límite por defecto: `100` peticiones por minuto por IP.
- El plan gratuito de Render ejecuta una sola instancia, por lo que el almacenamiento en memoria es suficiente a la escala actual.

### 11.4 CORS y headers

- `helmet` establece headers de seguridad.
- CORS permite orígenes de apps móviles (origen nulo) y orígenes de navegador incluidos en `CORS_ORIGIN`.
- Swagger UI está deshabilitado en producción.

### 11.5 Secretos y observabilidad

- Los archivos `.env` están ignorados por Git.
- El Dockerfile no copia archivos `.env*`.
- `LoggerMiddleware` elimina query strings antes de loggear.
- `AllExceptionsFilter` elimina query strings de los logs de error.
- OpenTelemetry redacta parámetros de query sensibles y no captura headers HTTP.

---

## 12. Flujo de manejo de errores

Todas las excepciones son capturadas por `AllExceptionsFilter` y devueltas en un formato uniforme:

```json
{
  "success": false,
  "statusCode": 403,
  "timestamp": "2026-08-13T17:00:00.000Z",
  "path": "/api/v1/classes/uuid",
  "message": "No tienes acceso a esta clase"
}
```

### Códigos HTTP comunes

| Código | Significado                                                 |
| ------ | ----------------------------------------------------------- |
| `400`  | Error de validación o bad request.                          |
| `401`  | Token de Firebase ausente, mal formado o inválido.          |
| `403`  | Autenticado pero no autorizado para el recurso/tenant.      |
| `404`  | Recurso no encontrado.                                      |
| `409`  | Conflicto, p. ej. reserva duplicada.                        |
| `429`  | Rate limit excedido.                                        |
| `500`  | Error interno inesperado (se devuelve un mensaje genérico). |

---

## Diagrama resumido

```
┌─────────────────┐     Firebase      ┌─────────────────┐
│   App móvil     │ ◄───────────────► │  Firebase Auth  │
└────────┬────────┘                   └─────────────────┘
         │
         │ Bearer <idToken>
         ▼
┌─────────────────────────────────────────────────────────┐
│                         API                              │
│  ┌─────────────────┐    ┌─────────────┐    ┌─────────┐ │
│  │ FirebaseAuthGuard│ -> │  RolesGuard │ -> │ Service │ │
│  └─────────────────┘    └─────────────┘    └────┬────┘ │
│                                                  │      │
│                              PostgreSQL  ◄───────┘      │
└─────────────────────────────────────────────────────────┘
```

---

## Ver también

- [README del proyecto](./README.md)
- [Guía de integración React Native](./README_REACT_NATIVE.md)
- [Guía de integración Flutter](./README_FLUTTER.md)
- [Guía de testing local](./LOCAL_TESTING_GUIDE.md)
