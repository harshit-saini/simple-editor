/**
 * Automatic Type Acquisition (ATA)
 * Detects imports in code and fetches type definitions from CDN.
 */

// Cache loaded libraries to avoid re-fetching
const loadedTypes = new Set<string>();

export const acquireTypes = async (monaco: any, code: string) => {
    if (!monaco) return;

    // Regex to find imports: import ... from 'package' OR import 'package'
    // This is simple and might catch local files too, so we'll filter.
    const importRegex = /import\s+(?:(?:[\w{}\s,*]+)\s+from\s+)?['"]([^'"]+)['"]/g;
    
    let match;
    while ((match = importRegex.exec(code)) !== null) {
        const packageName = match[1];

        // Skip relative imports (starting with .)
        if (packageName.startsWith('.')) continue;

        // Skip if already loaded
        if (loadedTypes.has(packageName)) continue;

        // Skip standard React imports if we already manually shimmed them (optimistic check)
        // actually, we should let this overwrite our simple shim if real types are available,
        // BUT fetching @types/react is huge and might fail or take long.
        // For now, let's allow fetching standard packages like lodash, axios etc.
        // If it's react, let's skip for now as we have a manual shim that works for the basics.
        if (packageName === 'react' || packageName === 'react-dom') continue; 
        if (packageName === 'react-dom/client') continue;

        loadedTypes.add(packageName); // Mark as requested to prevent double fetch

        await fetchTypeDefinition(monaco, packageName);
    }
};

const fetchTypeDefinition = async (monaco: any, packageName: string) => {
    try {
        console.log(`[ATA] Fetching types for ${packageName}...`);
        
        // Try getting index.d.ts from jsdelivr
        // Check standard @types first? Or commonly bundled types?
        // Many modern packages ship with types. 
        // Strategy: 
        // 1. Try https://cdn.jsdelivr.net/npm/@types/PACKAGE/index.d.ts
        // 2. Try https://cdn.jsdelivr.net/npm/PACKAGE/index.d.ts (bundled)
        
        // Simple attempt: @types first
        let url = `https://cdn.jsdelivr.net/npm/@types/${packageName}/index.d.ts`;
        let response = await fetch(url);
        
        if (!response.ok) {
           // Try bundled
           url = `https://cdn.jsdelivr.net/npm/${packageName}/index.d.ts`;
           response = await fetch(url);
        }

        if (response.ok) {
            const dtsContent = await response.text();
            
            // We need to verify if it has references to other files.
            // Simple approach: just add this file.
            // If it has /// <reference path="..." />, we might fail to resolve those.
            // For a robust system, we need a recursive fetcher, but that's complex.
            // Let's implement single-file support first.
            
            monaco.languages.typescript.typescriptDefaults.addExtraLib(
                dtsContent,
                `file:///node_modules/@types/${packageName}/index.d.ts`
            );
            console.log(`[ATA] Loaded types for ${packageName}`);
        } else {
            console.warn(`[ATA] Could not find types for ${packageName}`);
        }

    } catch (e) {
        console.error(`[ATA] Error fetching types for ${packageName}`, e);
    }
};
