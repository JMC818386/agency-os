import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const AGENCY_ROOT = path.resolve(__dirname, '../../'); // Go up to AI_AGENCY root

app.use(cors());
app.use(express.json());

// Helper to ignore system files if needed
const shouldIgnore = (name) => name.startsWith('.') || name === 'node_modules' || name === '_CONSOLE';

// 1. Get Ledger
app.get('/api/ledger', (req, res) => {
    const ledgerPath = path.join(AGENCY_ROOT, 'MASTER_STATUS_LEDGER.csv');
    if (fs.existsSync(ledgerPath)) {
        res.send(fs.readFileSync(ledgerPath, 'utf-8'));
    } else {
        res.status(404).send('Ledger not found');
    }
});

// 2. List Files (Recursive)
const getFiles = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        if (shouldIgnore(file)) return;
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        const relativePath = path.relative(AGENCY_ROOT, filePath);
        
        if (stat && stat.isDirectory()) {
            results.push({ type: 'dir', path: relativePath, children: getFiles(filePath) });
        } else {
            results.push({ type: 'file', path: relativePath });
        }
    });
    return results;
};

app.get('/api/files', (req, res) => {
    try {
        const files = getFiles(AGENCY_ROOT);
        res.json(files);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 3. Get Content
app.get('/api/content', (req, res) => {
    const relativePath = req.query.path;
    if (!relativePath) return res.status(400).send('Path required');
    
    // Security check: prevent directory traversal outside root
    const targetPath = path.resolve(AGENCY_ROOT, relativePath);
    if (!targetPath.startsWith(AGENCY_ROOT)) {
        return res.status(403).send('Access denied');
    }

    if (fs.existsSync(targetPath)) {
        res.send(fs.readFileSync(targetPath, 'utf-8'));
    } else {
        res.status(404).send('File not found');
    }
});

// Serve Frontend (after build)
// app.use(express.static(path.join(__dirname, 'dist')));

app.listen(PORT, () => {
    console.log(`Agency Console API running on http://localhost:${PORT}`);
    console.log(`Monitoring Root: ${AGENCY_ROOT}`);
});
