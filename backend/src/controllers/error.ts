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
import { Result } from "neverthrow";
import { KoaAppContext } from "./ctx";
import { SolawiError } from "../error";

export function handleResult<T>(
  ctx: KoaAppContext,
  result: Result<T, SolawiError>,
) {
  if (result.isErr()) {
    handleError(ctx, result.error);
  } else {
    ctx.status = 200;
  }
}

export function handleError(ctx: KoaAppContext, err: SolawiError) {
  ctx.status = err.code;
  ctx.body = {
    code: err.code,
    message: err.message,
  };
}
