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
import { ParsedUrlQuery } from "querystring";

export const getNumericQueryParameter = (
  requestQuery: ParsedUrlQuery,
  name: string,
  fallback?: number,
): number => {
  fallback = fallback ?? -1;
  const requestValue = requestQuery[name];
  if (!requestValue || Array.isArray(requestValue)) {
    return fallback;
  }
  const numericValue = parseInt(requestValue);
  return isFinite(numericValue) ? numericValue : fallback;
};
