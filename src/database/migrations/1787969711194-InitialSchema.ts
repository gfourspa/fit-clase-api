import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1787969711194 implements MigrationInterface {
    name = 'InitialSchema1787969711194'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."reservations_status_enum" AS ENUM('RESERVED', 'CANCELED', 'ATTENDED', 'MISSED')`);
        await queryRunner.query(`CREATE TABLE "reservations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "classId" uuid NOT NULL, "studentId" uuid NOT NULL, "status" "public"."reservations_status_enum" NOT NULL DEFAULT 'RESERVED', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_da95cef71b617ac35dc5bcda243" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_reservations_active_class_student" ON "reservations" ("classId", "studentId") WHERE status = 'RESERVED'`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('SUPER_ADMIN', 'OWNER_GYM', 'TEACHER', 'STUDENT')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL, "firebase_uid" character varying(255), "name" character varying(255), "email" character varying(255), "role" "public"."users_role_enum" NOT NULL DEFAULT 'STUDENT', "gymId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "UQ_0fd54ced5cc75f7cb92925dd803" UNIQUE ("firebase_uid"), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_0fd54ced5cc75f7cb92925dd80" ON "users" ("firebase_uid") `);
        await queryRunner.query(`CREATE TABLE "gyms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "address" text NOT NULL, "contact" character varying(100) NOT NULL, "ownerId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_fe765086496cf3c8475652cddcb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "disciplines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "description" text, "gymId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_9b25ea6da0741577a73c9e90aad" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "classes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "gymId" uuid NOT NULL, "disciplineId" uuid NOT NULL, "teacherId" uuid NOT NULL, "date" date NOT NULL, "startTime" TIME NOT NULL, "endTime" TIME NOT NULL, "capacity" integer NOT NULL, CONSTRAINT "PK_e207aa15404e9b2ce35910f9f7f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."invitations_status_enum" AS ENUM('PENDING', 'USED', 'EXPIRED', 'CANCELED')`);
        await queryRunner.query(`CREATE TABLE "invitations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "gymId" uuid NOT NULL, "tokenHash" character varying(64) NOT NULL, "email" character varying(255) NOT NULL, "createdByUserId" uuid, "status" "public"."invitations_status_enum" NOT NULL DEFAULT 'PENDING', "usedByUserId" uuid, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "usedAt" TIMESTAMP WITH TIME ZONE, "canceledAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5dec98cfdfd562e4ad3648bbb07" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a6eb6f2543de8a5a4c148b32a1" ON "invitations" ("tokenHash") `);
        await queryRunner.query(`CREATE INDEX "IDX_13ad5a8d6b8f4f063d0c1f22ff" ON "invitations" ("createdByUserId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_invitations_pending_email_gym" ON "invitations" ("gymId", "email") WHERE "status" = 'PENDING'`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD CONSTRAINT "FK_c45c027ce0171c67c332d18ecd7" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reservations" ADD CONSTRAINT "FK_c2964ebcbde93fc600fb2a54330" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_c2eb2f3b7991ab4186947ebf6ad" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "gyms" ADD CONSTRAINT "FK_521129f3c47351ebffbddc55dd2" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "disciplines" ADD CONSTRAINT "FK_62228e97f7661674f9ee6df0187" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "classes" ADD CONSTRAINT "FK_888ef7551efecef2f01dfda1694" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "classes" ADD CONSTRAINT "FK_96f6b4319eb1f5c48ca7d88aa2c" FOREIGN KEY ("disciplineId") REFERENCES "disciplines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "classes" ADD CONSTRAINT "FK_4b7ac7a7eb91f3e04229c7c0b6f" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invitations" ADD CONSTRAINT "FK_82f3be9e8eaae0a1f9f745ca7ba" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invitations" ADD CONSTRAINT "FK_13ad5a8d6b8f4f063d0c1f22ffb" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invitations" ADD CONSTRAINT "FK_3b573be50d07d4bf15c0a0582d8" FOREIGN KEY ("usedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invitations" DROP CONSTRAINT "FK_3b573be50d07d4bf15c0a0582d8"`);
        await queryRunner.query(`ALTER TABLE "invitations" DROP CONSTRAINT "FK_13ad5a8d6b8f4f063d0c1f22ffb"`);
        await queryRunner.query(`ALTER TABLE "invitations" DROP CONSTRAINT "FK_82f3be9e8eaae0a1f9f745ca7ba"`);
        await queryRunner.query(`ALTER TABLE "classes" DROP CONSTRAINT "FK_4b7ac7a7eb91f3e04229c7c0b6f"`);
        await queryRunner.query(`ALTER TABLE "classes" DROP CONSTRAINT "FK_96f6b4319eb1f5c48ca7d88aa2c"`);
        await queryRunner.query(`ALTER TABLE "classes" DROP CONSTRAINT "FK_888ef7551efecef2f01dfda1694"`);
        await queryRunner.query(`ALTER TABLE "disciplines" DROP CONSTRAINT "FK_62228e97f7661674f9ee6df0187"`);
        await queryRunner.query(`ALTER TABLE "gyms" DROP CONSTRAINT "FK_521129f3c47351ebffbddc55dd2"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_c2eb2f3b7991ab4186947ebf6ad"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT "FK_c2964ebcbde93fc600fb2a54330"`);
        await queryRunner.query(`ALTER TABLE "reservations" DROP CONSTRAINT "FK_c45c027ce0171c67c332d18ecd7"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_invitations_pending_email_gym"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_13ad5a8d6b8f4f063d0c1f22ff"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a6eb6f2543de8a5a4c148b32a1"`);
        await queryRunner.query(`DROP TABLE "invitations"`);
        await queryRunner.query(`DROP TYPE "public"."invitations_status_enum"`);
        await queryRunner.query(`DROP TABLE "classes"`);
        await queryRunner.query(`DROP TABLE "disciplines"`);
        await queryRunner.query(`DROP TABLE "gyms"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0fd54ced5cc75f7cb92925dd80"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_reservations_active_class_student"`);
        await queryRunner.query(`DROP TABLE "reservations"`);
        await queryRunner.query(`DROP TYPE "public"."reservations_status_enum"`);
    }

}
