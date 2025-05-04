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
import { UserRole } from "@lebenswurzel/solawi-bedarf-shared/src/enum";

export const config = {
  db: {
    username: process.env.POSTGRES_USER || "postgres",
    password: process.env.POSTGRES_PASSWORD || "postgres",
    url: process.env.POSTGRES_URL || "localhost",
    port: process.env.POSTGRES_PORT || 5532,
    name: process.env.POSTGRES_DB || "solawi",
    secret: process.env.POSTGRES_SECRET || "secret",
  },
  server: {
    serverPort: "3000",
    initialUsername: process.env.INITIAL_USERNAME || "admin",
    initialPassword: process.env.INITIAL_PASSWORD || "admin",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "secret",
    expirationTimeInMs: 60 * 60 * 1000,
    cookieSecure: false,
  },
  php: {
    url: process.env.PHP_URL || "localhost",
    port: process.env.PHP_PORT || 8180,
  },
  email: {
    enabled: process.env.EMAIL_ENABLED === "true",
    sendConfirmation: process.env.EMAIL_SEND_REGISTER_CONFIRMATION === "true",
    host: process.env.EMAIL_HOST || "smtp.solawi.biz",
    port: process.env.EMAIL_PORT || 587,
    username: process.env.EMAIL_USERNAME || "email",
    password: process.env.EMAIL_PASSWORD || "email",
    sender: process.env.EMAIL_SENDER || "sender",
    receiver: process.env.EMAIL_RECEIVER || "receiver",
    orderUpdatedBccReceiver: process.env.EMAIL_ORDER_UPDATED_BCC || undefined,
  },
  ldap: {
    enabled: process.env.LDAP_ENABLED || false,
    url: process.env.LDAP_URL || "ldap://someip:someport",
    adminDn: process.env.LDAP_ADMIN_DN || "cn=admin,dc=solawi,dc=biz",
    adminPassword: process.env.LDAP_ADMIN_Password || "passwort",
    userSearchBase:
      process.env.LDAP_USER_SEARCHBASE || "ou=users,dc=solawi,dc=biz",
    usernameAttribute: process.env.LDAP_USER_NAME_ATTRIBUTE || "uid",
    groupSearchBase:
      process.env.LDAP_GROUP_SEARCHBASE || "ou=groups,dc=solawi,dc=biz",
    groupMemberAttribute: process.env.LDAP_GROUP_MEMBER_ATTRIBUTE || "member",
    groupRoleMapping: {
      [UserRole.ADMIN]: "plantage_admin",
      [UserRole.EMPLOYEE]: "plantage_employee",
      [UserRole.USER]: "plantage_user",
    },
  },
  testing: {
    isTesting: process.env.NODE_ENV === "test",
    dbPort: process.env.POSTGRES_TESTING_PORT || 5533,
  },
  timezone: process.env.TIMEZONE || "Europe/Berlin",
};
