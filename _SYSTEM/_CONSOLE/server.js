import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Correct Paths based on new structure
const AGENCY_ROOT = path.resolve(__dirname, '../../');
const PROJECTS_DIR = path.join(AGENCY_ROOT, 'PROJECTS');
const BRIEF_DIR = path.join(AGENCY_ROOT, '00_BRIEF');

app.use(cors());
app.use(express.json());

// 1. List Files (Recursive check ONLY in PROJECTS)
// Improved recursive walker that returns nested structure properly
const walkDir = (dir, rootDir) => {
    if (!fs.existsSync(dir)) return [];
    
    const files = fs.readdirSync(dir);
    const list = [];

    files.forEach(file => {
        if (file.startsWith('.')) return; // Ignore hidden files
        
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        const relativePath = path.relative(rootDir, filePath); 

        if (stat.isDirectory()) {
            list.push({
                path: relativePath,
                type: 'directory',
                children: walkDir(filePath, rootDir) // Recursively get children
            });
        } else {
            list.push({
                path: relativePath,
                type: 'file',
                size: stat.size,
                mtime: stat.mtime
            });
        }
    });
    return list;
};

// API: Get File List
app.get('/api/files', (req, res) => {
    try {
        if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR);
        const structure = walkDir(PROJECTS_DIR, PROJECTS_DIR);
        res.json(structure);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// API: Get Specific File Content (FIXED FOR BINARY FILES)
app.get('/api/content', (req, res) => {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).send('Path required');

    // Security Check: Ensure path is within PROJECTS directory
    const fullPath = path.join(PROJECTS_DIR, filePath);
    // Note: path.resolve/join might need sanitization to prevent ../
    // but fullPath should start with PROJECTS_DIR if done right.
    // However, string checking is safer.
    
    if (!fullPath.startsWith(PROJECTS_DIR)) {
        return res.status(403).send('Access Denied');
    }

    if (fs.existsSync(fullPath)) {
        // Use sendFile to automatically handle MIME types and binary streams
        res.sendFile(fullPath);
    } else {
        res.status(404).send('File not found');
    }
});

// API: Get Briefs (So we can show available projects even before they start)
app.get('/api/briefs', (req, res) => {
     if (!fs.existsSync(BRIEF_DIR)) return res.json([]);
     const briefs = fs.readdirSync(BRIEF_DIR).filter(f => f.endsWith('.md'));
     res.json(briefs);
});

app.listen(PORT, () => {
    console.log(`Agency API (No-Ledger Mode) running on http://localhost:${PORT}`);
    console.log(`Projects Root: ${PROJECTS_DIR}`);
});
