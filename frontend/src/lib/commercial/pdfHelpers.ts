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
import { Unit } from "@lebenswurzel/solawi-bedarf-shared/src/enum.ts";
import { language } from "@lebenswurzel/solawi-bedarf-shared/src/lang/lang.ts";
import { Content } from "pdfmake/interfaces";

export const formatCommercialDocumentUnit = (unit: Unit): string => {
  switch (unit) {
    case Unit.WEIGHT:
      return language.app.units.kg;
    case Unit.PIECE:
      return language.app.units.piece;
    case Unit.VOLUME:
      return language.app.units.l;
    default:
      return language.app.units.unit;
  }
};

export const rightAlignedCell = (
  text: string,
  options?: { bold?: boolean },
): Content => ({
  text,
  alignment: "right",
  ...(options?.bold ? { bold: true } : {}),
});

export const commercialDocumentTitle = (text: string): Content => ({
  text,
  bold: true,
  alignment: "center",
  fontSize: 18,
  margin: [0, 8, 0, 8],
});
