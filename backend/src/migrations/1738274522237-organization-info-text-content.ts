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
import { basicOrganizationInfo } from "@lebenswurzel/solawi-bedarf-shared/src/config";
import { getOrganizationInfoValueByKey } from "@lebenswurzel/solawi-bedarf-shared/src/text/textContent";
import { OrganizationInfoKeys } from "@lebenswurzel/solawi-bedarf-shared/src/types";

/** Keys at migration time; do not use live {@link organizationInfoKeys} (later keys have their own migrations). */
const organizationInfoKeysAt1738274522237: OrganizationInfoKeys[] = [
  "appUrl",
  "name",
  "address.name",
  "address.street",
  "address.postalcode",
  "address.city",
  "address.email",
  "address.forumContact",
  "bankAccount",
];

export class OrganizationInfoTextContent1738274522237 implements MigrationInterface {
  name = "OrganizationInfoTextContent1738274522237";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."text_content_category_enum" RENAME TO "text_content_category_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."text_content_category_enum" AS ENUM('IMPRINT', 'PRIVACY_NOTICE', 'FAQ', 'TAC', 'MAINTENANCE_MESSAGE', 'ORGANIZATION_INFO')`,
    );
    await queryRunner.query(
      `ALTER TABLE "text_content" ALTER COLUMN "category" TYPE "public"."text_content_category_enum" USING "category"::"text"::"public"."text_content_category_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."text_content_category_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."text_content_typ_enum" RENAME TO "text_content_typ_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."text_content_typ_enum" AS ENUM('MD', 'PLAIN')`,
    );
    await queryRunner.query(
      `ALTER TABLE "text_content" ALTER COLUMN "typ" TYPE "public"."text_content_typ_enum" USING "typ"::"text"::"public"."text_content_typ_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."text_content_typ_enum_old"`);
    const organizationInfoDefaults = organizationInfoKeysAt1738274522237.map(
      (key) => ({
        key,
        value: getOrganizationInfoValueByKey(basicOrganizationInfo, key),
      }),
    );

    for (const entry of organizationInfoDefaults) {
      await queryRunner.query(
        `INSERT INTO "text_content" ("category", "title", "content", "typ") VALUES ('ORGANIZATION_INFO', $1, $2, 'PLAIN')`,
        [entry.key, entry.value],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the inserted ORGANIZATION_INFO entries
    await queryRunner.query(
      `DELETE FROM "text_content" WHERE "category" = 'ORGANIZATION_INFO'`,
    );

    // Rollback enum changes
    await queryRunner.query(
      `CREATE TYPE "public"."text_content_typ_enum_old" AS ENUM('MD')`,
    );
    await queryRunner.query(
      `ALTER TABLE "text_content" ALTER COLUMN "typ" TYPE "public"."text_content_typ_enum_old" USING "typ"::"text"::"public"."text_content_typ_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."text_content_typ_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."text_content_typ_enum_old" RENAME TO "text_content_typ_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."text_content_category_enum_old" AS ENUM('IMPRINT', 'PRIVACY_NOTICE', 'FAQ', 'TAC', 'MAINTENANCE_MESSAGE')`,
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
