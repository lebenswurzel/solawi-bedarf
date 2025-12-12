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
import { nonLoginRedirectRoutes, router } from "../routes.ts";

const host = "api";

export const getUrl = (path: string): string => `${host}${path}`;

export const verifyResponse = async (
  response: Response,
  redirectToLogin = true,
) => {
  if (
    redirectToLogin &&
    response.status == 401 &&
    !nonLoginRedirectRoutes.some((route: string) =>
      router.currentRoute.value.path.startsWith(route),
    )
  ) {
    // redirect to login page for urls that require a login
    await router.push({
      path: "/login",
      query: { redirect: router.currentRoute.value.path },
    });
  }
  if (response.status > 299) {
    const text = await response.text();
    if (text) {
      throw new Error(text);
    }
    throw new Error("Error " + response.status);
  }
};
