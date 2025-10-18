import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ClerkService } from '../src/auth/clerk.service';
import { UserSyncService } from '../src/auth/user-sync.service';

/**
 * Script para sincronizar usuarios de Clerk manualmente
 * Útil para desarrollo local sin webhooks
 * 
 * Uso:
 *   npm run sync-users
 * 
 * O sincronizar un usuario específico:
 *   npm run sync-users -- user_2abc123
 */
async function syncUsers() {
  console.log('🔄 Iniciando sincronización manual de usuarios...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  
  const userSyncService = app.get(UserSyncService);
  const clerkService = app.get(ClerkService);

  try {
    // Si se pasa un userId como argumento, sincronizar solo ese usuario
    const userIdArg = process.argv[2];

    if (userIdArg) {
      console.log(`📥 Sincronizando usuario específico: ${userIdArg}`);
      await syncSingleUser(userIdArg, clerkService, userSyncService);
    } else {
      console.log('📥 Sincronizando todos los usuarios de Clerk...');
      await syncAllUsers(clerkService, userSyncService);
    }

    console.log('\n✅ Sincronización completada!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error durante la sincronización:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

/**
 * Sincroniza un usuario específico
 */
async function syncSingleUser(
  userId: string,
  clerkService: ClerkService,
  userSyncService: UserSyncService,
) {
  try {
    // Obtener usuario de Clerk
    const clerkUser = await clerkService.getUserById(userId);

    // Obtener email primario
    const primaryEmail = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    );

    if (!primaryEmail) {
      throw new Error('Usuario sin email primario');
    }

    // Construir nombre
    const name = [clerkUser.firstName, clerkUser.lastName]
      .filter(Boolean)
      .join(' ') || primaryEmail.emailAddress;

    // Sincronizar
    await userSyncService.syncUser({
      clerkUserId: clerkUser.id,
      email: primaryEmail.emailAddress,
      name,
      role: clerkUser.publicMetadata?.role as string,
      imageUrl: clerkUser.imageUrl,
    });

    console.log(`   ✓ ${primaryEmail.emailAddress} (${clerkUser.id})`);
    console.log(`     Nombre: ${name}`);
    console.log(`     Rol: ${clerkUser.publicMetadata?.role || 'STUDENT'}`);
  } catch (error) {
    console.error(`   ✗ Error: ${error.message}`);
    throw error;
  }
}

/**
 * Sincroniza todos los usuarios de Clerk
 */
async function syncAllUsers(
  clerkService: ClerkService,
  userSyncService: UserSyncService,
) {
  try {
    // Obtener todos los usuarios de Clerk
    const users = await clerkService.listUsers();

    console.log(`📊 Total de usuarios en Clerk: ${users.length}\n`);

    let synced = 0;
    let errors = 0;

    for (const clerkUser of users) {
      try {
        // Obtener email primario
        const primaryEmail = clerkUser.emailAddresses.find(
          (e) => e.id === clerkUser.primaryEmailAddressId,
        );

        if (!primaryEmail) {
          console.log(`   ⚠️  Usuario ${clerkUser.id} sin email primario, omitiendo...`);
          continue;
        }

        // Construir nombre
        const name = [clerkUser.firstName, clerkUser.lastName]
          .filter(Boolean)
          .join(' ') || primaryEmail.emailAddress;

        // Sincronizar
        await userSyncService.syncUser({
          clerkUserId: clerkUser.id,
          email: primaryEmail.emailAddress,
          name,
          role: clerkUser.publicMetadata?.role as string,
          imageUrl: clerkUser.imageUrl,
        });

        console.log(`   ✓ ${primaryEmail.emailAddress} (${clerkUser.id})`);
        synced++;
      } catch (error) {
        console.error(`   ✗ Error con ${clerkUser.id}: ${error.message}`);
        errors++;
      }
    }

    console.log(`\n📈 Resumen:`);
    console.log(`   Sincronizados: ${synced}`);
    console.log(`   Errores: ${errors}`);
  } catch (error) {
    console.error('Error obteniendo usuarios de Clerk:', error.message);
    throw error;
  }
}

// Ejecutar script
syncUsers();
