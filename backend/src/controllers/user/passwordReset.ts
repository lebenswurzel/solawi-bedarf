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
import { KoaAppContext } from "../ctx";
import { PasswordResetService } from "../../services/user/passwordReset";
import { getStringQueryParameter } from "../../util/requestUtil";
import { handleError } from "../error";

export async function passwordResetRequest(ctx: KoaAppContext) {
  const username = getStringQueryParameter(ctx.request.query, "username");

  let service = new PasswordResetService(ctx.deps);
  return handleError(ctx, await service.requestPasswordReset(username));
}

export async function passwordReset(ctx: KoaAppContext) {
  const token = getStringQueryParameter(ctx.request.query, "token");
  const password = getStringQueryParameter(ctx.request.query, "password");

  let service = new PasswordResetService(ctx.deps);
  return handleError(ctx, await service.resetPassword(token, password));
}
