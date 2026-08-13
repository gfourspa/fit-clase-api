# FitClase API 🏋️‍♀️

> API REST profesional para la gestión de gimnasios, clases deportivas y reservas.  
> Construida con **NestJS + TypeORM + PostgreSQL**, autenticación con **Firebase Auth** y observabilidad mediante **OpenTelemetry/SigNoz**.
> Esta documentación refleja el estado actual tras el endurecimiento de seguridad y la migración a despliegue en **Render + Neon**.

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)

---

## 🌐 Enlaces

| Entorno               | URL                                                     |
| --------------------- | ------------------------------------------------------- |
| Producción            | https://fit-clase-api.onrender.com                      |
| Documentación Swagger | Disponible solo en entornos no productivos: `/api/docs` |
| Health check          | `/api/v1/health`                                        |

---

## 🚀 Características

- 📦 **CRUD completo** de gimnasios, clases, reservas, disciplinas e invitaciones.
- 🔐 **Autenticación** con Firebase ID Token (`Authorization: Bearer <token>`).
- 🛡️ **Autorización RBAC** con roles `SUPER_ADMIN`, `OWNER_GYM`, `TEACHER` y `STUDENT` verificados contra PostgreSQL.
- ✅ **Validaciones robustas** mediante `class-validator`, `class-transformer` y `ValidationPipe` global con `whitelist` y `forbidNonWhitelisted`.
- 🏢 **Multi-tenant por gimnasio** (`gymId`) con aislamiento en capa de servicio y guardias.
- 🔗 **Inscripción por invitación**: los estudiantes se unen a un gimnasio mediante un token de invitación generado por un `OWNER_GYM` o `SUPER_ADMIN`.
- 🎫 **Reservas concurrentes seguras** mediante transacciones con bloqueo pesimista e índice único parcial en base de datos.
- 🪖 **Seguridad** con `helmet`, CORS estricto, rate limiting global y límite de tamaño de cuerpo de petición de 100 kb.
- 📊 **Observabilidad** con OpenTelemetry exportando trazas y métricas a SigNoz, con redacción de datos sensibles (query strings, headers, tokens).
- 📝 **Logging** de cada request sin exponer información sensible en URLs.

---

## 🧱 Stack tecnológico

| Capa            | Tecnología                         |
| --------------- | ---------------------------------- |
| Runtime         | Node.js 20                         |
| Framework       | NestJS 11                          |
| Lenguaje        | TypeScript 5                       |
| Base de datos   | PostgreSQL                         |
| ORM             | TypeORM                            |
| Autenticación   | Firebase Admin SDK                 |
| Documentación   | Swagger / OpenAPI                  |
| Observabilidad  | OpenTelemetry + SigNoz (OTLP HTTP) |
| Contenerización | Docker                             |
| Cloud           | Render (web service) + Neon (DB)   |

---

## 📂 Módulos principales

| Módulo       | Ruta                       | Descripción                                                       |
| ------------ | -------------------------- | ----------------------------------------------------------------- |
| Auth         | `src/modules/auth`         | Inicializa Firebase Admin y provee guardas (`FirebaseAuthGuard`). |
| Users        | `src/modules/users`        | Sincronización de usuarios con Firebase, roles e invitaciones.    |
| Gyms         | `src/modules/gyms`         | CRUD de gimnasios.                                                |
| Classes      | `src/modules/classes`      | CRUD y búsqueda de clases deportivas.                             |
| Reservations | `src/modules/reservations` | Creación, cancelación y control de asistencia.                    |
| Disciplines  | `src/modules/disciplines`  | CRUD de disciplinas asociadas a un gimnasio.                      |
| Invitations  | `src/modules/invitations`  | Creación de invitaciones para unirse a un gimnasio.               |

---

## 🔌 Endpoints principales

Todos los endpoints protegidos requieren el header `Authorization: Bearer <FirebaseIdToken>`.  
El prefijo global es `/api/v1`.

### Usuarios

| Método | Endpoint                            | Descripción                                                                    | Acceso                      |
| ------ | ----------------------------------- | ------------------------------------------------------------------------------ | --------------------------- |
| POST   | `/api/v1/users/auto-assign-student` | Asigna el rol `STUDENT` usando un token de invitación.                         | Autenticado                 |
| POST   | `/api/v1/users/assign-role`         | Asigna roles a otros usuarios.                                                 | `SUPER_ADMIN`               |
| GET    | `/api/v1/users/me`                  | Perfil del usuario autenticado.                                                | Autenticado                 |
| POST   | `/api/v1/users/sync`                | Sincroniza el usuario autenticado con la base de datos.                        | Autenticado                 |
| GET    | `/api/v1/users`                     | Listar todos los usuarios.                                                     | `SUPER_ADMIN`               |
| POST   | `/api/v1/users/:gymId/add-to-gym`   | Agrega usuarios por email a un gimnasio (el usuario debe existir en Firebase). | `OWNER_GYM` / `SUPER_ADMIN` |

### Gimnasios

| Método | Endpoint           | Descripción                            | Acceso                      |
| ------ | ------------------ | -------------------------------------- | --------------------------- |
| POST   | `/api/v1/gyms`     | Crear gimnasio (`ownerId` automático). | `SUPER_ADMIN`, `OWNER_GYM`  |
| GET    | `/api/v1/gyms`     | Listar todos los gimnasios.            | `SUPER_ADMIN`               |
| GET    | `/api/v1/gyms/:id` | Obtener gimnasio.                      | Miembros / propietario      |
| PATCH  | `/api/v1/gyms/:id` | Actualizar gimnasio.                   | Propietario / `SUPER_ADMIN` |
| DELETE | `/api/v1/gyms/:id` | Eliminar gimnasio.                     | Propietario / `SUPER_ADMIN` |

### Clases

| Método | Endpoint                              | Descripción                                                               | Acceso                                |
| ------ | ------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------- |
| POST   | `/api/v1/classes`                     | Crear clase.                                                              | `SUPER_ADMIN`, `OWNER_GYM`            |
| GET    | `/api/v1/classes`                     | Listar clases. Filtros: `date`, `disciplineId`, `gymId`, `page`, `limit`. | Autenticado                           |
| GET    | `/api/v1/classes/:id`                 | Obtener clase.                                                            | Autenticado                           |
| PATCH  | `/api/v1/classes/:id`                 | Actualizar clase.                                                         | `SUPER_ADMIN`, `OWNER_GYM`            |
| DELETE | `/api/v1/classes/:id`                 | Eliminar clase.                                                           | `SUPER_ADMIN`, `OWNER_GYM`            |
| GET    | `/api/v1/classes/:id/teacher-classes` | Clases asignadas a un profesor.                                           | `TEACHER`, `OWNER_GYM`, `SUPER_ADMIN` |

### Reservas

| Método | Endpoint                                                       | Descripción                           | Acceso                                    |
| ------ | -------------------------------------------------------------- | ------------------------------------- | ----------------------------------------- |
| POST   | `/api/v1/reservations`                                         | Crear reserva. Body: `{ classId }`.   | `STUDENT`                                 |
| GET    | `/api/v1/reservations/my-reservations`                         | Reservas del usuario autenticado.     | `STUDENT`                                 |
| PUT    | `/api/v1/reservations/:id/cancel`                              | Cancelar reserva.                     | Propietario / `OWNER_GYM` / `SUPER_ADMIN` |
| PUT    | `/api/v1/reservations/:classId/students/:studentId/attendance` | Marcar asistencia. Query: `attended`. | `OWNER_GYM`, `SUPER_ADMIN`, `TEACHER`     |

### Disciplinas

| Método | Endpoint                         | Descripción                     | Acceso                     |
| ------ | -------------------------------- | ------------------------------- | -------------------------- |
| POST   | `/api/v1/disciplines`            | Crear disciplina.               | `OWNER_GYM`, `SUPER_ADMIN` |
| GET    | `/api/v1/disciplines`            | Listar disciplinas con filtros. | Autenticado                |
| GET    | `/api/v1/disciplines/:id`        | Obtener disciplina.             | Autenticado                |
| GET    | `/api/v1/disciplines/gym/:gymId` | Disciplinas de un gimnasio.     | Autenticado                |
| PATCH  | `/api/v1/disciplines/:id`        | Actualizar disciplina.          | `OWNER_GYM`, `SUPER_ADMIN` |
| DELETE | `/api/v1/disciplines/:id`        | Eliminar disciplina.            | `OWNER_GYM`, `SUPER_ADMIN` |

### Invitaciones

| Método | Endpoint              | Descripción                                                                            | Acceso                     |
| ------ | --------------------- | -------------------------------------------------------------------------------------- | -------------------------- |
| POST   | `/api/v1/invitations` | Crear invitación para unirse a un gimnasio. Body: `{ gymId, email, expiresInHours? }`. | `OWNER_GYM`, `SUPER_ADMIN` |

Para más detalles, consulta los controladores en `src/modules/*/*.controller.ts` o la documentación Swagger en `/api/docs` cuando la app esté ejecutando.

---

## 🔐 Autenticación y roles

El sistema utiliza **Firebase Authentication** solo para verificar la identidad del usuario. Cada petición protegida debe incluir:

```http
Authorization: Bearer <FirebaseIdToken>
```

- `FirebaseAuthGuard` verifica el token con Firebase Admin.
- Después de verificar el token, el servidor **carga el usuario desde PostgreSQL**. El rol (`role`) y el gimnasio (`gymId`) autoritativos provienen de la base de datos, **no de los custom claims de Firebase**.
- `RolesGuard` valida el rol y el aislamiento por `gymId` contra los parámetros, body o query del request.
- El servidor **ignora** cualquier `uid` o `email` enviado en el body de las peticiones; siempre extrae esa información del token verificado.

### Roles disponibles

- `SUPER_ADMIN` — acceso global.
- `OWNER_GYM` — administración de su gimnasio.
- `TEACHER` — gestión de clases y asistencia dentro de su gimnasio.
- `STUDENT` — reserva de clases dentro de su gimnasio.

### Flujo de inscripción de estudiantes

1. Un `OWNER_GYM` o `SUPER_ADMIN` crea una invitación:  
   `POST /api/v1/invitations` → devuelve `{ invitationToken }`.
2. El estudiante se registra en Firebase Auth y envía el token de invitación:  
   `POST /api/v1/users/auto-assign-student` con body `{ invitationToken }`.
3. El servidor valida que el email del token Firebase coincida con el email de la invitación y asigna el rol `STUDENT` con el `gymId` correspondiente.

> **Nota de seguridad:** el aislamiento por `gymId` se implementa en la lógica de aplicación. Se recomienda añadir políticas **RLS** en PostgreSQL como defensa en profundidad.

---

## ⚠️ Estructura uniforme de errores

Todas las respuestas de error siguen el mismo formato JSON, generado por el filtro global:

```json
{
  "success": false,
  "statusCode": 404,
  "timestamp": "2026-04-17T12:00:00.000Z",
  "path": "/api/v1/recurso/id",
  "message": "Mensaje descriptivo del error"
}
```

Errores de validación devuelven `400` y `message` es un array de mensajes.  
Códigos comunes:

| Código | Causa                                       |
| ------ | ------------------------------------------- |
| `400`  | Validación o datos inválidos.               |
| `401`  | Token ausente, inválido o expirado.         |
| `403`  | Sin permisos para el recurso o gimnasio.    |
| `404`  | Recurso no encontrado.                      |
| `409`  | Conflicto (por ejemplo, reserva duplicada). |
| `429`  | Rate limit excedido.                        |

---

## 🛠️ Variables de entorno

Copia `.env.example` a `.env` y ajusta los valores. En producción (Render) configura las mismas variables como secretos del servicio.

### Firebase (obligatorio)

| Variable                | Descripción                                        |
| ----------------------- | -------------------------------------------------- |
| `FIREBASE_PROJECT_ID`   | ID del proyecto de Firebase.                       |
| `FIREBASE_CLIENT_EMAIL` | Email de la cuenta de servicio.                    |
| `FIREBASE_PRIVATE_KEY`  | Clave privada de la cuenta de servicio (con `\n`). |

### Base de datos

| Variable      | Descripción                     | Ejemplo       |
| ------------- | ------------------------------- | ------------- |
| `DB_HOST`     | Host de PostgreSQL.             | `localhost`   |
| `DB_PORT`     | Puerto de PostgreSQL.           | `5432`        |
| `DB_USERNAME` | Usuario de la base de datos.    | `postgres`    |
| `DB_PASSWORD` | Contraseña de la base de datos. | `password`    |
| `DB_NAME`     | Nombre de la base de datos.     | `fitclase_db` |
| `DB_SSL`      | Activar SSL (`true`/`false`).   | `false`       |

### Servidor

| Variable      | Descripción                                                   | Ejemplo                 |
| ------------- | ------------------------------------------------------------- | ----------------------- |
| `PORT`        | Puerto de la aplicación.                                      | `4000`                  |
| `NODE_ENV`    | Entorno (`development`/`production`/`test`).                  | `development`           |
| `CORS_ORIGIN` | Orígenes permitidos separados por comas (`*` no recomendado). | `http://localhost:3000` |

### Observabilidad (opcional)

| Variable                      | Descripción                    | Ejemplo                 |
| ----------------------------- | ------------------------------ | ----------------------- |
| `OTEL_SERVICE_NAME`           | Nombre del servicio en SigNoz. | `api-fit-clase`         |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Endpoint OTLP HTTP.            | `http://localhost:4318` |

---

## 🚀 Ejecución local

### Requisitos

- Node.js 20
- npm
- PostgreSQL 15+ (o Docker)

### Pasos

1. Instalar dependencias:

```bash
npm install
```

2. Configurar variables de entorno:

```bash
cp .env.example .env
# Edita .env con tus credenciales de Firebase y PostgreSQL
```

3. Ejecutar migraciones (obligatorio en local si `synchronize` está desactivado):

```bash
npm run migration:run
```

4. Ejecutar en modo desarrollo con hot-reload:

```bash
npm run start:dev
```

La API estará disponible en `http://localhost:4000` (ajusta el puerto si aplica).

- Swagger UI: `http://localhost:4000/api/docs`
- Health check: `http://localhost:4000/api/v1/health`

### Build y producción local

```bash
npm run build
npm run start:prod
```

---

## 🐳 Docker (desarrollo local)

El proyecto incluye `Dockerfile` y `docker-compose.yml` para levantar la API junto con PostgreSQL y pgAdmin.

```bash
docker compose up --build
```

Servicios expuestos:

| Servicio   | URL                   |
| ---------- | --------------------- |
| API        | http://localhost:4000 |
| pgAdmin    | http://localhost:8080 |
| PostgreSQL | `localhost:5432`      |

> Revisa `docker-compose.yml` para ajustar credenciales y variables de entorno según tu entorno. `docker-compose.yml` **no** se utiliza en producción.

---

## 🧪 Tests

El entorno de tests está aislado mediante `.env.test` y una base de datos separada.

```bash
# Tests unitarios
npm test

# Tests e2e (requiere PostgreSQL local y las variables de .env.test)
npm run test:e2e

# Coverage
npm run test:cov
```

Para más detalles sobre pruebas locales, generación de tokens y configuración del entorno de test, consulta [`LOCAL_TESTING_GUIDE.md`](./LOCAL_TESTING_GUIDE.md).

---

## 🚀 Despliegue en producción (Render + Neon)

La aplicación se despliega como web service de Docker en Render, conectada a una base de datos PostgreSQL en Neon.

1. Crea una base de datos en [Neon](https://neon.tech) y anota la cadena de conexión.
2. En el dashboard de Render, crea un **Web Service** conectado a este repositorio y selecciona **Docker** como runtime.
3. Configura las variables de entorno en Render (todda la sección "Variables de entorno"):
   - `NODE_ENV=production`
   - `PORT=4000`
   - Variables de Firebase.
   - Variables de Neon (`DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL=true`).
   - `CORS_ORIGIN` con los dominios de tus clientes.
4. El archivo `render.yml` incluye `preDeployCommand` para ejecutar migraciones de TypeORM automáticamente antes de cada despliegue:

```yaml
preDeployCommand: 'node node_modules/typeorm/cli.js migration:run -d dist/src/database/data-source.js'
healthCheckPath: /api/v1/health
```

> **Importante:** nunca commitees archivos `.env` ni claves privadas. Render debe ser la única fuente de secretos en producción.

### Migraciones en producción

Para generar una nueva migración local:

```bash
npm run migration:generate -- src/database/migrations/NombreDeMigracion
```

Commit el archivo generado en `src/database/migrations/`. Render ejecutará `migration:run` automáticamente durante el despliegue.

> **Nota:** la migración manual `20260812183000-AddActiveReservationUniqueIndex.ts` usa un timestamp de calendario. TypeORM la ordena correctamente en el historial, pero para nuevas migraciones se recomienda usar el timestamp que genera el CLI (`npm run migration:generate`).

---

## 🔒 Seguridad y buenas prácticas

- No expongas `FIREBASE_PRIVATE_KEY` en repositorios públicos; usa secretos en el entorno de despliegue.
- En producción, configura `CORS_ORIGIN` con dominios concretos.
- Swagger UI solo se habilita cuando `NODE_ENV !== 'production'`.
- Rate limiting global protege contra abuso de la API.
- Límite de tamaño de cuerpo de petición de 100 kb para mitigar ataques de consumo de recursos.
- Validación global con `whitelist: true` previene asignación masiva de campos no permitidos.
- El servidor nunca usa `uid` o `email` del body del request; siempre los extrae del token de Firebase.
- Las trazas y métricas de OpenTelemetry no capturan headers ni query strings sensibles.
- Añade políticas RLS en PostgreSQL para reforzar el aislamiento multi-tenant.
- Considera añadir DTOs de respuesta o interceptores de serialización para evitar exponer campos internos de entidades.

---

## 📁 Estructura del proyecto

```
api-fit-clase
├── src
│   ├── main.ts                    # Arranque, CORS, helmet, validación, Swagger y graceful shutdown
│   ├── tracing.ts                 # Inicialización de OpenTelemetry con redacción de datos sensibles
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── config
│   │   └── database.config.ts     # Configuración de TypeORM
│   ├── database
│   │   ├── data-source.ts         # DataSource para CLI de TypeORM
│   │   └── migrations             # Migraciones de base de datos
│   ├── entities                   # Entidades de TypeORM
│   ├── common
│   │   ├── filters                # Filtros de excepciones globales
│   │   ├── guards                 # Guards de autenticación y roles
│   │   ├── middleware             # Middleware de logging
│   │   └── decorators             # Decoradores personalizados
│   └── modules
│       ├── auth                   # Firebase Admin y guardas
│       ├── users                  # Gestión de usuarios, roles e invitaciones
│       ├── gyms                   # CRUD de gimnasios
│       ├── classes                # CRUD de clases
│       ├── reservations           # Reservas y asistencia
│       ├── disciplines            # CRUD de disciplinas
│       └── invitations            # Invitaciones a gimnasios
├── scripts
│   └── generate-test-token.ts     # Script para generar tokens de Firebase en desarrollo
├── test                           # Tests e2e y configuración de Jest
├── Dockerfile
├── docker-compose.yml             # Solo desarrollo local
├── render.yml                     # Configuración de despliegue en Render
└── .env.example
```

---

## 📚 Documentación adicional

- [Guía de integración React Native](./README_REACT_NATIVE.md)
- [Guía de integración Flutter](./README_FLUTTER.md)
- [Guía de testing local](./LOCAL_TESTING_GUIDE.md)

---

## 📄 Licencia

Proyecto privado — `UNLICENSED`. Puedes cambiar la licencia en `package.json` según tus necesidades.
