# 🚀 Guía de Despliegue - Kitchen Quality System

Esta guía te explica paso a paso cómo desplegar KQS en diferentes plataformas cloud gratuitas.

---

## 📋 Requisitos Previos

- Cuenta de GitHub con el repositorio subido
- Tarjeta de crédito/débito para verificación (algunas plataformas lo requieren, no se cobra)

---

## 🌟 Opción 1: Vercel (RECOMENDADO)

Vercel es la plataforma oficial de Next.js, ofrece el mejor rendimiento y la integración más sencilla.

### Paso 1: Crear base de datos PostgreSQL gratuita

#### Opción A: Neon (Recomendado)
1. Ve a [neon.tech](https://neon.tech)
2. Clic en "Sign Up" y regístrate con GitHub
3. Clic en "Create a project"
4. Nombre: `kqs-database`
5. Región: Selecciona la más cercana a ti
6. Clic en "Create project"
7. **Copia la cadena de conexión** que aparece (algo como):
   ```
   postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/kqs?sslmode=require
   ```
8. Guárdala para más tarde

#### Opción B: Supabase
1. Ve a [supabase.com](https://supabase.com)
2. Clic en "Start your project"
3. Conecta con GitHub
4. Nombre del proyecto: `kqs`
5. Database Password: Crea una contraseña segura
6. Región: Selecciona la más cercana
7. Espera ~2 minutos a que se cree
8. Ve a **Settings → Database**
9. Copia la **Connection string** (URI format)
10. Reemplaza `[YOUR-PASSWORD]` con tu contraseña

### Paso 2: Preparar el repositorio

Antes de desplegar, necesitas cambiar a PostgreSQL:

1. En tu repositorio, renombra el archivo de schema:
   ```bash
   # En tu computadora local
   cd prisma
   mv schema.prisma schema.sqlite.prisma    # Backup del SQLite
   mv schema.postgresql.prisma schema.prisma # Usar PostgreSQL
   ```

2. Edita `prisma/schema.prisma` y asegúrate que diga:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. Sube los cambios a GitHub:
   ```bash
   git add .
   git commit -m "Switch to PostgreSQL for production"
   git push origin main
   ```

### Paso 3: Desplegar en Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Clic en "Sign Up" y elige "Continue with GitHub"
3. Autoriza a Vercel para acceder a tus repositorios
4. Clic en "Add New..." → "Project"
5. Importa tu repositorio `kqs-kitchen-quality-system`
6. Configura las variables de entorno:

   | Nombre | Valor |
   |--------|-------|
   | `DATABASE_URL` | Tu cadena de conexión PostgreSQL |
   | `NEXTAUTH_SECRET` | Ejecuta `openssl rand -base64 32` para generarlo |
   | `NEXTAUTH_URL` | Tu dominio de Vercel (ej: `https://kqs.vercel.app`) |

7. Clic en "Deploy"
8. Espera ~3-5 minutos

### Paso 4: Inicializar la base de datos

Después del primer despliegue, necesitas crear las tablas:

1. En el dashboard de Vercel, ve a tu proyecto
2. Clic en "Storage" → "Connect to Store" (si usas Neon)
3. O usa Vercel CLI:
   ```bash
   npx vercel env pull .env.local
   npx prisma db push
   npx prisma db seed
   ```

4. Alternativamente, usa la consola de Neon/Supabase:
   - Ve a "SQL Editor"
   - Ejecuta el schema generado por Prisma

### Paso 5: Crear el usuario administrador

1. Ve a la consola de tu base de datos (Neon o Supabase)
2. Ejecuta este SQL:
   ```sql
   INSERT INTO "User" (id, email, password, name, role, "isActive", "createdAt", "updatedAt")
   VALUES (
     'admin_001',
     'admin@tudominio.com',
     -- Contraseña: admin123 (hasheada con bcrypt)
     '$2b$10$rQZ9QxZ9QxZ9QxZ9QxZ9QeK5mY9QxZ9QxZ9QxZ9QxZ9QxZ9QxZ9Q',
     'Administrador',
     'SUPER_ADMIN',
     true,
     NOW(),
     NOW()
   );
   ```

O usa el endpoint de seed: `GET /api/seed`

---

## 🚂 Opción 2: Railway (Con SQLite persistente)

Railway permite usar SQLite con volumen persistente, por lo que no necesitas cambiar la base de datos.

### Paso 1: Crear cuenta
1. Ve a [railway.app](https://railway.app)
2. Clic en "Start a New Project"
3. Elige "Deploy from GitHub repo"
4. Selecciona tu repositorio

### Paso 2: Configurar variables de entorno
1. Ve a "Variables"
2. Agrega:
   ```
   DATABASE_URL=file:/app/data/kqs.db
   NEXTAUTH_SECRET=tu-secreto-aqui
   NEXTAUTH_URL=https://tu-app.railway.app
   ```

### Paso 3: Agregar volumen persistente
1. Ve a "Settings" → "Volumes"
2. Clic en "Add Volume"
3. Mount path: `/app/data`
4. Esto preserva tu base de datos SQLite

### Paso 4: Configurar comando de inicio
En "Settings" → "Start Command":
```bash
bunx prisma db push && bunx prisma db seed && bun start
```

---

## 🐳 Opción 3: Render

### Paso 1: Crear base de datos
1. Ve a [render.com](https://render.com)
2. Clic en "New" → "PostgreSQL"
3. Nombre: `kqs-db`
4. Región: La más cercana
5. Clic en "Create Database"
6. Copia la "Internal Database URL"

### Paso 2: Crear Web Service
1. Clic en "New" → "Web Service"
2. Conecta tu repositorio de GitHub
3. Configura:
   - **Name**: `kqs`
   - **Environment**: `Node`
   - **Build Command**: `bun install && bunx prisma generate && bun run build`
   - **Start Command**: `bun start`

4. Agrega variables de entorno:
   - `DATABASE_URL`: Tu URL de PostgreSQL
   - `NEXTAUTH_SECRET`: Genera uno con `openssl rand -base64 32`
   - `NEXTAUTH_URL`: `https://tu-app.onrender.com`

---

## 🎯 Opción 4: Fly.io (Con volumen persistente)

### Paso 1: Instalar Fly CLI
```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

### Paso 2: Crear aplicación
```bash
cd tu-proyecto
fly apps create kqs
```

### Paso 3: Crear volumen persistente
```bash
fly volumes create data --size 1
```

### Paso 4: Configurar secrets
```bash
fly secrets set DATABASE_URL="file:/data/kqs.db"
fly secrets set NEXTAUTH_SECRET="tu-secreto"
fly secrets set NEXTAUTH_URL="https://kqs.fly.dev"
```

### Paso 5: Crear fly.toml
```toml
app = "kqs"
primary_region = "mia"

[build]
  builder = "heroku/buildpacks:20"

[env]
  PORT = "8080"

[mounts]
  source = "data"
  destination = "/data"

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

### Paso 6: Desplegar
```bash
fly deploy
```

---

## 📊 Comparación de Plataformas

| Plataforma | Plan Gratuito | Base de Datos | Mejor para |
|------------|---------------|---------------|------------|
| **Vercel** | 100GB bandwidth | PostgreSQL externo | Producción seria |
| **Railway** | $5 crédito/mes | SQLite o PostgreSQL | Facilidad de uso |
| **Render** | 750 horas/mes | PostgreSQL incluido | Todo en uno |
| **Fly.io** | 3 VMs pequeñas | SQLite con volumen | Control total |

---

## ✅ Lista de Verificación Post-Despliegue

- [ ] La aplicación carga correctamente
- [ ] Puedo iniciar sesión
- [ ] Puedo crear una empresa
- [ ] Puedo crear sucursales
- [ ] Puedo crear usuarios
- [ ] Los datos persisten después de reiniciar

---

## 🔧 Solución de Problemas Comunes

### Error: "Prisma Client could not be generated"
```bash
bunx prisma generate
```

### Error: "Database connection failed"
- Verifica que DATABASE_URL esté correcto
- Verifica que la base de datos esté activa
- Verifica las reglas de firewall

### Error: "NextAuth.js configuration error"
- Verifica NEXTAUTH_SECRET y NEXTAUTH_URL
- Asegúrate de que NEXTAUTH_URL incluya `https://`

### Error: "500 Internal Server Error"
- Revisa los logs de la plataforma
- Verifica que todas las variables de entorno estén configuradas

---

## 📞 Soporte

Si encuentras problemas, revisa:
1. Los logs de tu plataforma (Vercel Dashboard, Railway, etc.)
2. La consola del navegador (F12 → Console)
3. La documentación de Prisma: [prisma.io/docs](https://prisma.io/docs)
4. La documentación de Next.js: [nextjs.org/docs](https://nextjs.org/docs)
