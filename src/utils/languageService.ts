
let worker: Worker | null = null;
let reqId = 0;
const pendingRequests = new Map<number, (result: any) => void>();

export const initLanguageWorker = () => {
    if (worker) return;
    worker = new Worker(new URL('./pythonLanguageWorker.ts', import.meta.url), { type: 'module' });
    
    worker.onmessage = (e) => {
        const { id, type, result } = e.data;
        if (type === 'ready') {
            console.log('Python Language Worker Ready');
        } else if (['completion_result', 'lint_result'].includes(type) && pendingRequests.has(id)) {
            const resolve = pendingRequests.get(id);
            if (resolve) resolve(result);
            pendingRequests.delete(id);
        }
    };
};

export const getCompletions = (code: string, line: number, column: number): Promise<any[]> => {
    if (!worker) initLanguageWorker();
    return new Promise((resolve) => {
        const id = reqId++;
        pendingRequests.set(id, resolve);
        worker?.postMessage({ id, type: 'complete', code, line, column });
        
        // Timeout 
        setTimeout(() => {
            if (pendingRequests.has(id)) {
                pendingRequests.delete(id);
                resolve([]);
            }
        }, 5000);
    });
};

export const getDiagnostics = (code: string): Promise<any[]> => {
    if (!worker) initLanguageWorker();
    return new Promise((resolve) => {
        const id = reqId++;
        pendingRequests.set(id, resolve);
        worker?.postMessage({ id, type: 'lint', code });
    });
};
