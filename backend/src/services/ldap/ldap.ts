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
import { UserRole } from "../../../../shared/src/enum";
import { config } from "../../config";
import { authenticateUser } from "./auth";
let ldapEnabled = false;

if (config.ldap.enabled) {
  console.log("LDAP enabled.");
  ldapEnabled = true;
}

export const verifyLDAP = async (
  username: string,
  password: string,
): Promise<UserRole | null> => {
  return authenticateUser(username, password);
};
