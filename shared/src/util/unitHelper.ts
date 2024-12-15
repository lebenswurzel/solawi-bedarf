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
import { Unit } from "../../../shared/src/enum";
import { sharedLanguage } from "../language/sharedLang";

export const getLangUnit = (unit?: Unit, useBigUnit?: boolean) => {
  switch (unit) {
    case Unit.WEIGHT:
      return useBigUnit ? sharedLanguage.units.kg : sharedLanguage.units.g;
    case Unit.PIECE:
      return sharedLanguage.units.pcs;
    case Unit.VOLUME:
      return useBigUnit ? sharedLanguage.units.l : sharedLanguage.units.ml;
    default:
      return sharedLanguage.units.unit;
  }
};

export const convertToBigUnit = (
  value: number,
  unit: Unit
): { label: string; value?: number } => {
  switch (unit) {
    case Unit.WEIGHT:
      return { label: sharedLanguage.units.kg, value: value / 1000 };
    case Unit.PIECE:
      return { label: sharedLanguage.units.pcs, value };
    case Unit.VOLUME:
      return { label: sharedLanguage.units.l, value: value / 1000 };
  }
};
