import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface File {
  name: string;
  language: string;
  content: string;
}

export type LanguageMode = 'node' | 'python' | 'html';

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

export const FileSystemProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [languageMode, setLanguageModeState] = useState<LanguageMode>('node');
  const [files, setFiles] = useState<{ [name: string]: File }>(NODE_TEMPLATE);
  const [activeFile, setActiveFile] = useState<string | null>('main.ts');
  const [openFiles, setOpenFiles] = useState<string[]>(['main.ts']);

  const setLanguageMode = (mode: LanguageMode) => {
      setLanguageModeState(mode);
      let template = NODE_TEMPLATE;
      let entry = 'main.ts';
      
      if (mode === 'python') {
          template = PYTHON_TEMPLATE;
          entry = 'main.py';
      } else if (mode === 'html') {
          template = HTML_TEMPLATE;
          entry = 'index.html';
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

    if (files[validName]) return; // File already exists
    
    let language = 'javascript';
    if (validName.endsWith('.ts') || validName.endsWith('.tsx')) language = 'typescript';
    else if (validName.endsWith('.html')) language = 'html';
    else if (validName.endsWith('.py')) language = 'python';
    else if (validName.endsWith('.css')) language = 'css';
    
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
