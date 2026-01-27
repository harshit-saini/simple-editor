import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface File {
  name: string;
  language: string;
  content: string;
}

export type LanguageMode = 'node' | 'python' | 'html' | 'markdown' | 'sql' | 'react' | 'go';

interface FileSystemContextType {
  files: { [name: string]: File };
  activeFile: string | null;
  openFiles: string[];
  createFile: (name: string, content?: string) => void;
  updateFile: (name: string, content: string) => void;
  deleteFile: (name: string) => void;
  selectFile: (name: string) => void;
  closeFile: (name: string) => void;
  languageMode: LanguageMode;
  setLanguageMode: (mode: LanguageMode) => void;
}

const FileSystemContext = createContext<FileSystemContextType | undefined>(undefined);

export const useFileSystem = () => {
    const context = useContext(FileSystemContext);
    if (!context) {
      throw new Error('useFileSystem must be used within a FileSystemProvider');
    }
    return context;
  };

// Default templates for each mode
const NODE_TEMPLATE: { [name: string]: File } = {
  'main.ts': { name: 'main.ts', language: 'typescript', content: `console.log("Hello Node.js");\n` }
};

const PYTHON_TEMPLATE: { [name: string]: File } = {
  'main.py': { name: 'main.py', language: 'python', content: `print("Hello Python")\n` }
};

const HTML_TEMPLATE: { [name: string]: File } = {
  'index.html': { name: 'index.html', language: 'html', content: `<h1>Hello HTML</h1>\n` },
  'style.css': { name: 'style.css', language: 'css', content: `body { font-family: sans-serif; }` }
};

const MARKDOWN_TEMPLATE: { [name: string]: File } = {
  'README.md': { name: 'README.md', language: 'markdown', content: `# Hello Markdown\n\nThis is a live preview.` }
};

const SQL_TEMPLATE: { [name: string]: File } = {
  'queries.sql': { name: 'queries.sql', language: 'sql', content: `-- Create a table\nCREATE TABLE users (id INT, name TEXT);\nINSERT INTO users VALUES (1, 'Alice');\nSELECT * FROM users;` }
};

const REACT_TEMPLATE: { [name: string]: File } = {
  'App.tsx': { name: 'App.tsx', language: 'typescript', content: `import React from 'react';\nimport { createRoot } from 'react-dom/client';\n\nfunction App() {\n  return <h1>Hello React</h1>;\n}\n\nconst root = createRoot(document.getElementById('root')!);\nroot.render(<App />);` }
};

const GO_TEMPLATE: { [name: string]: File } = {
  'main.go': { name: 'main.go', language: 'go', content: `package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello Go")\n}` }
};

export const FileSystemProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [languageMode, setLanguageModeState] = useState<LanguageMode>('node');
  const [files, setFiles] = useState<{ [name: string]: File }>(NODE_TEMPLATE);
  const [activeFile, setActiveFile] = useState<string | null>('main.ts');
  const [openFiles, setOpenFiles] = useState<string[]>(['main.ts']);

  const setLanguageMode = (mode: LanguageMode) => {
      setLanguageModeState(mode);
      let template = NODE_TEMPLATE;
      let entry = 'main.ts';
      
      switch (mode) {
          case 'python': template = PYTHON_TEMPLATE; entry = 'main.py'; break;
          case 'html': template = HTML_TEMPLATE; entry = 'index.html'; break;
          case 'markdown': template = MARKDOWN_TEMPLATE; entry = 'README.md'; break;
          case 'sql': template = SQL_TEMPLATE; entry = 'queries.sql'; break;
          case 'react': template = REACT_TEMPLATE; entry = 'App.tsx'; break;
          case 'go': template = GO_TEMPLATE; entry = 'main.go'; break;
          case 'node': default: template = NODE_TEMPLATE; entry = 'main.ts'; break;
      }

      setFiles(template);
      setOpenFiles(Object.keys(template));
      setActiveFile(entry);
  };

  const createFile = (name: string, content: string = '') => {
    // Enforce extensions based on mode
    let validName = name;
    if (languageMode === 'python' && !name.endsWith('.py')) validName += '.py';
    else if (languageMode === 'html' && !name.endsWith('.html') && !name.endsWith('.css') && !name.endsWith('.js')) validName += '.html';
    else if (languageMode === 'node' && !name.endsWith('.ts') && !name.endsWith('.js') && !name.endsWith('.json')) validName += '.ts';
    else if (languageMode === 'markdown' && !name.endsWith('.md')) validName += '.md';
    else if (languageMode === 'sql' && !name.endsWith('.sql')) validName += '.sql';
    else if (languageMode === 'react' && !name.endsWith('.tsx') && !name.endsWith('.ts')) validName += '.tsx';
    else if (languageMode === 'go' && !name.endsWith('.go')) validName += '.go';

    if (files[validName]) return; // File already exists
    
    let language = 'javascript';
    if (validName.endsWith('.ts') || validName.endsWith('.tsx')) language = 'typescript';
    else if (validName.endsWith('.html')) language = 'html';
    else if (validName.endsWith('.py')) language = 'python';
    else if (validName.endsWith('.css')) language = 'css';
    else if (validName.endsWith('.md')) language = 'markdown';
    else if (validName.endsWith('.sql')) language = 'sql';
    else if (validName.endsWith('.go')) language = 'go';
    
    setFiles(prev => ({
      ...prev,
      [validName]: { name: validName, language, content },
    }));
    selectFile(validName);
  };
  const updateFile = (name: string, content: string) => {
    setFiles(prev => ({
      ...prev,
      [name]: { ...prev[name], content },
    }));
  };

  const deleteFile = (name: string) => {
    const newFiles = { ...files };
    delete newFiles[name];
    setFiles(newFiles);
    
    if (openFiles.includes(name)) {
        closeFile(name);
    }
  };

  const selectFile = (name: string) => {
    if (!openFiles.includes(name)) {
      setOpenFiles(prev => [...prev, name]);
    }
    setActiveFile(name);
  };

  const closeFile = (name: string) => {
    setOpenFiles(prev => {
        const newFiles = prev.filter(f => f !== name);
        if (activeFile === name) {
            if (newFiles.length > 0) {
                // Switch to the last opened file
                 setActiveFile(newFiles[newFiles.length - 1]);
            } else {
                 setActiveFile(null);
            }
        }
        return newFiles;
    });
  };

  return (
    <FileSystemContext.Provider value={{ 
        files, activeFile, openFiles, 
        createFile, updateFile, deleteFile, selectFile, closeFile,
        languageMode, setLanguageMode 
    }}>
      {children}
    </FileSystemContext.Provider>
  );
};
