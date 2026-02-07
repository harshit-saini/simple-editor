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



let activeWorker: Worker | null = null;

export const terminateExecution = () => {
  if (activeWorker) {
    activeWorker.terminate();
    activeWorker = null;
  }
};

export const executeCode = (
  entryFile: string,
  files: { [name: string]: { content: string, language: string } },
  addLog: (entry: Omit<LogEntry, 'timestamp'>) => void,
  onPreview?: (content: string) => void,
  onFinish?: () => void
) => {
  const file = files[entryFile];
  if (!file) {
      addLog({ type: 'error', message: [`File not found: ${entryFile}`] });
      if (onFinish) onFinish();
      return;
  }
  
  addLog({ type: 'info', message: [`Run request for ${entryFile} (${file.language})`] });

  if (file.language === 'python') {
       // Python Execution via Web Worker
       terminateExecution(); // Cleanup previous

       try {
           activeWorker = new Worker(new URL('./pythonWorker.ts', import.meta.url), { type: 'module' });

           activeWorker.onmessage = (e) => {
               const { type, message } = e.data;
               if (type === 'log') addLog({ type: 'log', message });
               else if (type === 'warn') addLog({ type: 'warn', message });
               else if (type === 'error') addLog({ type: 'error', message });
               else if (type === 'info') addLog({ type: 'info', message });
               else if (type === 'finished') {
                    if (onFinish) onFinish();
                    terminateExecution();
               }
           };

           activeWorker.onerror = (e) => {
               addLog({ type: 'error', message: ['Worker Error: ' + e.message] });
               if (onFinish) onFinish();
               terminateExecution();
           };

           activeWorker.postMessage({ entryFile, files });

       } catch (err: any) {
           addLog({ type: 'error', message: [err.toString()] });
           if (onFinish) onFinish();
       }
       return;
  }

  if (file.language === 'html') {
      if (onPreview) {
          onPreview(file.content);
          addLog({ type: 'info', message: ['Opening HTML Preview...'] });
      } else {
          addLog({ type: 'warn', message: ['HTML Preview not supported in this view'] });
      }
      if (onFinish) onFinish();
      return;
  }

  if (file.language === 'markdown') {
      if (onPreview) {
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
      if (onFinish) onFinish();
      return;
  }

  if (file.language === 'sql') {
      addLog({ type: 'info', message: ['Executing SQL...'] });
      
      // SQL Execution via Web Worker
      terminateExecution(); // Cleanup previous

      try {
           activeWorker = new Worker(new URL('./sqlWorker.ts', import.meta.url));

           activeWorker.onmessage = (e) => {
               const { type, message } = e.data;
               if (type === 'log') addLog({ type: 'log', message });
               else if (type === 'warn') addLog({ type: 'warn', message });
               else if (type === 'error') addLog({ type: 'error', message });
               else if (type === 'info') addLog({ type: 'info', message });
               else if (type === 'finished') {
                    if (onFinish) onFinish();
                    terminateExecution();
               }
           };

           activeWorker.onerror = (e) => {
               addLog({ type: 'error', message: ['Worker Error: ' + e.message] });
               if (onFinish) onFinish();
               terminateExecution();
           };

           activeWorker.postMessage({ entryFile, files });

      } catch (err: any) {
           addLog({ type: 'error', message: [err.toString()] });
           if (onFinish) onFinish();
      }
      return;
  }

  if (file.language === 'typescript' && entryFile === 'App.tsx' && onPreview) {
     addLog({ type: 'info', message: ['Bundling React App...'] });
     try {
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
                    const require = (mod) => {
                        if (mod === 'react') return window.React;
                        if (mod === 'react-dom/client' || mod === 'react-dom') return window.ReactDOM;
                        throw new Error('Module not found: ' + mod);
                    };
                    const exports = {}; 
                    try {
                        ${transpiledCode}
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
     if (onFinish) onFinish();
     return;
  }
  
  if (file.language === 'go') {
      addLog({ type: 'warn', message: ['Go execution is not fully supported in the browser yet.'] });
      if (onFinish) onFinish();
      return;
  }

  // JS/TS Execution via Web Worker
  terminateExecution(); // Cleanup previous

  try {
    // Transpile all TS/JS files
    console.log('[Executor] Starting execution...');
    addLog({ type: 'info', message: ['[Executor] Starting execution...'] });
    const transpiledFiles: { [name: string]: { content: string } } = {};
    
    Object.keys(files).forEach(fileName => {
        const f = files[fileName];
        if (f.language === 'typescript' || f.language === 'javascript' || fileName.endsWith('.ts') || fileName.endsWith('.js') || fileName.endsWith('.tsx')) {
            try {
                // We use our existing transpile function (which sets jsx: React)
                // Note: The transpile function in executor.ts is hardcoded for React JSX but sets target to ES2020 CJS.
                // This fits our worker 'require' CJS simulation.
                transpiledFiles[fileName] = { content: transpile(f.content) };
            } catch (e) {
                console.error(`Failed to transpile ${fileName}`, e);
            }
        }
    });

    activeWorker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

    activeWorker.onmessage = (e) => {
        const { type, message } = e.data;
        if (type === 'log') addLog({ type: 'log', message });
        else if (type === 'warn') addLog({ type: 'warn', message });
        else if (type === 'error') addLog({ type: 'error', message });
        else if (type === 'info') addLog({ type: 'info', message });
        else if (type === 'finished') {
             if (onFinish) onFinish();
             // Terminate the worker to clean up resources
             terminateExecution();
        }
    };

    activeWorker.onerror = (e) => {
        console.error('[Executor] Worker Error:', e);
        addLog({ type: 'error', message: ['Worker Error: ' + e.message] });
        if (onFinish) onFinish();
        terminateExecution();
    };

    console.log('[Executor] Posting message to worker...');
    activeWorker.postMessage({ entryFile, files: transpiledFiles });

  } catch (err: any) {
    addLog({ type: 'error', message: [err.toString()] });
    if (onFinish) onFinish();
  }
};
// Helper to fetch schema without executing code
export const fetchSqlSchema = (callback: (schema: any[]) => void) => {
    try {
        const worker = new Worker(new URL('./sqlWorker.ts', import.meta.url));
        worker.onmessage = (e) => {
            const { type, schema } = e.data;
            if (type === 'schema') {
                callback(schema);
                worker.terminate();
            }
        };
        worker.postMessage({ type: 'get_schema' }); 
    } catch (e) {
        console.error("Failed to fetch schema", e);
    }
};
