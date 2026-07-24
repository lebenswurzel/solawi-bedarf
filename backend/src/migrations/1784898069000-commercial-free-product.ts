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

export class CommercialFreeProduct1784898069000 implements MigrationInterface {
  name = "CommercialFreeProduct1784898069000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "commercial_delivery_item" DROP CONSTRAINT "FK_commercial_delivery_item_product"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commercial_delivery_item" ALTER COLUMN "productId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "commercial_delivery_item" ADD "productName" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "commercial_delivery_item" ADD CONSTRAINT "FK_commercial_delivery_item_product" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "commercial_delivery_item" DROP CONSTRAINT "FK_commercial_delivery_item_product"`,
    );
    await queryRunner.query(
      `DELETE FROM "commercial_delivery_item" WHERE "productId" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "commercial_delivery_item" DROP COLUMN "productName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commercial_delivery_item" ALTER COLUMN "productId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "commercial_delivery_item" ADD CONSTRAINT "FK_commercial_delivery_item_product" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
