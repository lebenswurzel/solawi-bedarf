import { KoaAppContext } from "../ctx";
import { PasswordResetService } from "../../services/user/passwordReset";
import { getStringQueryParameter } from "../../util/requestUtil";
import { handleError } from "../error";

export async function passwordResetRequest(ctx: KoaAppContext) {
  const username = getStringQueryParameter(ctx.request.query, "username");

  let service = new PasswordResetService(ctx.deps);
  return handleError(ctx, await service.beginPasswordReset(username));
}

export async function passwordReset(ctx: KoaAppContext) {
  const token = getStringQueryParameter(ctx.request.query, "token");
  const password = getStringQueryParameter(ctx.request.query, "password");

  let service = new PasswordResetService(ctx.deps);
  return handleError(ctx, await service.endPasswordReset(token, password));
}
