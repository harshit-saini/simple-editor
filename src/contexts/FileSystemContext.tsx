import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

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

interface WorkspaceSnapshot {
  languageMode: LanguageMode;
  files: { [name: string]: File };
  activeFile: string | null;
  openFiles: string[];
}

const STORAGE_KEY = 'frontend-editor.workspace.v1';

const FileSystemContext = createContext<FileSystemContextType | undefined>(undefined);

export const useFileSystem = () => {
  const context = useContext(FileSystemContext);
  if (!context) {
    throw new Error('useFileSystem must be used within a FileSystemProvider');
  }
  return context;
};

const NODE_TEMPLATE: { [name: string]: File } = {
  'main.ts': { name: 'main.ts', language: 'typescript', content: 'console.log("Hello Node.js");\n' }
};

const PYTHON_TEMPLATE: { [name: string]: File } = {
  'main.py': { name: 'main.py', language: 'python', content: 'print("Hello Python")\n' }
};

const HTML_TEMPLATE: { [name: string]: File } = {
  'index.html': { name: 'index.html', language: 'html', content: '<h1>Hello HTML</h1>\n' },
  'style.css': { name: 'style.css', language: 'css', content: 'body { font-family: sans-serif; }' }
};

const MARKDOWN_TEMPLATE: { [name: string]: File } = {
  'README.md': { name: 'README.md', language: 'markdown', content: '# Hello Markdown\n\nThis is a live preview.' }
};

const SQL_TEMPLATE: { [name: string]: File } = {
  'queries.sql': { name: 'queries.sql', language: 'sql', content: 'SELECT * FROM users;' }
};

const REACT_TEMPLATE: { [name: string]: File } = {
  'App.tsx': {
    name: 'App.tsx',
    language: 'typescript',
    content:
      "import React from 'react';\nimport { createRoot } from 'react-dom/client';\n\nfunction App() {\n  return <h1>Hello React</h1>;\n}\n\nconst root = createRoot(document.getElementById('root')!);\nroot.render(<App />);"
  }
};

const GO_TEMPLATE: { [name: string]: File } = {
  'main.go': {
    name: 'main.go',
    language: 'go',
    content: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello Go")\n}'
  }
};

const isLanguageMode = (value: string): value is LanguageMode => {
  return ['node', 'python', 'html', 'markdown', 'sql', 'react', 'go'].includes(value);
};

const inferLanguage = (fileName: string) => {
  if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) return 'typescript';
  if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) return 'javascript';
  if (fileName.endsWith('.html')) return 'html';
  if (fileName.endsWith('.py')) return 'python';
  if (fileName.endsWith('.css')) return 'css';
  if (fileName.endsWith('.md')) return 'markdown';
  if (fileName.endsWith('.sql')) return 'sql';
  if (fileName.endsWith('.go')) return 'go';
  if (fileName.endsWith('.json')) return 'json';
  return 'javascript';
};

const getTemplateForMode = (mode: LanguageMode) => {
  switch (mode) {
    case 'python':
      return { template: PYTHON_TEMPLATE, entry: 'main.py' };
    case 'html':
      return { template: HTML_TEMPLATE, entry: 'index.html' };
    case 'markdown':
      return { template: MARKDOWN_TEMPLATE, entry: 'README.md' };
    case 'sql':
      return { template: SQL_TEMPLATE, entry: 'queries.sql' };
    case 'react':
      return { template: REACT_TEMPLATE, entry: 'App.tsx' };
    case 'go':
      return { template: GO_TEMPLATE, entry: 'main.go' };
    case 'node':
    default:
      return { template: NODE_TEMPLATE, entry: 'main.ts' };
  }
};

const cloneTemplate = (template: { [name: string]: File }) => {
  return Object.fromEntries(
    Object.entries(template).map(([name, file]) => [name, { ...file }])
  ) as { [name: string]: File };
};

const defaultWorkspaceSnapshot = (): WorkspaceSnapshot => {
  const { template, entry } = getTemplateForMode('node');
  const files = cloneTemplate(template);

  return {
    languageMode: 'node',
    files,
    activeFile: entry,
    openFiles: [entry]
  };
};

const sanitizeFiles = (candidate: unknown): { [name: string]: File } | null => {
  if (!candidate || typeof candidate !== 'object') return null;

  const entries = Object.entries(candidate as Record<string, unknown>);
  const normalized: { [name: string]: File } = {};

  for (const [name, rawFile] of entries) {
    if (!rawFile || typeof rawFile !== 'object') continue;

    const fileLike = rawFile as Partial<File>;
    const content = typeof fileLike.content === 'string' ? fileLike.content : '';
    const language = typeof fileLike.language === 'string' ? fileLike.language : inferLanguage(name);

    normalized[name] = {
      name,
      content,
      language
    };
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
};

const readWorkspaceSnapshot = (): WorkspaceSnapshot => {
  if (typeof window === 'undefined') {
    return defaultWorkspaceSnapshot();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return defaultWorkspaceSnapshot();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<WorkspaceSnapshot>;
    if (!parsed.languageMode || !isLanguageMode(parsed.languageMode)) {
      return defaultWorkspaceSnapshot();
    }

    const files = sanitizeFiles(parsed.files);
    if (!files) {
      return defaultWorkspaceSnapshot();
    }

    const fileNames = Object.keys(files);

    const openFilesRaw = Array.isArray(parsed.openFiles)
      ? parsed.openFiles.filter((entry): entry is string => typeof entry === 'string')
      : [];

    const openFiles = openFilesRaw.filter((name) => fileNames.includes(name));
    const normalizedOpenFiles = openFiles.length > 0 ? openFiles : [fileNames[0]];

    const activeFile =
      typeof parsed.activeFile === 'string' && fileNames.includes(parsed.activeFile)
        ? parsed.activeFile
        : normalizedOpenFiles[0] ?? null;

    return {
      languageMode: parsed.languageMode,
      files,
      activeFile,
      openFiles: normalizedOpenFiles
    };
  } catch {
    return defaultWorkspaceSnapshot();
  }
};

const enforceExtensionForMode = (mode: LanguageMode, fileName: string) => {
  if (mode === 'python' && !fileName.endsWith('.py')) return `${fileName}.py`;
  if (mode === 'html' && !['.html', '.css', '.js'].some((ext) => fileName.endsWith(ext))) return `${fileName}.html`;
  if (mode === 'node' && !['.ts', '.js', '.json'].some((ext) => fileName.endsWith(ext))) return `${fileName}.ts`;
  if (mode === 'markdown' && !fileName.endsWith('.md')) return `${fileName}.md`;
  if (mode === 'sql' && !fileName.endsWith('.sql')) return `${fileName}.sql`;
  if (mode === 'react' && !['.tsx', '.ts'].some((ext) => fileName.endsWith(ext))) return `${fileName}.tsx`;
  if (mode === 'go' && !fileName.endsWith('.go')) return `${fileName}.go`;
  return fileName;
};

export const FileSystemProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const initialSnapshot = useMemo(() => readWorkspaceSnapshot(), []);

  const [languageMode, setLanguageModeState] = useState<LanguageMode>(initialSnapshot.languageMode);
  const [files, setFiles] = useState<{ [name: string]: File }>(initialSnapshot.files);
  const [activeFile, setActiveFile] = useState<string | null>(initialSnapshot.activeFile);
  const [openFiles, setOpenFiles] = useState<string[]>(initialSnapshot.openFiles);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const snapshot: WorkspaceSnapshot = {
      languageMode,
      files,
      activeFile,
      openFiles
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, [activeFile, files, languageMode, openFiles]);

  const setLanguageMode = (mode: LanguageMode) => {
    setLanguageModeState(mode);

    const { template, entry } = getTemplateForMode(mode);
    const nextFiles = cloneTemplate(template);

    setFiles(nextFiles);
    setOpenFiles(Object.keys(nextFiles));
    setActiveFile(entry);
  };

  const selectFile = (name: string) => {
    setOpenFiles((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setActiveFile(name);
  };

  const createFile = (name: string, content = '') => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const validName = enforceExtensionForMode(languageMode, trimmedName);
    if (files[validName]) return;

    const language = inferLanguage(validName);

    setFiles((prev) => ({
      ...prev,
      [validName]: { name: validName, language, content }
    }));

    selectFile(validName);
  };

  const updateFile = (name: string, content: string) => {
    setFiles((prev) => ({
      ...prev,
      [name]: { ...prev[name], content }
    }));
  };

  const closeFile = (name: string) => {
    setOpenFiles((prev) => {
      const nextOpenFiles = prev.filter((fileName) => fileName !== name);

      if (activeFile === name) {
        setActiveFile(nextOpenFiles.length > 0 ? nextOpenFiles[nextOpenFiles.length - 1] : null);
      }

      return nextOpenFiles;
    });
  };

  const deleteFile = (name: string) => {
    const nextFiles = { ...files };
    delete nextFiles[name];

    const nextOpenFiles = openFiles.filter((fileName) => fileName !== name);
    const remainingFileNames = Object.keys(nextFiles);

    let nextActiveFile = activeFile;
    if (activeFile === name) {
      nextActiveFile = nextOpenFiles.length > 0 ? nextOpenFiles[nextOpenFiles.length - 1] : remainingFileNames[0] ?? null;
    } else if (activeFile && !nextFiles[activeFile]) {
      nextActiveFile = remainingFileNames[0] ?? null;
    }

    setFiles(nextFiles);
    setOpenFiles(nextOpenFiles);
    setActiveFile(nextActiveFile);
  };

  return (
    <FileSystemContext.Provider
      value={{
        files,
        activeFile,
        openFiles,
        createFile,
        updateFile,
        deleteFile,
        selectFile,
        closeFile,
        languageMode,
        setLanguageMode
      }}
    >
      {children}
    </FileSystemContext.Provider>
  );
};
