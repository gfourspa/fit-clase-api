# FitClase API 🏋️‍♀️

> **API REST profesional** para gestión de gimnasios, clases deportivas y reservas.  
> Construida con **NestJS + TypeORM + PostgreSQL**

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

**🌐 Producción**: [https://fit-clase-api.onrender.com](https://fit-clase-api.onrender.com)  
**📖 Documentación API**: disponible solo en entornos no-productivos (`NODE_ENV !== 'production'`)

---

## 🚀 Características

- 📦 **CRUD completo** - Gimnasios, clases, reservas y disciplinas
- ✨ **Validaciones robustas** - class-validator + class-transformer
- 📚 **Documentación automática** - Swagger/OpenAPI
***FitClase API***

API REST para la gestión de gimnasios, clases y reservas. Implementada con NestJS, autenticación basada en Firebase Auth, persistencia en PostgreSQL (TypeORM) y observabilidad via OpenTelemetry (SigNoz).

**Project Overview**
- **Stack:** Node.js 20, NestJS, TypeORM, PostgreSQL, Firebase Auth, SigNoz (OTLP)
- **Propósito:** Sistema de reservas de clases deportivas por gimnasio, multi-tenant por `gymId`.

**Principales Características**
- **Autenticación:** Firebase IdToken (Bearer) con sincronización de usuarios en PostgreSQL.
- **Autorización:** Roles (`SUPER_ADMIN`, `OWNER_GYM`, `TEACHER`, `STUDENT`) con `@Roles()` y `RolesGuard` (RBAC).
- **Validación:** DTOs + `class-validator` y `ValidationPipe` global con `whitelist` y `forbidNonWhitelisted`.
- **Errores:** Filtro global `AllExceptionsFilter` que retorna estructura uniforme.
- **Observabilidad:** OpenTelemetry exportando a SigNoz (OTLP HTTP).
- **Seguridad:** `helmet()` (CSP personalizado), CORS configurado por entorno, rate limiting global con `ThrottlerGuard` (100 req/min). Swagger UI deshabilitado en producción.
- **Logging:** Middleware global que registra cada request (método, path, status, duración).

**Estructura / Módulos Principales**
- **Auth:** `src/modules/auth` — inicializa Firebase Admin y provee guardas (`FirebaseAuthGuard`).
- **Users:** `src/modules/users` — sincronización con Firebase, asignación de roles.
- **Gyms:** `src/modules/gyms` — CRUD de gimnasios.
- **Classes:** `src/modules/classes` — CRUD y búsqueda de clases.
- **Reservations:** `src/modules/reservations` — creación/cancelación de reservas, marcar asistencia.
- **Disciplines:** `src/modules/disciplines` — CRUD de disciplinas.

**Endpoints Principales (resumen)**
- **Autenticación**
  - `POST /api/v1/*` — Todos los endpoints protegidos usan `Authorization: Bearer <FirebaseIdToken>` donde aplica.

- **Usuarios**
  - `POST /api/v1/users/auto-assign-student` — Asigna rol STUDENT. El `uid` y `email` se extraen del token Firebase (no del body) para evitar suplantación. Autenticado.
  - `POST /api/v1/users/assign-role` — Permite a SUPER_ADMIN asignar roles a otros usuarios. RolesGuard requerido.
  - `GET  /api/v1/users/me` — Recupera perfil del usuario autenticado.

- **Gimnasios (Gyms)**
  - `POST   /api/v1/gyms` — Crear gimnasio (ownerId asignado automáticamente).
  - `GET    /api/v1/gyms` — Listar gimnasios (SUPER_ADMIN).
  - `GET    /api/v1/gyms/:id` — Obtener gimnasio.
  - `PUT    /api/v1/gyms/:id` — Actualizar gimnasio (owner o super admin).
  - `DELETE /api/v1/gyms/:id` — Eliminar gimnasio (owner o super admin).

- **Clases (Classes)**
  - `POST /api/v1/classes` — Crear clase (SUPER_ADMIN, OWNER_GYM).
  - `GET  /api/v1/classes` — Listar clases con filtros: `date`, `disciplineId`, `gymId`, `page`, `limit`.
  - `GET  /api/v1/classes/:id` — Obtener detalles de una clase.
  - `PUT  /api/v1/classes/:id` — Actualizar clase.
  - `DELETE /api/v1/classes/:id` — Eliminar clase.

- **Reservas (Reservations)**
  - `POST /api/v1/reservations` — Crear reserva (STUDENT). Body: `{ classId }` (UUID).
  - `GET  /api/v1/reservations/my-reservations` — Obtener reservas del usuario autenticado.
  - `PUT  /api/v1/reservations/:id/cancel` — Cancelar reserva (propietario o OWNER_GYM o SUPER_ADMIN).
  - `PUT  /api/v1/reservations/:classId/students/:studentId/attendance` — Marcar asistencia (OWNER_GYM, SUPER_ADMIN, TEACHER).

- **Disciplinas (Disciplines)**
  - Endpoints CRUD estándar en `src/modules/disciplines`.

Para detalles exactos y ejemplos de request/response consulte los controladores en `src/modules/*/*.controller.ts` o la documentación Swagger en `/api/docs` cuando la app esté ejecutando.

**Autenticación y Roles**
- El sistema utiliza Firebase Authentication. Los tokens se verifican con `FirebaseAuthGuard` y se sincroniza la información del usuario en la tabla `users`.
- Roles y acceso multi-tenant se administran en `RolesGuard` (se verifica `gymId` del usuario frente a parámetros/body/query del request).
- Nota de seguridad importante: actualmente el aislamiento por `gymId` se implementa en la lógica de aplicación; no hay políticas RLS en la base de datos. Se recomienda implementar RLS en PostgreSQL para defensa en profundidad.

**Estructura uniforme de errores**
Todas las respuestas de error siguen la misma estructura JSON (viene del filtro global):

```json
{
  "success": false,
  "statusCode": 404,
  "timestamp": "2026-04-17T12:00:00.000Z",
  "path": "/recurso/id",
  "message": "Mensaje descriptivo del error"
}
```

**Validación**
- `ValidationPipe` global con `whitelist` y `forbidNonWhitelisted`.
- Errores de validación devuelven `400` con `message` siendo un array de mensajes (colección de constraints).

**Seguridad y CORS**
- `helmet()` activo con una política CSP personalizada (permitiendo recursos de Swagger CDN).
- CORS configurado mediante la variable `CORS_ORIGIN` (lista separada por comas). En producción, asegúrese de especificar dominios concretos.
- Rate limiting: `ThrottlerGuard` registrado globalmente via `APP_GUARD` — 100 requests/minuto por IP en todos los endpoints.
- Swagger UI (`/api/docs`) solo disponible cuando `NODE_ENV !== 'production'`.

**Observabilidad**
- OpenTelemetry integrado (archivo `src/tracing.ts`) y se exporta a SigNoz/OTLP.
- Variables relevantes: `OTEL_SERVICE_NAME` y `OTEL_EXPORTER_OTLP_ENDPOINT`.
- Middleware de logging registra cada request con método, ruta, status y duración.

**Base de Datos**
- PostgreSQL con TypeORM (`entities` en `src/config/entities`): `User`, `Gym`, `Class`, `Reservation`, `Discipline`.
- Configuración en `src/config/database.config.ts` y variables `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL`.
- `synchronize` solo activo en `development`.

**Variables de Entorno (resumen)**
- Firebase: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- DB: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL`
- Server: `PORT`, `NODE_ENV`, `CORS_ORIGIN`
- Observabilidad: `OTEL_SERVICE_NAME`, `OTEL_EXPORTER_OTLP_ENDPOINT`

Consulte `.env.example` para la lista completa y ejemplos.

**Ejecución local**
- Requisitos: Node.js 20, npm
- Instalar dependencias:

```bash
npm install
```

- Variables de entorno: copiar `.env.example` a `.env` y ajustar valores.

- Modo desarrollo (hot-reload):

```bash
npm run start:dev
```

- Build y producción:

```bash
npm run build
npm run start:prod
```

- Swagger UI (documentación, solo en desarrollo): `http://localhost:4000/api/docs` (ajustar puerto si aplica).

**Docker**
- Imagen base definida en `Dockerfile` (usa `node:20-alpine`).
- `docker-compose.yml` disponible para orquestar servicios si aplica.

**Tests**
- Ejecutar tests unitarios/e2e con:

```bash
npm test
npm run test:e2e
```

**Buenas prácticas y recomendaciones**
- Añadir RLS en PostgreSQL para reforzar aislamiento multi-tenant.
- Evitar exponer `FIREBASE_PRIVATE_KEY` en repos remotos; use secretos en el entorno de despliegue.
- Mantener `OTEL_EXPORTER_OTLP_ENDPOINT` apuntando a SigNoz/collector en staging/producción.
- Añadir response DTOs o interceptores de serialización para evitar exponer campos internos de entidades.

**Dónde mirar en el código**
- `src/main.ts` — arranque, CORS, helmet, validation pipe y filtro global.
- `src/common/filters/http-exception.filter.ts` — filtro de excepciones global.
- `src/common/middleware/logger.middleware.ts` — middleware de logging.
- `src/modules` — controladores, servicios y DTOs por dominio.
- `src/tracing.ts` — inicialización de OpenTelemetry (importar antes de `main.ts`).

**Licencia**
- Proyecto marcado como privado por `package.json` (UNLICENSED). Cambiar según necesidad.

