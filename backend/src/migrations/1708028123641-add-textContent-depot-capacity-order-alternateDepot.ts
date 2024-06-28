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

export class AddTextContentDepotCapacityOrderAlternateDepot1708028123641
  implements MigrationInterface
{
  name = "AddTextContentDepotCapacityOrderAlternateDepot1708028123641";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."text_content_category_enum" AS ENUM('IMPRINT', 'PRIVACY_NOTICE', 'FAQ')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."text_content_typ_enum" AS ENUM('MD')`,
    );
    await queryRunner.query(
      `CREATE TABLE "text_content" ("createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "id" SERIAL NOT NULL, "title" character varying NOT NULL, "active" boolean NOT NULL DEFAULT true, "category" "public"."text_content_category_enum" NOT NULL, "typ" "public"."text_content_typ_enum" NOT NULL, "content" character varying NOT NULL, CONSTRAINT "UQ_cbf4ba22ff06b88f39563b3fadc" UNIQUE ("title"), CONSTRAINT "PK_2ea24a6a41875b92fc637400deb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "depot" ADD "capacity" integer`);
    await queryRunner.query(
      `ALTER TABLE "order" ADD "alternateDepotId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" ADD CONSTRAINT "FK_e95c05a69026ec61ed69cb42c79" FOREIGN KEY ("alternateDepotId") REFERENCES "depot"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order" DROP CONSTRAINT "FK_e95c05a69026ec61ed69cb42c79"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" DROP COLUMN "alternateDepotId"`,
    );
    await queryRunner.query(`ALTER TABLE "depot" DROP COLUMN "capacity"`);
    await queryRunner.query(`DROP TABLE "text_content"`);
    await queryRunner.query(`DROP TYPE "public"."text_content_typ_enum"`);
    await queryRunner.query(`DROP TYPE "public"."text_content_category_enum"`);
  }
}
