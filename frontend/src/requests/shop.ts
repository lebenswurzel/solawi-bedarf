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
import { ConfirmedOrder, Order } from "../../../shared/src/types.ts";
import { getUrl, verifyResponse } from "./requests.ts";

export const saveOrder = async (order: ConfirmedOrder & { userId: number }) => {
  const payload: ConfirmedOrder = {
    orderItems: order.orderItems,
    offer: order.offer,
    offerReason: order.offerReason,
    depotId: order.depotId,
    alternateDepotId: order.alternateDepotId,
    category: order.category,
    categoryReason: order.categoryReason,
    confirmGTC: order.confirmGTC,
    validFrom: order.validFrom,
    requisitionConfigId: order.requisitionConfigId,
    sendConfirmationEmail: order.sendConfirmationEmail,
  };
  const response = await fetch(getUrl(`/shop/order?id=${order.userId}`), {
    method: "POST",
    body: JSON.stringify(payload),
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
): Promise<Order> => {
  const options = [
    noOrderItems ? "no-order-items" : "",
    noProductConfiguration ? "no-product-configuration" : "",
  ].join(",");
  const response = await fetch(
    getUrl(`/shop/order?id=${userId}&configId=${configId}&options=${options}`),
  );

  await verifyResponse(response);

  return response.json();
};
