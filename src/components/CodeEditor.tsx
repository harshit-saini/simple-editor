import React from 'react';
import Editor, { OnMount } from '@monaco-editor/react';

interface CodeEditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
  language?: string;
  files: { [name: string]: { content: string, language: string } };
  fileName: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, language = 'typescript', files, fileName }) => {
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    // Configure Monaco
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      baseUrl: '.', // Important for resolving absolute imports if used
      paths: { '*': ['*'] }, // Fallback for path mapping
    });
    
    // Add extra lib if needed, but basic ES2020 should be there.
    // monaco.languages.typescript.typescriptDefaults.addExtraLib(...)
  };

  // Sync files to models for Intellisense
  React.useEffect(() => {
     // Trigger sync on files change
  }, [files]);
  
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
       Object.keys(files).forEach(path => {
           // We use formatted path "file:///path"
           // Note: Monaco's 'file:///' protocol is standard. 
           // Ensure we don't double slash if path already has it? No, path is 'utils.ts'.
           const uri = monaco.Uri.parse(`file:///${path}`);
           let model = monaco.editor.getModel(uri);
           
           if (!model) {
               model = monaco.editor.createModel(
                   files[path].content,
                   files[path].language === 'typescript' ? 'typescript' : 'javascript',
                   uri
               );
           } else {
               // Update content if changed externally 
               if (path !== fileName && model.getValue() !== files[path].content) {
                   model.setValue(files[path].content);
               }
           }
       });
   };

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
