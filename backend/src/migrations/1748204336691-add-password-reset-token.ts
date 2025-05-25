import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPasswordResetToken1748204336691 implements MigrationInterface {
  name = "AddPasswordResetToken1748204336691";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "password_reset_token" character varying(32) COLLATE "C"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "password_reset_expire_date" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "password_reset_token"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "password_reset_expire_date"`,
    );
  }
}
