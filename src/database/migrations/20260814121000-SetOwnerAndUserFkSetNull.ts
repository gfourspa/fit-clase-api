import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetOwnerAndUserFkSetNull20260814121000
  implements MigrationInterface
{
  name = 'SetOwnerAndUserFkSetNull20260814121000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "gyms" ALTER COLUMN "ownerId" DROP NOT NULL`);

    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN (
          SELECT tc.constraint_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = 'gyms'
            AND kcu.column_name = 'ownerId'
        ) LOOP
          EXECUTE format('ALTER TABLE "gyms" DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
        END LOOP;
      END $$;
    `);

    await queryRunner.query(
      `ALTER TABLE "gyms" ADD CONSTRAINT "FK_gyms_owner_users" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL`,
    );

    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "gymId" DROP NOT NULL`);

    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN (
          SELECT tc.constraint_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = 'users'
            AND kcu.column_name = 'gymId'
        ) LOOP
          EXECUTE format('ALTER TABLE "users" DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
        END LOOP;
      END $$;
    `);

    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_users_gym_gyms" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_gym_gyms"`,
    );
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "gymId" SET NOT NULL`);

    await queryRunner.query(
      `ALTER TABLE "gyms" DROP CONSTRAINT IF EXISTS "FK_gyms_owner_users"`,
    );
    await queryRunner.query(`ALTER TABLE "gyms" ALTER COLUMN "ownerId" SET NOT NULL`);
  }
}
