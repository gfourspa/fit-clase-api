# Changelog
 
All notable changes to this project will be documented in this file.
 
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.5] - 2026-06-22

### Fixed
- ++ version

## [0.1.4] - 2026-06-22

### Fixed
- change default role student in sync user


## [0.1.3] - 2026-06-20

### Added
- `scripts/setup-superadmin-gym.sh` — shell script that generates a SUPER_ADMIN Firebase token, exchanges it for an ID Token, syncs the user to the DB, and prints `export TOKEN="..."` ready to use in curl
- `id?: string` added to `AuthenticatedUser` interface so the DB user id is available from the decoded token
- `setup-superadmin-gym.sh` added to `.gitignore`

### Changed
- `GymsService.create` now accepts `firebaseUid: string` and resolves it to the DB user via `userRepository.findOne({ firebase_uid })` before setting `ownerId` — fixes null constraint crash on `POST /gyms`
- `GymsModule` now includes `User` in `TypeOrmModule.forFeature` to support the owner lookup
- `GymsController.create` now passes `user.uid` (Firebase UID string) instead of the full user object
- `autoAssignStudent` and `assignRole` in `UsersService` now include `id: user.id` in Firebase custom claims so `req.user.id` is available in subsequent requests
- `autoAssignStudent` in `UsersService` now saves the user to DB **before** setting Firebase claims, so the DB `id` is available when writing claims
- `User.email` column changed to `nullable: true` (`string | null`) to support tokens that don't carry an email claim (e.g. test tokens)
- `autoAssignStudent` controller return now uses `user.email || ''` to satisfy the `string` return type after email became nullable
- `strictPropertyInitialization: false` added to `tsconfig.json` to support TypeORM entity class properties without constructors
- `tracing.ts` updated to use `resourceFromAttributes` instead of `new Resource()` (breaking change in `@opentelemetry/resources` v2)
- `tsconfig.json` `ignoreDeprecations` set to `"5.0"` to silence TypeScript deprecation warnings at current TS version

### Fixed
- `POST /gyms` was crashing with `null value in column "ownerId"` because `req.user` is the decoded Firebase token (no DB `id`), not the DB entity
- `POST /users/sync` was crashing with `null value in column "email"` for tokens generated without an email claim
- `error: unknown` TypeScript errors in catch blocks in `users.service.ts`
- `idToken` grep pattern in `setup-superadmin-gym.sh` now handles spaces after `:` in Firebase REST API responses

---

## [0.1.2] - 2026-06-20

### Added
- `ThrottlerGuard` registered globally via `APP_GUARD` so rate limiting (100 req/min) is enforced on every endpoint

### Changed
- `autoAssignStudent`: email now taken from verified Firebase token (`currentUser.email`) instead of the request body, preventing email spoofing
- Removed `email` field from `AutoAssignStudentDto` — it is no longer accepted from the client
- Swagger UI (`/api/docs`) now only mounted when `NODE_ENV !== 'production'`, reducing attack surface in production
- DB SSL changed from `rejectUnauthorized: false` to `rejectUnauthorized: true` to prevent MITM attacks on the database connection
- `scripts/` and `LOCAL_TESTING_GUIDE.md` added to `.gitignore` to avoid leaking internal testing details and Firebase project references

### Fixed
- `@IsEmail()` validator added to `CreateUserDto.email` (was `@IsString()`, accepted malformed values)

---

## [0.1.1] - 2026-06-20

### Added
- `AuthModule`: register, login, refresh token, and logout endpoints
- `UsersModule`: user profile management
- Database migrations setup with TypeORM CLI
- `.env` validation with `@nestjs/config` + Joi schema

### Changed
- Migrated from Express to NestJS platform
- Refactored error responses to follow RFC 7807 (Problem Details)

### Fixed
- Token expiration not being respected in some edge cases
- Duplicate email registration not throwing the correct HTTP status

---

## [0.1.0] - 2025-11-01

### Added
- first deploy

