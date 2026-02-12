import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';

// --- CONFIGURATION ---
dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENCY_ROOT = path.resolve(__dirname, '../../');
const BRIEF_DIR = path.join(AGENCY_ROOT, '00_BRIEF');
const LEDGER_PATH = path.join(AGENCY_ROOT, '_SYSTEM/MASTER_STATUS_LEDGER.csv');
const MANAGER_GEM_PATH = path.join(AGENCY_ROOT, '_SYSTEM/PERSONAS/01_MANAGER_GEM.md');

if (!process.env.OPENAI_API_KEY) {
    console.error("❌ CRITICAL: NO API KEY FOUND IN .env");
    process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let isProcessing = false;

// --- UTILS ---
const readLedger = async () => {
    return new Promise((resolve) => {
        const results = [];
        if (!fs.existsSync(LEDGER_PATH)) return resolve([]);
        fs.createReadStream(LEDGER_PATH)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results));
    });
};

const appendToLedger = async (newRows) => {
    // Read existing to get headers
    const existing = await readLedger();
    const headers = Object.keys(existing[0] || {
        TaskID: '', Workstream: '', OwnerAgent: '', Status: '', DependsOn: '', 
        Priority: '', Inputs: '', Outputs: '', QualityGate: '', 
        ContextPackVersion: '', StartedAt: '', CompletedAt: '', RevisionCount: '', BlockerReason: '', Notes: ''
    }).map(id => ({ id, title: id }));

    // Determine next Task ID
    let lastId = 0;
    existing.forEach(row => {
        const match = row.TaskID.match(/TASK-(\d+)/);
        if (match) {
            const num = parseInt(match[1]);
            if (num > lastId) lastId = num;
        }
    });

    // Assign IDs to new rows
    const rowsWithIds = newRows.map((row, index) => ({
        ...row,
        TaskID: `TASK-${String(lastId + index + 1).padStart(3, '0')}`,
        Status: index === 0 ? 'READY' : 'PENDING', // First task is ready, others pending
        StartedAt: '', CompletedAt: '', RevisionCount: '0', BlockerReason: '', Notes: 'Auto-generated from Brief'
    }));

    // Re-write entire file (append is tricky with csv-writer without keeping headers clean)
    const writer = createObjectCsvWriter({
        path: LEDGER_PATH,
        header: headers,
        append: false // Overwrite all
    });

    await writer.writeRecords([...existing, ...rowsWithIds]);
    console.log(`✅ Manager Created ${rowsWithIds.length} new Tasks in Ledger`);
};

// --- CORE LOGIC ---
const processBrief = async (filePath) => {
    console.log(`🧠 MANAGER WAKE UP: Analyzing Brief ${path.basename(filePath)}...`);
    
    // Read the newly added brief
    const briefContent = fs.readFileSync(filePath, 'utf-8');
    const managerPersona = fs.readFileSync(MANAGER_GEM_PATH, 'utf-8');

    const prompt = `
    SYSTEM: ${managerPersona}
    
    TASK: A new project brief has been detected: "${path.basename(filePath)}".
    Analyze the brief and generate a sequential list of tasks for the Agency Swarm to execute.
    
    AGENTS AVAILABLE:
    - Research Agent (Workstream: Research) -> Output: Analysis.md
    - UX Architect (Workstream: Design) -> Output: Wireframes.json
    - UI Designer (Workstream: Design) -> Output: Mockups.png
    - Frontend Engineer (Workstream: Engineering) -> Output: Codebase
    - Backend Engineer (Workstream: Engineering) -> Output: API
    - QA Agent (Workstream: QA) -> Output: Test_Report.md
    
    OUTPUT FORMAT:
    Return ONLY a raw JSON array of objects (no markdown blocks). Each object must look like this:
    {
        "Workstream": "String",
        "OwnerAgent": "String (Must match GEM name exactly)",
        "Priority": "P0/P1",
        "Inputs": "String (Filename)",
        "Outputs": "String (Filename)",
        "DependsOn": "String (TaskID or 'Previous')"
    }
    
    BRIEF CONTENT:
    ${briefContent}
    `;

    try {
        const completion = await openai.chat.completions.create({
            messages: [{ role: "system", content: prompt }],
            model: "gpt-4o",
        });

        let content = completion.choices[0].message.content.trim();
        // cleaning up potential markdown formatting
        if (content.startsWith('```json')) content = content.slice(7);
        if (content.endsWith('```')) content = content.slice(0, -3);
        
        const tasks = JSON.parse(content);
        
        await appendToLedger(tasks);

    } catch (e) {
        console.error("❌ Manager Brain Failed:", e);
    }
};

// --- INIT ---
console.log("👀 MANAGER WATCHER V3 (CLEAN) STARTED");
console.log(`📂 Watching Folder: ${BRIEF_DIR}`);

const watcher = chokidar.watch(BRIEF_DIR, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true // Don't re-process existing files on startup
});

// WATCH FOR ADDS AND CHANGES
const handleFileEvent = async (filePath) => {
    if (isProcessing) return;
    console.log(`📝 Brief Event Detected: ${filePath}`);
    setTimeout(async () => {
        isProcessing = true;
        await processBrief(filePath);
        isProcessing = false;
    }, 2000);
};

watcher.on('add', handleFileEvent);
watcher.on('change', handleFileEvent);
