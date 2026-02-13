import {
  createRoot,
  createEffect,
  type Accessor,
} from "@creact-labs/creact";

export function waitFor<T>(
  accessor: Accessor<T>,
  predicate?: (value: T) => boolean,
): Promise<T> {
  return new Promise((resolve, reject) => {
    createRoot((dispose) => {
      createEffect(() => {
        try {
          const value = accessor();
          if (predicate ? predicate(value) : value) {
            queueMicrotask(dispose);
            resolve(value);
          }
        } catch (err) {
          queueMicrotask(dispose);
          reject(err);
        }
      });
    });
  });
}
