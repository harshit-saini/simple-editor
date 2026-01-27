export const registerPythonIntellisense = (monaco: any) => {
  // Check if provider is already registered to avoid duplicates if possible, 
  // but Monaco doesn't expose easy check. We'll rely on idempotency of calling this once per mount or disposed.
  // Actually, simpler to just register a global completion provider for 'python'.

  return monaco.languages.registerCompletionItemProvider('python', {
    triggerCharacters: ['.'],
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      // Get text before the cursor to determine context (naive type inference)
      const lineContent = model.getLineContent(position.lineNumber);
      const textUntilPosition = lineContent.substring(0, position.column - 1);
      
      const suggestions: any[] = [];

      // 1. Built-in Functions (Global scope)
      if (!textUntilPosition.trim().endsWith('.')) {
         suggestions.push(
            { label: 'print', kind: monaco.languages.CompletionItemKind.Function, insertText: 'print(${1:object})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Prints values to a stream, or to sys.stdout by default.', range },
            { label: 'len', kind: monaco.languages.CompletionItemKind.Function, insertText: 'len(${1:object})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return the number of items in a container.', range },
            { label: 'range', kind: monaco.languages.CompletionItemKind.Function, insertText: 'range(${1:stop})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return an object that produces a sequence of integers from start (inclusive) to stop (exclusive).', range },
            { label: 'enumerate', kind: monaco.languages.CompletionItemKind.Function, insertText: 'enumerate(${1:iterable})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return an enumerate object.', range },
            { label: 'str', kind: monaco.languages.CompletionItemKind.Class, insertText: 'str(${1:object})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Create a new string object from the given object.', range },
            { label: 'int', kind: monaco.languages.CompletionItemKind.Class, insertText: 'int(${1:x})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Convert a number or string to an integer.', range },
            { label: 'list', kind: monaco.languages.CompletionItemKind.Class, insertText: 'list(${1:iterable})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Built-in mutable sequence.', range }
         );
      }

      // 2. Context-aware suggestions (Naive)
      // Check variable names or common patterns nearby
      
      // List Methods
      // Heuristic: If prompt ends in '.', check if previous word looks like a list
      // OR just provide all methods if we are after a dot, as we can't do real static analysis easily.
      // To be helpful, we'll provide common methods for list/string/dict if a dot is typed.
      if (textUntilPosition.endsWith('.')) {
          // List
          suggestions.push(
              { label: 'append', kind: monaco.languages.CompletionItemKind.Method, insertText: 'append(${1:item})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Appends object to the end of the list.', range },
              { label: 'pop', kind: monaco.languages.CompletionItemKind.Method, insertText: 'pop(${1:index})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Remove and return item at index (default last).', range },
              { label: 'remove', kind: monaco.languages.CompletionItemKind.Method, insertText: 'remove(${1:value})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Remove first occurrence of value.', range },
              { label: 'sort', kind: monaco.languages.CompletionItemKind.Method, insertText: 'sort()', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Sort the list in ascending order and return None.', range }
          );

          // String
          suggestions.push(
              { label: 'split', kind: monaco.languages.CompletionItemKind.Method, insertText: 'split(${1:sep})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return a list of the words in the string, using sep as the delimiter string.', range },
              { label: 'join', kind: monaco.languages.CompletionItemKind.Method, insertText: 'join(${1:iterable})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Concatenate any number of strings.', range },
              { label: 'replace', kind: monaco.languages.CompletionItemKind.Method, insertText: 'replace(${1:old}, ${2:new})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return a copy with all occurrences of substring old replaced by new.', range },
              { label: 'upper', kind: monaco.languages.CompletionItemKind.Method, insertText: 'upper()', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return a copy of the string converted to uppercase.', range },
              { label: 'lower', kind: monaco.languages.CompletionItemKind.Method, insertText: 'lower()', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return a copy of the string converted to lowercase.', range }
          );

          // Dict
          suggestions.push(
              { label: 'keys', kind: monaco.languages.CompletionItemKind.Method, insertText: 'keys()', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return a set-like object providing a view on D\'s keys.', range },
              { label: 'values', kind: monaco.languages.CompletionItemKind.Method, insertText: 'values()', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return an object providing a view on D\'s values.', range },
              { label: 'items', kind: monaco.languages.CompletionItemKind.Method, insertText: 'items()', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return a set-like object providing a view on D\'s items.', range },
              { label: 'get', kind: monaco.languages.CompletionItemKind.Method, insertText: 'get(${1:key}, ${2:default})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return the value for key if key is in the dictionary, else default.', range }
          );
      }

      return { suggestions: suggestions };
    }
  });
};
