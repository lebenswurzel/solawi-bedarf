import { MigrationInterface, QueryRunner } from "typeorm";

export class PasswortReset1757256737447 implements MigrationInterface {
  name = "PasswortReset1757256737447";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "password_reset" ("_token" character varying(128) COLLATE "C" NOT NULL, "_expireAt" TIMESTAMP NOT NULL, "userId" integer NOT NULL, CONSTRAINT "PK_070666d4167bb7b5c5611f6c95b" PRIMARY KEY ("_token"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset" ADD CONSTRAINT "FK_05baebe80e9f8fab8207eda250c" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "password_reset" DROP CONSTRAINT "FK_05baebe80e9f8fab8207eda250c"`,
    );
    await queryRunner.query(`DROP TABLE "password_reset"`);
  }
}
