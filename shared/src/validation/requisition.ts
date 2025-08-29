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
import { ExistingConfig, Msrp, Order, OrderId, SavedOrder } from "../types";
import { getSameOrNextThursday, isDateInRange } from "../util/dateHelper";

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
 * Check if the modification of the monthly msrp is valid based on the following rules:
 * - previous offer <= modification offer
 * - previous self grown <= modification self grown
 * - previous cooperation may only be greater than modification cooperation if the self grown difference >= cooperation difference
 *
 * @param previousMsrp
 * @param modificationMsrp
 * @returns
 */
export const validateModificationMsrp = (
  previous: {
    msrp: Msrp;
    offer: number;
  },
  modification: {
    msrp: Msrp;
    offer: number;
  }
): {
  errors: string[] | null;
  offerValid: boolean;
  selfgrownValid: boolean;
  cooperationValid: boolean;
  allValid: boolean;
} => {
  const selfgrownDifference =
    modification.msrp.monthly.selfgrown - previous.msrp.monthly.selfgrown;
  const cooperationDifference =
    modification.msrp.monthly.cooperation - previous.msrp.monthly.cooperation;

  const offerValid = previous.offer <= modification.offer;
  const selfgrownValid =
    previous.msrp.monthly.selfgrown <= modification.msrp.monthly.selfgrown;
  const cooperationValid =
    cooperationDifference >= 0 || cooperationDifference >= -selfgrownDifference;
  const allValid = offerValid && selfgrownValid && cooperationValid;
  const errors: string[] = [];

  // Rule 1: previous offer <= modification offer
  if (!offerValid) {
    errors.push(
      "Der neue Solawi-Beitrag darf nicht geringer sein als der alte"
    );
  }

  // Rule 2: previous self grown <= modification self grown
  if (!selfgrownValid) {
    errors.push(
      "Der neue Beitrag für selbst angebaute Produkte darf nicht geringer sein als der alte"
    );
  }

  // Rule 3: previous cooperation may be greater than modification cooperation,
  // given that the self grown difference >= cooperation difference

  if (!cooperationValid) {
    errors.push(
      "Der neue Beitrag für Kooperationsprodukte darf nicht geringer sein als der alte, falls dadurch der gesamte Orientierungswert sinkt"
    );
  }

  return {
    errors: errors.length > 0 ? errors : null,
    offerValid,
    selfgrownValid,
    cooperationValid,
    allValid,
  };
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
  now: Date,
  timezone?: string
): OrderId | undefined => {
  return allOrders.find(
    (order) =>
      order.validFrom &&
      now.getTime() < getSameOrNextThursday(order.validFrom, timezone).getTime()
  )?.id;
};

export const determineCurrentOrderId = (
  allOrders: SavedOrder[],
  now: Date,
  timezone?: string
): OrderId | undefined => {
  return allOrders.find((order) =>
    isDateInRange(now, {
      from: order.validFrom
        ? getSameOrNextThursday(order.validFrom, timezone)
        : null,
      to: order.validTo ? getSameOrNextThursday(order.validTo, timezone) : null,
    })
  )?.id;
};
