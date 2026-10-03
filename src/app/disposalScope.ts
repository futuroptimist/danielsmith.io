/** Own resources from acquisition onward, including interrupted initialization. */
export function createDisposalScope() {
  const callbacks: Array<() => void> = [];
  let disposed = false;
  return {
    add(cleanup: () => void) {
      if (disposed) cleanup();
      else callbacks.push(cleanup);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      let failure: { error: unknown } | undefined;
      while (callbacks.length) {
        try {
          callbacks.pop()!();
        } catch (error) {
          failure ??= { error };
        }
      }
      if (failure) throw failure.error;
    },
  };
}
