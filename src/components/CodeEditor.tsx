import React, { useEffect, useRef } from 'react';
import Editor, { Monaco, OnMount } from '@monaco-editor/react';
import { getCompletions, getDiagnostics, initLanguageWorker } from '../utils/languageService';
import { acquireTypes } from '../utils/typeAcquisition';

interface CodeEditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
  language: string;
  files: { [name: string]: { content: string, language: string } };
  fileName: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, language, files, fileName }) => {
  const monacoRef = useRef<Monaco | null>(null);
  const editorRef = useRef<any>(null);

  useEffect(() => {
      // Initialize language worker on load if python is used
      initLanguageWorker();
  }, []);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    monacoRef.current = monaco;
    editorRef.current = editor;

    // TypeScript Defaults
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types'],
    });

    // Enable eager sync so the worker knows about all models
    monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
    monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
    
    // Fix for React Highlighting: Inject generic module definitions
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      `
      declare module 'react' {
        export = React;
      }
      declare namespace React {
         function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
         function useEffect(effect: () => void | (() => void), deps?: ReadonlyArray<any>): void;
         function createContext<T>(defaultValue: T): any;
         function useContext<T>(context: any): T;
         function useRef<T>(initialValue: T): { current: T };
         const createElement: any;
         type ReactNode = any;
      }
      
      declare module 'react-dom/client' {
          export function createRoot(container: HTMLElement): { render: (node: any) => void };
      }
      
      // JSX Intrinsic Elements
      declare namespace JSX {
          interface IntrinsicElements {
              [elemName: string]: any;
          }
      }
      `,
      'file:///node_modules/@types/react/index.d.ts'
    );

    // Register Python Completion Provider
    // Check if duplicate registration needs handling (Monaco might handle it, or we ignore)
    // We can use a flag on the instance or similar if this runs multiple times on re-mounts.
    // For now, assuming One-time mount or purely additive is okay.
    monaco.languages.registerCompletionItemProvider('python', {
        provideCompletionItems: async (model, position) => {
            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
            };

            const suggestions = await getCompletions(model.getValue(), position.lineNumber, position.column);
            
            return {
                suggestions: suggestions.map((s: any) => ({
                    label: s.label,
                    kind: monaco.languages.CompletionItemKind.Function,
                    insertText: s.insertText,
                    range: range,
                    detail: s.detail
                }))
            };
        }
    });

    // Register Snippets for TS/JS
    monaco.languages.registerCompletionItemProvider('typescript', {
        provideCompletionItems: (model, position) => {
            const suggestions = [
                {
                    label: 'clg',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'console.log(${1:variable});',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Log to console'
                },
                {
                    label: 'rfc',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'export default function ${1:ComponentName}() {\n\treturn (\n\t\t<div>${2:Hello}</div>\n\t);\n}',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'React Functional Component'
                },
                {
                    label: 'uef',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'useEffect(() => {\n\t${1}\n}, [${2}]);',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'useEffect Hook'
                },
                {
                    label: 'us',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState(${2:initialState});',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'useState Hook'
                }
            ];
            return { suggestions: suggestions };
        }
    });

    syncModels(monaco);
  };

  // Sync files to Monaco models
  const syncModels = (monaco: Monaco) => {
      Object.keys(files).forEach(path => {
          if (path === fileName) return;
          try {
              const uri = monaco.Uri.parse(`file:///${path}`);
              let model = monaco.editor.getModel(uri);
              if (!model) {
                  model = monaco.editor.createModel(files[path].content, files[path].language, uri);
              } else {
                  if (model.getValue() !== files[path].content) {
                      model.setValue(files[path].content);
                  }
              }
          } catch (e) {
              console.error("Error in code sync", e);
          }
      });
  };

  useEffect(() => {
    if (monacoRef.current) {
        syncModels(monacoRef.current);
    }
  }, [files, fileName]);

  // Linting Effect for Python
  useEffect(() => {
      const lint = async () => {
          if (language === 'python' && monacoRef.current && editorRef.current) {
              const model = editorRef.current.getModel();
              if (model) {
                  const diagnostics = await getDiagnostics(code);
                  const markers = diagnostics.map((d: any) => ({
                      startLineNumber: d.line,
                      startColumn: d.column || 1,
                      endLineNumber: d.line,
                      endColumn: d.column ? d.column + 1 : 1000,
                      message: d.message,
                      severity: d.severity === 8 ? monacoRef.current!.MarkerSeverity.Error : monacoRef.current!.MarkerSeverity.Warning
                  }));
                  monacoRef.current.editor.setModelMarkers(model, 'flake8', markers);
              }
          }
      };
      
      const timer = setTimeout(lint, 500); // Debounce
      return () => clearTimeout(timer);
  }, [code, language]);

  // SQL Validation Effect
  useEffect(() => {
      let worker: Worker | null = null;
      const validate = () => {
          if (language === 'sql' && monacoRef.current && editorRef.current) {
              const model = editorRef.current.getModel();
              if (model) {
                  // Spin up a transient checker or reuse if possible?
                  // Creating a worker every keystroke is expensive.
                  // Ideally we should have a persistent worker for the editor session (like pythonLanguageWorker).
                  // For now, let's use a lightweight check. 
                  // actually, let's just use the executor's worker logic but simplified?
                  // Or better: The sqlWorker is stateless-ish but we init DB every time in it.
                  // We should probably rely on a dedicated language worker for SQL too if we want perf.
                  // But for this task, let's try to just spawn it. It might be laggy.
                  // OPTIMIZATION: Just spawn it. It's local WASM.
                  worker = new Worker(new URL('../utils/sqlWorker.ts', import.meta.url));
                  worker.onmessage = (e) => {
                      const { type, markers } = e.data;
                      if (type === 'validation_result' && monacoRef.current) {
                         // Map severity 8 to Error
                         const m = markers.map((mk: any) => ({
                             ...mk,
                             severity: monacoRef.current!.MarkerSeverity.Error
                         }));
                         monacoRef.current.editor.setModelMarkers(model, 'sql', m);
                         worker?.terminate();
                      }
                  };
                  worker.postMessage({ 
                      type: 'validate', 
                      entryFile: fileName, 
                      files: { [fileName]: { content: code, language: 'sql' } } 
                  });
              }
          }
      };
      
      const timer = setTimeout(validate, 800);
      return () => {
          clearTimeout(timer);
          if (worker) worker.terminate();
      };
  }, [code, language, fileName]);

  // Debounce Type Acquisition for JS/TS only
  useEffect(() => {
     if (language === 'typescript' || language === 'javascript' || language === 'react') {
         const timer = setTimeout(() => {
             if (monacoRef.current) {
                 acquireTypes(monacoRef.current, code);
             }
         }, 1000);
         return () => clearTimeout(timer);
     }
  }, [code, language]);

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Editor
        height="100%"
        defaultLanguage="typescript"
        language={language}
        value={code}
        theme="vs-dark"
        onChange={onChange}
        onMount={handleEditorDidMount}
        path={fileName ? `file:///${fileName}` : undefined}
        keepCurrentModel={true}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
      />
    </div>
  );
};

export default CodeEditor;
