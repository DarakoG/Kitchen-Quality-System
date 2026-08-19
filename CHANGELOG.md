# Changelog

Todos los cambios notables a este proyecto se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/),
y este proyecto sigue [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]

### Por hacer
- Tests automatizados (unit + integration)
- Pipeline de CI/CD (GitHub Actions)
- Internacionalización completa (ES / EN)
- Notificaciones por email para alertas críticas
- Exportación de reportes (PDF / Excel)
- 2FA para cuentas de empresa

## [1.0.0] - 2026-08-19

🎉 **Primera versión pública open source.**

### Added
- Sistema de autenticación con bcrypt y cookies httpOnly
- Sistema de roles y permisos granular: Super Admin, Company Admin, Branch Manager, Supervisor, Auditor
- Dashboards personalizados por rol con KPIs en tiempo real
- Gestión multi-empresa y multi-sucursal con aislamiento de datos
- CRUD completo de empresas, sucursales, usuarios, categorías y platos
- Sistema de evaluación de calidad con checklists configurables por plato
- Tipos de criterio: Puntuación (1-5), Sí/No, Numérico (rangos), Texto
- Cálculo automático de score ponderado por checklist
- Sistema de incidencias con niveles de severidad (Baja, Media, Alta, Crítica)
- Estados de incidencia: Pendiente → En Progreso → Resuelto → Cerrado
- Alertas automáticas por fallos repetidos, bajo puntaje y tiempo excesivo
- Sistema de auditoría completo (AuditLog por empresa y por fecha)
- API REST completa bajo `/api/*` con validación Zod
- Soporte dual de base de datos: SQLite (desarrollo) y PostgreSQL (producción)
- Schema Prisma con dos archivos: `schema.prisma` (SQLite) y `schema.postgresql.prisma`
- Dockerfile multi-stage con healthcheck y usuario no-root
- docker-compose con backup automático diario (rotación de 7 días)
- Guías de despliegue verificadas para Vercel, Railway, Render y Fly.io
- Documentación completa: README bilingüe, DEPLOYMENT.md, env.example
- Plantillas de checklists reutilizables entre platos
- Reordenamiento de checklists vía drag & drop (@dnd-kit)
- Gráficos interactivos con Recharts en todos los dashboards
- TanStack Table para tablas server-side con filtros y ordenamiento
- TanStack Query para cache de estado del servidor
- next-intl integrado (preparado para multi-idioma)

### Changed
- N/A (versión inicial pública)

### Fixed
- N/A (versión inicial pública)

### Removed
- N/A (versión inicial pública)

### Security
- Contraseñas hasheadas con bcrypt (cost 12)
- Cookies httpOnly para sesión
- Validación de entrada con Zod en todos los endpoints
- Aislamiento de datos por `companyId` en queries de Prisma
- Roles enforced server-side en cada ruta API

## [0.x] - 2024 a 2025

Versiones internas previas a la publicación open source. El proyecto comenzó como
herramienta interna y se liberó como open source en 2026.
