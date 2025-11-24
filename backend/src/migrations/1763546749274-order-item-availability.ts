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
import { availabilityWeights } from "../services/bi/availabilityWeights";

export class OrderItemAvailability1763546749274 implements MigrationInterface {
  name = "OrderItemAvailability1763546749274";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_item" ADD "availability" real NOT NULL DEFAULT '1'`,
    );

    const requisitionConfigs = await queryRunner.query(
      `SELECT id, "validFrom" FROM "requisition_config"`,
    );

    for (const requisitionConfig of requisitionConfigs) {
      // Get all orders with their requisition config and valid_from dates
      const orders = await queryRunner.query(
        `
        SELECT
          id,
          "requisitionConfigId",
          "validFrom"
        FROM "order"
        WHERE "requisitionConfigId" = $1
      `,
        [requisitionConfig.id],
      );

      // Collect all updates: orderItemId -> availability
      const updates: Array<{ orderItemId: number; availability: number }> = [];

      // Process each order to get availability weights and collect updates
      for (const order of orders) {
        // optimization: skip if order validity is before season as availability is 1 in that case
        if (order.validFrom && order.validFrom < requisitionConfig.validFrom) {
          console.log(
            `Skipping order ${order.id} ${order.validFrom} in ${order.requisitionConfigId}`,
          );
          continue;
        }
        console.log(
          `Processing order ${order.id} ${order.validFrom} in ${order.requisitionConfigId}`,
        );

        const { msrpWeightsByProductId } = await availabilityWeights(
          order.requisitionConfigId,
          order.validFrom ? new Date(order.validFrom) : undefined,
          true,
          false,
          queryRunner.manager,
        );

        // Get all order items for this order
        const orderItems = await queryRunner.query(
          `SELECT id, "productId" FROM "order_item" WHERE "orderId" = $1`,
          [order.id],
        );

        // Collect availability for each order item
        for (const orderItem of orderItems) {
          const availability =
            msrpWeightsByProductId[orderItem.productId] ?? 1.0;
          updates.push({
            orderItemId: orderItem.id,
            availability,
          });
        }
      }

      // Batch update all order items using VALUES clause
      // Process in chunks to avoid PostgreSQL parameter limit (32767 params)
      const BATCH_SIZE = 10000; // Update 10000 items at a time (20000 params)
      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        const values = batch
          .map((update, index) => `($${index * 2 + 1}, $${index * 2 + 2})`)
          .join(", ");
        const params = batch.flatMap((update) => [
          update.orderItemId,
          update.availability,
        ]);

        await queryRunner.query(
          `
        UPDATE "order_item" oi
        SET "availability" = v.availability::real
        FROM (VALUES ${values}) AS v(id, availability)
        WHERE oi.id = v.id::integer
      `,
          params,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_item" DROP COLUMN "availability"`,
    );
  }
}
