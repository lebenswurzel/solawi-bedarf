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
import { http } from "./consts/http";

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

  public static internalError(message: string): SolawiError {
    return new SolawiError(http.internal_server_error, message);
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
