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
  DeliveredByProductIdDepotId,
  Depot,
  Product,
  ProductId,
} from "../types";

export const calculateDeliveries = (
  product: Product,
  deliveredByProductIdDepotId: DeliveredByProductIdDepotId,
  depots: Depot[]
): {
  display: string;
  percentage: number;
  roundedPercentage: number;
  targetDeliveries: number;
  actualDeliveries: number;
} => {
  const deliveredByDepotId = deliveredByProductIdDepotId[product.id] ?? {};
  const depotIds = Object.keys(deliveredByDepotId).map((key) => parseInt(key));
  const targetDeliveries =
    depots
      .filter((d) => depotIds.includes(d.id))
      .filter((d) => deliveredByDepotId[d.id].valueForShipment > 0).length *
    product.frequency;
  const actualDeliveries =
    depots
      .filter((d) => depotIds.includes(d.id))
      .map((d) => deliveredByDepotId[d.id].actuallyDelivered)
      .reduce((sum, value) => sum + value, 0) / 100;

  if (product.id == 296) {
    console.log("deliveredByDepotId", deliveredByDepotId);
    console.log("depots", depots);
    console.log("depotIds", depotIds);
    console.log("targetDeliveries", targetDeliveries);
    console.log("actualDeliveries", actualDeliveries);
  }

  const percentage = !targetDeliveries
    ? 0
    : (actualDeliveries / targetDeliveries) * 100;
  return {
    display: `${actualDeliveries}/${targetDeliveries}`,
    percentage,
    roundedPercentage: Math.round(percentage),
    targetDeliveries,
    actualDeliveries,
  };
};

export const calculateDeliveriesNew = (
  product: Product,
  msrpWeightsByProductId: { [key: ProductId]: number }
): {
  display: string;
  percentage: number;
  roundedPercentage: number;
  targetDeliveries: number;
  actualDeliveries: number;
} => {
  const delivered = Math.min(
    Math.max(1 - msrpWeightsByProductId[product.id] || 1, 0),
    1
  );
  const targetDeliveries = product.frequency;
  const actualDeliveries = targetDeliveries * delivered;
  const percentage = delivered * 100;

  return {
    display: `${actualDeliveries}/${targetDeliveries}`,
    percentage,
    roundedPercentage: Math.round(percentage),
    targetDeliveries,
    actualDeliveries,
  };
};
