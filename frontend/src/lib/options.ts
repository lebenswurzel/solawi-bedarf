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

export const multiplicatorOptions = [
  {
    title: "0,5x",
    value: 50,
    display: "halbe Menge mitnehmen",
  },
  {
    title: "1x",
    value: 100,
  },
  {
    title: "1,5x",
    value: 150,
    display: "1,5-fache Menge mitnehmen",
  },
  {
    title: "2x",
    value: 200,
    display: "doppelte Menge mitnehmen",
  },
  {
    title: "3x",
    value: 300,
    display: "dreifache Menge mitnehmen",
  },
  {
    title: "4x",
    value: 400,
    display: "vierfache Menge mitnehmen",
  },
];

export const unitDict = {
  [Unit.PIECE]: [
    {
      title: "Stk -> Stk",
      value: Unit.PIECE,
    },
    {
      title: "Stk -> g",
      value: Unit.WEIGHT,
    },
    {
      title: "Stk -> ml",
      value: Unit.VOLUME,
    },
  ],
  [Unit.WEIGHT]: [
    {
      title: "g -> g",
      value: Unit.WEIGHT,
    },
    {
      title: "g -> Stk",
      value: Unit.PIECE,
    },
    {
      title: "g -> ml",
      value: Unit.VOLUME,
    },
  ],
  [Unit.VOLUME]: [
    {
      title: "ml -> ml",
      value: Unit.VOLUME,
    },
    {
      title: "ml -> Stk",
      value: Unit.PIECE,
    },
    {
      title: "ml -> g",
      value: Unit.WEIGHT,
    },
  ],
};
