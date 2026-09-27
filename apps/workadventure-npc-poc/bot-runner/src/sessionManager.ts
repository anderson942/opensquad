export interface RunSessionOptions {
  relaunchDelayMs: number;
}

export function runSessionWithRelaunch(
  launchSession: () => Promise<void>,
  options: RunSessionOptions
): { stop: () => void } {
  let stopped = false;

  const runOnce = () => {
    if (stopped) {
      return;
    }
    launchSession()
      .catch((error) => {
        console.error("[sessionManager] session ended with an error, relaunching", error);
      })
      .then(() => {
        if (!stopped) {
          setTimeout(runOnce, options.relaunchDelayMs);
        }
      });
  };

  runOnce();

  return {
    stop: () => {
      stopped = true;
    },
  };
}
