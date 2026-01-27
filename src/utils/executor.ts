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

export const executeCode = (
  code: string, 
  addLog: (entry: Omit<LogEntry, 'timestamp'>) => void
) => {
  // Create a proxy console to capture logs
  const customConsole = {
    log: (...args: any[]) => addLog({ type: 'log', message: args.map(String) }),
    warn: (...args: any[]) => addLog({ type: 'warn', message: args.map(String) }),
    error: (...args: any[]) => addLog({ type: 'error', message: args.map(String) }),
    info: (...args: any[]) => addLog({ type: 'info', message: args.map(String) }),
    clear: () => {} // Handled by UI
  };

  try {
    // Wrap code to capture 'console'
    // We use a Function constructor -> new Function('console', code)
    // and pass our customConsole as the argument.
    const run = new Function('console', code);
    run(customConsole);
  } catch (err: any) {
    addLog({ type: 'error', message: [err.toString()] });
  }
};
