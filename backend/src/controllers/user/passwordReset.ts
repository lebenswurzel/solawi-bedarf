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
import { handleError, handleResult } from "../error";
import {
  PasswordResetRequest,
  RequestPasswordResetRequest,
} from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { SolawiError } from "../../error";

export async function passwordResetRequest(ctx: KoaAppContext) {
  const request = ctx.request.body as Partial<RequestPasswordResetRequest>;
  if (!request.username) {
    return handleError(ctx, SolawiError.invalidInput("username empty"));
  }

  const service = new PasswordResetService(ctx.deps);
  return handleResult(
    ctx,
    await service.requestPasswordReset(request.username),
  );
}

export async function passwordReset(ctx: KoaAppContext) {
  const request = ctx.request.body as Partial<PasswordResetRequest>;
  if (!request.token) {
    return handleError(ctx, SolawiError.invalidInput("token empty"));
  }
  if (!request.password) {
    return handleError(ctx, SolawiError.invalidInput("password empty"));
  }

  const service = new PasswordResetService(ctx.deps);
  return handleResult(
    ctx,
    await service.resetPassword(request.token, request.password),
  );
}
