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

/**
 * Generic batcher that batches entity change notifications to avoid triggering
 * calculations multiple times when many changes happen in a single transaction.
 *
 * This uses a debouncing mechanism that waits a short time after the last
 * change before triggering the calculation. This naturally batches changes
 * that happen in quick succession (like in a transaction).
 *
 * @template TId - The type of the entity ID (typically number or string)
 *
 * Concurrency Notes:
 * - Node.js is single-threaded, so JavaScript operations are atomic
 * - Timers run on the event loop in the same thread as request handlers
 * - Multiple requests can schedule calculations concurrently, but they'll be batched
 * - The flush() method prevents concurrent calculations by using a lock
 */
export class ChangeBatcher<TId = number> {
  private pendingTimeout: NodeJS.Timeout | null = null;
  private pendingChanges: Set<TId> = new Set(); // Set of affected entity IDs
  private readonly debounceDelayMs: number;
  private calculationCallback: ((affectedIds: TId[]) => Promise<void>) | null =
    null;
  private isCalculating: boolean = false; // Lock to prevent concurrent calculations
  private readonly name: string; // Name for logging

  /**
   * @param name - Name of the batcher (for logging purposes)
   * @param debounceDelayMs - Delay in milliseconds before triggering calculation (default: 50ms)
   */
  constructor(name: string, debounceDelayMs: number = 50) {
    this.name = name;
    this.debounceDelayMs = debounceDelayMs;
  }

  /**
   * Schedule a calculation to be triggered after batching is complete.
   * @param id The ID of the entity that was affected
   */
  scheduleCalculation(id: TId): void {
    this.pendingChanges.add(id);

    // Clear existing timeout
    if (this.pendingTimeout) {
      clearTimeout(this.pendingTimeout);
    }

    // Schedule new calculation after debounce delay
    this.pendingTimeout = setTimeout(() => {
      this.triggerCalculation();
    }, this.debounceDelayMs);
  }

  /**
   * Immediately trigger calculation for all pending changes.
   * Useful for cleanup or when you need to ensure calculation runs.
   * Returns a promise that resolves when the calculation is complete.
   */
  async flush(): Promise<void> {
    if (this.pendingChanges.size === 0) {
      return;
    }
    console.log(`Flushing ${this.name} change batcher`);
    if (this.pendingTimeout) {
      clearTimeout(this.pendingTimeout);
      this.pendingTimeout = null;
    }
    await this.triggerCalculation();
  }

  /**
   * Set a callback function to be called when entity changes are detected.
   * This callback will receive an array of affected entity IDs.
   *
   * Example:
   * ```typescript
   * batcher.setCalculationCallback(async (affectedIds) => {
   *   await yourCalculationService.recalculate(affectedIds);
   * });
   * ```
   */
  setCalculationCallback(
    callback: (affectedIds: TId[]) => Promise<void>,
  ): void {
    this.calculationCallback = callback;
  }

  /**
   * Trigger the calculation for all pending changes.
   * Uses a lock to prevent concurrent calculations from running simultaneously.
   * If a calculation is already running, this will wait for it to complete
   * and then check if there are new pending changes.
   */
  private async triggerCalculation(): Promise<void> {
    // Prevent concurrent calculations
    if (this.isCalculating) {
      // If calculation is already running, schedule another check after it completes
      // The pending changes will be picked up in the next calculation cycle
      console.log(
        `${this.name}: Calculation already in progress, pending changes will be processed after current calculation completes`,
      );
      return;
    }

    // Extract pending changes atomically
    const affectedIds = Array.from(this.pendingChanges);
    this.pendingChanges.clear();
    this.pendingTimeout = null;

    if (affectedIds.length === 0) {
      return;
    }

    // Set lock and execute calculation
    this.isCalculating = true;
    try {
      if (this.calculationCallback) {
        await this.calculationCallback(affectedIds);
      } else {
        // Default behavior: just log
        console.log(
          `${this.name}: Changes detected for ${affectedIds.length} entity/entities. Set a calculation callback to trigger your calculation.`,
        );
        console.log(`${this.name}: Affected IDs: ${affectedIds.join(", ")}`);
      }

      // After calculation completes, check if new changes arrived during calculation
      // and trigger another calculation if needed
      if (this.pendingChanges.size > 0) {
        // Schedule immediate recalculation for any changes that arrived during calculation
        // Use setImmediate to avoid blocking and allow other operations to complete
        setImmediate(() => {
          this.triggerCalculation();
        });
      }
    } finally {
      this.isCalculating = false;
    }
  }
}
