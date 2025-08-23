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
import { UserRole } from "../enum";
import { ExistingConfig, Order, OrderId, SavedOrder } from "../types";
import { isDateInRange } from "../util/dateHelper";

export const isRequisitionActive = (
  userRole: UserRole,
  userActive: boolean,
  requisitionConfig: ExistingConfig,
  now: Date
) => {
  if (!userActive) {
    return false;
  }
  if (now < requisitionConfig.startOrder && userRole != UserRole.ADMIN) {
    return false;
  }
  if (now > requisitionConfig.endBiddingRound && userRole != UserRole.ADMIN) {
    return false;
  }
  return true;
};

export const isIncreaseOnly = (
  userRole: UserRole | undefined,
  requisitionConfig: ExistingConfig,
  now: Date
) => {
  return (
    now > requisitionConfig.startBiddingRound && userRole != UserRole.ADMIN
  );
};

export const isValidBiddingOrder = (
  userRole: UserRole,
  requisitionConfig: ExistingConfig,
  now: Date,
  savedOrder: Order | null,
  actualOrder: Order
) => {
  if (!isIncreaseOnly(userRole, requisitionConfig, now)) {
    return true;
  }

  // If no saved order exists, any order is valid
  if (!savedOrder) {
    return true;
  }

  if (savedOrder.offer > actualOrder.offer) {
    return false;
  }
  for (let savedOrderItem of savedOrder.orderItems) {
    const actualOrderItem = actualOrder.orderItems.find(
      (orderItem) => orderItem.productId == savedOrderItem.productId
    );
    if (
      savedOrderItem.value > 0 &&
      (!actualOrderItem || actualOrderItem.value < savedOrderItem.value)
    ) {
      return false;
    }
  }
  return true;
};

/**
 * Determine the id of the order to be modified
 * The order to be modified is the one with the validFrom date in the future
 *
 * @param allOrders All orders for the user and config
 * @param now Current date
 * @returns The id of the order to be modified
 */
export const determineModificationOrderId = (
  allOrders: SavedOrder[],
  now: Date
): OrderId | undefined => {
  return allOrders.find(
    (order) => order.validFrom && now.getTime() < order.validFrom?.getTime()
  )?.id;
};

export const determineCurrentOrderId = (
  allOrders: SavedOrder[],
  now: Date
): OrderId | undefined => {
  return allOrders.find((order) =>
    isDateInRange(now, {
      from: order.validFrom,
      to: order.validTo,
    })
  )?.id;
};
