/**
 * DTOs para manejar webhooks de Clerk
 * https://clerk.com/docs/integrations/webhooks/overview
 */

export interface ClerkWebhookEvent {
  data: ClerkWebhookUserData;
  object: 'event';
  type: ClerkWebhookEventType;
}

export type ClerkWebhookEventType =
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'session.created'
  | 'session.ended'
  | 'session.removed'
  | 'session.revoked';

export interface ClerkWebhookUserData {
  id: string;
  object: 'user';
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  image_url: string;
  has_image: boolean;
  primary_email_address_id: string | null;
  primary_phone_number_id: string | null;
  primary_web3_wallet_id: string | null;
  password_enabled: boolean;
  two_factor_enabled: boolean;
  totp_enabled: boolean;
  backup_code_enabled: boolean;
  email_addresses: ClerkEmailAddress[];
  phone_numbers: ClerkPhoneNumber[];
  web3_wallets: any[];
  external_accounts: any[];
  saml_accounts: any[];
  public_metadata: Record<string, any>;
  private_metadata: Record<string, any>;
  unsafe_metadata: Record<string, any>;
  external_id: string | null;
  last_sign_in_at: number | null;
  banned: boolean;
  locked: boolean;
  lockout_expires_in_seconds: number | null;
  verification_attempts_remaining: number | null;
  created_at: number;
  updated_at: number;
  delete_self_enabled: boolean;
  create_organization_enabled: boolean;
  last_active_at: number | null;
  mfa_enabled_at: number | null;
  mfa_disabled_at: number | null;
  legal_accepted_at: number | null;
  profile_image_url: string;
}

export interface ClerkEmailAddress {
  id: string;
  object: 'email_address';
  email_address: string;
  reserved: boolean;
  verification: {
    status: 'verified' | 'unverified';
    strategy: string;
    attempts: number | null;
    expire_at: number | null;
  } | null;
  linked_to: any[];
  created_at: number;
  updated_at: number;
}

export interface ClerkPhoneNumber {
  id: string;
  object: 'phone_number';
  phone_number: string;
  reserved_for_second_factor: boolean;
  default_second_factor: boolean;
  reserved: boolean;
  verification: {
    status: 'verified' | 'unverified';
    strategy: string;
    attempts: number | null;
    expire_at: number | null;
  } | null;
  linked_to: any[];
  backup_codes: string[] | null;
  created_at: number;
  updated_at: number;
}

/**
 * DTO para sincronización de usuario
 */
export class SyncUserDto {
  clerkUserId: string;
  email: string;
  name: string;
  role?: string;
  imageUrl?: string;
}
