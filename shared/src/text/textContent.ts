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
import { pdfTextsDefaults } from "../config";
import {
  OrganizationInfo,
  OrganizationInfoFlat,
  OrganizationInfoKeys,
  PdfTexts,
  PdfTextsKeys,
  SimpleTextContent,
} from "../types";

export const makeOrganizationInfo = (
  textContents: SimpleTextContent[]
): OrganizationInfo => {
  const getField = (title: string): string => {
    const value = textContents.filter((c) => c.title == title);
    if (value.length > 0) {
      return value[0].content;
    }
    return "";
  };
  return {
    appUrl: getField("appUrl"),
    name: getField("name"),
    address: {
      name: getField("address.name"),
      street: getField("address.street"),
      postalcode: getField("address.postalcode"),
      city: getField("address.city"),
      email: getField("address.email"),
      forumContact: getField("address.forumContact"),
    },
    bankAccount: getField("bankAccount"),
  };
};

export const makeFlatOrganizationInfo = (
  organizationInfo: OrganizationInfo
): OrganizationInfoFlat => {
  return {
    "organization.appUrl": organizationInfo.appUrl,
    "organization.name": organizationInfo.name,
    "organization.address.name": organizationInfo.address.name,
    "organization.address.street": organizationInfo.address.street,
    "organization.address.postalcode": organizationInfo.address.postalcode,
    "organization.address.city": organizationInfo.address.city,
    "organization.address.email": organizationInfo.address.email,
    "organization.address.forumContact": organizationInfo.address.forumContact,
    "organization.bankAccount": organizationInfo.bankAccount,
  };
};

export const getOrganizationInfoValueByKey = (
  organizationInfo: OrganizationInfo,
  key: OrganizationInfoKeys
): string => {
  switch (key) {
    case "appUrl":
      return organizationInfo.appUrl;
    case "name":
      return organizationInfo.name;
    case "address.name":
      return organizationInfo.address.name;
    case "address.street":
      return organizationInfo.address.street;
    case "address.postalcode":
      return organizationInfo.address.postalcode;
    case "address.city":
      return organizationInfo.address.city;
    case "address.email":
      return organizationInfo.address.email;
    case "address.forumContact":
      return organizationInfo.address.forumContact;
    case "bankAccount":
      return organizationInfo.bankAccount;
    default:
      return "";
  }
};

export const makePdfTexts = (textContents: SimpleTextContent[]): PdfTexts => {
  const getField = (title: PdfTextsKeys): string => {
    const value = textContents.filter((c) => c.title == title);
    if (value.length > 0) {
      return value[0].content;
    }
    return pdfTextsDefaults[title];
  };
  return {
    packagingListFooter: getField("packagingListFooter"),
    packagingListHeader: getField("packagingListHeader"),
  };
};
