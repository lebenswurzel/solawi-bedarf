# Generic Entity Change Subscribers

This directory contains a generic implementation for listening to TypeORM entity changes and triggering batched calculations.

## Overview

The generic implementation consists of:

1. **`ChangeBatcher<TId>`** - Generic batcher that batches entity change notifications
2. **`EntityChangeSubscriber<TEntity, TId>`** - Generic TypeORM subscriber
3. **`createEntityChangeSubscriber()`** - Helper function to create subscribers easily
4. **`ChangeBatcherRegistry`** - Global registry that tracks all batchers for automatic flushing
5. **`flushAllChangeBatchers`** - Middleware that automatically flushes all registered batchers

## Usage Examples

### Example 1: Creating a Subscriber for a Simple Entity

```typescript
import { ChangeBatcher } from "./ChangeBatcher";
import { changeBatcherRegistry } from "./ChangeBatcherRegistry";
import { createEntityChangeSubscriber } from "./EntityChangeSubscriber";
import { Product } from "../Product";

// Create a batcher for products
export const productBatcher = new ChangeBatcher<number>("Product", 50);

// Register for automatic flushing (required if using flushAllChangeBatchers)
changeBatcherRegistry.register(productBatcher);

// Create a subscriber
export const productSubscriber = createEntityChangeSubscriber(
  Product,
  (product) => product.id, // Extract ID from entity
  productBatcher
);

// Set calculation callback
productBatcher.setCalculationCallback(async (affectedProductIds) => {
  console.log("Products changed:", affectedProductIds);
  await yourCalculationService.recalculateProducts(affectedProductIds);
});

// Register in database.ts
subscribers: [productSubscriber, ...]
```

### Example 2: Creating a Subscriber with String IDs

```typescript
import { ChangeBatcher } from "./ChangeBatcher";
import { changeBatcherRegistry } from "./ChangeBatcherRegistry";
import { createEntityChangeSubscriber } from "./EntityChangeSubscriber";
import { User } from "../User";

// Create a batcher for users (with string IDs)
export const userBatcher = new ChangeBatcher<string>("User", 50);

// Register for automatic flushing
changeBatcherRegistry.register(userBatcher);

// Create a subscriber
export const userSubscriber = createEntityChangeSubscriber(
  User,
  (user) => user.uuid, // Extract UUID string
  userBatcher,
);

// Set calculation callback
userBatcher.setCalculationCallback(async (affectedUserIds) => {
  await yourCalculationService.recalculateUsers(affectedUserIds);
});
```

### Example 3: Creating Multiple Subscribers for Related Entities

```typescript
import { ChangeBatcher } from "./ChangeBatcher";
import { changeBatcherRegistry } from "./ChangeBatcherRegistry";
import { createEntityChangeSubscriber } from "./EntityChangeSubscriber";
import { Order } from "../Order";
import { OrderItem } from "../OrderItem";

// Create a shared batcher for orders
export const orderBatcher = new ChangeBatcher<number>("Order", 50);

// Register for automatic flushing
changeBatcherRegistry.register(orderBatcher);

// Create subscribers - both trigger the same batcher
export const orderSubscriber = createEntityChangeSubscriber(
  Order,
  (order) => order.id,
  orderBatcher,
);

// OrderItems trigger calculations based on their orderId
export const orderItemSubscriber = createEntityChangeSubscriber(
  OrderItem,
  (orderItem) => orderItem.orderId, // Note: using orderId, not orderItem.id
  orderBatcher,
);

// Set calculation callback (will be called for both Order and OrderItem changes)
orderBatcher.setCalculationCallback(async (affectedOrderIds) => {
  await yourCalculationService.recalculateOrders(affectedOrderIds);
});
```

### Example 4: Automatic Flushing (Recommended)

The easiest way is to use the automatic flushing middleware that flushes all registered batchers:

```typescript
// In initSubscribers.ts
import { ChangeBatcher } from "./ChangeBatcher";
import { changeBatcherRegistry } from "./ChangeBatcherRegistry";

export const orderBatcher = new ChangeBatcher<number>("Order", 50);
export const productBatcher = new ChangeBatcher<number>("Product", 50);

// Register batchers (required for automatic flushing)
changeBatcherRegistry.register(orderBatcher);
changeBatcherRegistry.register(productBatcher);

// In index.ts
import { flushAllChangeBatchers } from "./middleware/flushAllChangeBatchers";

app.use(flushAllChangeBatchers);
// All registered batchers will be automatically flushed!
```

## API Reference

### `ChangeBatcher<TId>`

Generic batcher class that batches entity change notifications.

**Constructor:**

```typescript
new ChangeBatcher<TId>(name: string, debounceDelayMs?: number)
```

**Methods:**

- `scheduleCalculation(id: TId): void` - Schedule a calculation for an entity ID
- `flush(): Promise<void>` - Immediately flush all pending calculations
- `setCalculationCallback(callback: (affectedIds: TId[]) => Promise<void>): void` - Set the calculation callback

### `createEntityChangeSubscriber<TEntity, TId>`

Helper function to create a TypeORM subscriber.

**Parameters:**

- `entityClass: new () => TEntity` - The entity class
- `idExtractor: (entity: TEntity) => TId` - Function to extract ID from entity
- `batcher: ChangeBatcher<TId>` - The batcher instance to use

**Returns:** `EntityChangeSubscriber<TEntity, TId>`

## Best Practices

1. **Use descriptive names** for batchers to help with debugging
2. **Share batchers** when entities are related (like Order and OrderItem)
3. **Set callbacks early** in your application initialization
4. **Register batchers** in `initSubscribers.ts` to enable automatic flushing
5. **Use `flushAllChangeBatchers` middleware** - it automatically flushes all registered batchers
6. **Consider debounce delay** - 50ms works well for most cases, but adjust based on your needs

## Automatic vs Manual Flushing

### Automatic Flushing (Recommended)

- Register all batchers in `initSubscribers.ts`
- Use `flushAllChangeBatchers` middleware
- New batchers are automatically included - no code changes needed!

## Order Implementation Example

The Order implementation uses the generic classes:

```typescript
// In initSubscribers.ts
import { ChangeBatcher } from "./ChangeBatcher";
import { changeBatcherRegistry } from "./ChangeBatcherRegistry";

export const orderChangeBatcher = new ChangeBatcher<number>("Order", 50);

// Register for automatic flushing
changeBatcherRegistry.register(orderChangeBatcher);

orderChangeBatcher.setCalculationCallback(async (affectedOrderIds) => {
  await yourCalculationService.recalculateAllOrders();
});

// In OrderSubscriber.ts
import { EventSubscriber } from "typeorm";
import { EntityChangeSubscriber } from "./EntityChangeSubscriber";
import { orderChangeBatcher } from "./initSubscribers";
import { Order } from "../Order";
import { OrderItem } from "../OrderItem";

@EventSubscriber()
export class OrderSubscriber extends EntityChangeSubscriber<Order, number> {
  constructor() {
    super(Order, (order) => order.id, orderChangeBatcher);
  }
}

@EventSubscriber()
export class OrderItemSubscriber extends EntityChangeSubscriber<
  OrderItem,
  number
> {
  constructor() {
    super(OrderItem, (orderItem) => orderItem.orderId, orderChangeBatcher);
  }
}
```
