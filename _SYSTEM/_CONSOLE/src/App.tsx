import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import ReactMarkdown from 'react-markdown'
import { FileText, Folder, CheckCircle, Clock, AlertCircle, Layout, Terminal, Box, Play, Check } from 'lucide-react'
import { fetchLedger, fetchFiles, fetchContent, type FileNode, type Task } from './lib/api'
import clsx from 'clsx'

// --- Types ---
interface Project {
  id: string;
  name: string;
  briefPath: string;
  phase: string;
  tasks: Task[];
  deliverables: FileNode[];
}

// --- Components ---

function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [files, setFiles] = useState<FileNode[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [view, setView] = useState<'hub' | 'docs'>('hub')

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const ledgerText = await fetchLedger()
      const ledgerResult = Papa.parse(ledgerText, { header: true })
      const allTasks = ledgerResult.data as Task[]
      setTasks(allTasks)

      const filesData = await fetchFiles()
      setFiles(filesData)

      // --- Smart Project Grouping ---
      // 1. Identify "Briefs" used in Manager tasks
      const managerTasks = allTasks.filter(t => t.Workstream === 'Management' && t.Inputs && t.Inputs.includes('Brief'))
      
      const derivedProjects: Project[] = managerTasks.map(mt => {
        const briefName = mt.Inputs ? mt.Inputs.split(',').find(s => s.includes('Brief')) || 'Unknown Project' : 'Unknown Project'
        const projectName = briefName.replace(/_/g, ' ').replace('.md', '').replace('Brief', '').trim()
        const pid = mt.TaskID

        // Find all tasks related to this brief (by dependency or input matching)
        // Simple heuristic: Tasks that are chronologically after the manager task OR linked via DependsOn
        const relatedTasks = allTasks.filter(t => {
            // Include the manager task itself
            if(t.TaskID === mt.TaskID) return true
            // If it depends on the manager task (direct or indirect chain would be better, but simple for now)
            return (t.Inputs && t.Inputs.includes(briefName)) || t.DependsOn === mt.TaskID || (t.TaskID > mt.TaskID && t.TaskID < 'TASK-999') // Approximate sequence
        })

        // Find deliverables (files matching project keywords)
        const projectKeywords = projectName.split(' ')
        const projectFiles: FileNode[] = []
        
        const scanFiles = (nodes: FileNode[]) => {
            nodes.forEach(n => {
                if(n.type === 'file') {
                    if(projectKeywords.some(k => n.path.toLowerCase().includes(k.toLowerCase()))) {
                        projectFiles.push(n)
                    }
                } else if (n.children) {
                    scanFiles(n.children)
                }
            })
        }
        scanFiles(filesData)

        // Determine Phase
        const lastDoneTask = relatedTasks.filter(t => t.Status === 'DONE').pop()
        const phase = lastDoneTask ? lastDoneTask.Workstream : 'Initiation'

        return {
           id: pid,
           name: projectName,
           briefPath: briefName,
           phase: phase,
           tasks: relatedTasks,
           deliverables: projectFiles
        }
      })
      
      setProjects(derivedProjects)
      if (!activeProjectId && derivedProjects.length > 0) {
          setActiveProjectId(derivedProjects[derivedProjects.length - 1].id) // Default to latest
      }

    } catch (e) {
      console.error(e)
    }
  }

  const handleFileClick = async (path: string) => {
    setSelectedFile(path)
    try {
      const content = await fetchContent(path)
      setFileContent(content)
      setView('docs')
    } catch (e) {
      setFileContent('Error loading file')
    }
  }

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
                        <div className={clsx("w-2 h-2 rounded-full", p.phase === 'Initiation' ? "bg-yellow-500" : "bg-green-500")} />
                        {p.phase}
                    </div>
                </button>
            ))}
        </div>
        <div className="mt-auto p-4 border-t border-slate-700 text-xs text-slate-500 text-center">
            AGENCY_OS v2.1
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {view === 'hub' && activeProject && (
            <div className="flex-1 overflow-y-auto p-8 space-y-8 animate-in fade-in duration-500">
                {/* Hero */}
                <header className="flex justify-between items-end border-b border-white/5 pb-6">
                    <div>
                        <h2 className="text-4xl font-bold text-white mb-2">{activeProject.name}</h2>
                        <p className="text-slate-400">Current Phase: <span className="text-primary font-bold">{activeProject.phase}</span></p>
                    </div>
                    <div className="flex gap-2">
                        {/* Placeholder for future actions */}
                    </div>
                </header>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left Col: Activity Feed (The Story) */}
                    <div className="lg:col-span-1 space-y-6">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Clock size={16} /> Activity Stream
                        </h3>
                        <div className="relative border-l border-slate-800 ml-3 space-y-8 pb-4">
                            {activeProject.tasks.slice().reverse().map((task, i) => (
                                <div key={task.TaskID} className="ml-6 relative group">
                                    <div className={clsx("absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-slate-900", 
                                        task.Status === 'DONE' ? "bg-green-500" : 
                                        task.Status === 'READY' ? "bg-blue-500" : "bg-slate-700"
                                    )} />
                                    <div className="bg-surface border border-slate-700 p-4 rounded-lg hover:border-primary transition-colors">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-bold text-slate-500">{task.OwnerAgent}</span>
                                            <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded text-slate-400">{task.TaskID}</span>
                                        </div>
                                        <div className="font-medium text-sm text-slate-200 mb-2">{task.Notes || `Working on ${task.Workstream}...`}</div>
                                        
                                        {/* Inputs/Outputs Badges */}
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {task.Inputs && (
                                                <span className="text-[10px] border border-slate-700 px-2 py-1 rounded text-slate-400">
                                                    In: {task.Inputs.split(',')[0]}
                                                </span>
                                            )}
                                             <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded flex items-center gap-1">
                                                    Out: {task.Outputs}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Col: Deliverables Gallery */}
                    <div className="lg:col-span-2 space-y-6">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <CheckCircle size={16} /> Delivered Artifacts
                        </h3>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {activeProject.deliverables.map(file => {
                                const isImage = file.path.match(/\.(png|jpg|jpeg|gif)$/i)
                                return (
                                    <button 
                                        key={file.path}
                                        onClick={() => handleFileClick(file.path)}
                                        className="bg-surface border border-slate-700 rounded-xl overflow-hidden hover:ring-2 ring-primary transition-all text-left flex flex-col h-40 group"
                                    >
                                        {isImage ? (
                                            <div className="flex-1 bg-black/50 relative w-full overflow-hidden">
                                                {/* In a real app we'd serve the image relative to root, simplified here */}
                                                <div className="w-full h-full flex items-center justify-center text-xs text-slate-600 font-mono">
                                                   [IMAGE PREVIEW]
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex-1 bg-slate-800/50 flex items-center justify-center p-4">
                                                <FileText size={32} className="text-slate-600 group-hover:text-primary transition-colors" />
                                            </div>
                                        )}
                                        
                                        <div className="p-3 bg-surface border-t border-slate-700">
                                            <div className="text-xs font-bold truncate text-slate-300 group-hover:text-white">
                                                {file.path.split('/').pop()}
                                            </div>
                                            <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                                {file.path.split('/').slice(-2, -1)[0]}
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}

                            {activeProject.deliverables.length === 0 && (
                                <div className="col-span-full py-12 text-center border border-dashed border-slate-700 rounded-xl">
                                    <p className="text-slate-500">No artifacts detected yet.</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        )}

        {view === 'docs' && activeProject && (
             <DocumentViewer path={selectedFile} content={fileContent} onClose={() => setView('hub')} />
        )}
      </div>
    </div>
  )
}

const DocumentViewer = ({ path, content, onClose }: { path: string | null, content: string, onClose: () => void }) => {
  const isCode = path?.endsWith('.html') || path?.endsWith('.js') || path?.endsWith('.json')
  
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
        <button onClick={onClose} className="text-xs hover:text-white text-slate-400 bg-slate-800 px-3 py-1.5 rounded">Close Viewer</button>
      </div>
      <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full prose prose-invert">
        {isCode ? (
          <pre className="bg-black/50 p-6 rounded-lg overflow-x-auto text-sm font-mono border border-slate-700">
            <code>{content}</code>
          </pre>
        ) : (
          <ReactMarkdown>{content}</ReactMarkdown>
        )}
      </div>
    </div>
  )
}

export default App
