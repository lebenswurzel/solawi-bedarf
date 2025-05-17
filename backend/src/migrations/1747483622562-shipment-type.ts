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

export class ShipmentType1747483622562 implements MigrationInterface {
  name = "ShipmentType1747483622562";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."shipment_type_enum" AS ENUM('NORMAL', 'DRAFT', 'FORECAST')`,
    );
    await queryRunner.query(
      `ALTER TABLE "shipment" ADD "type" "public"."shipment_type_enum" NOT NULL DEFAULT 'NORMAL'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "shipment" DROP COLUMN "type"`);
    await queryRunner.query(`DROP TYPE "public"."shipment_type_enum"`);
  }
}
