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
  ConfirmedOrder,
  SavedOrder,
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { getUrl, verifyResponse } from "./requests.ts";

export const saveOrder = async (order: ConfirmedOrder, userId: number) => {
  const response = await fetch(getUrl(`/shop/order?id=${userId}`), {
    method: "POST",
    body: JSON.stringify(order),
    headers: {
      "Content-Type": "application/json",
    },
  });

  await verifyResponse(response);
};

export const getOrder = async (
  userId: number,
  configId: number,
  noOrderItems?: boolean,
  noProductConfiguration?: boolean,
  orderId?: number,
): Promise<SavedOrder | null> => {
  const options = [
    noOrderItems ? "no-order-items" : "",
    noProductConfiguration ? "no-product-configuration" : "",
  ].join(",");

  const params = new URLSearchParams({
    id: userId.toString(),
    configId: configId.toString(),
    options,
  });

  if (orderId) {
    params.append("orderId", orderId.toString());
  }

  const response = await fetch(getUrl(`/shop/order?${params.toString()}`));

  await verifyResponse(response);

  const result = await response.json();
  return result.id
    ? {
        ...(result as SavedOrder),
        validFrom: new Date(result.validFrom),
        validTo: new Date(result.validTo),
      }
    : null;
};

export const getAllOrders = async (
  userId: number,
  configId: number,
): Promise<SavedOrder[]> => {
  const response = await fetch(
    getUrl(`/shop/orders?id=${userId}&configId=${configId}`),
  );

  await verifyResponse(response);

  const result = await response.json();
  return result.map((order: any) => ({
    ...order,
    validFrom: new Date(order.validFrom),
    validTo: new Date(order.validTo),
  }));
};

export const modifyOrder = async (userId: number, configId: number) => {
  const response = await fetch(
    getUrl(`/shop/order/modify?id=${userId}&configId=${configId}`),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  await verifyResponse(response);

  const result = await response.json();
  return {
    ...result,
    validFrom: new Date(result.validFrom),
    previousOrderValidTo: result.previousOrderValidTo
      ? new Date(result.previousOrderValidTo)
      : null,
  };
};

export const calcMsrp = async (userId: number, configId: number) => {
  const response = await fetch(
    getUrl(`/shop/calcMsrp?id=${userId}&configId=${configId}`),
  );

  await verifyResponse(response);
};
