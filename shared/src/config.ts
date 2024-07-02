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

export const appConfig = {
  address: {
    name: "Solawi-Projekt Gemüseanbau in Graupa",
    street: "Lindengrundstrasse 20",
    postalcode: "01796",
    city: "Pirna OT Graupa",
  },
  msrp: {
    [UserCategory.CAT100]: {
      absolute: 0, // 50.0
      relative: 1.0, // 1.0
    },
    [UserCategory.CAT115]: {
      absolute: 0, // 50
      relative: 1.15, // 1.0
    },
    [UserCategory.CAT130]: {
      absolute: 0, // 50
      relative: 1.3, // 1.0
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
    sourceCodeUrl: "https://github.com/lebenswurzel/solawi-bedarf"
  }
};
