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

// Thanks to ChatGPT :P

type AnyObject = Record<string, any>;

// Extract only function properties
type FunctionProps<T> = {
  [K in keyof T as T[K] extends (...args: any[]) => any ? K : never]: T[K];
};

// Merge all function-only properties
type MergeFunctionProps<S extends AnyObject[]> = S extends [
  infer Head,
  ...infer Tail,
]
  ? Tail extends AnyObject[]
    ? FunctionProps<Head & AnyObject> & MergeFunctionProps<Tail>
    : FunctionProps<Head & AnyObject>
  : {};

interface Method {
  fn: Function;
  this_: object;
}

/**
 * Merges all functions from the provided source objects.
 * Each function is bound to the object it came from.
 * Later sources overwrite earlier ones if they share the same function name.
 */
export function mergeMethods<S extends AnyObject[]>(
  ...sources: S
): MergeFunctionProps<S> {
  const collected = new Map<string | symbol, Method>();

  for (const src of sources) {
    if (!src) continue;

    let current: any = src;
    while (current && current !== Object.prototype) {
      // String keys
      for (const key of Object.getOwnPropertyNames(current)) {
        if (key === "constructor") continue;

        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (descriptor?.value && typeof descriptor.value === "function") {
          if (!collected.has(key)) {
            collected.set(key, {
              fn: descriptor.value.bind(src),
              this_: src,
            });
          } else {
            let existing = collected.get(key)!;
            throw new Error(
              `Conflict for method "${key.toString()}" existing on ${existing.this_.constructor.name} and ${src.constructor.name}`,
            );
          }
        }
      }

      current = Object.getPrototypeOf(current);
    }
  }

  return Object.fromEntries(
    Array.from(collected, (e) => [e[0], e[1].fn]),
  ) as MergeFunctionProps<S>;
}
