import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface File {
  name: string;
  language: string;
  content: string;
}

interface FileSystemContextType {
  files: { [name: string]: File };
  activeFile: string | null;
  openFiles: string[];
  createFile: (name: string, content?: string) => void;
  updateFile: (name: string, content: string) => void;
  deleteFile: (name: string) => void;
  selectFile: (name: string) => void;
  closeFile: (name: string) => void;
}

const FileSystemContext = createContext<FileSystemContextType | undefined>(undefined);

export const useFileSystem = () => {
  const context = useContext(FileSystemContext);
  if (!context) {
    throw new Error('useFileSystem must be used within a FileSystemProvider');
  }
  return context;
};

const INITIAL_FILES: { [name: string]: File } = {
  'main.ts': {
    name: 'main.ts',
    language: 'typescript',
    content: `// Main entry point
console.log("Hello from main.ts");
import { add } from './utils';
console.log("2 + 3 =", add(2, 3));
`,
  },
  'utils.ts': {
    name: 'utils.ts',
    language: 'typescript',
    content: `// Utility functions
export const add = (a: number, b: number) => a + b;
`,
  },
};

export const FileSystemProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [files, setFiles] = useState<{ [name: string]: File }>(INITIAL_FILES);
  const [activeFile, setActiveFile] = useState<string | null>('main.ts');
  const [openFiles, setOpenFiles] = useState<string[]>(['main.ts', 'utils.ts']);


  const createFile = (name: string, content: string = '') => {
    if (files[name]) return; // File already exists
    const language = name.endsWith('.ts') || name.endsWith('.tsx') ? 'typescript' : 'javascript';
    setFiles(prev => ({
      ...prev,
      [name]: { name, language, content },
    }));
    selectFile(name);
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
    <FileSystemContext.Provider value={{ files, activeFile, openFiles, createFile, updateFile, deleteFile, selectFile, closeFile }}>
      {children}
    </FileSystemContext.Provider>
  );
};
