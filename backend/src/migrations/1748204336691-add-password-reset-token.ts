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

export class AddPasswordResetToken1748204336691 implements MigrationInterface {
  name = "AddPasswordResetToken1748204336691";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "password_reset_token" character varying(32) COLLATE "C"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "password_reset_expire_date" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "password_reset_token"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "password_reset_expire_date"`,
    );
  }
}
