import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1787969711194 implements MigrationInterface {
    name = 'InitialSchema1787969711194'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await this.createEnumIfNotExists(queryRunner, 'reservations_status_enum', "'RESERVED', 'CANCELED', 'ATTENDED', 'MISSED'");
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "reservations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "classId" uuid NOT NULL, "studentId" uuid NOT NULL, "status" "public"."reservations_status_enum" NOT NULL DEFAULT 'RESERVED', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_da95cef71b617ac35dc5bcda243" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_reservations_active_class_student" ON "reservations" ("classId", "studentId") WHERE status = 'RESERVED'`);
        await this.createEnumIfNotExists(queryRunner, 'users_role_enum', "'SUPER_ADMIN', 'OWNER_GYM', 'TEACHER', 'STUDENT'");
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "users" ("id" uuid NOT NULL, "firebase_uid" character varying(255), "name" character varying(255), "email" character varying(255), "role" "public"."users_role_enum" NOT NULL DEFAULT 'STUDENT', "gymId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "UQ_0fd54ced5cc75f7cb92925dd803" UNIQUE ("firebase_uid"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_0fd54ced5cc75f7cb92925dd80" ON "users" ("firebase_uid") `);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "gyms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "address" text NOT NULL, "contact" character varying(100) NOT NULL, "ownerId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_fe765086496cf3c8475652cddcb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "disciplines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "description" text, "gymId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_9b25ea6da0741577a73c9e90aad" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "classes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "gymId" uuid NOT NULL, "disciplineId" uuid NOT NULL, "teacherId" uuid NOT NULL, "date" date NOT NULL, "startTime" TIME NOT NULL, "endTime" TIME NOT NULL, "capacity" integer NOT NULL, CONSTRAINT "PK_e207aa15404e9b2ce35910f9f7f" PRIMARY KEY ("id"))`);
        await this.createEnumIfNotExists(queryRunner, 'invitations_status_enum', "'PENDING', 'USED', 'EXPIRED', 'CANCELED'");
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "invitations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "gymId" uuid NOT NULL, "tokenHash" character varying(64) NOT NULL, "email" character varying(255) NOT NULL, "createdByUserId" uuid, "status" "public"."invitations_status_enum" NOT NULL DEFAULT 'PENDING', "usedByUserId" uuid, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "usedAt" TIMESTAMP WITH TIME ZONE, "canceledAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5dec98cfdfd562e4ad3648bbb07" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_a6eb6f2543de8a5a4c148b32a1" ON "invitations" ("tokenHash") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_13ad5a8d6b8f4f063d0c1f22ff" ON "invitations" ("createdByUserId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_invitations_pending_email_gym" ON "invitations" ("gymId", "email") WHERE "status" = 'PENDING'`);

        // Foreign keys: PostgreSQL does not support ADD CONSTRAINT IF NOT EXISTS.
        await this.addForeignKeyIfNotExists(queryRunner, 'reservations', 'FK_c45c027ce0171c67c332d18ecd7', 'classId', 'classes', 'id', 'NO ACTION', 'NO ACTION');
        await this.addForeignKeyIfNotExists(queryRunner, 'reservations', 'FK_c2964ebcbde93fc600fb2a54330', 'studentId', 'users', 'id', 'NO ACTION', 'NO ACTION');
        await this.addForeignKeyIfNotExists(queryRunner, 'users', 'FK_c2eb2f3b7991ab4186947ebf6ad', 'gymId', 'gyms', 'id', 'SET NULL', 'NO ACTION');
        await this.addForeignKeyIfNotExists(queryRunner, 'gyms', 'FK_521129f3c47351ebffbddc55dd2', 'ownerId', 'users', 'id', 'SET NULL', 'NO ACTION');
        await this.addForeignKeyIfNotExists(queryRunner, 'disciplines', 'FK_62228e97f7661674f9ee6df0187', 'gymId', 'gyms', 'id', 'CASCADE', 'NO ACTION');
        await this.addForeignKeyIfNotExists(queryRunner, 'classes', 'FK_888ef7551efecef2f01dfda1694', 'gymId', 'gyms', 'id', 'NO ACTION', 'NO ACTION');
        await this.addForeignKeyIfNotExists(queryRunner, 'classes', 'FK_96f6b4319eb1f5c48ca7d88aa2c', 'disciplineId', 'disciplines', 'id', 'NO ACTION', 'NO ACTION');
        await this.addForeignKeyIfNotExists(queryRunner, 'classes', 'FK_4b7ac7a7eb91f3e04229c7c0b6f', 'teacherId', 'users', 'id', 'NO ACTION', 'NO ACTION');
        await this.addForeignKeyIfNotExists(queryRunner, 'invitations', 'FK_82f3be9e8eaae0a1f9f745ca7ba', 'gymId', 'gyms', 'id', 'RESTRICT', 'NO ACTION');
        await this.addForeignKeyIfNotExists(queryRunner, 'invitations', 'FK_13ad5a8d6b8f4f063d0c1f22ffb', 'createdByUserId', 'users', 'id', 'RESTRICT', 'NO ACTION');
        await this.addForeignKeyIfNotExists(queryRunner, 'invitations', 'FK_3b573be50d07d4bf15c0a0582d8', 'usedByUserId', 'users', 'id', 'SET NULL', 'NO ACTION');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE IF EXISTS "invitations" DROP CONSTRAINT IF EXISTS "FK_3b573be50d07d4bf15c0a0582d8"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "invitations" DROP CONSTRAINT IF EXISTS "FK_13ad5a8d6b8f4f063d0c1f22ffb"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "invitations" DROP CONSTRAINT IF EXISTS "FK_82f3be9e8eaae0a1f9f745ca7ba"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "classes" DROP CONSTRAINT IF EXISTS "FK_4b7ac7a7eb91f3e04229c7c0b6f"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "classes" DROP CONSTRAINT IF EXISTS "FK_96f6b4319eb1f5c48ca7d88aa2c"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "classes" DROP CONSTRAINT IF EXISTS "FK_888ef7551efecef2f01dfda1694"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "disciplines" DROP CONSTRAINT IF EXISTS "FK_62228e97f7661674f9ee6df0187"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "gyms" DROP CONSTRAINT IF EXISTS "FK_521129f3c47351ebffbddc55dd2"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "users" DROP CONSTRAINT IF EXISTS "FK_c2eb2f3b7991ab4186947ebf6ad"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "reservations" DROP CONSTRAINT IF EXISTS "FK_c2964ebcbde93fc600fb2a54330"`);
        await queryRunner.query(`ALTER TABLE IF EXISTS "reservations" DROP CONSTRAINT IF EXISTS "FK_c45c027ce0171c67c332d18ecd7"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."UQ_invitations_pending_email_gym"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_13ad5a8d6b8f4f063d0c1f22ff"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_a6eb6f2543de8a5a4c148b32a1"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "invitations"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."invitations_status_enum"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "classes"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "disciplines"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "gyms"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_0fd54ced5cc75f7cb92925dd80"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_role_enum"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_reservations_active_class_student"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "reservations"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."reservations_status_enum"`);
    }

    private async createEnumIfNotExists(
        queryRunner: QueryRunner,
        enumName: string,
        enumValues: string,
    ): Promise<void> {
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_type WHERE typname = '${enumName}' AND typnamespace = 'public'::regnamespace
                ) THEN
                    CREATE TYPE "public"."${enumName}" AS ENUM(${enumValues});
                END IF;
            END $$;
        `);
    }

    private async addForeignKeyIfNotExists(
        queryRunner: QueryRunner,
        tableName: string,
        constraintName: string,
        columnName: string,
        referencedTable: string,
        referencedColumn: string,
        onDelete: string,
        onUpdate: string,
    ): Promise<void> {
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE constraint_name = '${constraintName}'
                    AND table_name = '${tableName}'
                    AND table_schema = 'public'
                ) THEN
                    ALTER TABLE "${tableName}"
                    ADD CONSTRAINT "${constraintName}"
                    FOREIGN KEY ("${columnName}")
                    REFERENCES "${referencedTable}"("${referencedColumn}")
                    ON DELETE ${onDelete} ON UPDATE ${onUpdate};
                END IF;
            END $$;
        `);
    }

}
