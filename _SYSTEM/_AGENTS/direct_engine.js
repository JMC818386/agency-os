import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import https from 'https';

// --- CONFIGURATION ---
dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENCY_ROOT = path.resolve(__dirname, '../../');
const BRIEF_DIR = path.join(AGENCY_ROOT, '00_BRIEF');
const PROJECTS_ROOT = path.join(AGENCY_ROOT, 'PROJECTS');
const PERSONAS_DIR = path.join(AGENCY_ROOT, '_SYSTEM/PERSONAS');

if (!process.env.OPENAI_API_KEY) {
    console.error("❌ CRITICAL: NO API KEY FOUND IN .env");
    process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let isProcessing = false;

// --- UTILS ---
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getPersona = (filename) => {
    const p = path.join(PERSONAS_DIR, filename);
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf-8');
    return "You are a generic helpful assistant.";
};

const updateStatus = (projectDir, step, status, details = "") => {
    const statusFile = path.join(projectDir, 'status.json');
    const data = {
        currentStep: step,
        status: status, // "running", "completed", "pending"
        details: details,
        lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(statusFile, JSON.stringify(data, null, 2));
};

// --- IMAGE GENERATION (DALL-E 3) ---
const generateImage = async (prompt, outputPath) => {
    try {
        console.log(`🎨 Generating Image: "${prompt.substring(0, 50)}..."`);
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024",
            response_format: "url", 
        });

        const imageUrl = response.data[0].url;
        if (!imageUrl) throw new Error("No URL returned");

        // Download Image
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(outputPath);
            https.get(imageUrl, function(response) {
                response.pipe(file);
                file.on('finish', function() {
                    file.close(() => {
                        console.log(`✅ Image Saved: ${path.basename(outputPath)}`);
                        resolve(true);
                    });
                });
            }).on('error', function(err) {
                fs.unlink(outputPath, () => {}); // Delete failed file
                reject(err);
            });
        });

    } catch (e) {
        console.error(`❌ Image Gen Failed: ${e.message}`);
        fs.writeFileSync(outputPath + '.error.txt', `Failed to gen image: ${e.message}`);
        return false;
    }
};

const callAgent = async (systemPrompt, userPrompt) => {
    try {
        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            model: "gpt-4o",
        });
        return completion.choices[0].message.content;
    } catch (e) {
        console.error(`❌ Agent Failed: ${e.message}`);
        return "Error generating content.";
    }
};

// --- EXECUTION PIPELINE ---
const runPipeline = async (briefPath) => {
    const briefName = path.basename(briefPath);
    console.log(`\n🚀 NEW JOB DETECTED: ${briefName} (Full Visual Pipeline)`);
    
    // 1. Setup Project Folder
    const projectName = briefName.replace('_Brief.md', '').replace('_Brief', '').replace('.md', '').trim();
    const projectDir = path.join(PROJECTS_ROOT, projectName.replace(/ /g, '_')); 
    
    if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true });
    
    // Copy Brief
    fs.copyFileSync(briefPath, path.join(projectDir, '00_Original_Brief.md'));

    // --- STEP 1: RESEARCH ---
    updateStatus(projectDir, "Research", "running", "Deep Analysis & Strategy...");
    console.log(`🔍 [Research Agent] Analyzing Brief...`);
    const researchOutput = await callAgent(
        getPersona('02_RESEARCH_GEM.md'),
        `Analyze this project brief deeply. Output a comprehensive 'Analysis.md'.\n\nBRIEF:\n${fs.readFileSync(briefPath, 'utf-8')}`
    );
    fs.writeFileSync(path.join(projectDir, 'Analysis.md'), researchOutput);
    console.log(`✅ [Research Agent] Analysis.md Created.`);
    
    updateStatus(projectDir, "Research", "completed", "Strategy Defined.");
    await wait(1000); 

    // --- STEP 2: UX DESIGN (VISUALIZED) ---
    updateStatus(projectDir, "Design", "running", "Generating UX Infographics...");
    console.log(`Themes [UX Architect] Creating Visual Artifacts...`);
    
    // 2a. Persona Infographic (Instead of text)
    const personaPrompt = await callAgent(
        getPersona('03_UX_DESIGN_GEM.md'),
        `Create a DALL-E 3 prompt for a "Detailed User Persona INFOGRAPHIC".
         Visual style: Modern, Flat Vector.
         Content: Photo of persona, bio stats, goals/frustrations bars.
         Project Context: ${researchOutput}
         Return ONLY prompt.`
    );
    await generateImage(personaPrompt, path.join(projectDir, 'Persona_Infographic.png'));

    // 2b. User Flow Diagram (Visual)
    const flowPrompt = await callAgent(
        getPersona('03_UX_DESIGN_GEM.md'),
        `Create a DALL-E 3 prompt for a "User Flow Chart Diagram".
         Visual style: Clean isometric flowchart, connected nodes.
         Project Context: ${researchOutput}
         Return ONLY prompt.`
    );
    await generateImage(flowPrompt, path.join(projectDir, 'User_Flow_Chart.png'));

    // 2c. Journey Map (Visual)
    const journeyPrompt = await callAgent(
        getPersona('03_UX_DESIGN_GEM.md'),
        `Create a DALL-E 3 prompt for a "Customer Journey Map Infographic".
         Visual style: Horizontal timeline, emotional curve line, key touchpoint icons.
         Project Context: ${researchOutput}
         Return ONLY prompt.`
    );
    await generateImage(journeyPrompt, path.join(projectDir, 'Journey_Map_Infographic.png'));

    // 2d. Wireframes (JSON - Still keep data)
    const uxOutput = await callAgent(
        getPersona('03_UX_DESIGN_GEM.md'),
        `Create a structural wireframe JSON for the application.\n\nANALYSIS:\n${researchOutput}`
    );
    fs.writeFileSync(path.join(projectDir, 'Wireframes.json'), uxOutput);
    console.log(`✅ [UX Architect] UX Visuals Created.`);

    updateStatus(projectDir, "Design", "completed", "UX Visuals Ready.");
    await wait(1000);

    // --- STEP 3: CREATIVE DIRECTOR (Visual Assets - Multi-Device) ---
    updateStatus(projectDir, "UI", "running", "Visual Design & Image Generation...");

    console.log(`🖌️ [Creative Director] Designing Brand Assets...`);
    
    // 3a. Generate Logo
    const logoPrompt = await callAgent(
        getPersona('04_UI_DESIGN_GEM.md'),
        `Create a DALL-E 3 prompt for a modern LOGO for this project. Minimalist, Vector.\nPROJECT: ${researchOutput}\nReturn ONLY prompt.`
    );
    await generateImage(logoPrompt, path.join(projectDir, 'Logo.png'));

    // 3b. Desktop Mockup
    const desktopPrompt = await callAgent(
        getPersona('04_UI_DESIGN_GEM.md'),
        `Create a DALL-E 3 prompt for a DESKTOP WEB UI Mockup (1920x1080 style) for the Landing Page. Modern, Clean, High Fidelity.\nPROJECT: ${researchOutput}\nReturn ONLY prompt.`
    );
    await generateImage(desktopPrompt, path.join(projectDir, 'Mockup_Desktop.png'));

    // 3c. Tablet Mockup
    const tabletPrompt = await callAgent(
        getPersona('04_UI_DESIGN_GEM.md'),
        `Create a DALL-E 3 prompt for a TABLET UI Mockup (iPad Pro style). Responsive layout shown on tablet.\nPROJECT: ${researchOutput}\nReturn ONLY prompt.`
    );
    await generateImage(tabletPrompt, path.join(projectDir, 'Mockup_Tablet.png'));

    // 3d. Mobile Mockup
    const mobilePrompt = await callAgent(
        getPersona('04_UI_DESIGN_GEM.md'),
        `Create a DALL-E 3 prompt for a MOBILE APP UI Mockup (iPhone 15 style). Mobile optimized layout.\nPROJECT: ${researchOutput}\nReturn ONLY prompt.`
    );
    await generateImage(mobilePrompt, path.join(projectDir, 'Mockup_Mobile.png'));

    updateStatus(projectDir, "UI", "completed", "Visual Assets Generated.");
    await wait(1000);

    // --- STEP 4: ENGINEERING ---
    updateStatus(projectDir, "Engineering", "running", "Frontend Engineer Coding App Structure...");
    console.log(`💻 [Frontend Engineer] Generating Core Codebase...`);
    const feOutput = await callAgent(
        getPersona('05_FRONTEND_GEM.md'),
        `Generate the core React component structure for this project based on the wireframes.\n\nWIREFRAMES:\n${uxOutput}`
    );
    fs.writeFileSync(path.join(projectDir, 'App_Structure.jsx'), feOutput);
    console.log(`✅ [Frontend Engineer] App_Structure.jsx Created.`);

    updateStatus(projectDir, "Engineering", "completed", "Codebase Generated.");
    await wait(1000);
    updateStatus(projectDir, "Done", "completed", "Project Pipeline Complete.");

    console.log(`🎉 PROJECT [${projectName}] PIPELINE COMPLETE.\n`);
};

// --- WATCHER ---
console.log("👀 DIRECT EXECUTION ENGINE STARTED (Visual UX/UI Mode)");
console.log(`📂 Watching: ${BRIEF_DIR}`);

const watcher = chokidar.watch(BRIEF_DIR, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: false 
});

const handleFile = async (filePath) => {
    if (!filePath.endsWith('.md')) return;

    if (isProcessing) {
        console.log(`⏳ Busy, queuing ${path.basename(filePath)}...`);
        setTimeout(() => handleFile(filePath), 5000);
        return;
    }

    isProcessing = true;
    try {
        await runPipeline(filePath);
    } catch (e) {
        console.error("Pipeline Error:", e);
    } finally {
        isProcessing = false;
    }
};

watcher.on('add', handleFile);
watcher.on('change', handleFile);
