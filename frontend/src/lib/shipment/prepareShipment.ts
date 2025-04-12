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
import { appConfig } from "../../../../shared/src/config";
import {
  AdditionalShipmentItem,
  CapacityByDepotId,
  DeliveredByProductIdDepotId,
  EditShipment,
  OptionalId,
  Shipment,
  ShipmentItem,
} from "../../../../shared/src/types";
import { splitTotal, valueToDelivered } from "../convert";

export const prepareShipment = (
  editShipment: EditShipment & OptionalId,
  deliveredByProductIdDepotId: DeliveredByProductIdDepotId,
  capacityByDepotId: CapacityByDepotId,
): Shipment & OptionalId => {
  // split total quantity
  const shipmentItems: ShipmentItem[] = [];
  editShipment.shipmentItems.forEach((s) => {
    const deliveredByDepotId = deliveredByProductIdDepotId[s.productId!];
    const neededValue = s.depotIds.map((depotId) => ({
      depotId,
      value: valueToDelivered({
        value: deliveredByDepotId[depotId].valueForShipment,
        multiplicator: s.multiplicator,
        conversionFrom: s.conversionFrom,
        conversionTo: s.conversionTo,
      }),
    }));
    const conversion = appConfig.shipment.totalQuantityRound[s.unit!];
    const reducedTotal = Math.round(s.totalShipedQuantity / conversion);
    const totalByDepot = splitTotal(neededValue, reducedTotal);

    s.depotIds.forEach((depotId) => {
      shipmentItems.push({
        productId: s.productId!,
        description: s.description,
        unit: s.unit!,
        depotId,
        totalShipedQuantity:
          (totalByDepot.find((v) => v.depotId == depotId)?.value || 0) *
          conversion,
        conversionFrom: s.conversionFrom,
        conversionTo: s.conversionTo,
        isBio: s.isBio,
        multiplicator: s.multiplicator,
      });
    });
  });

  // split total quantity
  const additionalShipmentItems: AdditionalShipmentItem[] = [];
  editShipment.additionalShipmentItems.forEach((s) => {
    const neededValue = s.depotIds.map((depotId) => ({
      depotId,
      value: capacityByDepotId[depotId].reserved * s.quantity,
    }));
    const conversion = appConfig.shipment.totalQuantityRound[s.unit!];
    const reducedTotal = Math.round(s.totalShipedQuantity / conversion);
    const totalByDepot = splitTotal(neededValue, reducedTotal);

    s.depotIds.forEach((depotId) => {
      additionalShipmentItems.push({
        product: s.product!,
        description: s.description,
        unit: s.unit!,
        depotId,
        totalShipedQuantity:
          totalByDepot.find((v) => v.depotId == depotId)!.value * conversion,
        isBio: s.isBio,
        quantity: s.quantity,
      });
    });
  });

  const shipment: Shipment & OptionalId = {
    description: editShipment.description,
    validFrom: editShipment.validFrom,
    shipmentItems,
    additionalShipmentItems,
    active: editShipment.active,
    id: editShipment.id,
    updatedAt: editShipment.updatedAt,
    requisitionConfigId: editShipment.requisitionConfigId,
  };
  return shipment;
};
