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
import {
  EditShipment,
  Shipment,
  ShipmentItem,
  EditShipmentItem,
  AdditionalShipmentItem,
  EditAdditionalShipmentItem,
} from "../types";
import { isDateEqual } from "../util/dateHelper";

/**
 * Efficiently compares two shipment items for equality
 * Returns true if items are different, false if they are equal
 */
const isShipmentItemDifferent = (
  item1: ShipmentItem,
  item2: EditShipmentItem
): boolean => {
  // Quick checks for primitive values first
  if (item1.productId !== item2.productId) return true;
  if (item1.description !== item2.description) return true;
  if (item1.multiplicator !== item2.multiplicator) return true;
  if (item1.conversionFrom !== item2.conversionFrom) return true;
  if (item1.conversionTo !== item2.conversionTo) return true;
  if (item1.totalShipedQuantity !== item2.totalShipedQuantity) return true;
  if (item1.isBio !== item2.isBio) return true;

  // Check if depotId from item1 exists in item2's depotIds array
  if (!item2.depotIds.includes(item1.depotId)) return true;

  // Check unit if it's defined in item2
  if (item2.unit !== undefined && item1.unit !== item2.unit) return true;

  return false;
};

/**
 * Efficiently compares two additional shipment items for equality
 * Returns true if items are different, false if they are equal
 */
const isAdditionalShipmentItemDifferent = (
  item1: AdditionalShipmentItem,
  item2: EditAdditionalShipmentItem
): boolean => {
  // Quick checks for primitive values first
  if (item1.product !== item2.product) return true;
  if (item1.description !== item2.description) return true;
  if (item1.quantity !== item2.quantity) return true;
  if (item1.totalShipedQuantity !== item2.totalShipedQuantity) return true;
  if (item1.isBio !== item2.isBio) return true;

  // Check if depotId from item1 exists in item2's depotIds array
  if (!item2.depotIds.includes(item1.depotId)) return true;

  // Check unit if it's defined in item2
  if (item2.unit !== undefined && item1.unit !== item2.unit) return true;

  return false;
};

export const isShipmentDifferent = (
  shipment1: Shipment,
  shipment2: EditShipment
): boolean => {
  // Quick checks for basic properties first
  if (!isDateEqual(shipment1.validFrom, shipment2.validFrom)) {
    return true;
  }
  if (shipment1.active !== shipment2.active) {
    return true;
  }
  if (shipment1.description !== shipment2.description) {
    return true;
  }

  // Check shipment items length first
  if (shipment1.shipmentItems.length !== shipment2.shipmentItems.length) {
    return true;
  }

  // Check additional shipment items length
  if (
    shipment1.additionalShipmentItems.length !==
    shipment2.additionalShipmentItems.length
  ) {
    return true;
  }

  // Deep compare shipment items - return true as soon as a difference is found
  for (let i = 0; i < shipment1.shipmentItems.length; i++) {
    if (
      isShipmentItemDifferent(
        shipment1.shipmentItems[i],
        shipment2.shipmentItems[i]
      )
    ) {
      return true;
    }
  }

  // Deep compare additional shipment items - return true as soon as a difference is found
  for (let i = 0; i < shipment1.additionalShipmentItems.length; i++) {
    if (
      isAdditionalShipmentItemDifferent(
        shipment1.additionalShipmentItems[i],
        shipment2.additionalShipmentItems[i]
      )
    ) {
      return true;
    }
  }

  return false;
};
