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

export class ErrorLog1743622159714 implements MigrationInterface {
  name = "ErrorLog1743622159714";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "error_log" ("createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "id" SERIAL NOT NULL, "method" character varying NOT NULL, "url" character varying NOT NULL, "status" integer NOT NULL, "error" jsonb NOT NULL, "requestBody" jsonb, "requestQuery" jsonb, "requestHeaders" jsonb, "userAgent" character varying, "ip" character varying, "userId" integer, CONSTRAINT "PK_0284e7aa7afe77ea1ce1621c252" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."product_category_type_enum" RENAME TO "product_category_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."product_category_typ_enum" AS ENUM('SELFGROWN', 'COOPERATION')`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_category" ALTER COLUMN "typ" TYPE "public"."product_category_typ_enum" USING "typ"::"text"::"public"."product_category_typ_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."product_category_type_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "error_log" ADD CONSTRAINT "FK_cbb6904547e12fa19ad9e963ae9" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "error_log" DROP CONSTRAINT "FK_cbb6904547e12fa19ad9e963ae9"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."product_category_type_enum_old" AS ENUM('SELFGROWN', 'COOPERATION')`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_category" ALTER COLUMN "typ" TYPE "public"."product_category_type_enum_old" USING "typ"::"text"::"public"."product_category_type_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."product_category_typ_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."product_category_type_enum_old" RENAME TO "product_category_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "error_log"`);
  }
}
