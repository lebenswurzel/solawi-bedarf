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
  Depot,
  NewDepot,
  OptionalId,
  UpdateDepot,
} from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { getUrl, verifyResponse } from "./requests.ts";

export const getDepots = async (): Promise<Depot[]> => {
  const response = await fetch(getUrl("/depot"));

  await verifyResponse(response);

  return (await response.json()).depots;
};

export const saveDepot = async (depot: Required<NewDepot> & OptionalId) => {
  const response = await fetch(getUrl("/depot"), {
    method: "POST",
    body: JSON.stringify(depot),
    headers: {
      "Content-Type": "application/json",
    },
  });

  await verifyResponse(response);
};

export const updateDepot = async (depot: UpdateDepot) => {
  const response = await fetch(getUrl("/depot/update"), {
    method: "POST",
    body: JSON.stringify(depot),
    headers: {
      "Content-Type": "application/json",
    },
  });

  await verifyResponse(response);
};
