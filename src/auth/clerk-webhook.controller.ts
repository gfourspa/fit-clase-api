import {
    Body,
    Controller,
    Headers,
    HttpCode,
    HttpStatus,
    Logger,
    Post,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { createHmac } from 'crypto';
import type { ClerkWebhookEvent } from './dto/clerk-webhook.dto';
import { UserSyncService } from './user-sync.service';

/**
 * Controller para manejar webhooks de Clerk
 * 
 * Configuración en Clerk Dashboard:
 * 1. Ir a https://dashboard.clerk.com
 * 2. Seleccionar tu aplicación
 * 3. Ir a "Webhooks" en el menú lateral
 * 4. Click en "Add Endpoint"
 * 5. URL: https://tu-dominio.com/api/v1/webhooks/clerk
 * 6. Eventos a subscribir:
 *    - user.created
 *    - user.updated
 *    - user.deleted
 * 7. Copiar el "Signing Secret" y agregarlo a .env como CLERK_WEBHOOK_SECRET
 */
@ApiTags('Webhooks')
@Controller('webhooks/clerk')
export class ClerkWebhookController {
  private readonly logger = new Logger(ClerkWebhookController.name);

  constructor(
    private userSyncService: UserSyncService,
    private configService: ConfigService,
  ) {}

  /**
   * Endpoint para recibir webhooks de Clerk
   * 
   * @param svixId - ID del webhook (header svix-id)
   * @param svixTimestamp - Timestamp del webhook (header svix-timestamp)
   * @param svixSignature - Firma del webhook (header svix-signature)
   * @param body - Payload del webhook
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint() // Ocultar de Swagger
  async handleWebhook(
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
    @Body() body: ClerkWebhookEvent,
  ) {
    // Verificar que los headers estén presentes
    if (!svixId || !svixTimestamp || !svixSignature) {
      this.logger.warn('Webhook sin headers de Svix');
      throw new UnauthorizedException('Missing Svix headers');
    }

    // Verificar la firma del webhook
    const isValid = this.verifyWebhookSignature(
      svixId,
      svixTimestamp,
      JSON.stringify(body),
      svixSignature,
    );

    if (!isValid) {
      this.logger.warn('Webhook con firma inválida');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    this.logger.log(`Webhook recibido: ${body.type}`);

    try {
      // Manejar el evento según su tipo
      switch (body.type) {
        case 'user.created':
          await this.handleUserCreated(body);
          break;

        case 'user.updated':
          await this.handleUserUpdated(body);
          break;

        case 'user.deleted':
          await this.handleUserDeleted(body);
          break;

        default:
          this.logger.log(`Evento no manejado: ${body.type}`);
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Error procesando webhook: ${error.message}`);
      throw error;
    }
  }

  /**
   * Maneja el evento de usuario creado
   */
  private async handleUserCreated(event: ClerkWebhookEvent) {
    const userData = event.data;
    this.logger.log(
      `Usuario creado en Clerk: ${userData.email_addresses[0]?.email_address}`,
    );

    await this.userSyncService.syncUserFromWebhook(userData);
  }

  /**
   * Maneja el evento de usuario actualizado
   */
  private async handleUserUpdated(event: ClerkWebhookEvent) {
    const userData = event.data;
    this.logger.log(
      `Usuario actualizado en Clerk: ${userData.email_addresses[0]?.email_address}`,
    );

    await this.userSyncService.syncUserFromWebhook(userData);
  }

  /**
   * Maneja el evento de usuario eliminado
   */
  private async handleUserDeleted(event: ClerkWebhookEvent) {
    const userData = event.data;
    this.logger.log(`Usuario eliminado en Clerk: ${userData.id}`);

    await this.userSyncService.handleUserDeleted(userData.id);
  }

  /**
   * Verifica la firma del webhook usando el secret de Clerk
   * https://docs.svix.com/receiving/verifying-payloads/how
   */
  private verifyWebhookSignature(
    svixId: string,
    svixTimestamp: string,
    payload: string,
    svixSignature: string,
  ): boolean {
    const webhookSecret = this.configService.get<string>('CLERK_WEBHOOK_SECRET');

    if (!webhookSecret) {
      this.logger.warn(
        'CLERK_WEBHOOK_SECRET no configurado. Webhooks no pueden ser verificados.',
      );
      return false;
    }

    // Construir el payload firmado
    const signedPayload = `${svixId}.${svixTimestamp}.${payload}`;

    // Calcular la firma esperada
    const secret = webhookSecret.startsWith('whsec_')
      ? webhookSecret.substring(6)
      : webhookSecret;

    const secretBytes = Buffer.from(secret, 'base64');
    const signature = createHmac('sha256', secretBytes)
      .update(signedPayload)
      .digest('base64');

    // Clerk envía múltiples firmas separadas por espacios (v1, v2, etc)
    const signatures = svixSignature.split(' ');

    // Verificar si alguna firma coincide
    return signatures.some((sig) => {
      const [version, signatureValue] = sig.split(',');
      return signatureValue === signature;
    });
  }
}
