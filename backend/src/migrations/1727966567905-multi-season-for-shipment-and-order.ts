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

export class MultiSeasonForShipmentAndOrder1727966567905 implements MigrationInterface {
  name = "MultiSeasonForShipmentAndOrder1727966567905";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order" ADD "requisitionConfigId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "shipment" ADD "requisitionConfigId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" ADD CONSTRAINT "FK_6244a7829318ec3abb7dfc77219" FOREIGN KEY ("requisitionConfigId") REFERENCES "requisition_config"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shipment" ADD CONSTRAINT "FK_c838366c99da62b09a2edcb5f25" FOREIGN KEY ("requisitionConfigId") REFERENCES "requisition_config"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    // Fill in existing requistionConfigId
    const requisitionConfigId = await queryRunner.query(
      `SELECT "id" from "requisition_config" ORDER BY "createdAt" ASC LIMIT 1`,
    );
    if (requisitionConfigId.length > 0) {
      await queryRunner.query(`UPDATE "order" SET "requisitionConfigId"=$1`, [
        requisitionConfigId[0].id,
      ]);
      await queryRunner.query(
        `UPDATE "shipment" SET "requisitionConfigId"=$1`,
        [requisitionConfigId[0].id],
      );
    }

    // set NOT NULL constraints
    await queryRunner.query(
      `ALTER TABLE "order" ALTER "requisitionConfigId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "shipment" ALTER "requisitionConfigId" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shipment" DROP CONSTRAINT "FK_c838366c99da62b09a2edcb5f25"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" DROP CONSTRAINT "FK_6244a7829318ec3abb7dfc77219"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shipment" DROP COLUMN "requisitionConfigId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" DROP COLUMN "requisitionConfigId"`,
    );
  }
}
