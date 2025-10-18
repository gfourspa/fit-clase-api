# FitClase API 🏋️‍♀️

API REST completa y modular construida con **NestJS + TypeORM + PostgreSQL** para una plataforma de reservas de clases deportivas (CrossFit, Pilates, Yoga, etc.).

## 🚀 Características

- **Autenticación con Clerk** para gestión de usuarios y sesiones
- **Autorización por roles**: Admin, Teacher, Student
- **CRUD completo** para gimnasios, clases, reservas y usuarios
- **Validaciones robustas** con class-validator
- **Documentación automática** con Swagger
- **Seguridad** integrada (Helmet, CORS, Rate Limiting)
- **Base de datos** PostgreSQL con TypeORM
- **Sincronización automática** de usuarios vía webhooks de Clerk

## 🏗️ Arquitectura

```
src/
├── auth/              # Autenticación con Clerk y webhooks
├── common/            # Enums, guards, decorators compartidos
├── config/            # Configuraciones (DB)
├── database/          # Módulo de base de datos
├── entities/          # Entidades TypeORM
├── gyms/              # Módulo de gimnasios
├── classes/           # Módulo de clases deportivas
├── reservations/      # Módulo de reservas
├── teachers/          # Módulo específico para profesores
├── disciplines/       # Módulo de disciplinas deportivas
├── app.module.ts      # Módulo principal
└── main.ts           # Punto de entrada
```

## 📋 Requisitos

- Node.js >= 18
- PostgreSQL >= 13
- npm o yarn

## 🛠️ Instalación

### 1. Clonar y configurar dependencias

```bash
# Instalar dependencias
npm install
```

### 2. Configurar base de datos

Crear una base de datos PostgreSQL llamada `FitClase`:

```sql
CREATE DATABASE FitClase;
```

### 3. Configurar variables de entorno

Copia el archivo `.env.example` y ajusta las credenciales:

```bash
cp .env.example .env
```

Variables principales:

```env
# Base de datos
DATABASE_URL="postgresql://postgres:password@localhost:5432/fitclase"
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=fitclase

# Clerk (https://clerk.com)
CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# API
PORT=4000
NODE_ENV=development
CORS_ORIGIN="http://localhost:3000"
```

### 4. Ejecutar la aplicación

```bash
# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod
```

## 📚 Documentación API

Una vez ejecutada la aplicación, accede a:

- **Swagger UI**: http://localhost:4000/api/docs
- **Health Check**: http://localhost:4000/api/v1/health

## 🔐 Gestión de Usuarios

Los usuarios se gestionan completamente a través de **Clerk**:

### Desarrollo Local
```bash
# Sincronizar usuarios de Clerk a tu DB
npm run sync-users

# Sincronizar un usuario específico
npm run sync-users -- user_2xxxxx
```

Ver guía completa: `LOCAL_TESTING_GUIDE.md`

### Producción
Los usuarios se sincronizan automáticamente vía webhooks de Clerk.

Ver configuración: `WEBHOOK_SETUP_GUIDE.md` o `WEBHOOK_QUICKSTART.md`

## 🌐 Endpoints Principales

### Autenticación
```http
POST /api/v1/webhooks/clerk  # Webhook de Clerk (sincronización automática)
```

> **Nota**: La autenticación se maneja completamente por Clerk en el frontend.
> El backend valida los tokens JWT de Clerk automáticamente.

### Gimnasios
```http
GET    /api/v1/gyms         # Listar gimnasios (Super Admin)
POST   /api/v1/gyms         # Crear gimnasio
GET    /api/v1/gyms/:id     # Obtener gimnasio específico
PATCH  /api/v1/gyms/:id     # Actualizar gimnasio
DELETE /api/v1/gyms/:id     # Eliminar gimnasio
```

### Clases
```http
GET    /api/v1/classes                    # Listar clases con filtros
POST   /api/v1/classes                    # Crear clase
GET    /api/v1/classes/:id                # Obtener clase específica
PATCH  /api/v1/classes/:id                # Actualizar clase
DELETE /api/v1/classes/:id                # Eliminar clase
```

### Reservas
```http
POST   /api/v1/reservations               # Crear reserva
GET    /api/v1/reservations/me            # Mis reservas
DELETE /api/v1/reservations/:id           # Cancelar reserva
PUT    /api/v1/reservations/classes/:id/attendance  # Marcar asistencia
```

### Profesores
```http
GET    /api/v1/teachers/:id/classes       # Clases de un profesor
```

## 👥 Roles y Permisos

Los roles se asignan en Clerk Dashboard en el campo `publicMetadata`:

```json
{
  "role": "ADMIN"
}
```

### 👔 ADMIN (Administrador)
- Gestión de gimnasios
- Crear/editar/eliminar clases
- Ver todas las reservas
- Gestionar profesores y estudiantes

### 🧑‍🏫 TEACHER (Profesor)
- Ver sus clases asignadas
- Marcar asistencia de estudiantes
- Ver reservas de sus clases

### 🎓 STUDENT (Estudiante)
- Reservar clases
- Ver sus reservas
- Cancelar reservas (con restricciones de tiempo)

## 🔧 Funcionalidades Destacadas

### Validación de Reservas
- ✅ Verificación de cupos disponibles
- ✅ Un estudiante solo puede reservar una clase una vez
- ✅ No se permiten reservas de clases pasadas
- ✅ Restricciones de cancelación (2 horas antes)

### Seguridad
- 🔐 JWT tokens con expiración configurable
- 🛡️ Rate limiting (100 requests/minuto)
- 🔒 Helmet para headers de seguridad
- ✅ Validación estricta de datos de entrada

### Filtros y Búsquedas
- 📅 Filtrar clases por fecha, disciplina, gimnasio
- 📊 Paginación en listados
- 🔍 Búsquedas optimizadas con QueryBuilder

## 🧪 Testing

```bash
# Tests unitarios
$ npm run test

# Tests e2e
$ npm run test:e2e

# Cobertura
$ npm run test:cov
```

## 📦 Tecnologías Utilizadas

- **NestJS** - Framework Node.js
- **TypeORM** - ORM para PostgreSQL
- **PostgreSQL** - Base de datos
- **JWT** - Autenticación
- **bcryptjs** - Encriptación de contraseñas
- **class-validator** - Validación de DTOs
- **Swagger** - Documentación automática
- **Helmet** - Seguridad HTTP
- **TypeScript** - Tipado estático

## 🚀 Despliegue

### Variables de Entorno para Producción

```env
NODE_ENV=production
DATABASE_URL="postgresql://user:password@host:5432/FitClase"
JWT_SECRET="clave_super_segura_unica_en_produccion"
PORT=4000
```

## 📞 Soporte

Para reportar bugs o solicitar nuevas características, crea un issue en el repositorio.

---

**Desarrollado con ❤️ para la comunidad fitness** 🏋️‍♀️💪
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
