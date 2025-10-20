# FitClase API 🏋️‍♀️

> **API REST profesional** para gestión de gimnasios, clases deportivas y reservas.  
> Construida con **NestJS + TypeORM + PostgreSQL + Clerk Authentication**

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Clerk](https://img.shields.io/badge/Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)](https://clerk.com/)

**🌐 Producción**: [https://fit-clase-api.onrender.com](https://fit-clase-api.onrender.com)  
**📖 Documentación API**: [https://fit-clase-api.onrender.com/api/docs](https://fit-clase-api.onrender.com/api/docs)

---

## 🚀 Características

- ✅ **Autenticación con Clerk** - Gestión moderna de usuarios y sesiones
- 🔐 **Autorización por roles** - SUPER_ADMIN, GYM_OWNER, TEACHER, STUDENT
- 📦 **CRUD completo** - Gimnasios, clases, reservas y disciplinas
- ✨ **Validaciones robustas** - class-validator + class-transformer
- 📚 **Documentación automática** - Swagger/OpenAPI
- 🛡️ **Seguridad integrada** - Helmet, CORS, Rate Limiting
- 🐘 **PostgreSQL** - Base de datos relacional con TypeORM
- 🔄 **Sincronización automática** - Webhooks de Clerk para usuarios
- 🐳 **Docker Ready** - Multi-stage build optimizado
- ☁️ **Deploy automatizado** - Render.com con CI/CD

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

- **Node.js** >= 18.x
- **PostgreSQL** >= 13.x
- **Docker** (opcional, para desarrollo)
- **Cuenta Clerk** ([clerk.com](https://clerk.com)) - Plan gratuito disponible
- **npm** o **yarn**

## 🛠️ Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/gfourspa/fit-clase-api.git
cd fit-clase-api

# Instalar dependencias
npm install
```

### 2. Configurar base de datos

**Opción A: PostgreSQL Local**
```sql
CREATE DATABASE fitclase;
```

**Opción B: Base de datos en la nube**
- [Neon](https://neon.tech/) (Recomendado, gratis)
- [Supabase](https://supabase.com/)
- [Railway](https://railway.app/)

### 3. Configurar Clerk

1. Crear cuenta en [clerk.com](https://clerk.com)
2. Crear nueva aplicación
3. Obtener las claves en **API Keys**:
   - `Publishable key` → `CLERK_PUBLISHABLE_KEY`
   - `Secret key` → `CLERK_SECRET_KEY`
4. Configurar roles en **User & Authentication** → **Metadata**

### 4. Variables de entorno

Crear archivo `.env` en la raíz:

```env
# Base de datos
DATABASE_URL="postgresql://user:password@host:5432/fitclase"
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=fitclase
DB_SSL=false  # true para producción (Neon, Render, etc.)

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# API
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### 5. Ejecutar la aplicación

```bash
# Modo desarrollo (con hot-reload)
npm run start:dev

# Modo producción
npm run build
npm run start:prod

# Con Docker
docker-compose up -d
```

La API estará disponible en: **http://localhost:4000**

## 📚 Documentación API

Una vez ejecutada la aplicación, accede a:

- **Swagger UI**: http://localhost:4000/api/docs
- **Health Check**: http://localhost:4000/api/v1/health

## 🔐 Gestión de Usuarios

Los usuarios se gestionan completamente a través de **Clerk**:


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

Los roles se asignan en **Clerk Dashboard** → **Users** → Seleccionar usuario → **Metadata** → `publicMetadata`:

```json
{
  "role": "GYM_OWNER"
}
```

### Roles disponibles:

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| **SUPER_ADMIN** | Administrador global | Acceso total al sistema |
| **GYM_OWNER** | Dueño de gimnasio | Gestionar su gimnasio, clases y profesores |
| **TEACHER** | Profesor/Instructor | Ver sus clases, marcar asistencia |
| **STUDENT** | Estudiante/Cliente | Reservar clases, ver sus reservas |

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
npm run test

# Tests e2e
npm run test:e2e

# Cobertura de código
npm run test:cov

# Tests en modo watch
npm run test:watch
```

## 📦 Tecnologías Utilizadas

### Backend Framework
- **NestJS** 10.x - Framework Node.js progresivo
- **TypeScript** 5.x - Tipado estático

### Base de Datos
- **PostgreSQL** 13+ - Base de datos relacional
- **TypeORM** 0.3.x - ORM para TypeScript/JavaScript

### Autenticación y Seguridad
- **Clerk** - Autenticación moderna y gestión de usuarios
- **Helmet** - Headers de seguridad HTTP
- **CORS** - Control de acceso entre orígenes
- **Rate Limiting** - Throttler de NestJS

### Validación y Documentación
- **class-validator** - Validación de DTOs
- **class-transformer** - Transformación de objetos
- **Swagger/OpenAPI** - Documentación automática

### DevOps
- **Docker** - Contenedorización
- **Docker Compose** - Orquestación local
- **Render.com** - Plataforma de deployment


### Configurar Webhooks de Clerk

1. En **Clerk Dashboard** → **Webhooks** → **Add Endpoint**
2. URL: `https://tu-api.onrender.com/api/v1/webhooks/clerk`
3. Eventos: `user.created`, `user.updated`, `user.deleted`
4. Copiar **Signing Secret** y agregarlo como `CLERK_WEBHOOK_SECRET`



## 🤝 Contribuir

Las contribuciones son bienvenidas. Para cambios importantes:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo `LICENSE` para más detalles.

## 📞 Soporte

¿Necesitas ayuda? Tenemos varias opciones:

- � **Email**: soporte@gfourspa.com
- 💬 **GitHub Issues**: [Reportar problema](https://github.com/gfourspa/fit-clase-api/issues)
- 📚 **Documentación**: Revisa las guías en el repositorio
- 🌐 **Website**: [gfourspa.cL](https://gfourspa.cL)

## 👨‍💻 Desarrollado por

<div align="center">

### **GFOURSPA** 🚀

*Soluciones tecnológicas innovadoras para tu negocio*

[![GitHub](https://img.shields.io/badge/GitHub-gfourspa-181717?style=for-the-badge&logo=github)](https://github.com/gfourspa)
[![Website](https://img.shields.io/badge/Website-gfourspa.com-0078D4?style=for-the-badge&logo=google-chrome&logoColor=white)](https://gfourspa.com)

**Especialidades**: Desarrollo Web • APIs REST • Cloud Computing • Automatización

---

**Desarrollado con ❤️ y ☕ por el equipo de GFOURSPA**

*Transformando ideas en soluciones digitales desde 2023*

</div>

---

<div align="center">

**© 2024 GFOURSPA. Todos los derechos reservados.**

</div>

