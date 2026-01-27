import { LogEntry } from '../components/Console';

declare global {
  interface Window {
    loadPyodide: any;
  }
}

let pyodide: any = null;
let isLoading = false;

const loadPyodideScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.loadPyodide) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
    script.async = true;
    script.onload = () => {
        console.log("Pyodide script loaded");
        resolve();
    };
    script.onerror = (e) => {
        console.error("Pyodide script load error", e);
        reject(new Error('Failed to load Pyodide script from CDN'));
    };
    document.body.appendChild(script);
  });
};

const getPyodide = async (addLog: (entry: Omit<LogEntry, 'timestamp'>) => void) => {
  if (pyodide) return pyodide;
  if (isLoading) {
      throw new Error('Pyodide is loading... please wait and try again.');
  }

  isLoading = true;
  addLog({ type: 'info', message: ['Loading Pyodide (Python Runtime)... this may take a moment...'] });

  // WORKAROUND: Hide Monaco's AMD loader to prevent conflicts with Pyodide dependencies
  const backupDefine = (window as any).define;
  const backupRequire = (window as any).require;
  (window as any).define = undefined;
  (window as any).require = undefined;

  try {
    await loadPyodideScript();
    pyodide = await window.loadPyodide();
    addLog({ type: 'info', message: ['Pyodide loaded successfully!'] });
    isLoading = false;
    return pyodide;
  } catch (err: any) {
    isLoading = false;
    throw err;
  } finally {
      // Restore AMD loader
      (window as any).define = backupDefine;
      (window as any).require = backupRequire;
  }
};

export const executePythonCode = async (
  files: { [name: string]: { content: string, language: string } },
  entryFile: string,
  addLog: (entry: Omit<LogEntry, 'timestamp'>) => void
) => {
  try {
    const py = await getPyodide(addLog);
    
    // Redirect stdout
    py.setStdout({ batched: (msg: string) => addLog({ type: 'log', message: [msg] }) });
    py.setStderr({ batched: (msg: string) => addLog({ type: 'error', message: [msg] }) });

    // Write all files to Pyodide's virtual filesystem
    Object.keys(files).forEach(fileName => {
        const file = files[fileName];
        if (file.language === 'python' || fileName.endsWith('.py')) {
             try {
                 py.FS.writeFile(fileName, file.content, { encoding: "utf8" });
             } catch (e) {
                 console.error(`Failed to write ${fileName} to Pyodide FS`, e);
             }
        }
    });

    // Run the entry file
    const entryContent = files[entryFile]?.content;
    if (!entryContent) {
        throw new Error(`Entry file ${entryFile} not found`);
    }

    // Run the script
    // We use runPythonAsync. 
    // Note: If importing other files, they must be in the FS, which we just did.
    await py.runPythonAsync(entryContent);
  } catch (err: any) {
    addLog({ type: 'error', message: [err.toString()] });
  }
};
