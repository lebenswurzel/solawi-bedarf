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
  UserWithLastOrderChange,
} from "../../../shared/src/types.ts";
import { getUrl, verifyResponse } from "./requests.ts";

// auxiliary types that allow receiving the date as string for later conversion to a Date object
export type SerializedLastOrderChange = {
  date: string;
  configId: number;
};

export type SerializedGetUserResponse = {
  userId: number;
  users: (Omit<UserWithLastOrderChange, "lastOrderChanges"> & {
    lastOrderChanges: SerializedLastOrderChange[];
  })[];
};

export const getUser = async (): Promise<GetUserResponse> => {
  const response = await fetch(getUrl("/user"));

  await verifyResponse(response);

  const result = (await response.json()) as SerializedGetUserResponse;
  return {
    ...result,
    users: result.users.map((u) => ({
      ...u,
      lastOrderChanges: u.lastOrderChanges?.map((loc) => ({
        ...loc,
        date: parseISO(loc.date),
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
