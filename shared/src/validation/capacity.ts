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
import {
  Depot,
  ExistingConfig,
  OrderItem,
  ProductsById,
  SoldByProductId,
} from "../types";
import { getLangUnit } from "../util/unitHelper";
import { isIncreaseOnly } from "./requisition";

export const getRemainingDepotCapacity = (
  depot: Depot,
  reserved: number,
  savedDepotId: number
): number | null => {
  if (depot.capacity == null) {
    return null;
  }
  let remainingCapacitiy = depot.capacity - reserved;
  if (depot.id == savedDepotId) {
    remainingCapacitiy += 1;
  }
  return remainingCapacitiy;
};

const calculateRemainingQuantity = (
  productId: number,
  soldByProductId: SoldByProductId,
  savedValue?: number | null
): number => {
  const sold = soldByProductId[productId];
  let remaining = sold.quantity - sold.sold;

  if (savedValue && savedValue > 0) {
    remaining += sold.frequency * savedValue;
  }

  return remaining;
};

const calculateMaxAvailable = (
  productId: number,
  productsById: ProductsById,
  soldByProductId: SoldByProductId,
  savedValue?: number | null
): number => {
  const product = productsById[productId];
  const remaining = calculateRemainingQuantity(
    productId,
    soldByProductId,
    savedValue
  );
  return Math.min(remaining / product.frequency, product.quantityMax);
};

const calculateMinAvailable = (
  productId: number,
  productsById: ProductsById,
  userRole?: UserRole,
  requisitionConfig?: ExistingConfig,
  now?: Date,
  savedValue?: number | null
): number => {
  const product = productsById[productId];
  if (
    requisitionConfig &&
    now &&
    isIncreaseOnly(userRole, requisitionConfig, now) &&
    savedValue
  ) {
    return Math.max(savedValue, product.quantityMin);
  }
  return product.quantityMin;
};

export const isOrderItemValid = (
  savedValue: number | null,
  actualOrderItem: OrderItem,
  soldByProductId: SoldByProductId,
  productsById: ProductsById
): string | null => {
  if (actualOrderItem.value == 0) {
    return null;
  }
  const product = productsById[actualOrderItem.productId];
  if (!product || !product.active) {
    return "Produkt nicht verfügbar";
  }
  if (actualOrderItem.value < 0) {
    return `Wert für ${product.name} darf nicht negativ sein`;
  }

  const minAvailable = calculateMinAvailable(
    actualOrderItem.productId,
    productsById,
    undefined,
    undefined,
    undefined,
    savedValue
  );
  if (minAvailable > actualOrderItem.value) {
    return `Mindestmenge ${minAvailable} ${getLangUnit(product.unit)} von ${product.name} nicht erreicht`;
  }

  const maxAvailable = calculateMaxAvailable(
    actualOrderItem.productId,
    productsById,
    soldByProductId,
    savedValue || 0
  );
  if (maxAvailable < actualOrderItem.value) {
    return `Maximal verfügbare Menge ${maxAvailable} ${getLangUnit(product.unit)} von ${product.name} überschritten`;
  }

  if (actualOrderItem.value % product.quantityStep != 0) {
    return `Menge für ${product.name} muss ein Vielfaches von ${product.quantityStep} ${getLangUnit(product.unit)} sein`;
  }
  return null;
};

export const getMaxAvailable = (
  savedValue: number | null,
  productId: number,
  productsById: ProductsById,
  soldByProductId: SoldByProductId
) => {
  return calculateMaxAvailable(
    productId,
    productsById,
    soldByProductId,
    savedValue
  );
};

export const getMinAvailable = (
  savedValue: number | null,
  productId: number,
  userRole: UserRole | undefined,
  requisitionConfig: ExistingConfig,
  now: Date,
  productsById: ProductsById
) => {
  return calculateMinAvailable(
    productId,
    productsById,
    userRole,
    requisitionConfig,
    now,
    savedValue
  );
};

export const sanitizeOrderItem = ({
  value,
  minValue,
  maxValue,
  step,
}: {
  value: number | undefined;
  minValue: number;
  maxValue: number;
  step: number;
}) => {
  if (value === undefined || isNaN(value)) {
    value = minValue;
  }
  if (value < minValue) {
    value = minValue;
  }
  if (value > maxValue) {
    value = maxValue;
  }
  if (value % step != 0) {
    value = Math.floor(value / step) * step;
  }
  if (value < minValue) {
    value = 0;
  }
  return value;
};
