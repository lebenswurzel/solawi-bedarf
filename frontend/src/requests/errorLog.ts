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
import { GetErrorLogResponse } from "@lebenswurzel/solawi-bedarf-shared/src/types.ts";
import { getUrl, verifyResponse } from "./requests.ts";

// auxiliary type that allows receiving the date as string for later conversion to a Date object
type SerializedErrorLogEntry = Omit<GetErrorLogResponse[0], "createdAt"> & {
  createdAt: string;
};

export const getErrorLog = async (): Promise<GetErrorLogResponse> => {
  const response = await fetch(getUrl("/error-log"));

  await verifyResponse(response);

  const result = (await response.json()) as SerializedErrorLogEntry[];

  return result.map((entry) => ({
    ...entry,
    createdAt: new Date(entry.createdAt),
  }));
};
