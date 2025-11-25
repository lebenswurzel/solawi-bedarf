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
import { EventSubscriber } from "typeorm";
import { Order } from "../Order";
import { OrderItem } from "../OrderItem";
import { orderChangeBatcher } from "./initSubscribers";
import { EntityChangeSubscriber } from "./EntityChangeSubscriber";

/**
 * Subscriber that listens to Order changes.
 * Use this to trigger heavy calculations that depend on all orders.
 *
 * This uses the generic EntityChangeSubscriber under the hood.
 */
@EventSubscriber()
export class OrderSubscriber extends EntityChangeSubscriber<Order, number> {
  constructor() {
    super(Order, (order) => order.id, orderChangeBatcher);
  }
}

/**
 * Subscriber that listens to OrderItem changes.
 * This is needed because TypeORM subscribers can only listen to one entity type.
 *
 * Note: OrderItems trigger calculations based on their orderId, not their own ID.
 * This allows batching all changes for a single order together.
 */
@EventSubscriber()
export class OrderItemSubscriber extends EntityChangeSubscriber<
  OrderItem,
  number
> {
  constructor() {
    super(OrderItem, (orderItem) => orderItem.orderId, orderChangeBatcher);
  }
}
