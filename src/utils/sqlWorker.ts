// @ts-ignore
importScripts('https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js');

const sqlCtx: Worker = self as any;
let db: any = null;

const initDB = async () => {
    try {
        const SQL = await (self as any).initSqlJs({
            locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
        });
        db = new SQL.Database();
        
        // Seed Data
        db.run(`
            CREATE TABLE users (
                id INTEGER PRIMARY KEY,
                name TEXT,
                email TEXT,
                role TEXT
            );
            
            CREATE TABLE products (
                id INTEGER PRIMARY KEY,
                name TEXT,
                price REAL,
                category TEXT
            );
            
            CREATE TABLE orders (
                id INTEGER PRIMARY KEY,
                user_id INTEGER,
                total REAL,
                date TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );

            CREATE TABLE order_items (
                id INTEGER PRIMARY KEY,
                order_id INTEGER,
                product_id INTEGER,
                quantity INTEGER,
                FOREIGN KEY(order_id) REFERENCES orders(id),
                FOREIGN KEY(product_id) REFERENCES products(id)
            );

            -- Sample Users
            INSERT INTO users (name, email, role) VALUES 
            ('Alice Smith', 'alice@example.com', 'admin'),
            ('Bob Jones', 'bob@example.com', 'user'),
            ('Charlie Brown', 'charlie@example.com', 'user'),
            ('Diana Prince', 'diana@example.com', 'user'),
            ('Evan Wright', 'evan@example.com', 'viewer');

            -- Sample Products
            INSERT INTO products (name, price, category) VALUES
            ('Laptop', 1200.00, 'Electronics'),
            ('Mouse', 25.50, 'Electronics'),
            ('Keyboard', 45.00, 'Electronics'),
            ('Monitor', 300.00, 'Electronics'),
            ('Desk Chair', 150.00, 'Furniture'),
            ('Coffee Mug', 12.00, 'Kitchen');

            -- Sample Orders
            INSERT INTO orders (user_id, total, date) VALUES
            (1, 1225.50, '2023-01-15'),
            (2, 45.00, '2023-01-16'),
            (2, 300.00, '2023-02-01'),
            (3, 150.00, '2023-02-10'),
            (1, 12.00, '2023-03-05');

            -- Sample Order Items
            INSERT INTO order_items (order_id, product_id, quantity) VALUES
            (1, 1, 1), (1, 2, 1),
            (2, 3, 1),
            (3, 4, 1),
            (4, 5, 1),
            (5, 6, 1);
        `);

        sqlCtx.postMessage({ type: 'info', message: ['Database initialized with tables: users, products, orders, order_items'] });
        
    } catch (e: any) {
        sqlCtx.postMessage({ type: 'error', message: ['Failed to initialize database: ' + e.message] });
    }
};

const initPromise = initDB();

sqlCtx.onmessage = async (event) => {
    const { start } = event.data;
    if (start) return; 

    // Wait for DB to be ready
    await initPromise;

    const { entryFile, files, type } = event.data;

    // Handle Schema Request
    if (type === 'get_schema') {
        if (!db) {
            sqlCtx.postMessage({ type: 'error', message: ['Database not ready for schema'] });
            return;
        }
        try {
            // Get tables
            const tablesRes = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
            const tables = tablesRes[0]?.values.map((v: any[]) => v[0]) || [];

            const schema: any[] = [];
            for (const table of tables) {
                const colsRes = db.exec(`PRAGMA table_info(${table})`);
                const columns = colsRes[0]?.values.map((v: any[]) => ({
                     name: v[1],
                     type: v[2]
                })) || [];
                schema.push({ tableName: table, columns });
            }
            sqlCtx.postMessage({ type: 'schema', schema });
        } catch (e: any) {
            sqlCtx.postMessage({ type: 'error', message: ['Failed to fetch schema: ' + e.message] });
        }
        return;
    }

    // Handle Validation Request
    if (type === 'validate') {
        const query = files?.[entryFile]?.content;
        if (!db || !query) return;

        try {
            // Use prepare to check syntax without executing
            const stmt = db.prepare(query);
            stmt.free(); // Valid
            sqlCtx.postMessage({ type: 'validation_result', markers: [] });
        } catch (e: any) {
             // SQLite error: "near "x": syntax error"
             // It doesn't give line numbers easily, but we can return the message.
             // If we had a better parser we'd give line/col.
             // For now, mark the first line or try to regex extract "line X".
             // Actually, commonly it just fails. 
             // We will put a marker on the whole file or just return the error.
             sqlCtx.postMessage({ 
                 type: 'validation_result', 
                 markers: [{
                     startLineNumber: 1,
                     startColumn: 1,
                     endLineNumber: 1000,
                     endColumn: 1000,
                     message: e.message,
                     severity: 8 // Error
                 }] 
             });
        }
        return;
    }

    const sqlQuery = files?.[entryFile]?.content;

    if (!db) {
         sqlCtx.postMessage({ type: 'error', message: ['Database failed to initialize'] });
         sqlCtx.postMessage({ type: 'finished' });
         return;
    }

    if (!sqlQuery) {
         sqlCtx.postMessage({ type: 'error', message: ['No query found'] });
         sqlCtx.postMessage({ type: 'finished' });
         return;
    }

    try {
        const results = db.exec(sqlQuery);
        if (results.length === 0) {
            sqlCtx.postMessage({ type: 'log', message: ['Query executed successfully. No results returned.'] });
        } else {
            results.forEach((res: any) => {
                sqlCtx.postMessage({ type: 'info', message: [`Result: ${res.columns.join(' | ')}`] });
                sqlCtx.postMessage({ type: 'log', message: ['----------------------------------------'] });
                res.values.forEach((row: any) => {
                    sqlCtx.postMessage({ type: 'log', message: [row.join(' | ')] });
                });
                sqlCtx.postMessage({ type: 'log', message: [`${res.values.length} rows returned.`] });
            });
        }
    } catch (e: any) {
        sqlCtx.postMessage({ type: 'error', message: ['SQL Error: ' + e.message] });
    } finally {
        sqlCtx.postMessage({ type: 'finished' });
    }
};
