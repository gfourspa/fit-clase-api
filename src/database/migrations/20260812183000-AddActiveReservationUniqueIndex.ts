import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActiveReservationUniqueIndex20260812183000
  implements MigrationInterface
{
  name = 'AddActiveReservationUniqueIndex20260812183000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_reservations_active_class_student" ON "reservations" ("classId", "studentId") WHERE status = 'RESERVED'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_reservations_active_class_student"`,
    );
  }
}
