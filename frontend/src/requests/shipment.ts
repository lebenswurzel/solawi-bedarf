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
  OptionalId,
  ShipmentFullInformation,
  ShipmentRequest,
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { getUrl, verifyResponse } from "./requests";
import { ShipmentType } from "@lebenswurzel/solawi-bedarf-shared/src/enum";

export const saveShipment = async (shipment: ShipmentRequest & OptionalId) => {
  const response = await fetch(getUrl("/shipment"), {
    method: "POST",
    body: JSON.stringify(shipment),
    headers: {
      "Content-Type": "application/json",
    },
  });

  await verifyResponse(response);
};

export const getShipments = async (
  configId: number,
  shipmentId?: number,
  includeItems: boolean = false,
  shipmentType?: ShipmentType,
): Promise<{
  shipments: ShipmentFullInformation[];
}> => {
  const shipmentIdParam = shipmentId ? `&shipmentId=${shipmentId}` : "";
  const shipmentTypeParam = shipmentType ? `&shipmentType=${shipmentType}` : "";
  const response = await fetch(
    getUrl(
      `/shipments?configId=${configId}&includeItems=${includeItems}${shipmentIdParam}${shipmentTypeParam}`,
    ),
  );

  await verifyResponse(response);

  return response.json();
};

export const getUserShipments = async (
  userId: number,
  configId: number,
): Promise<{ shipments: ShipmentFullInformation[] }> => {
  const response = await fetch(
    getUrl(`/shipment?id=${userId}&configId=${configId}`),
  );

  await verifyResponse(response);

  return response.json();
};

export const deleteShipment = async (shipmentId: number) => {
  const response = await fetch(getUrl(`/shipment?id=${shipmentId}`), {
    method: "DELETE",
  });

  await verifyResponse(response);
};
