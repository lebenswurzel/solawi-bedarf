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
import { DeliveredByProductIdDepotId, Depot, Product } from "../types";

export const calculateDeliveries = (
  product: Product,
  deliveredByProductIdDepotId: DeliveredByProductIdDepotId,
  depots: Depot[]
): {
  display: string;
  percentage: number;
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
  const actualDeliveries = depots
    .filter((d) => depotIds.includes(d.id))
    .map((d) => deliveredByDepotId[d.id].deliveryCount)
    .reduce((sum, value) => sum + value, 0);

  return {
    display: `${actualDeliveries}/${targetDeliveries}`,
    percentage: Math.round((actualDeliveries / (targetDeliveries || 1)) * 100),
    targetDeliveries,
    actualDeliveries,
  };
};
