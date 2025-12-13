/*
This file is part of the SoLawi Bedarf app

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPaymentInfo1765663537156 implements MigrationInterface {
  name = "AddPaymentInfo1765663537156";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."payment_info_paymenttype_enum" AS ENUM('SEPA', 'BANK_TRANSFER', 'UNCONFIRMED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "payment_info" ("id" SERIAL NOT NULL, "paymentType" "public"."payment_info_paymenttype_enum" NOT NULL, "paymentRequired" boolean NOT NULL DEFAULT false, "paymentProcessed" boolean NOT NULL DEFAULT false, "amount" integer NOT NULL DEFAULT '0', "bankDetails" character varying NOT NULL, CONSTRAINT "PK_b2ba4f3b3f40c6a37e54fb8b252" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "order" ADD "paymentInfoId" integer`);
    await queryRunner.query(
      `ALTER TABLE "order" ADD CONSTRAINT "UQ_d0c9107e80f91fde1523efb96e1" UNIQUE ("paymentInfoId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" ADD CONSTRAINT "FK_d0c9107e80f91fde1523efb96e1" FOREIGN KEY ("paymentInfoId") REFERENCES "payment_info"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order" DROP CONSTRAINT "FK_d0c9107e80f91fde1523efb96e1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" DROP CONSTRAINT "UQ_d0c9107e80f91fde1523efb96e1"`,
    );
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "paymentInfoId"`);
    await queryRunner.query(`DROP TABLE "payment_info"`);
    await queryRunner.query(
      `DROP TYPE "public"."payment_info_paymenttype_enum"`,
    );
  }
}
