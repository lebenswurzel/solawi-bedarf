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

export class AddMaintenanceMsgText1730887882789 implements MigrationInterface {
  name = "AddMaintenanceMsgText1730887882789";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."text_content_category_enum" RENAME TO "text_content_category_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."text_content_category_enum" AS ENUM('IMPRINT', 'PRIVACY_NOTICE', 'FAQ', 'TAC', 'MAINTENANCE_MESSAGE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "text_content" ALTER COLUMN "category" TYPE "public"."text_content_category_enum" USING "category"::"text"::"public"."text_content_category_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."text_content_category_enum_old"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."text_content_category_enum_old" AS ENUM('IMPRINT', 'PRIVACY_NOTICE', 'FAQ', 'TAC')`,
    );
    await queryRunner.query(
      `ALTER TABLE "text_content" ALTER COLUMN "category" TYPE "public"."text_content_category_enum_old" USING "category"::"text"::"public"."text_content_category_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."text_content_category_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."text_content_category_enum_old" RENAME TO "text_content_category_enum"`,
    );
  }
}