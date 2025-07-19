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

import { escapeHtmlEntities } from "../util/stringHelper";

const regex = /{([a-zA-Z0-9]+)}/g;

export const interpolate = (
  template: string,
  variables: Record<string, string>,
  escapeHtml?: boolean,
) => {
  if (escapeHtml) {
    return template.replace(regex, (match, key) => {
      let value = variables[key];
      return value !== undefined ? escapeHtmlEntities(value) : match;
    });
  } else {
    return template.replace(regex, (match, key) => {
      let value = variables[key];
      return value !== undefined ? value : match;
    });
  }
};
