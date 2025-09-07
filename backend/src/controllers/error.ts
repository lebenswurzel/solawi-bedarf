import { Result } from "neverthrow";
import { KoaAppContext } from "./ctx";
import { SolawiError } from "../error";

export function handleError<T>(
  ctx: KoaAppContext,
  result: Result<T, SolawiError>,
) {
  if (result.isErr()) {
    const err = result.error;
    ctx.status = err.code;
    ctx.body = {
      code: err.code,
      message: err.message,
    };
  } else {
    ctx.status = 200;
  }
}
