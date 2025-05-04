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
import ldap from "ldapjs";
import { config } from "../../config";
import { UserRole } from "@lebenswurzel/solawi-bedarf-shared/src/enum";

export async function authenticateUser(
  username: string,
  password: string,
): Promise<UserRole | null> {
  const client = ldap.createClient({ url: config.ldap.url });

  const userAuthenticated = await new Promise((resolve, reject) => {
    client.bind(
      `${config.ldap.usernameAttribute}=${username},${config.ldap.userSearchBase}`,
      password,
      (err: any) => {
        if (err) {
          reject("Authentication failed");
          return;
        }
        resolve(true);
      },
    );
  });

  if (!userAuthenticated) {
    return null;
  }

  const ldapGroup: string[] = await new Promise((resolve, reject) => {
    client.bind(config.ldap.adminDn, config.ldap.adminPassword, (err: any) => {
      if (err) {
        reject("Authentication failed");
        return;
      }

      client.search(
        config.ldap.groupSearchBase,
        {
          scope: "sub",
          filter: `(${config.ldap.groupMemberAttribute}=${username})`,
          attributes: ["cn"],
        },
        (err: any, searchRes: any) => {
          if (err) {
            reject("Failed to retrieve user groups");
            return;
          }

          const groups: string[] = [];

          searchRes.on("searchEntry", (entry: any) => {
            (entry.pojo.attributes as { type: string; values: string[] }[])
              .filter((attribute) => attribute.type == "cn")
              .forEach((attribute) => {
                attribute.values.forEach((cn) => groups.push(cn));
              });
          });

          searchRes.on("error", (err: any) => {
            reject("Error while searching user groups");
          });

          searchRes.on("end", () => {
            resolve(groups);
          });
        },
      );
    });
  });

  if (
    config.ldap.groupRoleMapping.ADMIN &&
    ldapGroup.includes(config.ldap.groupRoleMapping.ADMIN)
  ) {
    return UserRole.ADMIN;
  }
  if (
    config.ldap.groupRoleMapping.EMPLOYEE &&
    ldapGroup.includes(config.ldap.groupRoleMapping.EMPLOYEE)
  ) {
    return UserRole.EMPLOYEE;
  }
  if (
    config.ldap.groupRoleMapping.USER &&
    ldapGroup.includes(config.ldap.groupRoleMapping.USER)
  ) {
    return UserRole.USER;
  }
  return null;
}
