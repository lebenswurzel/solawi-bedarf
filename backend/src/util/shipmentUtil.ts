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
}

export const mergeShipmentWithForecast = (
  shipments: Shipment[],
  forecastShipments: Shipment[],
): ShipmentItem[] => {
  const result: ShipmentItem[] = [];

  const shippedItems = shipments.flatMap((shipment) =>
    shipment.shipmentItems.map((si) => ({
      ...si,
      validFrom: shipment.validFrom,
    })),
  );

  const forecastItems = forecastShipments.flatMap((shipment) =>
    shipment.shipmentItems.map((si) => ({
      ...si,
      validFrom: shipment.validFrom,
      validTo: shipment.validTo,
    })),
  );

  if (forecastItems.length === 0) {
    return shippedItems;
  }

  const usedItems: number[] = [];

  const adjustForecastItems = (items: ShipmentItemWithValidity[]) => {
    // find items in forecast that are already shipped and deduct those from the forecast items
    return items
      .map((fi) => {
        const matchingSiIndex = shippedItems.findIndex(
          (si, index) =>
            si.depotId === fi.depotId &&
            si.productId === fi.productId &&
            !usedItems.includes(index) &&
            fi.validFrom < si.validFrom &&
            fi.validTo &&
            si.validFrom < fi.validTo,
        );
        if (matchingSiIndex === -1) {
          return { ...fi };
        } else {
          // TODO this is a naive approach where each shipped item is only applied once,
          // even if it may have a higher multiplicator value than the forecast item that
          // it is applied to. Instead, also support partial usage of shipped items.
          usedItems.push(matchingSiIndex);
          return {
            ...fi,
            multiplicator:
              fi.multiplicator - shippedItems[matchingSiIndex].multiplicator,
          };
        }
      })
      .filter((fi) => fi.multiplicator > 0);
  };

  let adjustedForecastItems = forecastItems;
  let counter = 0;
  while (true) {
    counter++;
    const initialUsedItemsCount = usedItems.length;

    // repeat the forecast adjustments until no forecast items are modified
    adjustedForecastItems = adjustForecastItems(adjustedForecastItems);
    if (usedItems.length === initialUsedItemsCount) {
      break;
    }
    if (counter > 1000) {
      // should never happen, but just to be safe
      throw new Error(`infinite loop detected`);
    }
  }

  return shippedItems.concat(adjustedForecastItems);
};
