
const ctx: Worker = self as any;

ctx.onmessage = (event) => {
  const { entryFile, files } = event.data;

  // Custom console
  const customConsole = {
    log: (...args: any[]) => ctx.postMessage({ type: 'log', message: args.map(String) }),
    warn: (...args: any[]) => ctx.postMessage({ type: 'warn', message: args.map(String) }),
    error: (...args: any[]) => ctx.postMessage({ type: 'error', message: args.map(String) }),
    info: (...args: any[]) => ctx.postMessage({ type: 'info', message: args.map(String) }),
    clear: () => {} 
  };

  // Async Tracker
  let activeTimers = 0;
  
  const originalSetTimeout = self.setTimeout;
  const originalClearTimeout = self.clearTimeout;
  const originalSetInterval = self.setInterval;
  const originalClearInterval = self.clearInterval;

  const checkFinished = () => {
      if (activeTimers === 0) {
          // Use setTimeout to allow microtasks to drain before declaring finished
          originalSetTimeout(() => {
              if (activeTimers === 0) {
                  ctx.postMessage({ type: 'finished' });
              }
          }, 0);
      }
  };

  // For valid tracking, we need a map
  const timerMap = new Set<number>();

  const robustSetTimeout = (handler: TimerHandler, timeout?: number, ...args: any[]): number => {
      activeTimers++;
      const id = originalSetTimeout(() => {
          timerMap.delete(id);
          if (typeof handler === 'function') handler(...args);
          else new Function(handler)(...args);
          activeTimers--;
          checkFinished();
      }, timeout, ...args);
      timerMap.add(id);
      return id;
  };

  const robustClearTimeout = (id: number | undefined) => {
      if (id !== undefined && timerMap.has(id)) {
          timerMap.delete(id);
          activeTimers--;
          checkFinished(); // could be last one
          originalClearTimeout(id);
      }
  };

  // Intervals are different; they stay active until cleared.
  // We count an interval as +1 active task.
  const intervalMap = new Set<number>();

  const robustSetInterval = (handler: TimerHandler, timeout?: number, ...args: any[]): number => {
      activeTimers++;
      const id = originalSetInterval(handler, timeout, ...args);
      intervalMap.add(id);
      return id;
  };

  const robustClearInterval = (id: number | undefined) => {
      if (id !== undefined && intervalMap.has(id)) {
          intervalMap.delete(id);
          activeTimers--;
          checkFinished();
          originalClearInterval(id);
      }
  };

  // Override globals in the worker scope
  (self as any).setTimeout = robustSetTimeout;
  (self as any).clearTimeout = robustClearTimeout;
  (self as any).setInterval = robustSetInterval;
  (self as any).clearInterval = robustClearInterval;

  // Track fetch
  const originalFetch = self.fetch;
  const robustFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      activeTimers++;
      try {
          const response = await originalFetch(input, init);
          
          // Proxy the response to track methods like .json(), .text(), etc.
          const proxy = new Proxy(response, {
            get(target: any, prop: string | symbol) {
                if (typeof prop === 'string' && ['json', 'text', 'blob', 'arrayBuffer', 'formData'].includes(prop)) {
                    const originalMethod = target[prop];
                    return async (...args: any[]) => {
                        activeTimers++;
                        try {
                            return await originalMethod.apply(target, args);
                        } finally {
                            activeTimers--;
                            checkFinished();
                        }
                    };
                }
                const value = target[prop];
                if (typeof value === 'function') {
                    return value.bind(target);
                }
                return value;
            }
          });
          
          return proxy;
      } finally {
          activeTimers--;
          checkFinished();
      }
  };
  (self as any).fetch = robustFetch;
  
  const moduleCache: { [path: string]: any } = {};

  const require = (path: string) => {
// ... same require logic ...
    // Basic resolution: assume relative paths ./name or just name map to name.ts or name.js
    let targetFileName = path.replace('./', '');
    
    // Exact match
    if (!files[targetFileName]) {
        // Try extensions
        if (files[targetFileName + '.ts']) targetFileName += '.ts';
        else if (files[targetFileName + '.tsx']) targetFileName += '.tsx';
        else if (files[targetFileName + '.js']) targetFileName += '.js';
        else throw new Error(`Module not found: ${path}`);
    }

    if (moduleCache[targetFileName]) {
        return moduleCache[targetFileName];
    }

    const jsCode = files[targetFileName]; // Using pre-transpiled code

    const module = { exports: {} };
    const exports = module.exports;

    try {
        const run = new Function('console', 'require', 'module', 'exports', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'fetch', jsCode);
        run(customConsole, require, module, exports, robustSetTimeout, robustClearTimeout, robustSetInterval, robustClearInterval, robustFetch);
    } catch (err: any) {
        throw new Error(`Error executing ${targetFileName}: ${err.message}`);
    }

    moduleCache[targetFileName] = module.exports;
    return module.exports;
  };

  try {
    // Start execution
    require(entryFile);
    
    // If no async tasks were started, we are done.
    checkFinished();

  } catch (err: any) {
    ctx.postMessage({ type: 'error', message: [err.toString()] });
    // If error, we are done.
    ctx.postMessage({ type: 'finished' });
  }
};
