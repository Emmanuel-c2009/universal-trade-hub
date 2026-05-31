/**
 * Wraps a promise (or thenable, like Supabase query builders) with a timeout.
 * Rejects with a user-friendly Error if the operation exceeds `ms` ms.
 */
export function withTimeout<T>(promise: PromiseLike<T>, ms = 30000, label = "Request"): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(ms / 1000)} seconds. Please check your connection and try again.`));
    }, ms);
    Promise.resolve(promise).then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}
