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
export enum UserRole {
  ADMIN = "ADMIN",
  USER = "USER",
  EMPLOYEE = "EMPLOYEE",
}

export enum Unit {
  WEIGHT = "WEIGHT",
  PIECE = "PIECE",
  VOLUME = "VOLUME",
}

export enum UserCategory {
  CAT100 = "CAT100",
  CAT115 = "CAT115",
  CAT130 = "CAT130",
}

export enum ApplicantState {
  NEW = "NEW",
  DELETED = "DELETED",
  CONFIRMED = "CONFIRMED",
}

export enum TextContentCategory {
  IMPRINT = "IMPRINT",
  PRIVACY_NOTICE = "PRIVACY_NOTICE",
  FAQ = "FAQ",
  TAC = "TAC",
  MAINTENANCE_MESSAGE = "MAINTENANCE_MESSAGE",
  ORGANIZATION_INFO = "ORGANIZATION_INFO",
  PDF = "PDF",
  EMAIL = "EMAIL",
  PAGE_ELEMENTS = "PAGE_ELEMENTS",
}

/**
 * Categories that may contain more than one text entry but that have a pre-defined
 * set of titles (unlike FAQ entries that can have an arbitrary number of entries).
 */
export const multiContentCategories = [
  TextContentCategory.ORGANIZATION_INFO,
  TextContentCategory.PDF,
  TextContentCategory.EMAIL,
];
export const isMultiContentCategory = (
  category: TextContentCategory
): boolean => {
  return multiContentCategories.includes(category);
};

export enum TextContentTyp {
  MD = "MD",
  PLAIN = "PLAIN",
}

export enum ProductCategoryType {
  SELFGROWN = "SELFGROWN",
  COOPERATION = "COOPERATION",
}

export enum SeasonPhase {
  BEFORE_SEASON,
  ACTIVE_SEASON,
  AFTER_SEASON,
  ORDER_CLOSED,
  FREE_ORDER,
  INCREASE_ONLY,
}

export enum ShipmentType {
  NORMAL = "NORMAL",
  DRAFT = "DRAFT",
  FORECAST = "FORECAST",
}
