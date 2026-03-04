# Kitchen Quality System (KQS)

Sistema profesional SaaS para el control de calidad de productos cocinados en restaurantes.

## 🚀 Características Principales

### Multi-empresa y Multi-sucursal
- Arquitectura SaaS escalable
- Aislamiento de datos por empresa
- Gestión de múltiples sucursales

### Sistema de Roles
- **Super Admin**: Control global del sistema
- **Company Admin**: Administración de empresa
- **Branch Manager**: Gestión de sucursal
- **Supervisor**: Evaluación de calidad
- **Auditor**: Consulta y auditoría

### Gestión de Platos
- CRUD completo de platos
- Categorización
- Configuración de tiempo de preparación
- Checklists personalizados por plato

### Control de Calidad
- Evaluación con checklists configurables
- Tipos de criterios: Puntuación (1-5), Booleano, Numérico, Texto
- Cálculo automático de score
- Estados: Aprobado / Rechazado / Pendiente de revisión

### Sistema de Incidencias
- Registro de problemas de calidad
- Seguimiento de acciones correctivas
- Estados: Pendiente, En progreso, Resuelto, Cerrado
- Severidad: Baja, Media, Alta, Crítica

### Alertas Automáticas
- Fallos repetidos
- Tiempo excesivo
- Bajo puntaje promedio
- Incidentes críticos

### Dashboard Gerencial
- KPIs en tiempo real
- % de aprobación
- Tiempo promedio de salida
- Platos con más incidencias
- Rendimiento por sucursal
- Tendencias diarias

### Auditoría Completa
- Registro de todos los cambios
- Historial de acciones
- Trazabilidad completa

## 🛠️ Stack Tecnológico

- **Framework**: Next.js 16 (App Router)
- **Lenguaje**: TypeScript 5
- **Base de datos**: SQLite con Prisma ORM
- **UI**: Tailwind CSS 4 + shadcn/ui
- **Estado**: Zustand
- **Gráficos**: Recharts
- **Validación**: Zod
- **Autenticación**: bcrypt para hashing de contraseñas

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── api/
│   │   ├── auth/          # Autenticación
│   │   ├── companies/     # Gestión de empresas
│   │   ├── branches/      # Gestión de sucursales
│   │   ├── users/         # Gestión de usuarios
│   │   ├── dishes/        # Gestión de platos
│   │   ├── categories/    # Categorías
│   │   ├── checklists/    # Checklists de calidad
│   │   ├── quality-reports/ # Reportes de calidad
│   │   ├── incidents/     # Incidencias
│   │   ├── alerts/        # Alertas
│   │   ├── dashboard/     # KPIs del dashboard
│   │   └── audit/         # Logs de auditoría
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── auth/              # Componentes de autenticación
│   ├── layout/            # Layout principal
│   ├── views/             # Vistas de la aplicación
│   └── ui/                # Componentes shadcn/ui
├── lib/
│   ├── api.ts             # Cliente API
│   ├── auth.ts            # Utilidades de autenticación
│   ├── audit.ts           # Sistema de auditoría
│   ├── api-response.ts    # Helpers de respuesta
│   └── db.ts              # Cliente Prisma
├── store/
│   └── auth-store.ts      # Estado de autenticación
└── types/
    └── index.ts           # Tipos TypeScript

prisma/
└── schema.prisma          # Esquema de base de datos
```

## 🗄️ Modelo de Datos

### Entidades Principales
1. **Company** - Empresas/Organizaciones
2. **Branch** - Sucursales/Locaciones
3. **User** - Usuarios con roles
4. **Category** - Categorías de platos
5. **Dish** - Platos del menú
6. **QualityChecklistItem** - Criterios de evaluación
7. **QualityReport** - Reportes de calidad
8. **QualityReportItem** - Respuestas a criterios
9. **Incident** - Incidencias
10. **Alert** - Alertas automáticas
11. **AuditLog** - Registro de auditoría
12. **Setting** - Configuración del sistema

## 🚀 Inicio Rápido

### 1. Instalar dependencias
```bash
bun install
```

### 2. Configurar base de datos
```bash
bun run db:push
```

### 3. Sembrar datos de demostración
Visita `/api/seed` en tu navegador o ejecuta:
```bash
curl http://localhost:3000/api/seed
```

### 4. Iniciar servidor de desarrollo
```bash
bun run dev
```

## 👤 Cuentas de Demostración

| Rol | Email | Contraseña |
|-----|-------|------------|
| Super Admin | admin@kqs.com | admin123 |
| Company Admin | company@kqs.com | company123 |
| Branch Manager | manager@kqs.com | manager123 |
| Supervisor | supervisor@kqs.com | super123 |

## 📊 API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/me` - Usuario actual

### Empresas (Super Admin)
- `GET /api/companies` - Listar empresas
- `POST /api/companies` - Crear empresa
- `GET /api/companies/[id]` - Obtener empresa
- `PUT /api/companies/[id]` - Actualizar empresa
- `DELETE /api/companies/[id]` - Eliminar empresa

### Sucursales
- `GET /api/branches` - Listar sucursales
- `POST /api/branches` - Crear sucursal
- `GET /api/branches/[id]` - Obtener sucursal
- `PUT /api/branches/[id]` - Actualizar sucursal
- `DELETE /api/branches/[id]` - Eliminar sucursal

### Usuarios
- `GET /api/users` - Listar usuarios
- `POST /api/users` - Crear usuario
- `GET /api/users/[id]` - Obtener usuario
- `PUT /api/users/[id]` - Actualizar usuario
- `DELETE /api/users/[id]` - Eliminar usuario

### Platos
- `GET /api/dishes` - Listar platos
- `POST /api/dishes` - Crear plato
- `GET /api/dishes/[id]` - Obtener plato
- `PUT /api/dishes/[id]` - Actualizar plato
- `DELETE /api/dishes/[id]` - Eliminar plato

### Categorías
- `GET /api/categories` - Listar categorías
- `POST /api/categories` - Crear categoría
- `GET /api/categories/[id]` - Obtener categoría
- `PUT /api/categories/[id]` - Actualizar categoría
- `DELETE /api/categories/[id]` - Eliminar categoría

### Checklists
- `GET /api/checklists` - Listar items de checklist
- `POST /api/checklists` - Crear item
- `GET /api/checklists/[id]` - Obtener item
- `PUT /api/checklists/[id]` - Actualizar item
- `DELETE /api/checklists/[id]` - Eliminar item

### Reportes de Calidad
- `GET /api/quality-reports` - Listar reportes
- `POST /api/quality-reports` - Crear reporte
- `GET /api/quality-reports/[id]` - Obtener reporte

### Incidencias
- `GET /api/incidents` - Listar incidencias
- `POST /api/incidents` - Crear incidencia
- `GET /api/incidents/[id]` - Obtener incidencia
- `PUT /api/incidents/[id]` - Actualizar incidencia
- `DELETE /api/incidents/[id]` - Eliminar incidencia

### Alertas
- `GET /api/alerts` - Listar alertas
- `GET /api/alerts/[id]` - Obtener alerta
- `PUT /api/alerts/[id]` - Reconocer/Cerrar alerta

### Dashboard
- `GET /api/dashboard` - Obtener KPIs

### Auditoría
- `GET /api/audit` - Listar logs de auditoría

## 📝 Licencia

MIT License
