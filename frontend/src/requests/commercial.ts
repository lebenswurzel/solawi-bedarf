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
  CommercialDeliveryFullInformation,
  CommercialDeliveryRequest,
  CommercialProfile,
  CommercialUser,
  CreateInvoiceResponse,
  OptionalId,
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { getUrl, verifyResponse } from "./requests.ts";

export const getCommercialUsers = async (): Promise<{
  users: CommercialUser[];
}> => {
  const response = await fetch(getUrl("/users/commercial"));
  await verifyResponse(response);
  return response.json();
};

export const getCommercialDeliveries = async (
  deliveryId?: number,
  includeItems: boolean = false,
): Promise<{ deliveries: CommercialDeliveryFullInformation[] }> => {
  const deliveryIdParam = deliveryId ? `&deliveryId=${deliveryId}` : "";
  const response = await fetch(
    getUrl(
      `/commercialDeliveries?includeItems=${includeItems}${deliveryIdParam}`,
    ),
  );
  await verifyResponse(response);
  return response.json();
};

export const saveCommercialDelivery = async (
  delivery: CommercialDeliveryRequest & OptionalId,
): Promise<CommercialDeliveryFullInformation> => {
  const response = await fetch(getUrl("/commercialDelivery"), {
    method: "POST",
    body: JSON.stringify(delivery),
    headers: {
      "Content-Type": "application/json",
    },
  });
  await verifyResponse(response);
  return response.json();
};

export const deleteCommercialDelivery = async (deliveryId: number) => {
  const response = await fetch(getUrl(`/commercialDelivery?id=${deliveryId}`), {
    method: "DELETE",
  });
  await verifyResponse(response);
};

export const createCommercialInvoice = async (
  deliveryId: number,
): Promise<CreateInvoiceResponse> => {
  const response = await fetch(
    getUrl(`/commercialDelivery/invoice?deliveryId=${deliveryId}`),
    {
      method: "POST",
    },
  );
  await verifyResponse(response);
  return response.json();
};

export const getCommercialProfile = async (
  userId: number,
): Promise<{ commercialProfile: CommercialProfile | null }> => {
  const response = await fetch(
    getUrl(`/user/commercialProfile?userId=${userId}`),
  );
  await verifyResponse(response);
  return response.json();
};
