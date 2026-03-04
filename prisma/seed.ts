import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

// ============================================
// CONFIGURACIÓN DEL SUPER ADMIN
// Modifica estos valores según necesites
// ============================================
const SUPER_ADMIN_CONFIG = {
  email: 'admin@kqs.com',
  password: 'Admin123!',  // Cambia esta contraseña en producción
  name: 'Super Admin',
  phone: '+1-555-0001',
};

async function main() {
  console.log('🔧 Configurando Super Admin...');
  console.log(`📧 Email: ${SUPER_ADMIN_CONFIG.email}`);
  console.log(`🔑 Password: ${SUPER_ADMIN_CONFIG.password}`);

  // Hash password
  const hashedPassword = await bcrypt.hash(SUPER_ADMIN_CONFIG.password, SALT_ROUNDS);
  console.log('✅ Password hasheado correctamente');

  // Buscar si ya existe un super admin
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { role: UserRole.SUPER_ADMIN },
  });

  if (existingSuperAdmin) {
    // Actualizar el super admin existente
    const updated = await prisma.user.update({
      where: { id: existingSuperAdmin.id },
      data: {
        email: SUPER_ADMIN_CONFIG.email,
        password: hashedPassword,
        name: SUPER_ADMIN_CONFIG.name,
        phone: SUPER_ADMIN_CONFIG.phone,
        isActive: true,
      },
    });
    console.log('\n✅ Super Admin actualizado correctamente:');
    console.log(`   ID: ${updated.id}`);
    console.log(`   Nombre: ${updated.name}`);
    console.log(`   Email: ${updated.email}`);
  } else {
    // Crear nuevo super admin
    const superAdmin = await prisma.user.create({
      data: {
        email: SUPER_ADMIN_CONFIG.email,
        password: hashedPassword,
        name: SUPER_ADMIN_CONFIG.name,
        role: UserRole.SUPER_ADMIN,
        phone: SUPER_ADMIN_CONFIG.phone,
        isActive: true,
      },
    });
    console.log('\n✅ Super Admin creado correctamente:');
    console.log(`   ID: ${superAdmin.id}`);
    console.log(`   Nombre: ${superAdmin.name}`);
    console.log(`   Email: ${superAdmin.email}`);
  }

  console.log('\n🔐 Credenciales de acceso:');
  console.log(`   Email: ${SUPER_ADMIN_CONFIG.email}`);
  console.log(`   Password: ${SUPER_ADMIN_CONFIG.password}`);
  console.log('\n⚠️  IMPORTANTE: Cambia la contraseña después del primer inicio de sesión en producción!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
