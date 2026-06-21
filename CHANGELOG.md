# Changelog
 
All notable changes to this project will be documented in this file.
 
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
 
 
## [0.1.1] - 2026-06-20

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
 
## [0.1.0] - 2025-11-01
 
### Added
- first deploy
