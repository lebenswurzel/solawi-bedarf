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
import { Shipment } from "../database/Shipment";
import { ShipmentItem } from "../database/ShipmentItem";

interface ShipmentItemWithValidity extends ShipmentItem {
  validFrom: Date;
  validTo: Date | undefined;
  availableMultiplicator: number | undefined; // how much of the muliplicator has been used to reduce forecast items
}

/**
 * Deducts form the forecast shipment items the shipment item values that have actually been
 * delivered within the validFrom-validTo range of the forecast shipments. Values are only
 * deducted if both the product and the depot match.
 */
export const mergeShipmentWithForecast = (
  shipments: Shipment[],
  forecastShipments: Shipment[],
): ShipmentItemWithValidity[] => {
  const shippedItems: ShipmentItemWithValidity[] = shipments.flatMap(
    (shipment) =>
      shipment.shipmentItems.map((si) => ({
        ...si,
        validFrom: shipment.validFrom,
        validTo: undefined,
        availableMultiplicator: si.multiplicator,
      })),
  );

  const forecastItems: ShipmentItemWithValidity[] = forecastShipments.flatMap(
    (shipment) =>
      shipment.shipmentItems.map((fi) => ({
        ...fi,
        validFrom: shipment.validFrom,
        validTo: shipment.validTo,
        availableMultiplicator: undefined,
      })),
  );

  if (forecastItems.length === 0) {
    return shippedItems;
  }

  const adjustForecastItems = (items: ShipmentItemWithValidity[]) => {
    // find items in forecast that are already shipped and deduct those from the forecast items
    let changed = false;
    const updatedItems = items
      .map((fi) => {
        const matchingSiIndex = shippedItems.findIndex(
          (si) =>
            si.depotId === fi.depotId &&
            si.productId === fi.productId &&
            si.availableMultiplicator &&
            si.availableMultiplicator > 0 &&
            fi.validFrom < si.validFrom &&
            fi.validTo &&
            si.validFrom < fi.validTo,
        );
        if (matchingSiIndex === -1) {
          // no matching shipment item found that would change the forecast item
          return { ...fi };
        } else {
          changed = true;
          const difference = Math.min(
            shippedItems[matchingSiIndex].availableMultiplicator || 0,
            fi.multiplicator,
          );
          if (shippedItems[matchingSiIndex].availableMultiplicator) {
            shippedItems[matchingSiIndex].availableMultiplicator -= difference;
          }
          return {
            ...fi,
            multiplicator: fi.multiplicator - difference,
          };
        }
      })
      .filter((fi) => fi.multiplicator > 0);

    return {
      updatedItems,
      changed,
    };
  };

  let adjustedForecastItems = forecastItems;
  let counter = 0;
  while (true) {
    counter++;

    // repeat the forecast adjustments until no forecast items are modified
    const { updatedItems, changed } = adjustForecastItems(
      adjustedForecastItems,
    );
    if (!changed) {
      break;
    }
    adjustedForecastItems = updatedItems;
    if (counter > 10000) {
      // should never happen, but just to be safe
      throw new Error(`infinite loop detected`);
    }
  }

  return shippedItems.concat(adjustedForecastItems);
};
