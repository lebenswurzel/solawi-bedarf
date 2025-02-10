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
import { getUrl, verifyResponse } from "./requests.ts";

export const login = async (
  username: string,
  password: string,
  untilMidnight?: boolean,
) => {
  let query = "";
  if (untilMidnight === true) {
    query = "?untilMidnight=true";
  }
  const response = await fetch(getUrl("/user/token" + query), {
    headers: new Headers({
      Authorization: `Basic ${btoa(`${username}:${password}`)}`,
    }),
  });
  await verifyResponse(response, false);
};

export const logout = async () => {
  await fetch(getUrl("/user/token"), {
    method: "DELETE",
  });
};
