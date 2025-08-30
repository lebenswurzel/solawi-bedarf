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
import { Unit, UserCategory } from "./enum";
import {
  OrganizationInfo,
  OrganizationInfoKeys,
  PdfTexts,
  PdfTextsKeys,
} from "./types";

export const organizationInfoKeys: OrganizationInfoKeys[] = [
  "appUrl",
  "address.name",
  "address.street",
  "address.postalcode",
  "address.city",
  "address.email",
  "address.forumContact",
  "bankAccount",
];

export const basicOrganizationInfo: OrganizationInfo = {
  appUrl: "https://bedarf.lebenswurzel.biz",
  address: {
    name: "Solawi-Projekt Gemüseanbau in Graupa",
    street: "Lindengrundstrasse 20",
    postalcode: "01796",
    city: "Pirna OT Graupa",
    email: "solawi@lebenswurzel.org",
    forumContact: "@rike",
  },
  bankAccount: "Kontoinhaber: ...\nIBAN: ...\nKreditinstitut: ...",
};

export const appConfig = {
  msrp: {
    [UserCategory.CAT100]: {
      relative: 1.0, // multiplier for the given category
    },
    [UserCategory.CAT115]: {
      relative: 1.15, // multiplier for the given category
    },
    [UserCategory.CAT130]: {
      relative: 1.3, // multiplier for the given category
    },
  },
  offerLimit: 0.6, // 0.75
  offerReasonLimit: 0.9, // 0.7
  needsCategoryReason: [UserCategory.CAT115, UserCategory.CAT100], // []
  availableCategories: [
    UserCategory.CAT130,
    UserCategory.CAT115,
    UserCategory.CAT100,
  ], // [UserCategory.CAT130, UserCategory.CAT115]
  defaultCategory: UserCategory.CAT130, // UserCategory.CAT115
  showAlternateDepot: true, // false
  externalAuthProvider: false, // true
  shipment: {
    totalQuantityRound: {
      [Unit.PIECE]: 1,
      [Unit.WEIGHT]: 10,
      [Unit.VOLUME]: 10,
    },
  },
  meta: {
    sourceCodeUrl: "https://github.com/lebenswurzel/solawi-bedarf",
  },
};

export const pdfTextsKeys: PdfTextsKeys[] = [
  "packagingListFooter",
  "packagingListHeader",
];

export const pdfTextsDefaults: PdfTexts = {
  packagingListFooter: "",
  packagingListHeader: "",
};
