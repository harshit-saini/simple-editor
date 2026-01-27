import React from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { registerPythonIntellisense } from '../utils/pythonIntellisense';
import { acquireTypes } from '../utils/typeAcquisition';

interface CodeEditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
  language?: string;
  files: { [name: string]: { content: string, language: string } };
  fileName: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, language = 'typescript', files, fileName }) => {
  const handleEditorDidMount: OnMount = (_, monaco) => {
    // Configure Monaco
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: false,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      baseUrl: '.', // Important for resolving absolute imports if used
      paths: { '*': ['*'] }, // Fallback for path mapping
      strict: true,
    });
    
    // Add extra lib if needed, but basic ES2020 should be there.
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
    
    // Register Python Intellisense
    registerPythonIntellisense(monaco);
  };


  
  const monacoRef = React.useRef<any>(null);

  const handleEditorDidMountWithRef: OnMount = (editor, monaco) => {
      monacoRef.current = monaco;
      handleEditorDidMount(editor, monaco);
      syncModels(monaco);
  };

   React.useEffect(() => {
      if (monacoRef.current) {
          syncModels(monacoRef.current);
      }
   }, [files, fileName]); // Also sync when active file changes, to ensure everything is fresh

   const syncModels = (monaco: any) => {
       // ... existing sync logic 
       Object.keys(files).forEach(path => {
           // ... (keep existing)
           try {
               const uri = monaco.Uri.parse(`file:///${path}`);
               // ... (keep existing)
               // Only create if needed
               // ...
           } catch (e) {
               console.error("Error in code sync");
           }
       });
   };
   
   // Register Snippets (One time registry ideally, but here we do it on mount with a check or Idempotency)
   // For simplicity, we just add them. Monaco handles multiple providers fine usually.
   // To avoid duplicates, we could check if we did it.
   React.useEffect(() => {
       if (monacoRef.current) {
           const monaco = monacoRef.current;
           monaco.languages.registerCompletionItemProvider('typescript', {
               provideCompletionItems: (model: any, position: any) => {
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
       }
   }, []);

  // Debounce ATA
  React.useEffect(() => {
     if (language === 'typescript' || language === 'javascript' || language === 'react') {
         const timer = setTimeout(() => {
             if (monacoRef.current) {
                 acquireTypes(monacoRef.current, code);
             }
         }, 1000); // Check for imports 1 second after typing stops
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
        onMount={handleEditorDidMountWithRef}
        path={fileName ? `file:///${fileName}` : undefined} // Important: Set the path for the active model so Monaco treats it as the file
        keepCurrentModel={true} // Prevent disposal of models on switch
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          automaticLayout: true,
        }}
      />
    </div>
  );
};

export default CodeEditor;
