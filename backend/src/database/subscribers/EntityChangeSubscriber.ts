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
import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
} from "typeorm";
import { ChangeBatcher } from "./ChangeBatcher";

/**
 * Generic subscriber that listens to entity changes and schedules batched calculations.
 *
 * @template TEntity - The TypeORM entity type
 * @template TId - The type of the entity ID (typically number or string)
 */
@EventSubscriber()
export class EntityChangeSubscriber<TEntity, TId = number>
  implements EntitySubscriberInterface<TEntity>
{
  private readonly entityClass: new () => TEntity;
  private readonly idExtractor: (entity: TEntity) => TId;
  private readonly batcher: ChangeBatcher<TId>;

  /**
   * @param entityClass - The entity class to listen to
   * @param idExtractor - Function to extract the ID from an entity
   * @param batcher - The ChangeBatcher instance to use for batching
   */
  constructor(
    entityClass: new () => TEntity,
    idExtractor: (entity: TEntity) => TId,
    batcher: ChangeBatcher<TId>,
  ) {
    this.entityClass = entityClass;
    this.idExtractor = idExtractor;
    this.batcher = batcher;
  }

  /**
   * Indicates that this subscriber listens to the specified entity type.
   */
  listenTo() {
    return this.entityClass;
  }

  /**
   * Called after an entity is inserted.
   * Schedules a batched calculation to avoid multiple triggers.
   */
  async afterInsert(event: InsertEvent<TEntity>): Promise<void> {
    const id = this.idExtractor(event.entity);
    this.batcher.scheduleCalculation(id);
  }

  /**
   * Called after an entity is updated.
   * Schedules a batched calculation to avoid multiple triggers.
   */
  async afterUpdate(event: UpdateEvent<TEntity>): Promise<void> {
    if (!event.entity) {
      return;
    }
    const id = this.idExtractor(event.entity as TEntity);
    this.batcher.scheduleCalculation(id);
  }

  /**
   * Called after an entity is removed.
   * Schedules a batched calculation to avoid multiple triggers.
   */
  async afterRemove(event: RemoveEvent<TEntity>): Promise<void> {
    if (!event.entity) {
      return;
    }
    const id = this.idExtractor(event.entity as TEntity);
    this.batcher.scheduleCalculation(id);
  }
}

/**
 * Helper function to create a subscriber for an entity.
 *
 * @param entityClass - The entity class to listen to
 * @param idExtractor - Function to extract the ID from an entity
 * @param batcher - The ChangeBatcher instance to use for batching
 * @returns A configured EntityChangeSubscriber instance
 *
 * @example
 * ```typescript
 * const orderBatcher = new ChangeBatcher<number>("Order", 50);
 * const orderSubscriber = createEntityChangeSubscriber(
 *   Order,
 *   (order) => order.id,
 *   orderBatcher
 * );
 * ```
 */
export function createEntityChangeSubscriber<TEntity, TId = number>(
  entityClass: new () => TEntity,
  idExtractor: (entity: TEntity) => TId,
  batcher: ChangeBatcher<TId>,
): EntityChangeSubscriber<TEntity, TId> {
  return new EntityChangeSubscriber(entityClass, idExtractor, batcher);
}
