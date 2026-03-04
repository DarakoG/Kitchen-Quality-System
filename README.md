<div align="center">

# 🍳 Kitchen Quality System (KQS)

**Sistema Profesional SaaS para Control de Calidad en Cocinas Comerciales**

[![Next.js](https://img.shields.io/badge/Next.js%2016-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript%205-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma%206-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS%204-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

[Demo](#-demo) • [Características](#-características) • [Instalación](#-instalación) • [Documentación](#-documentación)

</div>

---

## 📖 Descripción

**Kitchen Quality System (KQS)** es una aplicación web profesional diseñada para la gestión integral del control de calidad en cocinas comerciales y restaurantes. Permite evaluar platos, gestionar incidencias, y mantener estándares de calidad de manera eficiente.

### 🎯 Problema que Resuelve

- **Falta de estandarización** en evaluaciones de calidad
- **Pérdida de información** en procesos manuales
- **Dificultad para rastrear** problemas recurrentes
- **Ausencia de métricas** para toma de decisiones

### ✅ Solución

KQS centraliza y automatiza el control de calidad con:
- Evaluaciones estandarizadas por plato
- Alertas automáticas para problemas recurrentes
- Dashboards en tiempo real por rol
- Trazabilidad completa de auditoría

---

## ✨ Características

### 🏢 Multi-empresa y Multi-sucursal
- Arquitectura SaaS escalable
- Aislamiento de datos por empresa
- Gestión de múltiples sucursales

### 👥 Sistema de Roles y Permisos
| Rol | Descripción |
|-----|-------------|
| 🔴 **Super Admin** | Control global del sistema, gestión de empresas |
| 🟠 **Company Admin** | Administración de empresa y sucursales |
| 🟡 **Branch Manager** | Gestión de sucursal y personal |
| 🟢 **Supervisor** | Evaluación de calidad y reportes |
| 🔵 **Auditor** | Consulta y auditoría de datos |

### 🍽️ Gestión de Platos
- CRUD completo con categorización
- Checklists personalizados por plato
- Plantillas de criterios reutilizables
- Tiempo de preparación configurables

### 📋 Control de Calidad
- **Tipos de criterios**:
  - Puntuación (1-5)
  - Sí/No (Booleano)
  - Numérico (rangos personalizados)
  - Texto (comentarios)
- Cálculo automático de score ponderado
- Estados: Aprobado / Rechazado / Pendiente

### 🚨 Sistema de Incidencias
- Registro de problemas de calidad
- Seguimiento de acciones correctivas
- Niveles de severidad: Baja, Media, Alta, Crítica
- Estados: Pendiente → En Progreso → Resuelto → Cerrado

### 🔔 Alertas Automáticas
- Detección de fallos repetidos
- Alertas por tiempo excesivo
- Notificaciones de bajo puntaje
- Incidentes críticos

### 📊 Dashboards Inteligentes
Dashboards personalizados según el rol del usuario:

| Dashboard | Contenido |
|-----------|-----------|
| **Super Admin** | Métricas globales, empresas, usuarios, actividad |
| **Company Admin** | Calidad por sucursal, ranking, tendencias |
| **Branch Manager** | KPIs de sucursal, personal, comparativas |
| **Supervisor** | Metas diarias, racha, evaluaciones propias |
| **Auditor** | Tendencias, incidentes, reportes |

### 📝 Auditoría Completa
- Registro de todos los cambios
- Historial de acciones por usuario
- Trazabilidad completa

---

## 🛠️ Stack Tecnológico

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| [Next.js](https://nextjs.org/) | 16 | Framework React SSR |
| [TypeScript](https://www.typescriptlang.org/) | 5 | Tipado estático |
| [Prisma](https://www.prisma.io/) | 6 | ORM y migraciones |
| [SQLite](https://www.sqlite.org/) / [PostgreSQL](https://www.postgresql.org/) | - | Base de datos |
| [Tailwind CSS](https://tailwindcss.com/) | 4 | Estilos utilitarios |
| [shadcn/ui](https://ui.shadcn.com/) | - | Componentes UI |
| [Zustand](https://zustand-demo.pmnd.rs/) | 5 | Estado global |
| [Recharts](https://recharts.org/) | 2 | Gráficos |
| [Zod](https://zod.dev/) | 4 | Validación |

---

## 📁 Estructura del Proyecto

```
kqs-kitchen-quality-system/
├── 📁 prisma/
│   ├── schema.prisma              # Esquema SQLite (desarrollo)
│   ├── schema.postgresql.prisma   # Esquema PostgreSQL (producción)
│   └── seed.ts                    # Datos de demostración
├── 📁 src/
│   ├── 📁 app/
│   │   ├── 📁 api/                # API Routes (REST)
│   │   │   ├── auth/              # Autenticación
│   │   │   ├── companies/          # Empresas
│   │   │   ├── branches/           # Sucursales
│   │   │   ├── users/              # Usuarios
│   │   │   ├── dishes/             # Platos
│   │   │   ├── categories/         # Categorías
│   │   │   ├── checklists/         # Criterios de calidad
│   │   │   ├── incidents/          # Incidencias
│   │   │   ├── alerts/             # Alertas
│   │   │   ├── dashboard/          # KPIs por rol
│   │   │   └── audit/              # Logs de auditoría
│   │   ├── layout.tsx              # Layout principal
│   │   └── page.tsx                # Página principal
│   ├── 📁 components/
│   │   ├── 📁 dashboards/          # Dashboards por rol
│   │   ├── 📁 layout/              # Layout principal
│   │   ├── 📁 views/               # Vistas de la app
│   │   └── 📁 ui/                  # Componentes shadcn/ui
│   ├── 📁 lib/
│   │   ├── api.ts                  # Cliente API
│   │   ├── auth.ts                 # Utilidades auth
│   │   ├── db.ts                   # Cliente Prisma
│   │   └── audit.ts                # Sistema auditoría
│   ├── 📁 store/                   # Estado global (Zustand)
│   └── 📁 types/                   # Tipos TypeScript
├── .env.example                    # Variables de entorno (template)
├── DEPLOYMENT.md                   # Guía de despliegue
├── vercel.json                     # Configuración Vercel
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🚀 Instalación

### Prerrequisitos

- [Node.js 18+](https://nodejs.org/) o [Bun](https://bun.sh/)
- [Git](https://git-scm.com/)

### Pasos de Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/tu-usuario/kqs-kitchen-quality-system.git
   cd kqs-kitchen-quality-system
   ```

2. **Instalar dependencias**
   ```bash
   bun install
   # o
   npm install
   ```

3. **Configurar base de datos**
   ```bash
   bun run db:push
   # o
   npm run db:push
   ```

4. **Cargar datos de demostración**
   ```bash
   bun run db:seed
   # o visitar /api/seed en el navegador
   ```

5. **Iniciar servidor de desarrollo**
   ```bash
   bun run dev
   # o
   npm run dev
   ```

6. **Abrir en el navegador**
   ```
   http://localhost:3000
   ```

### Configuración para Producción

Para desplegar en producción, necesitas cambiar a PostgreSQL:

1. **Configurar variables de entorno**:
   ```bash
   cp .env.example .env
   # Edita .env con tus valores de producción
   ```

2. **Cambiar a PostgreSQL**:
   ```bash
   cd prisma
   mv schema.prisma schema.sqlite.prisma
   mv schema.postgresql.prisma schema.prisma
   bunx prisma generate
   ```

3. **Configurar DATABASE_URL**:
   ```env
   # Para Neon
   DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/kqs?sslmode=require"
   
   # Para Supabase
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres"
   ```

---

## 👤 Cuentas de Demostración

| Rol | Email | Contraseña |
|-----|-------|------------|
| 🔴 Super Admin | `admin@kqs.com` | `admin123` |
| 🟠 Company Admin | `company@kqs.com` | `company123` |
| 🟡 Branch Manager | `manager@kqs.com` | `manager123` |
| 🟢 Supervisor | `supervisor@kqs.com` | `super123` |
| 🔵 Auditor | `auditor@kqs.com` | `auditor123` |

---

## 📊 API Endpoints

### Autenticación
```
POST   /api/auth/login      # Iniciar sesión
POST   /api/auth/logout     # Cerrar sesión
GET    /api/auth/me         # Usuario actual
```

### Recursos Principales
```
GET    /api/companies       # Listar empresas
POST   /api/companies       # Crear empresa
GET    /api/companies/:id   # Obtener empresa
PUT    /api/companies/:id   # Actualizar empresa
DELETE /api/companies/:id   # Eliminar empresa
```

```
GET    /api/branches        # Listar sucursales
POST   /api/branches        # Crear sucursal
GET    /api/branches/:id    # Obtener sucursal
PUT    /api/branches/:id    # Actualizar sucursal
DELETE /api/branches/:id    # Eliminar sucursal
```

```
GET    /api/users           # Listar usuarios
POST   /api/users           # Crear usuario
GET    /api/users/:id       # Obtener usuario
PUT    /api/users/:id       # Actualizar usuario
DELETE /api/users/:id       # Eliminar usuario
```

```
GET    /api/dishes          # Listar platos
POST   /api/dishes          # Crear plato
GET    /api/dishes/:id      # Obtener plato
PUT    /api/dishes/:id      # Actualizar plato
DELETE /api/dishes/:id      # Eliminar plato
```

```
GET    /api/incidents       # Listar incidencias
POST   /api/incidents       # Crear incidencia
GET    /api/incidents/:id   # Obtener incidencia
PUT    /api/incidents/:id   # Actualizar incidencia
DELETE /api/incidents/:id   # Eliminar incidencia
```

### Dashboards por Rol
```
GET    /api/dashboard/super-admin     # Dashboard Super Admin
GET    /api/dashboard/company-admin   # Dashboard Company Admin
GET    /api/dashboard/branch-manager  # Dashboard Branch Manager
GET    /api/dashboard/supervisor      # Dashboard Supervisor
GET    /api/dashboard/auditor         # Dashboard Auditor
```

---

## 🗄️ Modelo de Datos

```mermaid
erDiagram
    Company ||--o{ Branch : "tiene"
    Company ||--o{ User : "tiene"
    Company ||--o{ Category : "tiene"
    Company ||--o{ Dish : "tiene"
    
    Branch ||--o{ User : "tiene"
    Branch ||--o{ QualityReport : "genera"
    Branch ||--o{ Incident : "reporta"
    
    User ||--o{ QualityReport : "evalua"
    
    Category ||--o{ Dish : "contiene"
    
    Dish ||--o{ QualityChecklistItem : "tiene"
    Dish ||--o{ QualityReport : "evaluado_en"
    Dish ||--o{ Incident : "relacionado_con"
    
    QualityReport ||--o{ QualityReportItem : "contiene"
```

---

## 🔒 Permisos por Rol

| Acción | Super Admin | Company Admin | Branch Mgr | Supervisor | Auditor |
|--------|:-----------:|:-------------:|:----------:|:----------:|:-------:|
| Ver Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gestionar Empresas | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gestionar Sucursales | ✅ | ✅ | ❌ | ❌ | ❌ |
| Gestionar Usuarios | ✅ | ✅ | ❌ | ❌ | ❌ |
| Gestionar Platos | ✅ | ✅ | ❌ | ❌ | ❌ |
| Gestionar Categorías | ✅ | ✅ | ❌ | ❌ | ❌ |
| Crear Reportes | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gestionar Incidencias | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver Auditoría | ✅ | ✅ | ✅ | ❌ | ✅ |
| Gestionar Permisos | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## ☁️ Despliegue en Producción

### Plataformas Recomendadas

| Plataforma | Plan Gratuito | Base de Datos | Dificultad |
|------------|---------------|---------------|------------|
| [Vercel](https://vercel.com) | 100GB/mes | PostgreSQL externo | ⭐ Fácil |
| [Railway](https://railway.app) | $5 crédito/mes | SQLite o PostgreSQL | ⭐ Fácil |
| [Render](https://render.com) | 750 horas/mes | PostgreSQL incluido | ⭐⭐ Medio |
| [Fly.io](https://fly.io) | 3 VMs pequeñas | SQLite con volumen | ⭐⭐⭐ Avanzado |

### Despliegue Rápido en Vercel

1. **Crear base de datos PostgreSQL gratuita** en [Neon](https://neon.tech) o [Supabase](https://supabase.com)

2. **Cambiar a PostgreSQL** en tu repositorio:
   ```bash
   # Renombrar schema para PostgreSQL
   cd prisma
   mv schema.prisma schema.sqlite.prisma
   mv schema.postgresql.prisma schema.prisma
   git add . && git commit -m "Switch to PostgreSQL" && git push
   ```

3. **Desplegar en Vercel**:
   - Ve a [vercel.com](https://vercel.com) y conéctate con GitHub
   - Importa tu repositorio
   - Configura las variables de entorno:
     - `DATABASE_URL` = Tu conexión PostgreSQL
     - `NEXTAUTH_SECRET` = Genera con `openssl rand -base64 32`
     - `NEXTAUTH_URL` = Tu dominio (ej: `https://kqs.vercel.app`)

4. **Inicializar base de datos**:
   - Visita `https://tu-app.vercel.app/api/seed` para crear datos iniciales

📖 **Guía detallada**: Ver [DEPLOYMENT.md](./DEPLOYMENT.md) para instrucciones completas de todas las plataformas.

---

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Haz un Fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/NuevaCaracteristica`)
3. Commit tus cambios (`git commit -m 'Agrega nueva característica'`)
4. Push a la rama (`git push origin feature/NuevaCaracteristica`)
5. Abre un Pull Request

### Guías de Contribución
- Sigue el estilo de código existente
- Escribe tests para nuevas funcionalidades
- Actualiza la documentación cuando sea necesario

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

---

## 📞 Soporte

¿Tienes preguntas o problemas?

- 📧 Email: soporte@kqs.com
- 🐛 Issues: [GitHub Issues](https://github.com/tu-usuario/kqs-kitchen-quality-system/issues)

---

<div align="center">

**Hecho con ❤️ para la industria de restaurantes**

[⬆ Volver arriba](#-kitchen-quality-system-kqs)

</div>
