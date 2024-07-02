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

export class Shipment1711181370934 implements MigrationInterface {
  name = "Shipment1711181370934";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."shipment_item_unit_enum" AS ENUM('WEIGHT', 'PIECE', 'VOLUME')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."additional_shipment_item_unit_enum" AS ENUM('WEIGHT', 'PIECE', 'VOLUME')`,
    );
    await queryRunner.query(
      `CREATE TABLE "requisition_config" ("createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "id" SERIAL NOT NULL, "name" character varying NOT NULL, "startOrder" TIMESTAMP NOT NULL, "startBiddingRound" TIMESTAMP NOT NULL, "endBiddingRound" TIMESTAMP NOT NULL, "budget" integer NOT NULL, "validFrom" TIMESTAMP NOT NULL, "validTo" TIMESTAMP NOT NULL, CONSTRAINT "UQ_d24d5dcdba8d2f9d38c6d34e2cf" UNIQUE ("name"), CONSTRAINT "PK_27e48e681d25952c6483c07bd3e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "shipment_item" ("createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "id" SERIAL NOT NULL, "shipmentId" integer NOT NULL, "depotId" integer NOT NULL, "productId" integer NOT NULL, "description" character varying, "multiplicator" integer NOT NULL DEFAULT '100', "unit" "public"."shipment_item_unit_enum" NOT NULL, "conversionFrom" integer NOT NULL DEFAULT '1', "conversionTo" integer NOT NULL DEFAULT '1', "totalShipedQuantity" integer NOT NULL, "isBio" boolean NOT NULL, CONSTRAINT "PK_f6228898b4578ba672a2f794d11" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "additional_shipment_item" ("createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "id" SERIAL NOT NULL, "shipmentId" integer NOT NULL, "depotId" integer NOT NULL, "product" character varying NOT NULL, "description" character varying, "unit" "public"."additional_shipment_item_unit_enum" NOT NULL, "quantity" integer NOT NULL, "totalShipedQuantity" integer NOT NULL, "isBio" boolean NOT NULL, CONSTRAINT "PK_a76a459e5efd5731d5d840da726" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "shipment" ("createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "id" SERIAL NOT NULL, "active" boolean NOT NULL, "validFrom" TIMESTAMP NOT NULL, "description" character varying, CONSTRAINT "PK_f51f635db95c534ca206bf7a0a4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "typ"`);
    await queryRunner.query(`DROP TYPE "public"."order_typ_enum"`);
    await queryRunner.query(
      `ALTER TABLE "product" ALTER COLUMN "frequency" SET DEFAULT '1'`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" ALTER COLUMN "frequency" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" ALTER COLUMN "category" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."text_content_category_enum" RENAME TO "text_content_category_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."text_content_category_enum" AS ENUM('IMPRINT', 'PRIVACY_NOTICE', 'FAQ', 'TAC')`,
    );
    await queryRunner.query(
      `ALTER TABLE "text_content" ALTER COLUMN "category" TYPE "public"."text_content_category_enum" USING "category"::"text"::"public"."text_content_category_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."text_content_category_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shipment_item" ADD CONSTRAINT "FK_e4b0906b4cfeb96bd72b6d1dfab" FOREIGN KEY ("shipmentId") REFERENCES "shipment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shipment_item" ADD CONSTRAINT "FK_126023ca64945c2190512b468e2" FOREIGN KEY ("depotId") REFERENCES "depot"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shipment_item" ADD CONSTRAINT "FK_350ce4e66d33f00dd07fe351c50" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "additional_shipment_item" ADD CONSTRAINT "FK_fcf495bc13c94f432564033eb5c" FOREIGN KEY ("shipmentId") REFERENCES "shipment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "additional_shipment_item" ADD CONSTRAINT "FK_3f85c9b4f02a14819efc4ed2f44" FOREIGN KEY ("depotId") REFERENCES "depot"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "additional_shipment_item" DROP CONSTRAINT "FK_3f85c9b4f02a14819efc4ed2f44"`,
    );
    await queryRunner.query(
      `ALTER TABLE "additional_shipment_item" DROP CONSTRAINT "FK_fcf495bc13c94f432564033eb5c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shipment_item" DROP CONSTRAINT "FK_350ce4e66d33f00dd07fe351c50"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shipment_item" DROP CONSTRAINT "FK_126023ca64945c2190512b468e2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shipment_item" DROP CONSTRAINT "FK_e4b0906b4cfeb96bd72b6d1dfab"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."text_content_category_enum_old" AS ENUM('IMPRINT', 'PRIVACY_NOTICE', 'FAQ')`,
    );
    await queryRunner.query(
      `ALTER TABLE "text_content" ALTER COLUMN "category" TYPE "public"."text_content_category_enum_old" USING "category"::"text"::"public"."text_content_category_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."text_content_category_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."text_content_category_enum_old" RENAME TO "text_content_category_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" ALTER COLUMN "category" SET DEFAULT 'CAT130'`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" ALTER COLUMN "frequency" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" ALTER COLUMN "frequency" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."order_typ_enum" AS ENUM('REQUISITION_24_01')`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" ADD "typ" "public"."order_typ_enum" NOT NULL`,
    );
    await queryRunner.query(`DROP TABLE "shipment"`);
    await queryRunner.query(`DROP TABLE "additional_shipment_item"`);
    await queryRunner.query(
      `DROP TYPE "public"."additional_shipment_item_unit_enum"`,
    );
    await queryRunner.query(`DROP TABLE "shipment_item"`);
    await queryRunner.query(`DROP TYPE "public"."shipment_item_unit_enum"`);
    await queryRunner.query(`DROP TABLE "requisition_config"`);
  }
}
