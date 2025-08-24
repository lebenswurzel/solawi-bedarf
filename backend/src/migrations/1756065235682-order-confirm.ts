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

export class OrderConfirm1756065235682 implements MigrationInterface {
  name = "OrderConfirm1756065235682";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order" ADD "confirmGTC" boolean NOT NULL DEFAULT false`,
    );

    // set all orders to confirmed that have at least one order item with value > 0
    await queryRunner.query(`
            UPDATE "order"
            SET "confirmGTC" = true
            WHERE id IN (
                SELECT "order_item"."orderId" FROM "order_item" WHERE "order_item"."value" > 0
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "confirmGTC"`);
  }
}
