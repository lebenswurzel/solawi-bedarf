import { http } from "./consts/http.js";

export class SolawiError extends Error {
  public code: number;
  public cause?: unknown;

  constructor(code: number, message: string, stack?: string, cause?: unknown) {
    super(message);
    this.name = "SolawiError";
    this.code = code;
    this.cause = cause;
  }

  public static invalidInput(message: string): SolawiError {
    return new SolawiError(http.unprocessable_entity, message);
  }

  public static rejected(message: string): SolawiError {
    return new SolawiError(http.conflict, message);
  }
}

export class InfrastructureError extends SolawiError {
  constructor(system: string, cause: unknown) {
    if (cause instanceof Error) {
      super(
        503,
        `${system} error: ${cause.name}: ${cause.message}`,
        cause.stack,
        cause,
      );
    } else {
      super(503, `${system} error: ${cause}`, undefined, cause);
    }
  }
}
