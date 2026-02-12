import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';
import chokidar from 'chokidar';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

// --- CONFIGURATION ---
dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENCY_ROOT = path.resolve(__dirname, '../../');
const LEDGER_PATH = path.join(AGENCY_ROOT, '_SYSTEM/MASTER_STATUS_LEDGER.csv');
const PERSONAS_DIR = path.join(AGENCY_ROOT, '_SYSTEM/PERSONAS');
const PROJECTS_ROOT = path.join(AGENCY_ROOT, 'PROJECTS');

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

const writeLedger = async (data) => {
    const headers = Object.keys(data[0] || {}).map(id => ({ id, title: id }));
    const writer = createObjectCsvWriter({
        path: LEDGER_PATH,
        header: headers
    });
    await writer.writeRecords(data);
};

const findPersonaForAgent = (agentName) => {
    if (!fs.existsSync(PERSONAS_DIR)) return null;
    const files = fs.readdirSync(PERSONAS_DIR);
    const match = files.find(f => f.toLowerCase().includes(agentName.toLowerCase().split(' ')[0]));
    return match ? path.join(PERSONAS_DIR, match) : null;
};

// --- CORE ENGINE ---

// UPDATED DEPENDENCY LOGIC (V5)
const getDependencyId = (taskId, dependsOn, allTasks = []) => {
    if (!dependsOn || dependsOn.toLowerCase() === 'none') return null;
    
    // 1. Check "Previous" keyword
    if (dependsOn.toLowerCase() === 'previous') {
        const currentNum = parseInt(taskId.split('-')[1]);
        return `TASK-${String(currentNum - 1).padStart(3, '0')}`;
    }

    // 2. Check "ID" format (TASK-001)
    if (dependsOn.startsWith('TASK-')) return dependsOn;

    // 3. Check "Filename" format (Analysis.md)
    if (allTasks && allTasks.length > 0) {
        const producer = allTasks.find(t => t.Outputs === dependsOn);
        if (producer) return producer.TaskID;
    }

    return null; 
};

const processTask = async (task) => {
    console.log(`🤖 AGENT WAKE UP: [${task.OwnerAgent}] Processing ${task.TaskID}...`);
    
    // Determine Project Name from Inputs
    let projectName = "Unknown_Project";
    if (task.Inputs.includes("Brief.md")) {
        projectName = task.Inputs.replace('00_BRIEF/', '').split('_Brief')[0]; 
    } else {
        const found = glob.sync(`${PROJECTS_ROOT}/**/${task.Inputs}`);
        if (found.length > 0) {
           projectName = path.relative(PROJECTS_ROOT, found[0]).split(path.sep)[0];
        } else {
             const dirs = fs.readdirSync(PROJECTS_ROOT);
             for (const d of dirs) {
                 if (fs.existsSync(path.join(PROJECTS_ROOT, d, task.Inputs))) {
                     projectName = d;
                     break;
                 }
             }
        }
    }
    
    const projectDir = path.join(PROJECTS_ROOT, projectName);
    if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true });

    // 1. Load Persona
    const personaPath = findPersonaForAgent(task.OwnerAgent);
    if (!personaPath) {
        console.error(`❌ ERROR: No Persona found for ${task.OwnerAgent}`);
        return false;
    }
    const persona = fs.readFileSync(personaPath, 'utf-8');

    // 2. Load Inputs
    let inputContext = "";
    const inputFiles = task.Inputs.split(',').map(s => s.trim());
    
    for (const f of inputFiles) {
        let p = path.join(projectDir, f);
        if (!fs.existsSync(p)) p = path.join(AGENCY_ROOT, '00_BRIEF', f);
        if (fs.existsSync(p)) {
            inputContext += `\n--- FILE: ${f} ---\n${fs.readFileSync(p, 'utf-8')}\n`;
        }
    }

    // 3. Construct Prompt
    const prompt = `
    SYSTEM INSTRUCTION (YOUR PERSONA):
    ${persona}

    TASK CONTEXT:
    Project: ${projectName}
    Task: ${task.Notes || "Execute work."}
    
    INPUT DATA:
    ${inputContext}
    
    OUTPUT REQUIREMENT:
    Generate content for: ${task.Outputs}.
    Return ONLY the file content.
    `;

    // 4. Call OpenAI
    try {
        const completion = await openai.chat.completions.create({
            messages: [{ role: "system", content: prompt }],
            model: "gpt-4o",
        });

        const outputContent = completion.choices[0].message.content;

        // 5. Save Output
        const outputPath = path.join(projectDir, task.Outputs);
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        fs.writeFileSync(outputPath, outputContent);
        
        console.log(`✅ SUCCESS: Created ${projectName}/${task.Outputs}`);
        return true;

    } catch (e) {
        console.error(`❌ API ERROR: ${e.message}`);
        return false;
    }
};

const runCycle = async () => {
    if (isProcessing) return;
    isProcessing = true;

    try {
        const ledger = await readLedger();
        let ledgerUpdated = false;

        // Find next READY task
        let task = ledger.find(t => t.Status === 'READY');
        
        // OR Find PENDING task whose dependency is DONE
        if (!task) {
             ledger.forEach(t => {
                if (t.Status === 'PENDING') {
                    // PASS THE FULL LEDGER TO getDependencyId
                    const depId = getDependencyId(t.TaskID, t.DependsOn, ledger);
                    if (depId) {
                        const parent = ledger.find(p => p.TaskID === depId);
                        if (parent && parent.Status === 'DONE') {
                            t.Status = 'READY';
                            ledgerUpdated = true; 
                        }
                    } else if (!depId && t.Priority === 'P0') {
                        // Edge case: if dependency is invalid or missing, but it's P0, maybe just run it?
                        // Better to be safe and wait, but for now we assume dependency resolution works.
                    }
                }
             });
             // Re-fetch the first READY one if we just updated some
             if (ledgerUpdated) task = ledger.find(t => t.Status === 'READY');
        }

        if (task) {
            const success = await processTask(task);
            if (success) {
                task.Status = 'DONE';
                task.CompletedAt = new Date().toISOString();
                ledgerUpdated = true;
            }
        }

        if (ledgerUpdated) {
            await writeLedger(ledger);
        }

    } catch (e) {
        console.error("Cycle Error:", e);
    } finally {
        isProcessing = false;
    }
};

// --- INIT ---
console.log("🚀 AGENCY SWARM ENGINE V5 (SMART DEPENDENCIES) STARTED");
console.log(`📂 Watching: ${LEDGER_PATH}`);

runCycle();

chokidar.watch(LEDGER_PATH).on('change', () => {
    setTimeout(runCycle, 1000);
});
