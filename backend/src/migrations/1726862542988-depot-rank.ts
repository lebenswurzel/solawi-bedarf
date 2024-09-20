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

export class DepotRank1726862542988 implements MigrationInterface {
  name = "DepotRank1726862542988";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "depot" ADD "rank" integer`);

    // Initialize rank based on the ordered name column
    await queryRunner.query(`
            WITH ranked_depots AS (
                SELECT id, ROW_NUMBER() OVER (ORDER BY name) AS rank
                FROM depot
            )
            UPDATE depot
            SET rank = ranked_depots.rank
            FROM ranked_depots
            WHERE depot.id = ranked_depots.id;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "depot" DROP COLUMN "rank"`);
  }
}
