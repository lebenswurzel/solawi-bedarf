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

export class AddOrderValidTo1755284922330 implements MigrationInterface {
  name = "AddOrderValidTo1755284922330";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the validTo column
    await queryRunner.query(`ALTER TABLE "order" ADD "validTo" TIMESTAMP`);

    // Initialize validTo with the requisitionConfig's validTo for existing orders
    await queryRunner.query(`
            UPDATE "order"
            SET "validTo" = "requisition_config"."validTo"
            FROM "requisition_config"
            WHERE "order"."requisitionConfigId" = "requisition_config"."id"
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "validTo"`);
  }
}
