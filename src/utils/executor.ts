import * as ts from 'typescript';
import { LogEntry } from '../components/Console';

export const transpile = (code: string): string => {
  try {
    const result = ts.transpileModule(code, {
      compilerOptions: { 
        module: ts.ModuleKind.CommonJS, 
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
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

  if (file.language === 'markdown') {
      if (onPreview) {
         // Naive markdown rendering using marked via CDN (injected into preview iframe usually, or here we process it)
         // For locally we can just inject a script into preview, or transform it here if we had the lib.
         // Let's use the Preview Pane to render it by wrapping in HTML.
         const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
                <style>body { font-family: sans-serif; padding: 20px; }</style>
            </head>
            <body>
                <div id="content"></div>
                <script>
                    document.getElementById('content').innerHTML = marked.parse(\`${file.content.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`);
                </script>
            </body>
            </html>
         `;
         onPreview(html);
         addLog({ type: 'info', message: ['Rendering Markdown...'] });
      }
      return;
  }

  if (file.language === 'sql') {
      addLog({ type: 'info', message: ['Executing SQL (loading SQLite)...'] });
      // We need to load sql.js
      // This is a bit complex for a single block, but we try a dynamic import approach or script injection in a worker
      // For simplicity/demo:
      const runSQL = async () => {
          try {
             // We need to load the WASM from CDN. 
             // Ideally this should be in a separate file like pythonExecutor.ts
             // But implementing inline for speed to fix user issue.
             addLog({ type: 'info', message: ['Checking SQL.js...'] });
             
             // Check if script exists
             if (!(window as any).initSqlJs) {
                 await new Promise<void>((resolve, reject) => {
                     const script = document.createElement('script');
                     script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js';
                     script.onload = () => resolve();
                     script.onerror = () => reject(new Error('Failed to load SQL.js'));
                     document.body.appendChild(script);
                 });
             }

             const SQL = await (window as any).initSqlJs({
                 locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
             });
             
             const db = new SQL.Database();
             // Execute the query
             // Split by semicolon to run multiple statements? SQL.js .exec runs multiple.
             const results = db.exec(file.content);
             
             if (results.length === 0) {
                 addLog({ type: 'log', message: ['Query executed. No results returned.'] });
             } else {
                 results.forEach((res: any) => {
                     addLog({ type: 'info', message: [`Result: ${res.columns.join(' | ')}`] });
                     res.values.forEach((row: any) => {
                         addLog({ type: 'log', message: [row.join(' | ')] });
                     });
                 });
             }
          } catch (e: any) {
              addLog({ type: 'error', message: ['SQL Error: ' + e.message] });
          }
      };
      runSQL();
      return;
  }

  if (file.language === 'typescript' && entryFile === 'App.tsx' && onPreview) {
     addLog({ type: 'info', message: ['Bundling React App...'] });
     
     try {
         // Transpile the TSX code to JS using our existing transpile function
         // This handles TS syntax and converts imports to CommonJS 'require' calls
         const transpiledCode = transpile(file.content);
         
         const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
                <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
                <style>body { font-family: sans-serif; padding: 20px; }</style>
            </head>
            <body>
                <div id="root"></div>
                <script>
                    // Shim require to return global React/ReactDOM
                    const require = (mod) => {
                        if (mod === 'react') return window.React;
                        if (mod === 'react-dom/client' || mod === 'react-dom') return window.ReactDOM;
                        throw new Error('Module not found: ' + mod);
                    };
                    
                    const exports = {}; 
                    
                    try {
                        // The transpiled code will use 'require' and 'exports'
                        ${transpiledCode}
                        
                        // If the user exported default, try to use it if they didn't render manually
                        // But our template renders manually, so this is just backup or no-op
                    } catch (err) {
                        document.body.innerHTML = '<pre style="color:red">' + err.message + '</pre>';
                        console.error(err);
                    }
                </script>
            </body>
            </html>
         `;
         onPreview(html);
     } catch (e: any) {
         addLog({ type: 'error', message: ['Transpilation Error: ' + e.message] });
     }
     return;
  }
  
  if (file.language === 'go') {
      addLog({ type: 'warn', message: ['Go execution is not fully supported in the browser yet.', 'Please use the Go Playground for full execution.'] });
      // Attempting to run real Go in browser without a dedicated worker/wasm setup is fragile.
      // We will leave this as a stub message for now as per plan B.
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
