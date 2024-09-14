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
import { Depot } from "../../../shared/src/types.ts";

export interface Collector<K, V, Acc> {
  init(key: K, first: V): Acc;

  add(acc: Acc, value: V): void;
}

export function collect<K, V, Acc>(
  init: (key: K, first: V) => Acc,
  add: (acc: Acc, value: V) => void,
): Collector<K, V, Acc> {
  return {
    init,
    add,
  };
}

export function collectArray<K, V>(): Collector<K, V, V[]> {
  return {
    init(): V[] {
      return [];
    },
    add(acc: V[], value: V) {
      acc.push(value);
    },
  };
}

export function collectMap<K1, K2, V, Acc>(
  keyFn: (value: V) => K2,
  agg: Collector<K2, V, Acc>,
): Collector<K1, V, Map<K2, Acc>> {
  return {
    init(): Map<K2, Acc> {
      return new Map();
    },
    add: groupingBy(keyFn, agg),
  };
}

export function groupingBy<K, V, Agg>(
  keyFn: (value: V) => K,
  agg: Collector<K, V, Agg>,
): (acc: Map<K, Agg>, val: V) => Map<K, Agg> {
  return (acc: Map<K, Agg>, val: V) => {
    const key = keyFn(val);
    const existing = acc.get(key);
    if (existing === undefined) {
      const created = agg.init(key, val);
      agg.add(created, val);
      acc.set(key, created);
    } else {
      agg.add(existing, val);
    }
    return acc;
  };
}

export function grouping<K, V, U>(
  keyFn: (value: V) => K,
  valueFn: (value: V) => U,
): (acc: Map<K, U>, val: V) => Map<K, U> {
  return (acc: Map<K, U>, val: V) => {
    const key = keyFn(val);
    const existing = acc.get(key);
    if (existing === undefined) {
      acc.set(key, valueFn(val));
    } else {
      throw new Error("Multiple values for key " + key);
    }
    return acc;
  };
}

export type Comparator<T> = (a: T, b: T) => number;

export function byKey<V, K>(
  keyExtractor: (value: V) => K,
  keyComparator: Comparator<K>,
): Comparator<V> {
  return (a, b) => keyComparator(keyExtractor(a), keyExtractor(b));
}

export const inLocaleOrder: Comparator<string> = (a, b) => a.localeCompare(b);
export const inNaturalOrder: Comparator<any> = (a, b) => a - b;

export function getOrCompute<V>(
  obj: Map<string, V>,
  key: string,
  fn: (k: string) => V,
): V {
  const value = obj.get(key);
  if (value === undefined) {
    const init = fn(key);
    obj.set(key, init);
    return init;
  } else {
    return value;
  }
}

export function findDepotById(
  depots: Depot[],
  depotId: number,
): Depot | undefined {
  return depots.find((d) => d.id == depotId);
}

export function findDepotNameById(depots: Depot[], depotId: number): string {
  return findDepotById(depots, depotId)?.name || "Unbekanntes Depot";
}
