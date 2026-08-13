import { Global, Module } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { FirebaseAuthGuard } from './firebase-auth.guard';

@Global()
@Module({
  providers: [FirebaseAuthGuard, RolesGuard],
  exports: [FirebaseAuthGuard, RolesGuard],
})
export class AuthModule {}
