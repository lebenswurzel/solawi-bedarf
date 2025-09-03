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
import { format } from "date-fns";
import { UserRole } from "../enum";
import { language } from "../lang/lang";
import { interpolate } from "../lang/template";
import { ExistingConfig, Msrp, Order, OrderId, SavedOrder } from "../types";
import {
  countCalendarMonths,
  getSameOrNextThursday,
  getValidFromMonth,
  getValidToMonth,
  isDateInRange,
  prettyDateWithMonthAndYear,
} from "../util/dateHelper";

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
  errors: [string, string][] | null;
  offerValid: boolean;
  selfgrownValid: boolean;
  cooperationValid: boolean;
  totalValid: boolean;
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
  const totalValid =
    previous.msrp.monthly.total <= modification.msrp.monthly.total;
  const allValid =
    offerValid && selfgrownValid && cooperationValid && totalValid;

  return {
    offerValid,
    selfgrownValid,
    cooperationValid,
    totalValid,
    allValid,
    errors: getMsrpValidationMessages(
      offerValid,
      selfgrownValid,
      cooperationValid,
      totalValid,
      previous.offer
    ),
  };
};

const getMsrpValidationMessages = (
  offerValid: boolean,
  selfgrownValid: boolean,
  cooperationValid: boolean,
  totalValid: boolean,
  previousOffer: number
) => {
  const errors: [string, string][] = [];

  // Rule 1: previous offer <= modification offer
  if (!offerValid) {
    errors.push([
      "Der neue Solawi-Beitrag darf nicht geringer sein als der alte",
      "",
    ]);
  }

  // Rule 2: previous self grown <= modification self grown
  if (!selfgrownValid) {
    errors.push([
      "Der neue Orientierungswert für selbst angebaute Produkte ist geringer als der alte. Daher wurde der Differenzbetrag hinzugefügt.",
      "Hintergrund ist, dass der bisherige Beitrag bereits in das Jahresbudget für den Gemüseanbau eingerechnet ist und daher eine Verringerung dieses Beitrags nicht möglich ist.",
    ]);
  }

  // Rule 3: previous cooperation may be greater than modification cooperation,
  // given that the self grown difference >= cooperation difference

  if (!cooperationValid) {
    errors.push([
      "Der neue Orientierungswert für Kooperationsprodukte ist geringer als der alte.",
      "Das ist zulässig, jedoch darf dein monatlicher Solawi-Beitrag nicht verringert werden.",
    ]);
  }

  if (!totalValid) {
    errors.push([
      "Dein neuer Orientierungswert liegt unter dem Orientierungswert der ursprünglichen Bedarfsanmeldung. Du kannst die Bedarfsanmeldung trotzdem speichern, wenn du darauf achtest, dass dein neuer Solawi-Beitrag nicht geringer ist als der alte (" +
        previousOffer.toString() +
        "€)",
      "",
    ]);
  }

  return errors;
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

export const getSepaUpdateMessage = (
  validFrom: Date,
  validTo: Date,
  offer: number,
  previousOffer: number
) => {
  return interpolate(language.pages.shop.dialog.confirmSepaUpdate.label, {
    from: prettyDateWithMonthAndYear(getSameOrNextThursday(validFrom)),
    to: prettyDateWithMonthAndYear(validTo),
    total: offer.toString() || "?",
    previousOffer: previousOffer.toString() || "?",
  });
};

export const getBankTransferMessage = (
  orderValidFrom: Date,
  orderValidTo: Date,
  requisitionConfigValidFrom: Date,
  requisitionConfigValidTo: Date,
  offer: number,
  previousOffer: number,
  userName: string,
  accountDetails: string,
  timezone?: string
): {
  message: string;
  accountDetails: string;
} => {
  const { startMonth, count } = getOrderValidMonths(
    orderValidFrom,
    orderValidTo,
    requisitionConfigValidFrom,
    requisitionConfigValidTo,
    timezone
  );
  return {
    message: interpolate(language.pages.shop.dialog.confirmBankTransfer.label, {
      difference: ((offer - previousOffer) * count).toString(),
      date: format(
        new Date(startMonth.getFullYear(), startMonth.getMonth(), 14),
        "dd.MM.yyyy"
      ),
    }),
    accountDetails:
      accountDetails +
      "\n" +
      interpolate(language.pages.shop.dialog.confirmBankTransfer.reference, {
        userName,
      }),
  };
};

export const getOrderValidMonths = (
  orderValidFrom: Date,
  orderValidTo: Date,
  requisitionConfigValidFrom: Date,
  requisitionConfigValidTo: Date,
  timezone?: string
): { startMonth: Date; endMonth: Date; count: number } => {
  const effectiveValidFrom =
    orderValidFrom.getTime() > requisitionConfigValidFrom.getTime()
      ? orderValidFrom
      : requisitionConfigValidFrom;
  const effectiveValidTo =
    orderValidTo.getTime() < requisitionConfigValidTo.getTime()
      ? orderValidTo
      : requisitionConfigValidTo;
  const startMonth = getValidFromMonth(effectiveValidFrom, timezone);
  const endMonth = getValidToMonth(effectiveValidTo, timezone);
  const count = countCalendarMonths(startMonth, endMonth, timezone);
  return { startMonth, endMonth, count };
};
