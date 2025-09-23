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
import { parseISO } from "date-fns";
import {
  GetUserResponse,
  SaveUserRequest,
  UpdateUserRequest,
  UserWithOrders,
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { getUrl, verifyResponse } from "./requests.ts";

// auxiliary types that allow receiving the date as string for later conversion to a Date object
export type SerializedUserOrders = {
  validFrom: string;
  configId: number;
  updatedAt: string;
  hasItems: boolean;
  depotId: number;
  depotName: string;
};

export type SerializedGetUserResponse = {
  userId: number;
  users: (Omit<UserWithOrders, "orders"> & {
    orders: SerializedUserOrders[];
  })[];
  tokenValidUntil: Date;
};

export const getUser = async (): Promise<GetUserResponse> => {
  const response = await fetch(getUrl("/user"));

  await verifyResponse(response);

  const result = (await response.json()) as SerializedGetUserResponse;
  return {
    ...result,
    tokenValidUntil: result.tokenValidUntil
      ? new Date(result.tokenValidUntil)
      : null,
    users: result.users.map((u) => ({
      ...u,
      orders: u.orders?.map((userOrder) => ({
        ...userOrder,
        updatedAt: parseISO(userOrder.updatedAt),
        validFrom: parseISO(userOrder.validFrom),
        depotId: userOrder.depotId,
        depotName: userOrder.depotName,
      })),
    })),
  };
};

export const saveUser = async (user: SaveUserRequest) => {
  const response = await fetch(getUrl("/user"), {
    method: "POST",
    body: JSON.stringify(user),
    headers: {
      "Content-Type": "application/json",
    },
  });

  await verifyResponse(response);
};

export const updateUser = async (user: UpdateUserRequest) => {
  const response = await fetch(getUrl("/user"), {
    method: "PUT",
    body: JSON.stringify(user),
    headers: {
      "Content-Type": "application/json",
    },
  });

  await verifyResponse(response);
};
