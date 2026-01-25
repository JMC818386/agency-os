export interface FileNode {
    type: 'file' | 'dir';
    path: string;
    children?: FileNode[];
}

export interface Task {
    TaskID: string;
    Workstream: string;
    OwnerAgent: string;
    Status: string;
    Priority: string;
    Inputs: string;
    Outputs: string;
    QualityGate: string;
    Notes: string;
    ContextPackVersion?: string;
    StartedAt?: string;
    CompletedAt?: string;
    RevisionCount?: string;
    BlockerReason?: string;
    DependsOn?: string;
}

const API_URL = 'http://localhost:3000/api';

export const fetchLedger = async (): Promise<string> => {
    const res = await fetch(`${API_URL}/ledger`);
    return res.text();
};

export const fetchFiles = async (): Promise<FileNode[]> => {
    const res = await fetch(`${API_URL}/files`);
    return res.json();
};

export const fetchContent = async (path: string): Promise<string> => {
    const res = await fetch(`${API_URL}/content?path=${encodeURIComponent(path)}`);
    return res.text();
};
