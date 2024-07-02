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
import { Order, RequisitionConfig } from "../types";

export const isRequisitionActive = (
  userRole: UserRole,
  userActive: boolean,
  requisitionConfig: RequisitionConfig,
  now: Date,
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
  requisitionConfig: RequisitionConfig,
  now: Date,
) => {
  return (
    now > requisitionConfig.startBiddingRound && userRole != UserRole.ADMIN
  );
};

export const isValidBiddingOrder = (
  userRole: UserRole,
  requisitionConfig: RequisitionConfig,
  now: Date,
  savedOrder: Order,
  actualOrder: Order,
) => {
  if (!isIncreaseOnly(userRole, requisitionConfig, now)) {
    return true;
  }
  if (savedOrder.offer > actualOrder.offer) {
    return false;
  }
  for (let savedOrderItem of savedOrder.orderItems) {
    const actualOrderItem = actualOrder.orderItems.find(
      (orderItem) => orderItem.productId == savedOrderItem.productId,
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
