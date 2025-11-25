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

import { ChangeBatcher } from "./ChangeBatcher";

/**
 * Registry that automatically tracks all ChangeBatcher instances.
 * This allows a single middleware to flush all registered batchers.
 */
class ChangeBatcherRegistry {
  private batchers: Set<ChangeBatcher<any>> = new Set();

  /**
   * Register a batcher to be automatically flushed by the middleware.
   * This is called automatically when a batcher is created via the helper.
   *
   * @param batcher - The ChangeBatcher instance to register
   */
  register(batcher: ChangeBatcher<any>): void {
    this.batchers.add(batcher);
  }

  /**
   * Get all registered batchers.
   * @returns Array of all registered ChangeBatcher instances
   */
  getAll(): ChangeBatcher<any>[] {
    return Array.from(this.batchers);
  }

  /**
   * Flush all registered batchers.
   * This is used by the middleware to ensure all calculations run.
   */
  async flushAll(): Promise<void> {
    const batchers = this.getAll();
    if (batchers.length === 0) {
      return;
    }
    await Promise.all(batchers.map((batcher) => batcher.flush()));
  }
}

// Export singleton instance
export const changeBatcherRegistry = new ChangeBatcherRegistry();
