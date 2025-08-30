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
import { EditShipment, Shipment } from "../types";
import { isDateEqual } from "../util/dateHelper";

export const isShipmentDifferent = (
  shipment1: Shipment,
  shipment2: EditShipment
): boolean => {
  if (!isDateEqual(shipment1.validFrom, shipment2.validFrom)) {
    return true;
  }
  if (shipment1.active !== shipment2.active) {
    return true;
  }
  if (shipment1.description !== shipment2.description) {
    return true;
  }
  if (shipment1.shipmentItems.length !== shipment2.shipmentItems.length) {
    return true;
  }
  if (
    shipment1.additionalShipmentItems.length !==
    shipment2.additionalShipmentItems.length
  ) {
    return true;
  }
  if (
    shipment1.shipmentItems.some(
      (item) =>
        shipment2.shipmentItems.find((i) => i.productId !== item.productId) ===
        undefined
    )
  ) {
    return true;
  }
  if (
    shipment1.additionalShipmentItems.some(
      (item) =>
        shipment2.additionalShipmentItems.find(
          (i) => i.product !== item.product
        ) === undefined
    )
  ) {
    return true;
  }
  // todo: also compare individual shipment items and additional shipment items for
  // - identical depotIds
  // - identical productId
  // - identical product
  // - identical unit
  // - identical quantity
  // - identical totalShipedQuantity
  // - identical isBio
  // - identical description
  return false;
};
