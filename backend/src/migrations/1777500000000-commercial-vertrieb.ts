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
import {
  basicOrganizationInfo,
  pdfTextsDefaults,
} from "@lebenswurzel/solawi-bedarf-shared/src/config";

export class CommercialVertrieb1777500000000 implements MigrationInterface {
  name = "CommercialVertrieb1777500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."user_role_enum" ADD VALUE IF NOT EXISTS 'COMMERCIAL'`,
    );

    await queryRunner.query(
      `ALTER TABLE "product" ADD "vatRate" integer NOT NULL DEFAULT 7`,
    );

    await queryRunner.query(
      `CREATE TABLE "commercial_profile" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer NOT NULL, "companyName" character varying NOT NULL, "street" character varying NOT NULL, "postalcode" character varying NOT NULL, "city" character varying NOT NULL, CONSTRAINT "REL_commercial_profile_userId" UNIQUE ("userId"), CONSTRAINT "PK_commercial_profile" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "commercial_profile" ADD CONSTRAINT "FK_commercial_profile_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "commercial_delivery" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deliveryDate" TIMESTAMP NOT NULL, "customerUserId" integer NOT NULL, "description" character varying, "active" boolean NOT NULL, CONSTRAINT "PK_commercial_delivery" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "commercial_delivery" ADD CONSTRAINT "FK_commercial_delivery_customer" FOREIGN KEY ("customerUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."commercial_delivery_item_unit_enum" AS ENUM('WEIGHT', 'PIECE', 'VOLUME')`,
    );

    await queryRunner.query(
      `CREATE TABLE "commercial_delivery_item" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "commercialDeliveryId" integer NOT NULL, "productId" integer NOT NULL, "quantity" integer NOT NULL, "unit" "public"."commercial_delivery_item_unit_enum" NOT NULL, "conversionFrom" integer NOT NULL DEFAULT 1, "conversionTo" integer NOT NULL DEFAULT 1, "unitPriceCents" integer NOT NULL, "vatRate" integer NOT NULL, "isBio" boolean NOT NULL, "description" character varying, CONSTRAINT "PK_commercial_delivery_item" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "commercial_delivery_item" ADD CONSTRAINT "FK_commercial_delivery_item_delivery" FOREIGN KEY ("commercialDeliveryId") REFERENCES "commercial_delivery"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "commercial_delivery_item" ADD CONSTRAINT "FK_commercial_delivery_item_product" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "invoice" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "invoiceNumber" character varying NOT NULL, "bioControlNumber" character varying NOT NULL, "commercialDeliveryId" integer NOT NULL, CONSTRAINT "UQ_invoice_invoiceNumber" UNIQUE ("invoiceNumber"), CONSTRAINT "REL_invoice_commercialDeliveryId" UNIQUE ("commercialDeliveryId"), CONSTRAINT "PK_invoice" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoice" ADD CONSTRAINT "FK_invoice_delivery" FOREIGN KEY ("commercialDeliveryId") REFERENCES "commercial_delivery"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "invoice_sequence" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "year" integer NOT NULL, "lastNumber" integer NOT NULL DEFAULT 0, CONSTRAINT "UQ_invoice_sequence_year" UNIQUE ("year"), CONSTRAINT "PK_invoice_sequence" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `INSERT INTO "text_content" ("category", "title", "content", "typ") VALUES ('ORGANIZATION_INFO', 'bioControlNumber', $1, 'PLAIN')`,
      [basicOrganizationInfo.bioControlNumber],
    );

    for (const key of [
      "deliveryNoteHeader",
      "deliveryNoteFooter",
      "invoiceFooter",
    ] as const) {
      await queryRunner.query(
        `INSERT INTO "text_content" ("category", "title", "content", "typ") VALUES ('PDF', $1, $2, 'PLAIN')`,
        [key, pdfTextsDefaults[key]],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "text_content" WHERE "title" IN ($1, $2, $3) AND "category" = 'PDF'`,
      ["deliveryNoteHeader", "deliveryNoteFooter", "invoiceFooter"],
    );
    await queryRunner.query(
      `DELETE FROM "text_content" WHERE "title" = 'bioControlNumber' AND "category" = 'ORGANIZATION_INFO'`,
    );

    await queryRunner.query(`DROP TABLE "invoice_sequence"`);
    await queryRunner.query(`DROP TABLE "invoice"`);
    await queryRunner.query(`DROP TABLE "commercial_delivery_item"`);
    await queryRunner.query(
      `DROP TYPE "public"."commercial_delivery_item_unit_enum"`,
    );
    await queryRunner.query(`DROP TABLE "commercial_delivery"`);
    await queryRunner.query(`DROP TABLE "commercial_profile"`);
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "vatRate"`);
  }
}
