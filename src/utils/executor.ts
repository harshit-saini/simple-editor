import * as ts from 'typescript';
import { LogEntry } from '../components/Console';

export const transpile = (code: string): string => {
  try {
    const result = ts.transpileModule(code, {
      compilerOptions: { 
        module: ts.ModuleKind.CommonJS, 
        target: ts.ScriptTarget.ES2020,
        noImplicitUseStrict: true
      }
    });
    return result.outputText;
  } catch (e: any) {
    throw new Error('Transpilation failed: ' + e.message);
  }
};

import { executePythonCode } from './pythonExecutor';

export const executeCode = (
  entryFile: string,
  files: { [name: string]: { content: string, language: string } },
  addLog: (entry: Omit<LogEntry, 'timestamp'>) => void,
  onPreview?: (content: string) => void
) => {
  const file = files[entryFile];
  if (!file) {
      addLog({ type: 'error', message: [`File not found: ${entryFile}`] });
      return;
  }
  
  addLog({ type: 'info', message: [`Run request for ${entryFile} (${file.language})`] });

  if (file.language === 'python') {
      executePythonCode(file.content, addLog);
      return;
  }

  if (file.language === 'html') {
      if (onPreview) {
          onPreview(file.content);
          addLog({ type: 'info', message: ['Opening HTML Preview...'] });
      } else {
          addLog({ type: 'warn', message: ['HTML Preview not supported in this view'] });
      }
      return;
  }

  // Default to JavaScript/TypeScript execution from here
  // Create a proxy console to capture logs
  const customConsole = {
    log: (...args: any[]) => addLog({ type: 'log', message: args.map(String) }),
    warn: (...args: any[]) => addLog({ type: 'warn', message: args.map(String) }),
    error: (...args: any[]) => addLog({ type: 'error', message: args.map(String) }),
    info: (...args: any[]) => addLog({ type: 'info', message: args.map(String) }),
    clear: () => {} 
  };
// ... rest of the JS execution logic ...

  const moduleCache: { [path: string]: any } = {};

  const require = (path: string) => {
    // Basic resolution: assume relative paths ./name or just name map to name.ts or name.js
    // This is very naive.
    let targetFileName = path.replace('./', '');
    if (!files[targetFileName]) {
        if (files[targetFileName + '.ts']) targetFileName += '.ts';
        else if (files[targetFileName + '.tsx']) targetFileName += '.tsx';
        else if (files[targetFileName + '.js']) targetFileName += '.js';
        else throw new Error(`Module not found: ${path}`);
    }

    if (moduleCache[targetFileName]) {
        return moduleCache[targetFileName];
    }

    const fileContent = files[targetFileName].content;
    const jsCode = transpile(fileContent);

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
    // Execute the entry file (usually main.ts/active file) using the require mechanism
    // but without caching it effectively (or just treat it as a module).
    // We treat the entry execution as a pseudo-require to reuse logic, or just run it.
    // However, the entry file itself might have exports, so treating it as a module is fine.
    
    // We wrapped the logic in require, so let's just use it on the entry file.
    // BUT, the entry file name comes in as argument.
    
    // Actually, executeCode was called with `code` string before. 
    // Now we change it to take `files` and `entryFileName` (or active file).
    // The previous caller passed `transpile(code)`. Now we want to control transpilation 
    // inside here to handle dependencies.
    
    require(entryFile);

  } catch (err: any) {
    addLog({ type: 'error', message: [err.toString()] });
  }
};
