import { useEffect, useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { FileText, Folder, CheckCircle, Clock, AlertCircle, Layout, Terminal, Box, Play, Check, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { X } from 'lucide-react'

// --- Simplified API Calls ---
const API_URL = 'http://localhost:3000/api';

export interface FileNode {
    type: 'file' | 'directory';
    path: string;
    children?: FileNode[];
    size?: number;
    mtime?: string;
}

const fetchFiles = async (): Promise<FileNode[]> => {
    try {
        const res = await fetch(`${API_URL}/files`);
        if (!res.ok) return [];
        return res.json();
    } catch (e) {
        console.error("Fetch files error", e);
        return [];
    }
}

const fetchContent = async (path: string): Promise<string> => {
    const res = await fetch(`${API_URL}/content?path=${encodeURIComponent(path)}`);
    if (!res.ok) throw new Error('Failed to fetch content');
    return res.text();
}

// --- Simplified Types ---
interface Project {
  id: string; // The Folder Name
  name: string; // Human Readable
  phase: string;
  files: FileNode[]; // Direct list of files
  status: 'active' | 'complete';
  pipelineStatus?: any; // Live status JSON
}

function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [view, setView] = useState<'hub' | 'docs'>('hub')

  // Ref to track if we've done initial selection
  const hasInitializedSelection = useRef(false);

  // Fast Poll for Live Status
  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 2000) // 2s poll for snappy updates
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const fileTree = await fetchFiles()
      
      // Derive Projects from Top-Level Folders in PROJECTS/
      const derivedProjects: Project[] = await Promise.all(fileTree
        .filter(node => node.type === 'directory') 
        .map(async folder => {
            const folderName = folder.path; // e.g. "UPS_Logistics"
            const niceName = folderName.replace(/_/g, ' ');
            const files = folder.children || [];
            
            // Check for status.json safely
            let pipelineStatus = null;
            const statusFile = files.find(f => f.path.endsWith('status.json'));
            if(statusFile) {
                try {
                    const res = await fetch(`${API_URL}/content?path=${encodeURIComponent(statusFile.path)}`);
                    if (res.ok) {
                        const jsonText = await res.text();
                        pipelineStatus = JSON.parse(jsonText);
                    }
                } catch(e) { /* ignore */ }
            }

            // Determine Phase if no live status
            let phase = 'Initiation';
            if (pipelineStatus) {
                phase = pipelineStatus.currentStep || 'Processing';
            } else {
                if (files.some(f => f.path.includes('App_Structure') || f.path.includes('Codebase'))) phase = 'Engineering';
                else if (files.some(f => f.path.includes('Mockups'))) phase = 'Design';
                else if (files.some(f => f.path.includes('Analysis'))) phase = 'Planning';
            }

            return {
                id: folderName,
                name: niceName,
                phase: phase,
                files: files,
                status: 'active',
                pipelineStatus
            };
        }));
      
      // Sort projects to stabilize order
      derivedProjects.sort((a, b) => a.name.localeCompare(b.name));

      setProjects(derivedProjects);

      // --- CLEAN SELECTION LOGIC ---
      // Only runs ONCE on first successful data load
      if (!hasInitializedSelection.current && derivedProjects.length > 0) {
          setActiveProjectId(derivedProjects[0].id);
          hasInitializedSelection.current = true;
      }

    } catch (e) {
      console.error(e)
    }
  }

  const handleFileClick = async (path: string) => {
    console.log("Clicked:", path);
    setSelectedFile(path)
    
    // IMAGE HANDLING: Don't load as text
    const isImage = path.toLowerCase().match(/\.(png|jpg|jpeg|gif)$/);
    if (isImage) {
        console.log("Image Detected. Rendering directly.");
        setFileContent(''); // Clear any dirty state
        setView('docs');
        return;
    }

    try {
      const content = await fetchContent(path)
      setFileContent(content)
      setView('docs')
    } catch (e) {
      setFileContent('Error loading file')
    }
  }

  // Find active project manually
  const activeProject = projects.find(p => p.id === activeProjectId)

  return (
    <div className="flex h-screen bg-background text-indigo-50 font-sans overflow-hidden">
      {/* Sidebar: Project Browser */}
      <div className="w-64 bg-surface border-r border-slate-700 flex flex-col h-full">
        <div className="p-6 border-b border-slate-700 flex items-center gap-2">
           <Box className="text-primary" />
           <h1 className="font-bold text-lg tracking-wider">PROJECTS</h1>
        </div>
        <div className="p-4 space-y-2">
            {projects.map(p => (
                <button
                    key={p.id}
                    onClick={() => { setActiveProjectId(p.id); setView('hub') }}
                    className={clsx("w-full text-left p-3 rounded-xl transition-all border",
                        activeProjectId === p.id 
                        ? "bg-slate-800 border-primary shadow-lg shadow-primary/10" 
                        : "border-transparent hover:bg-slate-800 text-slate-400 hover:text-white"
                    )}
                >
                    <div className="font-bold text-sm mb-1">{p.name}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        {p.pipelineStatus?.status === 'running' ? (
                            <Loader2 size={12} className="animate-spin text-blue-400" />
                        ) : (
                            <div className={clsx("w-2 h-2 rounded-full", "bg-green-500")} />
                        )}
                        {p.phase}
                    </div>
                </button>
            ))}
        </div>
        <div className="mt-auto p-4 border-t border-slate-700 text-xs text-slate-500 text-center">
            AGENCY_OS v4.1 (Clean Image Handler)
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {activeProject ? (
           view === 'hub' ? (
            <div className="flex-1 overflow-y-auto p-8 space-y-8 animate-in fade-in duration-500">
                {/* Hero */}
                <header className="flex justify-between items-end border-b border-white/5 pb-6">
                    <div>
                        <h2 className="text-4xl font-bold text-white mb-2">{activeProject.name}</h2>
                        
                        {/* LIVE PIPELINE STATUS */}
                        {activeProject.pipelineStatus && (
                            <div className="mt-4 flex items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                <div className="flex items-center gap-3">
                                   <div className={clsx("w-3 h-3 rounded-full", 
                                       activeProject.pipelineStatus.status === 'running' ? "bg-blue-500 animate-pulse" : "bg-green-500"
                                   )} />
                                   <div className="flex flex-col">
                                       <span className="text-xs text-slate-400 uppercase tracking-widest">Active Process</span>
                                       <span className="font-bold text-white">{activeProject.pipelineStatus.details || activeProject.pipelineStatus.currentStep}</span>
                                   </div>
                                </div>
                                
                                {/* Pipeline Steps Viz */}
                                <div className="ml-auto flex items-center gap-2">
                                    {['Research', 'Design', 'UI', 'Engineering', 'Done'].map((step, i) => {
                                        const currentStepIndex = ['Research', 'Design', 'UI', 'Engineering', 'Done'].indexOf(activeProject.pipelineStatus.currentStep);
                                        const isCompleted = i < currentStepIndex || activeProject.pipelineStatus.currentStep === 'Done';
                                        const isActive = step === activeProject.pipelineStatus.currentStep && activeProject.pipelineStatus.currentStep !== 'Done';
                                        
                                        return (
                                            <div key={step} className="flex items-center">
                                                <div className={clsx("px-3 py-1 rounded text-xs font-bold transition-all",
                                                    isCompleted ? "bg-green-900/50 text-green-400 border border-green-800" :
                                                    isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105" :
                                                    "bg-slate-800 text-slate-600"
                                                )}>
                                                    {step}
                                                </div>
                                                {i < 4 && <div className={clsx("w-4 h-0.5 mx-1", isCompleted ? "bg-green-800" : "bg-slate-800")} />}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                {/* Main Grid: Artifacts */}
                <div className="space-y-6">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Folder size={16} /> Project Artifacts
                    </h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {activeProject.files.map(file => {
                            if (file.type === 'directory' || file.path.endsWith('status.json')) return null; 

                            const isImage = file.path.match(/\.(png|jpg|jpeg|gif)$/i)
                            // Clean up display name
                            const displayName = file.path.split('/').pop().replace(/_/g, ' ');
                            const imageUrl = `${API_URL}/content?path=${encodeURIComponent(file.path)}`;

                            return (
                                <button 
                                    key={file.path}
                                    onClick={() => handleFileClick(file.path)}
                                    className="bg-surface border border-slate-700 rounded-xl overflow-hidden hover:ring-2 ring-primary transition-all text-left flex flex-col h-40 group animate-in zoom-in-95 duration-300"
                                >
                                    {isImage ? (
                                        <div className="flex-1 bg-black/50 relative w-full overflow-hidden">
                                           <img 
                                                src={imageUrl} 
                                                alt={displayName} 
                                                className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                                                loading="lazy"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex-1 bg-slate-800/50 flex items-center justify-center p-4">
                                            <FileText size={32} className="text-slate-600 group-hover:text-primary transition-colors" />
                                        </div>
                                    )}
                                    
                                    <div className="p-3 bg-surface border-t border-slate-700">
                                        <div className="text-xs font-bold truncate text-slate-300 group-hover:text-white">
                                            {displayName}
                                        </div>
                                        <div className="text-[10px] text-slate-500 truncate mt-0.5 uppercase">
                                            {isImage ? 'IMAGE' : 'FILE'}
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>

            </div>
           ) : (
             <DocumentViewer path={selectedFile} content={fileContent} onClose={() => setView('hub')} />
           )
        ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
                <div className="text-center">
                    <Box size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No Project Selected</p>
                </div>
            </div>
        )}
      </div>
    </div>
  )
}

const DocumentViewer = ({ path, content, onClose }: { path: string | null, content: string, onClose: () => void }) => {
  const isImage = path?.match(/\.(png|jpg|jpeg|gif)$/i);
  const isCode = path?.endsWith('.html') || path?.endsWith('.js') || path?.endsWith('.json') || path?.endsWith('.jsx');
  
  const imageUrl = path ? `${API_URL}/content?path=${encodeURIComponent(path)}` : '';

  return (
    <div className="absolute inset-0 z-50 bg-background flex flex-col animate-in slide-in-from-bottom duration-300">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-surface w-full">
        <h3 className="font-mono text-sm text-primary flex items-center gap-2">
            <button onClick={onClose} className="hover:text-white flex items-center gap-1">
                <Layout size={14} /> Back to Project
            </button>
            <span className="text-slate-600">/</span>
            {path?.split('/').pop()}
        </h3>
        <button onClick={onClose} className="text-xs hover:text-white text-slate-400 bg-slate-800 px-3 py-1.5 rounded flex items-center gap-1">
            <X size={14} /> Close Viewer
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full prose prose-invert flex items-center justify-center">
        {isImage ? (
            <img src={imageUrl} alt="Asset" className="max-w-full max-h-full rounded-lg shadow-2xl" />
        ) : isCode ? (
          <pre className="bg-black/50 p-6 rounded-lg overflow-x-auto text-sm font-mono border border-slate-700 w-full">
            <code>{content}</code>
          </pre>
        ) : (
          <div className="w-full h-full">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
