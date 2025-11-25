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
import Koa from "koa";
import { changeBatcherRegistry } from "../database/subscribers/ChangeBatcherRegistry";

/**
 * Middleware that automatically flushes all registered ChangeBatcher instances
 * after the request completes. This ensures that any pending calculations are
 * executed before the response is sent, so subsequent requests will see the
 * most up-to-date state.
 *
 * This middleware automatically includes all batchers that were created and
 * registered. You don't need to manually specify which batchers to flush.
 *
 * This should be placed early in the middleware chain (after error handling)
 * to ensure it runs for all requests.
 *
 * @example
 * ```typescript
 * // In initSubscribers.ts
 * export const orderBatcher = new ChangeBatcher<number>("Order", 50);
 * export const productBatcher = new ChangeBatcher<number>("Product", 50);
 *
 * // In index.ts
 * import { flushAllChangeBatchers } from "./middleware/flushAllChangeBatchers";
 * app.use(flushAllChangeBatchers);
 * // Both orderBatcher and productBatcher will be automatically flushed
 * ```
 */
export const flushAllChangeBatchers = async (
  ctx: Koa.Context,
  next: Koa.Next,
) => {
  try {
    await next();
  } finally {
    // Flush all registered batchers after the request completes (even if there was an error)
    // This ensures calculations run before the response is sent
    await changeBatcherRegistry.flushAll();
  }
};
