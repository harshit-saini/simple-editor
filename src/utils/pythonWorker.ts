const ctx: Worker = self as any;

let pyodide: any = null;

const loadPyodideRuntime = async () => {
    if (pyodide) return pyodide;
    ctx.postMessage({ type: 'info', message: ['Loading Pyodide (Python Runtime)...'] });
    try {
        // Dynamic import for the ES module version of Pyodide
        const { loadPyodide } = await import('https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.mjs');
        pyodide = await loadPyodide();
        ctx.postMessage({ type: 'info', message: ['Pyodide loaded successfully!'] });
        return pyodide;
    } catch (e: any) {
        throw new Error('Failed to load Pyodide: ' + e.message);
    }
};

ctx.onmessage = async (event) => {
    const { entryFile, files } = event.data;
    
    try {
        const py = await loadPyodideRuntime();
        
        // Output handling
        py.setStdout({ batched: (msg: string) => ctx.postMessage({ type: 'log', message: [msg] }) });
        py.setStderr({ batched: (msg: string) => ctx.postMessage({ type: 'error', message: [msg] }) });

        // Write files
        // We need to mount the files. Pyodide has a virtual FS.
        // We'll write all known files to the root.
        Object.keys(files).forEach(fileName => {
             const file = files[fileName];
             // Simple write
             try {
                // Ensure directories exist if filename has paths?
                // For simplicity, we assume flat structure or user handles paths relative to root.
                // But Pyodide `writeFile` handles simple paths.
                py.FS.writeFile(fileName, file.content, { encoding: "utf8" });
             } catch (e) {
                 console.error(`Failed to write ${fileName}`, e);
             }
        });

        const entryContent = files[entryFile]?.content;
        if (!entryContent) {
            throw new Error(`Entry file ${entryFile} not found`);
        }

        // Run the script
        // await py.loadPackagesFromImports(entryContent); // Optional: auto-load packages?
        // Let's stick to basic execution first.
        
        await py.runPythonAsync(entryContent);
        
        ctx.postMessage({ type: 'finished' });
    } catch (err: any) {
        ctx.postMessage({ type: 'error', message: [err.toString()] });
        ctx.postMessage({ type: 'finished' });
    }
};

export {};
