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

export class MultiSeason1727640942892 implements MigrationInterface {
  name = "MultiSeason1727640942892";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_category" ADD "requisitionConfigId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_category" ADD CONSTRAINT "FK_f7fc345f27c62a659d35873146e" FOREIGN KEY ("requisitionConfigId") REFERENCES "requisition_config"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    // Fill in existing requistionConfigId
    const requisitionConfigId = await queryRunner.query(
      `SELECT "id" from "requisition_config" LIMIT 1`,
    );
    if (requisitionConfigId.length > 0) {
      await queryRunner.query(
        `UPDATE "product_category" SET "requisitionConfigId"=$1`,
        [requisitionConfigId[0].id],
      );
    }

    // set NOT NULL constraint
    await queryRunner.query(
      `ALTER TABLE "product_category" ALTER "requisitionConfigId" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_category" DROP CONSTRAINT "FK_f7fc345f27c62a659d35873146e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_category" DROP COLUMN "requisitionConfigId"`,
    );
  }
}
