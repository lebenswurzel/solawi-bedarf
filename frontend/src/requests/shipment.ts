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
import { Id, OptionalId, Shipment } from "../../../shared/src/types";
import { getUrl, verifyResponse } from "./requests";

export const saveShipment = async (shipment: Shipment & OptionalId) => {
  const response = await fetch(getUrl("/shipment"), {
    method: "POST",
    body: JSON.stringify(shipment),
    headers: {
      "Content-Type": "application/json",
    },
  });

  await verifyResponse(response);
};

export const getShipments = async (): Promise<{
  shipments: (Shipment & Id)[];
}> => {
  const response = await fetch(getUrl("/shipments"));

  await verifyResponse(response);

  return response.json();
};

export const getShipment = async (
  userId: number,
): Promise<{ shipments: (Shipment & Id)[] }> => {
  const response = await fetch(getUrl(`/shipment?id=${userId}`));

  await verifyResponse(response);

  return response.json();
};
