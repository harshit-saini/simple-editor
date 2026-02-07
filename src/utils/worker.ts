
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

  const moduleCache: { [path: string]: any } = {};

  const require = (path: string) => {
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
        const run = new Function('console', 'require', 'module', 'exports', jsCode);
        run(customConsole, require, module, exports);
    } catch (err: any) {
        throw new Error(`Error executing ${targetFileName}: ${err.message}`);
    }

    moduleCache[targetFileName] = module.exports;
    return module.exports;
  };

  try {
    // Start execution
    require(entryFile);
    ctx.postMessage({ type: 'finished' });
  } catch (err: any) {
    ctx.postMessage({ type: 'error', message: [err.toString()] });
    ctx.postMessage({ type: 'finished' });
  }
};
