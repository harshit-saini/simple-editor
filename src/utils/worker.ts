
const jsCtx: Worker = self as any;

jsCtx.onmessage = async (event) => {
  const { entryFile, files } = event.data;
  jsCtx.postMessage({ type: 'info', message: ['Worker received message for file: ' + entryFile] });

  // Custom console
  const customConsole = {
    log: (...args: any[]) => jsCtx.postMessage({ type: 'log', message: args.map(String) }),
    warn: (...args: any[]) => jsCtx.postMessage({ type: 'warn', message: args.map(String) }),
    error: (...args: any[]) => jsCtx.postMessage({ type: 'error', message: args.map(String) }),
    info: (...args: any[]) => jsCtx.postMessage({ type: 'info', message: args.map(String) }),
    clear: () => {} 
  };

  // Async Tracker
  let activeTimers = 0;
  let activeFetches = 0;
  
  const originalSetTimeout = self.setTimeout;
  const originalClearTimeout = self.clearTimeout;
  const originalSetInterval = self.setInterval;
  const originalClearInterval = self.clearInterval;

  const checkFinished = () => {
      if (activeTimers === 0) {
          // Use setTimeout to allow microtasks to drain before declaring finished
          originalSetTimeout(() => {
              if (activeTimers === 0) {
                  jsCtx.postMessage({ type: 'info', message: ['Worker Checking Finished: DONE'] });
                  jsCtx.postMessage({ type: 'finished' });
              } else {
                  jsCtx.postMessage({ type: 'info', message: ['Worker Checking Finished: Resumed (Active: ' + activeTimers + ')'] });
              }
          }, 0);
      }
  };

  // For valid tracking, we need a map
  const originalFetch = self.fetch;

  // 2. Create Robust Versions for THIS execution
  const robustSetTimeout = (handler: TimerHandler, timeout?: number, ...args: any[]) => {
      activeTimers++;
      jsCtx.postMessage({ type: 'info', message: ['SetTimeout called. Active:', String(activeTimers), 'Timeout:', String(timeout)] });
      return originalSetTimeout(() => {
          try {
              if (typeof handler === 'function') handler(...args);
              else new Function(handler)(...args);
          } catch (e: any) {
              jsCtx.postMessage({ type: 'error', message: ['Timeout Action Error: ' + e.toString()] });
          } finally {
              activeTimers--;
              jsCtx.postMessage({ type: 'info', message: ['Timeout finished. Active:', String(activeTimers)] });
              checkFinished();
          }
      }, timeout, ...args);
  };

//   const robustClearTimeout = (id: number | undefined) => {
//       // We can't easily track which ID corresponds to which activeTimer without a map.
//       // If user clears a timeout, we should decrement.
//       // Simplified: Just use the wrapped version.
//       // Issue: standard clearTimeout doesn't trigger a callback.
//       // We need a map to know if we should decrement.
//       // For simplicity in this playground: We WON'T decrement on clear, 
//       // we just let the timer fire (it will do nothing) and then decrement.
//       // This implies we don't support "cancelled" tasks reducing the wait time immediately.
//       // That's acceptable for now.
//       originalClearTimeout(id);
//   };

  const robustSetInterval = (handler: TimerHandler, timeout?: number, ...args: any[]) => {
      activeTimers++; 
      return originalSetInterval(handler, timeout, ...args);
  };

  const robustClearInterval = (id: number | undefined) => {
      if (id !== undefined) {
         activeTimers--;
         originalClearInterval(id);
         checkFinished();
      }
  };

  const robustFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      activeFetches++;
      try {
          const response = await originalFetch(input, init);
          const proxy = new Proxy(response, {
            get(target: any, prop: string | symbol) {
                if (typeof prop === 'string' && ['json', 'text', 'blob', 'arrayBuffer', 'formData'].includes(prop)) {
                    const originalMethod = target[prop];
                    return async (...args: any[]) => {
                        activeFetches++; // Count consumption as activity
                        try {
                            return await originalMethod.apply(target, args);
                        } finally {
                            activeFetches--;
                            checkFinished();
                        }
                    };
                }
                const value = target[prop];
                return (typeof value === 'function') ? value.bind(target) : value;
            }
          });
          return proxy;
      } finally {
          activeFetches--;
          checkFinished();
      }
  };

  // 3. Module System
  const modules: any = {};
  const require = (path: string) => {
     const target = path.replace('./', '');
     if (modules[target]) return modules[target];
     
     // basic resolution against 'files'
     if (!files[target] && !files[target + '.js'] && !files[target + '.ts']) {
         throw new Error(`Module ${path} not found`);
     }
     return {}; // Placeholder for non-evaluated modules
  };

  try {
    const code = files[entryFile].content;
    
    // Wrap and Execute
    // We shadow globals by passing them as arguments to the function
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const fn = new AsyncFunction(
        'console', 
        'require', 
        'module', 
        'exports', 
        'setTimeout', 
        'clearTimeout', 
        'setInterval', 
        'clearInterval', 
        'fetch', 
        code
    );
    
    const module = { exports: {} };
    jsCtx.postMessage({ type: 'info', message: ['Executing code (length: ' + code.length + '):', code.substring(0, 100) + '...'] });
    await fn(
        customConsole, 
        require, 
        module, 
        module.exports, 
        robustSetTimeout, 
        originalClearTimeout, // usage of original means we accept the limitation noted above
        robustSetInterval, 
        robustClearInterval, 
        robustFetch
    );

    // Initial check
    checkFinished();

  } catch (err: any) {
    jsCtx.postMessage({ type: 'error', message: [err.toString()] });
    jsCtx.postMessage({ type: 'finished' });
  }
};
