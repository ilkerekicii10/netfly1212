import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';
import { db, initDb } from '../../server/database.js';

// Initialize the database when the function is cold-started
await initDb().catch(err => {
  console.error("Failed to initialize database in Netlify function:", err);
});

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// --- API Router ---
// We use a router to keep the code clean and prefix all routes with /api
const router = express.Router();


// Helper function to handle JSON parsing for database rows
const parseJsonFields = (items, fields) => {
  return items.map(item => {
    const newItem = { ...item };
    fields.forEach(field => {
      if (typeof newItem[field] === 'string') {
        try {
          newItem[field] = JSON.parse(newItem[field]);
        } catch (e) {
          console.error(`Failed to parse JSON for field ${field}`, e);
        }
      }
    });
    return newItem;
  });
};

// --- API Endpoints ---

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET all data for initial app load
router.get('/all-data', async (req, res) => {
  try {
    const [orders, allStockEntries, cuttingReports, colors, producers, defectReasons] = await Promise.all([
      db.all('SELECT * FROM orders'),
      db.all('SELECT * FROM stock_entries'),
      db.all('SELECT * FROM cutting_reports'),
      db.all('SELECT * FROM colors ORDER BY name'),
      db.all('SELECT * FROM producers ORDER BY name'),
      db.all('SELECT * FROM defect_reasons ORDER BY name'),
    ]);

    res.json({
      orders: parseJsonFields(orders, ['sizes']),
      allStockEntries: parseJsonFields(allStockEntries, ['normalSizes', 'defectiveSizes']),
      cuttingReports: parseJsonFields(cuttingReports, ['sizes']),
      colors,
      producers,
      defectReasons,
    });
  } catch (error) {
    console.error('Error fetching all data:', error);
    res.status(500).json({ message: 'Failed to fetch data from database.' });
  }
});

const getTableData = (table, fieldsToParse) => async (req, res) => {
    try {
        const items = await db.all(`SELECT * FROM ${table}`);
        res.json(parseJsonFields(items, fieldsToParse));
    } catch (error) {
        res.status(500).json({ message: `Error fetching from ${table}` });
    }
};

router.get('/orders', getTableData('orders', ['sizes']));
router.get('/stock-entries', getTableData('stock_entries', ['normalSizes', 'defectiveSizes']));

router.get('/export', async (req, res) => {
    try {
        const [orders, allStockEntries, cuttingReports, colors, producers, defectReasons] = await Promise.all([
            db.all('SELECT * FROM orders'),
            db.all('SELECT * FROM stock_entries'),
            db.all('SELECT * FROM cutting_reports'),
            db.all('SELECT * FROM colors'),
            db.all('SELECT * FROM producers'),
            db.all('SELECT * FROM defect_reasons'),
        ]);
        res.json({ orders, allStockEntries, cuttingReports, colors, producers, defectReasons });
    } catch (error) {
        res.status(500).json({ message: 'Error exporting data' });
    }
});

router.post('/import', async (req, res) => {
    const { orders, allStockEntries, cuttingReports, colors, producers, defectReasons } = req.body;
    try {
        await db.exec('BEGIN TRANSACTION');
        await Promise.all([
            db.exec('DELETE FROM orders'),
            db.exec('DELETE FROM stock_entries'),
            db.exec('DELETE FROM cutting_reports'),
            db.exec('DELETE FROM colors'),
            db.exec('DELETE FROM producers'),
            db.exec('DELETE FROM defect_reasons'),
        ]);

        if (orders) for (const o of orders) await db.run('INSERT INTO orders (id, groupId, createdDate, completionDate, productName, color, producer, sizes, totalQuantity, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', o.id, o.groupId, o.createdDate, o.completionDate, o.productName, o.color, o.producer, JSON.stringify(o.sizes), o.totalQuantity, o.status);
        if (allStockEntries) for (const s of allStockEntries) await db.run('INSERT INTO stock_entries (id, date, productName, color, producer, normalSizes, defectiveSizes, defectReason, isArchived) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', s.id, s.date, s.productName, s.color, s.producer, JSON.stringify(s.normalSizes), JSON.stringify(s.defectiveSizes), s.defectReason, s.isArchived ? 1 : 0);
        if (cuttingReports) for (const c of cuttingReports) await db.run('INSERT INTO cutting_reports (id, date, groupId, productName, color, sizes, isConfirmed) VALUES (?, ?, ?, ?, ?, ?, ?)', c.id, c.date, c.groupId, c.productName, c.color, JSON.stringify(c.sizes), c.isConfirmed ? 1 : 0);
        if (colors) for (const c of colors) await db.run('INSERT INTO colors (id, name) VALUES (?, ?)', c.id, c.name);
        if (producers) for (const p of producers) await db.run('INSERT INTO producers (id, name, contactPerson, phone, address) VALUES (?, ?, ?, ?, ?)', p.id, p.name, p.contactPerson, p.phone, p.address);
        if (defectReasons) for (const d of defectReasons) await db.run('INSERT INTO defect_reasons (id, name) VALUES (?, ?)', d.id, d.name);

        await db.exec('COMMIT');
        res.status(200).send({ message: 'Import successful' });
    } catch (error) {
        await db.exec('ROLLBACK');
        console.error("Import failed:", error);
        res.status(500).json({ message: 'Import failed' });
    }
});

router.post('/orders', async (req, res) => {
    const { newOrders, newCuttingReports } = req.body;
    try {
        await db.exec('BEGIN TRANSACTION');
        for (const order of newOrders) {
            await db.run('INSERT INTO orders (id, groupId, createdDate, productName, color, producer, sizes, totalQuantity, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', order.id, order.groupId, order.createdDate, order.productName, order.color, order.producer, JSON.stringify(order.sizes), order.totalQuantity, order.status);
        }
        for (const report of newCuttingReports) {
            await db.run('INSERT INTO cutting_reports (id, date, groupId, productName, color, sizes, isConfirmed) VALUES (?, ?, ?, ?, ?, ?, ?)', report.id, report.date, report.groupId, report.productName, report.color, JSON.stringify(report.sizes), report.isConfirmed ? 1 : 0);
        }
        await db.exec('COMMIT');
        res.status(201).json({ message: "Orders created" });
    } catch (error) {
        await db.exec('ROLLBACK');
        res.status(500).json({ message: 'Failed to create orders' });
    }
});

router.put('/orders/sync', async (req, res) => {
    const { originalOrders, updatedOrders } = req.body;
    const groupId = originalOrders[0].groupId;
    try {
        await db.exec('BEGIN TRANSACTION');
        await db.run('DELETE FROM orders WHERE groupId = ?', groupId);
        for (const order of updatedOrders) {
            await db.run('INSERT INTO orders (id, groupId, createdDate, productName, color, producer, sizes, totalQuantity, status, completionDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', order.id, order.groupId, order.createdDate, order.productName, order.color, order.producer, JSON.stringify(order.sizes), order.totalQuantity, order.status, order.completionDate);
        }
        await db.exec('COMMIT');
        const refreshedOrders = await db.all('SELECT * FROM orders WHERE groupId = ?', groupId);
        res.status(200).json(parseJsonFields(refreshedOrders, ['sizes']));
    } catch (error) {
        await db.exec('ROLLBACK');
        res.status(500).json({ message: 'Failed to sync orders' });
    }
});

router.post('/orders/reassign', async (req, res) => {
    const { finalOrders, groupIds } = req.body;
    try {
        await db.exec('BEGIN TRANSACTION');
        for (const groupId of groupIds) {
            await db.run('DELETE FROM orders WHERE groupId = ?', groupId);
        }
        for (const order of finalOrders) {
            await db.run('INSERT INTO orders (id, groupId, createdDate, productName, color, producer, sizes, totalQuantity, status, completionDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', order.id, order.groupId, order.createdDate, order.productName, order.color, order.producer, JSON.stringify(order.sizes), order.totalQuantity, order.status, order.completionDate);
        }
        await db.exec('COMMIT');
        res.status(200).json({ message: 'Reassignment successful.' });
    } catch (error) {
        await db.exec('ROLLBACK');
        console.error("Reassign failed:", error);
        res.status(500).json({ message: 'Reassignment failed.' });
    }
});

router.delete('/orders/:groupId', async (req, res) => {
    const { groupId } = req.params;
    try {
        await db.exec('BEGIN TRANSACTION');
        await db.run('DELETE FROM orders WHERE groupId = ?', groupId);
        await db.run('DELETE FROM cutting_reports WHERE groupId = ?', groupId);
        await db.exec('COMMIT');
        res.status(200).json({ message: 'Order group deleted' });
    } catch (error) {
        await db.exec('ROLLBACK');
        res.status(500).json({ message: 'Failed to delete order group' });
    }
});

router.post('/stock-entries', async (req, res) => {
    const newEntries = req.body;
    try {
        await db.exec('BEGIN TRANSACTION');
        for (const entry of newEntries) {
            await db.run('INSERT INTO stock_entries (id, date, productName, color, producer, normalSizes, defectiveSizes, defectReason, isArchived) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', entry.id, entry.date, entry.productName, entry.color, entry.producer, JSON.stringify(entry.normalSizes), JSON.stringify(entry.defectiveSizes), entry.defectReason, 0);
        }
        await db.exec('COMMIT');
        res.status(201).json(newEntries);
    } catch (error) {
        await db.exec('ROLLBACK');
        res.status(500).json({ message: 'Failed to add stock entries' });
    }
});

router.put('/stock-entries/:id', async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    try {
        await db.run('UPDATE stock_entries SET date=?, productName=?, color=?, producer=?, normalSizes=?, defectiveSizes=?, defectReason=? WHERE id = ?', data.date, data.productName, data.color, data.producer, JSON.stringify(data.normalSizes), JSON.stringify(data.defectiveSizes), data.defectReason, id);
        res.status(200).json({ id, ...data });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update stock entry' });
    }
});

router.put('/stock-entries/:action/:id', async (req, res) => {
    const { action, id } = req.params;
    const isArchived = action === 'archive' ? 1 : 0;
    try {
        await db.run('UPDATE stock_entries SET isArchived = ? WHERE id = ?', isArchived, id);
        res.status(200).json({ message: `Entry ${action}d` });
    } catch (error) {
        res.status(500).json({ message: `Failed to ${action} stock entry` });
    }
});

router.post('/cutting-reports/update', async (req, res) => {
    const { reportsToDelete, newReport } = req.body;
    try {
        await db.exec('BEGIN TRANSACTION');
        for (const report of reportsToDelete) {
            await db.run('DELETE FROM cutting_reports WHERE id = ?', report.id);
        }
        await db.run('INSERT INTO cutting_reports (id, date, groupId, productName, color, sizes, isConfirmed) VALUES (?, ?, ?, ?, ?, ?, ?)', newReport.id, newReport.date, newReport.groupId, newReport.productName, newReport.color, JSON.stringify(newReport.sizes), newReport.isConfirmed ? 1 : 0);
        await db.exec('COMMIT');
        res.status(200).json({ message: 'Cutting report updated' });
    } catch (error) {
        await db.exec('ROLLBACK');
        res.status(500).json({ message: 'Failed to update cutting report' });
    }
});

const createCrudEndpoints = (tableName, requiredField = 'name') => {
    router.post(`/${tableName}`, async (req, res) => {
        const data = req.body;
        if (!data[requiredField]) return res.status(400).json({ message: `${requiredField} is required.` });
        try {
            const result = await db.run(`INSERT INTO ${tableName} (${Object.keys(data).join(',')}) VALUES (${Object.keys(data).map(() => '?').join(',')})`, ...Object.values(data));
            const newRecord = await db.get(`SELECT * FROM ${tableName} WHERE id = ?`, result.lastID);
            res.status(201).json(newRecord);
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT') {
                 res.status(409).json({ message: 'This name already exists.' });
            } else {
                 res.status(500).json({ message: `Failed to add to ${tableName}` });
            }
        }
    });

    router.put(`/${tableName}/:id`, async (req, res) => {
        const { id } = req.params;
        const data = req.body;
        const fields = Object.keys(data).map(k => `${k} = ?`).join(',');
        try {
            await db.run(`UPDATE ${tableName} SET ${fields} WHERE id = ?`, ...Object.values(data), id);
            res.status(200).json({ message: 'Updated successfully' });
        } catch (error) {
            res.status(500).json({ message: `Failed to update ${tableName}` });
        }
    });

    router.delete(`/${tableName}/:id`, async (req, res) => {
        const { id } = req.params;
        try {
            if (tableName === 'producers') {
                const producer = await db.get('SELECT name FROM producers WHERE id = ?', id);
                if (producer) {
                    await db.run('UPDATE orders SET producer = NULL WHERE producer = ?', producer.name);
                }
            }
            if (tableName === 'defect_reasons') {
                 const reason = await db.get('SELECT name FROM defect_reasons WHERE id = ?', id);
                 if (reason) {
                    await db.run('UPDATE stock_entries SET defectReason = NULL WHERE defectReason = ?', reason.name);
                 }
            }
            await db.run(`DELETE FROM ${tableName} WHERE id = ?`, id);
            res.status(200).json({ message: 'Deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: `Failed to delete from ${tableName}` });
        }
    });
};

createCrudEndpoints('colors');
createCrudEndpoints('producers');
createCrudEndpoints('defect_reasons');

// This is the key part for Netlify Functions.
// The router is mounted on a specific path that Netlify will use.
app.use('/.netlify/functions/api', router);

// Export the handler for Netlify
export const handler = serverless(app);