import {
  createRoot,
  createEffect,
  type Accessor,
} from "@creact-labs/creact";

/** Await a real timer — for handlers that simulate async work */
export const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export function waitFor<T>(
  accessor: Accessor<T>,
  predicate?: (value: T) => boolean,
): Promise<T> {
  return new Promise((resolve, reject) => {
    createRoot((dispose) => {
      createEffect(() =>
        checkCondition(accessor, predicate, dispose, resolve, reject),
      );
    });
  });
}

/** One effect pass: settle the waitFor promise when the condition holds */
function checkCondition<T>(
  accessor: Accessor<T>,
  predicate: ((value: T) => boolean) | undefined,
  dispose: () => void,
  resolve: (value: T) => void,
  reject: (err: unknown) => void,
): void {
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
}
