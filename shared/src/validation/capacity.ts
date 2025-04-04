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
  Order,
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

export const isOrderItemValid = (
  savedOrder: Order | null,
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
  if (product.quantityMin > actualOrderItem.value) {
    return `Mindestmenge ${product.quantityMin} ${getLangUnit(product.unit)} von ${product.name} nicht erreicht`;
  }
  let remaining =
    soldByProductId[actualOrderItem.productId].quantity -
    soldByProductId[actualOrderItem.productId].sold;
  if (savedOrder) {
    const savedOrderItem = savedOrder.orderItems.find(
      (orderItem) => orderItem.productId == actualOrderItem.productId
    );
    if (savedOrderItem) {
      remaining +=
        savedOrderItem.value *
        soldByProductId[actualOrderItem.productId].frequency;
    }
  }
  let maxAvailable = Math.min(
    remaining / product.frequency,
    product.quantityMax
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
  savedOrderItem: OrderItem,
  productsById: ProductsById,
  soldByProductId: SoldByProductId
) => {
  const sold = soldByProductId[savedOrderItem.productId];
  const product = productsById[savedOrderItem.productId];
  let remaining = sold.quantity - sold.sold;
  if (savedOrderItem.value > 0) {
    remaining += sold.frequency * savedOrderItem.value;
  }
  return Math.min(remaining / sold.frequency, product.quantityMax);
};

export const getMinAvailable = (
  savedOrderItem: OrderItem,
  userRole: UserRole | undefined,
  requisitionConfig: ExistingConfig,
  now: Date,
  productsById: ProductsById
) => {
  const product = productsById[savedOrderItem.productId];
  if (isIncreaseOnly(userRole, requisitionConfig, now)) {
    return Math.max(savedOrderItem.value, product.quantityMin);
  }
  return product.quantityMin;
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
