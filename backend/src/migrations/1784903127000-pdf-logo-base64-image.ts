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

export class PdfLogoBase64Image1784903127000 implements MigrationInterface {
  name = "PdfLogoBase64Image1784903127000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."text_content_typ_enum" RENAME TO "text_content_typ_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."text_content_typ_enum" AS ENUM('MD', 'PLAIN', 'BASE64_IMAGE')`,
    );
    await queryRunner.query(
      `ALTER TABLE "text_content" ALTER COLUMN "typ" TYPE "public"."text_content_typ_enum" USING "typ"::"text"::"public"."text_content_typ_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."text_content_typ_enum_old"`);

    await queryRunner.query(
      `INSERT INTO "text_content" ("category", "title", "content", "typ") VALUES ('PDF', 'pdfLogo', '', 'BASE64_IMAGE')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "text_content" WHERE "title" = 'pdfLogo' AND "category" = 'PDF'`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."text_content_typ_enum_old" AS ENUM('MD', 'PLAIN')`,
    );
    await queryRunner.query(
      `ALTER TABLE "text_content" ALTER COLUMN "typ" TYPE "public"."text_content_typ_enum_old" USING "typ"::"text"::"public"."text_content_typ_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."text_content_typ_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."text_content_typ_enum_old" RENAME TO "text_content_typ_enum"`,
    );
  }
}
