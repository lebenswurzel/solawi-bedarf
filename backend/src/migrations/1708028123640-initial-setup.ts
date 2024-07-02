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

export class InitialSetup1708028123640 implements MigrationInterface {
  name = "InitialSetup1708028123640";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "token" ("jti" character varying NOT NULL, "active" boolean NOT NULL, "iat" TIMESTAMP NOT NULL, "exp" TIMESTAMP NOT NULL, "userId" integer NOT NULL, CONSTRAINT "PK_a3a8179b544ae23dfc9449582be" PRIMARY KEY ("jti"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "depot" ("createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "id" SERIAL NOT NULL, "name" character varying NOT NULL, "address" character varying NOT NULL, "openingHours" character varying NOT NULL, "comment" character varying, "active" boolean NOT NULL, CONSTRAINT "UQ_b8136d2d445720339a983f19d40" UNIQUE ("name"), CONSTRAINT "PK_90d6d40026ca8276389f30a0455" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "product_category" ("createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "id" SERIAL NOT NULL, "name" character varying NOT NULL, "active" boolean NOT NULL, CONSTRAINT "UQ_96152d453aaea425b5afde3ae9f" UNIQUE ("name"), CONSTRAINT "PK_0dce9bc93c2d2c399982d04bef1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."product_unit_enum" AS ENUM('WEIGHT', 'PIECE', 'VOLUME')`,
    );
    await queryRunner.query(
      `CREATE TABLE "product" ("createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying, "active" boolean NOT NULL, "msrp" integer NOT NULL, "frequency" integer, "quantity" integer NOT NULL, "quantityMin" integer NOT NULL, "quantityMax" integer NOT NULL, "quantityStep" integer NOT NULL, "unit" "public"."product_unit_enum" NOT NULL, "productCategoryId" integer NOT NULL, CONSTRAINT "UQ_22cc43e9a74d7498546e9a63e77" UNIQUE ("name"), CONSTRAINT "PK_bebc9158e480b949565b4dc7a82" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "order_item" ("createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "id" SERIAL NOT NULL, "value" integer NOT NULL DEFAULT '0', "productId" integer NOT NULL, "orderId" integer NOT NULL, CONSTRAINT "PK_d01158fe15b1ead5c26fd7f4e90" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."order_category_enum" AS ENUM('CAT100', 'CAT115', 'CAT130')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."order_typ_enum" AS ENUM('REQUISITION_24_01')`,
    );
    await queryRunner.query(
      `CREATE TABLE "order" ("createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "id" SERIAL NOT NULL, "offer" integer NOT NULL, "offerReason" character varying, "category" "public"."order_category_enum" NOT NULL DEFAULT 'CAT130', "categoryReason" character varying, "typ" "public"."order_typ_enum" NOT NULL, "productConfiguration" json NOT NULL, "userId" integer NOT NULL, "depotId" integer, CONSTRAINT "PK_1031171c13130102495201e3e20" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_role_enum" AS ENUM('ADMIN', 'USER', 'EMPLOYEE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "id" SERIAL NOT NULL, "name" character varying NOT NULL, "active" boolean NOT NULL, "hash" character varying NOT NULL, "role" "public"."user_role_enum" NOT NULL DEFAULT 'USER', CONSTRAINT "UQ_065d4d8f3b5adb4a08841eae3c8" UNIQUE ("name"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "config" ("createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "key" character varying NOT NULL, "value" json NOT NULL, CONSTRAINT "PK_26489c99ddbb4c91631ef5cc791" PRIMARY KEY ("key"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_address" ("createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "id" SERIAL NOT NULL, "active" boolean NOT NULL, "address" character varying NOT NULL, CONSTRAINT "PK_302d96673413455481d5ff4022a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "applicant" ("createdAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "updatedAt" TIMESTAMP NOT NULL DEFAULT ('now'::text)::timestamp(6) with time zone, "id" SERIAL NOT NULL, "hash" character varying NOT NULL, "active" boolean NOT NULL, "confirmGDPR" boolean NOT NULL, "comment" character varying NOT NULL, "userId" integer, "addressId" integer NOT NULL, CONSTRAINT "REL_546a819aa07c196d7aa0f9d17d" UNIQUE ("userId"), CONSTRAINT "REL_bdc432509905bb33209e11c713" UNIQUE ("addressId"), CONSTRAINT "PK_f4a6e907b8b17f293eb073fc5ea" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "token" ADD CONSTRAINT "FK_94f168faad896c0786646fa3d4a" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" ADD CONSTRAINT "FK_618194d24a7ea86a165d7ec628e" FOREIGN KEY ("productCategoryId") REFERENCES "product_category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" ADD CONSTRAINT "FK_904370c093ceea4369659a3c810" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" ADD CONSTRAINT "FK_646bf9ece6f45dbe41c203e06e0" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" ADD CONSTRAINT "FK_caabe91507b3379c7ba73637b84" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" ADD CONSTRAINT "FK_890ceb8044430bb85990466f4bf" FOREIGN KEY ("depotId") REFERENCES "depot"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "applicant" ADD CONSTRAINT "FK_546a819aa07c196d7aa0f9d17db" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "applicant" ADD CONSTRAINT "FK_bdc432509905bb33209e11c7135" FOREIGN KEY ("addressId") REFERENCES "user_address"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "applicant" DROP CONSTRAINT "FK_bdc432509905bb33209e11c7135"`,
    );
    await queryRunner.query(
      `ALTER TABLE "applicant" DROP CONSTRAINT "FK_546a819aa07c196d7aa0f9d17db"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" DROP CONSTRAINT "FK_890ceb8044430bb85990466f4bf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" DROP CONSTRAINT "FK_caabe91507b3379c7ba73637b84"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" DROP CONSTRAINT "FK_646bf9ece6f45dbe41c203e06e0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" DROP CONSTRAINT "FK_904370c093ceea4369659a3c810"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" DROP CONSTRAINT "FK_618194d24a7ea86a165d7ec628e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "token" DROP CONSTRAINT "FK_94f168faad896c0786646fa3d4a"`,
    );
    await queryRunner.query(`DROP TABLE "applicant"`);
    await queryRunner.query(`DROP TABLE "user_address"`);
    await queryRunner.query(`DROP TABLE "config"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
    await queryRunner.query(`DROP TABLE "order"`);
    await queryRunner.query(`DROP TYPE "public"."order_typ_enum"`);
    await queryRunner.query(`DROP TYPE "public"."order_category_enum"`);
    await queryRunner.query(`DROP TABLE "order_item"`);
    await queryRunner.query(`DROP TABLE "product"`);
    await queryRunner.query(`DROP TYPE "public"."product_unit_enum"`);
    await queryRunner.query(`DROP TABLE "product_category"`);
    await queryRunner.query(`DROP TABLE "depot"`);
    await queryRunner.query(`DROP TABLE "token"`);
  }
}
