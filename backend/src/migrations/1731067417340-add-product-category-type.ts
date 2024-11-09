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
import { ProductCategoryType } from "../../../shared/src/enum";

export class AddProductCategoryType1731067417340 implements MigrationInterface {
  name = "AddProductCategoryType1731067417340";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."product_category_type_enum" AS ENUM('SELFGROWN', 'COOPERATION')`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_category" ADD "typ" "public"."product_category_type_enum"`,
    );

    // set sane defaults
    await queryRunner.query(
      `UPDATE "product_category" SET "typ"=$1 WHERE "id"=1`,
      [ProductCategoryType.SELFGROWN],
    );
    await queryRunner.query(
      `UPDATE "product_category" SET "typ"=$1 WHERE "id"!=1`,
      [ProductCategoryType.COOPERATION],
    );

    // set NOT NULL constraint
    await queryRunner.query(
      `ALTER TABLE "product_category" ALTER "typ" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "product_category" DROP COLUMN "typ"`);
    await queryRunner.query(`DROP TYPE "public"."product_category_type_enum"`);
  }
}
