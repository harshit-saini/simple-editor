const ctx: Worker = self as any;

let pyodide: any = null;
let isReady = false;

const loadPyodideRuntime = async () => {
    if (pyodide) return pyodide;
    
    try {
        const { loadPyodide } = await import('https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.mjs');
        pyodide = await loadPyodide();
        
        // Install dependencies
        await pyodide.loadPackage(['micropip']);
        const micropip = pyodide.pyimport("micropip");
        
        // Install Jedi for autocomplete and Pyflakes for linting (lighter than Flake8)
        await micropip.install(['jedi', 'pyflakes']);
        
        // Setup Python helper functions
        pyodide.runPython(`
import jedi
import sys
from pyflakes.api import check
from pyflakes.reporter import Reporter
import io

def get_completions(code, line, column):
    try:
        script = jedi.Script(code)
        completions = script.complete(line, column)
        return [{
            "label": c.name,
            "kind": c.type,
            "detail": c.description,
            "insertText": c.name
        } for c in completions]
    except Exception as e:
        return []

def get_diagnostics(code):
    try:
        # Capture stdout/stderr
        warning_stream = io.StringIO()
        error_stream = io.StringIO()
        reporter = Reporter(warning_stream, error_stream)
        
        check(code, 'input.py', reporter)
        
        messages = []
        # Parse output? Pyflakes reporter prints to stream.
        # Format: input.py:line:col: message
        
        def parse_output(stream, severity):
            output = stream.getvalue()
            if not output: return
            for line in output.splitlines():
                parts = line.split(':')
                if len(parts) >= 4:
                    # input.py:1:5: undefined name 'x'
                    try:
                        lineno = int(parts[1])
                        col = int(parts[2]) if parts[2].isdigit() else 0
                        msg = ':'.join(parts[3:]).strip()
                        messages.append({
                            "line": lineno,
                            "column": col,
                            "message": msg,
                            "severity": severity
                        })
                    except:
                        pass

        parse_output(warning_stream, 4) # 4 = Warning in Monaco? 8 = Error
        parse_output(error_stream, 8) 
        
        return messages
    except Exception as e:
        return [{"line": 1, "column": 1, "message": str(e), "severity": 8}]
        `);
        
        isReady = true;
        ctx.postMessage({ type: 'ready' });
        return pyodide;
    } catch (e: any) {
        console.error('Failed to load Python Language Worker:', e);
    }
};

loadPyodideRuntime();

ctx.onmessage = async (event) => {
    const { id, type, code, line, column } = event.data;
    
    if (!isReady) {
        // Queue or ignore?
        if (type === 'init') return; // already loading
    }
    
    if (type === 'complete') {
        try {
            const get_completions = pyodide.globals.get('get_completions');
            const completions = get_completions(code, line, column).toJs();
            ctx.postMessage({ id, type: 'completion_result', result: completions });
        } catch (e) {
            ctx.postMessage({ id, type: 'completion_result', result: [] });
        }
    } else if (type === 'lint') {
        try {
            const get_diagnostics = pyodide.globals.get('get_diagnostics');
            const diagnostics = get_diagnostics(code).toJs();
            ctx.postMessage({ id, type: 'lint_result', result: diagnostics });
        } catch (e) {
            ctx.postMessage({ id, type: 'lint_result', result: [] });
        }
    }
};

export {};
