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

export class OrderNonNullValidRange1758647660837 implements MigrationInterface {
  name = "OrderNonNullValidRange1758647660837";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Initialize validFrom with the requisitionConfig's validFrom for currently null validFrom
    await queryRunner.query(`
            UPDATE "order"
            SET "validFrom" = "requisition_config"."validFrom"
            FROM "requisition_config"
            WHERE "order"."requisitionConfigId" = "requisition_config"."id"
            AND "order"."validFrom" IS NULL
        `);
    await queryRunner.query(
      `ALTER TABLE "order" ALTER COLUMN "validFrom" SET NOT NULL`,
    );

    // Initialize validTo with the requisitionConfig's validTo for currently null validTo
    await queryRunner.query(`
            UPDATE "order"
            SET "validTo" = "requisition_config"."validTo"
            FROM "requisition_config"
            WHERE "order"."requisitionConfigId" = "requisition_config"."id"
            AND "order"."validTo" IS NULL
        `);
    await queryRunner.query(
      `ALTER TABLE "order" ALTER COLUMN "validTo" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order" ALTER COLUMN "validTo" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" ALTER COLUMN "validFrom" DROP NOT NULL`,
    );
  }
}
