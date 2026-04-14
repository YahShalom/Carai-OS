import React, { useState, useEffect, useRef } from 'react';
import { Activity, Shield, ShieldAlert, Terminal, Send, Trash2, Zap, Database, Play, UploadCloud, AlertTriangle, Settings, X, Search } from 'lucide-react';

const BACKGROUNDS = [
  { id: 'black', name: 'Jet Black', bg: '#050505', panel: '#111111', border: '#222222' },
  { id: 'blue', name: 'Deep Blue', bg: '#020617', panel: '#0f172a', border: '#1e293b' },
  { id: 'charcoal', name: 'Charcoal', bg: '#171717', panel: '#262626', border: '#404040' },
  { id: 'purple', name: 'Midnight Purple', bg: '#1e1b4b', panel: '#312e81', border: '#4338ca' },
  { id: 'forest', name: 'Forest Green', bg: '#064e3b', panel: '#065f46', border: '#047857' },
  { id: 'slate', name: 'Slate', bg: '#0f172a', panel: '#1e293b', border: '#334155' },
];

const ACCENTS = [
  { id: 'emerald', name: 'Emerald', color: '#10b981', glow: 'rgba(16, 185, 129, 0.2)' },
  { id: 'neon-blue', name: 'Neon Blue', color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.2)' },
  { id: 'pink', name: 'Cyber Pink', color: '#ec4899', glow: 'rgba(236, 72, 153, 0.2)' },
  { id: 'amber', name: 'Amber', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.2)' },
  { id: 'violet', name: 'Violet', color: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.2)' },
  { id: 'crimson', name: 'Crimson', color: '#e11d48', glow: 'rgba(225, 29, 72, 0.2)' },
  { id: 'cyan', name: 'Cyan', color: '#06b6d4', glow: 'rgba(6, 182, 212, 0.2)' },
];

const FONTS = [
  { id: 'modern', name: 'Modern', sans: '"Inter", ui-sans-serif, system-ui, sans-serif', mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace' },
  { id: 'system', name: 'System', sans: 'system-ui, sans-serif', mono: 'ui-monospace, monospace' },
  { id: 'classic', name: 'Classic', sans: '"Helvetica Neue", Helvetica, Arial, sans-serif', mono: '"Courier New", Courier, monospace' },
  { id: 'tech', name: 'Tech', sans: '"Space Grotesk", sans-serif', mono: '"Fira Code", monospace' },
  { id: 'elegant', name: 'Elegant', sans: '"Playfair Display", serif', mono: '"Source Code Pro", monospace' },
  { id: 'brutalist', name: 'Brutalist', sans: '"Archivo Black", sans-serif', mono: '"IBM Plex Mono", monospace' },
];

const CARAI_AUTH_TOKEN = import.meta.env.VITE_CARAI_AUTH_TOKEN;

interface Workflow {
  id: string;
  name: string;
  description: string;
  intent: string;
  tags: string[];
  status: 'Active' | 'Inactive' | 'Failing';
  config: any;
}

type WorkflowStatusFilter = 'All' | 'Active' | 'Inactive' | 'Failing';

interface ExecutionRecord {
  id: string;
  workflowId: string;
  intent: string;
  timestamp: string;
  outcome: 'success' | 'failure';
}

const STATUS_OPTIONS: WorkflowStatusFilter[] = ['All', 'Active', 'Inactive', 'Failing'];

const DEFAULT_WORKFLOWS: Workflow[] = [
  { id: 'AUDIT_WKFL', name: 'System Audit', description: 'Performs a comprehensive security and integrity scan of the Carai OS environment. Alerts administrators if anomalies are detected.', intent: 'EXEC', tags: ['security', 'system'], status: 'Active', config: { deepScan: true, notifyAdmin: true } },
  { id: 'ALL_WKFL', name: 'Get All Workflows', description: 'Retrieves a complete list of all registered workflows within the system. Useful for synchronization and auditing.', intent: 'GET', tags: ['readonly', 'system'], status: 'Active', config: { limit: 100, includeInactive: false } },
  { id: 'RECOVERY_SANDBOX', name: 'Recovery Sandbox', description: 'Initiates a safe, isolated environment for testing critical recovery procedures without affecting production data.', intent: 'TEST', tags: ['testing', 'critical'], status: 'Inactive', config: { isolateEnvironment: true, mockResponses: true } },
  { id: 'PUB_WKFL', name: 'Publish Workflow', description: 'Deploys a staged workflow to the production environment. Requires manual approval if auto-approve is disabled.', intent: 'PUB', tags: ['deployment'], status: 'Active', config: { autoApprove: false, targetEnv: 'production' } },
];

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'request';
  message: string;
  details?: any;
}

export default function App() {
  const [input, setInput] = useState('');
  const [agentResponse, setAgentResponse] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [isArmed, setIsArmed] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [approvalRequest, setApprovalRequest] = useState<{executionId: string, intentDetails: any} | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>(DEFAULT_WORKFLOWS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkflowStatusFilter>('All');
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isEditingWorkflow, setIsEditingWorkflow] = useState(false);
  const [editWorkflowData, setEditWorkflowData] = useState<Workflow | null>(null);
  const [configStr, setConfigStr] = useState('');
  const [executionHistory, setExecutionHistory] = useState<ExecutionRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'workflows' | 'history'>('workflows');
  const [theme, setTheme] = useState({
    bg: BACKGROUNDS[0],
    accent: ACCENTS[0],
    font: FONTS[0]
  });
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('carai-theme');
    if (saved) {
      try {
        setTheme(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-carai-bg', theme.bg.bg);
    root.style.setProperty('--color-carai-panel', theme.bg.panel);
    root.style.setProperty('--color-carai-border', theme.bg.border);
    root.style.setProperty('--color-carai-green', theme.accent.color);
    root.style.setProperty('--color-carai-green-glow', theme.accent.glow);
    root.style.setProperty('--font-sans', theme.font.sans);
    root.style.setProperty('--font-mono', theme.font.mono);
    
    localStorage.setItem('carai-theme', JSON.stringify(theme));
  }, [theme]);

  const addLog = (type: LogEntry['type'], message: string, details?: any) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString().split('T')[1].substring(0, 8),
      type,
      message,
      details
    };
    setLogs(prev => [...prev, newLog]);
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const sendPayload = async (userInput: string) => {
    if (!isArmed) {
      addLog('error', 'System is disarmed. Transmission blocked.');
      return;
    }

    setApprovalRequest(null);
    setIsSending(true);
    const payload = { chatInput: userInput };
    addLog('request', `POST /webhook/carai-controller`, payload);

    try {
      const response = await fetch('https://hooks.carai.agency/webhook/carai-controller', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CARAI-TOKEN': CARAI_AUTH_TOKEN
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = responseText;
      }

      if (response.ok) {
        addLog('success', `Status ${response.status}`, responseData);
        setAgentResponse(typeof responseData === 'string' ? responseData : JSON.stringify(responseData, null, 2));
        if (responseData?.status === 'AWAITING_APPROVAL' && responseData?.executionId) {
          setApprovalRequest({
            executionId: responseData.executionId,
            intentDetails: payload
          });
        } else {
          setApprovalRequest(null);
        }
      } else {
        addLog('error', `Status ${response.status}`, responseData);
        setAgentResponse(`Error: ${response.status}\n${typeof responseData === 'string' ? responseData : JSON.stringify(responseData, null, 2)}`);
      }

      setExecutionHistory(prev => [{
        id: Math.random().toString(36).substring(7),
        workflowId: 'CHAT',
        intent: 'CHAT',
        timestamp: new Date().toISOString().split('T')[1].substring(0, 8),
        outcome: response.ok ? 'success' : 'failure'
      }, ...prev]);
    } catch (error: any) {
      addLog('error', 'Network Error', error.message);
      setAgentResponse(`Network Error: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = () => {
    if (input.trim()) {
      sendPayload(input);
    }
  };

  const handleConfirmApproval = async () => {
    if (!approvalRequest) return;
    
    setIsSending(true);
    addLog('request', `POST /webhook/carai-controller/resume`, { executionId: approvalRequest.executionId });

    try {
      const response = await fetch('https://hooks.carai.agency/webhook/carai-controller/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CARAI-TOKEN': CARAI_AUTH_TOKEN
        },
        body: JSON.stringify({ executionId: approvalRequest.executionId })
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = responseText;
      }

      if (response.ok) {
        addLog('success', `Status ${response.status}`, responseData);
      } else {
        addLog('error', `Status ${response.status}`, responseData);
      }
    } catch (error: any) {
      addLog('error', 'Network Error', error.message);
    } finally {
      setIsSending(false);
      setApprovalRequest(null);
    }
  };

  const handleAbortApproval = () => {
    addLog('info', 'Execution aborted by user.');
    setApprovalRequest(null);
  };

  const handleAddTag = (workflowId: string) => {
    const tag = window.prompt('Enter new tag (e.g., "urgent", "api"):');
    if (tag && tag.trim()) {
      setWorkflows(prev => prev.map(w => w.id === workflowId ? { ...w, tags: [...new Set([...w.tags, tag.trim().toLowerCase()])] } : w));
    }
  };

  const handleRemoveTag = (workflowId: string, tagToRemove: string) => {
    setWorkflows(prev => prev.map(w => w.id === workflowId ? { ...w, tags: w.tags.filter(t => t !== tagToRemove) } : w));
  };

  const filteredWorkflows = workflows.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      w.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'All' || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleQuickAction = (intent: string, workflowId: string = 'SYSTEM', data: any = {}) => {
    const payload = {
      ucip: { id: "CARAI-SYS-01", intent },
      payload: { workflowId, data }
    };
    setInput(JSON.stringify(payload, null, 2));
  };

  const handlePublish = () => {
    const id = window.prompt("Enter Workflow ID to Publish:");
    if (id) {
      handleQuickAction('PUB', id);
    }
  };

  return (
    <div className="min-h-screen bg-carai-bg text-white flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-carai-border bg-carai-panel px-4 py-2 grid grid-cols-3 items-center gap-2 md:flex md:justify-between md:gap-4 md:px-6 md:py-4">
        <div className="col-span-1 flex items-center gap-2 min-w-0">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-carai-green opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-carai-green"></span>
          </div>
          <h1 className="text-[10px] md:text-xl font-mono tracking-widest font-bold text-gray-200 whitespace-nowrap">
            CARAI OS <span className="text-carai-green opacity-70">//</span> CONTROL PLANE
          </h1>
        </div>

        <div className="col-span-1 flex justify-center items-center w-full">
          <div className="w-full max-w-[4.5rem] rounded-3xl border border-carai-border/70 bg-carai-panel/80 p-3 flex justify-center items-center shadow-[0_0_30px_rgba(16,185,129,0.15)] md:max-w-xs md:p-4">
            <Shield
              className="text-carai-green transition-all duration-500 animate-pulse scale-110 md:scale-150 w-12 h-12 md:w-20 md:h-20"
              aria-label="Security Shield"
            />
          </div>
        </div>

        <div className="col-span-1 flex items-center justify-end gap-2 min-w-0 md:gap-4">
          <button
            onClick={() => setIsThemeModalOpen(true)}
            className="text-gray-500 hover:text-carai-green transition-colors"
            title="Theme Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="hidden md:block text-xs font-mono text-gray-500 uppercase tracking-wider">Safety Toggle</span>
            <button
              onClick={() => setIsArmed(!isArmed)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isArmed ? 'bg-red-500/20 border border-red-500/50' : 'bg-carai-border border border-gray-600'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full transition-transform ${isArmed ? 'translate-x-6 bg-red-500' : 'translate-x-1 bg-gray-400'}`} />
            </button>
            {isArmed ? <ShieldAlert className="w-4 h-4 text-red-500" /> : <Shield className="w-4 h-4 text-gray-500" />}
          </div>
          <div className="hidden md:inline-flex font-mono text-xs text-carai-green border border-carai-green/30 bg-carai-green/10 px-3 py-1 rounded">
            SYS.ID: CARAI-SYS-01
          </div>
          {CARAI_AUTH_TOKEN && (
            <Shield className="w-5 h-5 text-[#10b981] rounded-full shadow-[0_0_10px_#10b981]" />
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Column: Controls */}
        <div className="w-2/3 flex flex-col border-r border-carai-border">
          
          {/* Workflows & History Tabs */}
          <div className="h-1/2 flex flex-col border-b border-carai-border">
            <div className="flex border-b border-carai-border bg-carai-panel px-6 pt-4 gap-6 shrink-0">
              <button onClick={() => setActiveTab('workflows')} className={`pb-3 text-xs font-mono uppercase tracking-widest transition-colors ${activeTab === 'workflows' ? 'text-carai-green border-b-2 border-carai-green' : 'text-gray-500 hover:text-gray-300'}`}>
                <Zap className="w-3 h-3 inline mr-2 mb-0.5" /> Intent Dashboard
              </button>
              <button onClick={() => setActiveTab('history')} className={`pb-3 text-xs font-mono uppercase tracking-widest transition-colors ${activeTab === 'history' ? 'text-carai-green border-b-2 border-carai-green' : 'text-gray-500 hover:text-gray-300'}`}>
                <Activity className="w-3 h-3 inline mr-2 mb-0.5" /> Execution History
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6 bg-[#0a0a0a]">
              {activeTab === 'workflows' ? (
                <div className="flex flex-col h-full">
                  <div className="flex gap-3 mb-4 shrink-0">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input 
                        type="text" 
                        placeholder="Search workflows by name, ID, or tag..." 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        className="w-full bg-carai-panel border border-carai-border rounded pl-10 pr-4 py-2 text-xs font-mono text-gray-300 focus:border-carai-green outline-none transition-colors" 
                      />
                    </div>
                    <div className="flex bg-carai-panel border border-carai-border rounded overflow-hidden">
                      {STATUS_OPTIONS.map(status => (
                        <button
                          key={status}
                          onClick={() => setStatusFilter(status)}
                          className={`px-3 py-2 text-xs font-mono transition-colors ${statusFilter === status ? 'bg-carai-green text-black' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 auto-rows-max">
                    {filteredWorkflows.map(w => (
                      <div key={w.id} className="relative border border-carai-border bg-carai-panel p-4 rounded flex flex-col gap-3 hover:border-gray-600 transition-colors group/card">
                        
                        {/* Tooltip */}
                        <div className="absolute z-50 bottom-full left-0 mb-2 w-full bg-black border border-carai-border p-3 rounded shadow-xl opacity-0 invisible group-hover/card:opacity-100 group-hover/card:visible transition-all pointer-events-none">
                          <div className="text-[10px] text-carai-green uppercase tracking-widest mb-1">Configuration</div>
                          <pre className="text-[10px] text-gray-300 font-mono whitespace-pre-wrap">
                            {JSON.stringify(w.config, null, 2)}
                          </pre>
                        </div>

                        <div className="flex justify-between items-start">
                          <div className="cursor-pointer group" onClick={() => setSelectedWorkflow(w)}>
                            <div className="font-bold text-sm text-gray-200 group-hover:text-carai-green transition-colors">{w.name}</div>
                            <div className="text-[10px] text-gray-500 font-mono mt-0.5">{w.id}</div>
                          </div>
                          <button onClick={() => handleQuickAction(w.intent, w.id)} className="text-gray-400 hover:text-carai-green hover:bg-carai-green/10 p-1.5 rounded transition-colors" title="Run Workflow">
                            <Play className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-auto">
                          {w.tags.map(t => (
                            <span key={t} className="text-[10px] bg-black border border-carai-border px-2 py-0.5 rounded flex items-center gap-1 text-gray-400">
                              {t} <X className="w-2.5 h-2.5 cursor-pointer hover:text-red-400 transition-colors" onClick={() => handleRemoveTag(w.id, t)} />
                            </span>
                          ))}
                          <button onClick={() => handleAddTag(w.id)} className="text-[10px] bg-black border border-dashed border-gray-600 px-2 py-0.5 rounded hover:border-carai-green text-gray-500 transition-colors">
                            + Tag
                          </button>
                        </div>
                      </div>
                    ))}
                    {filteredWorkflows.length === 0 && (
                      <div className="col-span-2 text-center py-8 text-gray-500 font-mono text-xs">No workflows found matching "{searchQuery}"</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {executionHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 font-mono text-xs">No execution history available.</div>
                  ) : (
                    executionHistory.map(h => (
                      <div key={h.id} className="flex justify-between items-center border border-carai-border bg-carai-panel p-3 rounded text-xs font-mono">
                        <div className="flex items-center gap-4">
                          <span className="text-gray-500">{h.timestamp}</span>
                          <span className="text-gray-300 cursor-pointer hover:text-carai-green transition-colors" onClick={() => {
                            const w = workflows.find(wk => wk.id === h.workflowId);
                            if (w) setSelectedWorkflow(w);
                          }}>{h.workflowId}</span>
                          <span className="text-carai-green bg-carai-green/10 px-2 py-0.5 rounded">{h.intent}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded ${h.outcome === 'success' ? 'text-carai-green bg-carai-green/10' : 'text-red-500 bg-red-500/10'}`}>
                          {h.outcome.toUpperCase()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Command Console */}
          <div className="flex-1 flex flex-col p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Terminal className="w-3 h-3" /> Command Console
              </h2>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Input natural language intent or raw JSON..."
              className="flex-1 w-full bg-carai-panel border border-carai-border rounded p-4 font-mono text-sm text-gray-300 focus:outline-none focus:border-carai-green focus:ring-1 focus:ring-carai-green resize-none"
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSend}
                disabled={!input.trim() || !isArmed || isSending}
                className={`flex items-center gap-2 px-6 py-3 font-mono text-sm tracking-wider rounded transition-all ${
                  !input.trim() || !isArmed || isSending
                    ? 'bg-carai-border text-gray-500 cursor-not-allowed'
                    : 'bg-carai-green text-black hover:bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                }`}
              >
                {isSending ? <Activity className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {!isArmed ? 'LOCKED' : 'TRANSMIT'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Preview & Logs */}
        <div className="w-1/3 flex flex-col bg-carai-panel">
          
          {/* Agent Response */}
          <div className="flex-1 flex flex-col border-b border-carai-border">
            <div className="p-4 border-b border-carai-border bg-[#0a0a0a]">
              <h2 className="text-xs font-mono text-gray-500 uppercase tracking-widest">Agent Response</h2>
            </div>
            <div className="flex-1 p-4 overflow-auto bg-[#0a0a0a]">
              {agentResponse ? (
                <pre className="font-mono text-xs text-carai-green whitespace-pre-wrap">
                  {agentResponse}
                </pre>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-600 font-mono text-xs">
                  Awaiting response...
                </div>
              )}
            </div>
          </div>

          {/* Response Log */}
          <div className="h-1/3 flex flex-col bg-[#050505]">
            <div className="p-3 border-y border-carai-border bg-carai-panel flex justify-between items-center">
              <h2 className="text-xs font-mono text-gray-500 uppercase tracking-widest">System Logs</h2>
              <button onClick={() => setLogs([])} className="text-gray-500 hover:text-white transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-auto font-mono text-[11px] space-y-2">
              {logs.length === 0 ? (
                <div className="text-gray-600 italic">No logs to display.</div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="border-l-2 pl-2 py-1 border-gray-800">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-500">[{log.timestamp}]</span>
                      <span className={`uppercase tracking-wider ${
                        log.type === 'error' ? 'text-red-500' :
                        log.type === 'success' ? 'text-carai-green' :
                        log.type === 'request' ? 'text-blue-400' : 'text-gray-400'
                      }`}>
                        {log.type}
                      </span>
                      <span className="text-gray-300">{log.message}</span>
                    </div>
                    {log.details && (
                      <div className="text-gray-500 ml-16 whitespace-pre-wrap mt-1">
                        {typeof log.details === 'string' ? log.details : (
                          <div className="bg-black/30 p-2 rounded border border-gray-800/50">
                            {log.details.workflowId && (
                              <button className="text-carai-green hover:underline mb-2 text-[10px] flex items-center gap-1" onClick={() => {
                                const w = workflows.find(wk => wk.id === log.details.workflowId);
                                if (w) setSelectedWorkflow(w);
                              }}>
                                <Database className="w-3 h-3" /> View Workflow: {log.details.workflowId}
                              </button>
                            )}
                            <pre>{JSON.stringify(log.details, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </div>

        </div>
      </main>

      {/* Workflow Details Modal */}
      {selectedWorkflow && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70]">
          <div className="bg-carai-panel border border-carai-border rounded-lg p-6 w-[600px] max-w-[90vw] shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 border-b border-carai-border pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-carai-green" />
                <h2 className="text-lg font-mono font-bold text-gray-200 tracking-widest">
                  {isEditingWorkflow ? 'EDIT WORKFLOW' : 'WORKFLOW DETAILS'}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {!isEditingWorkflow && (
                  <button 
                    onClick={() => { 
                      setEditWorkflowData(selectedWorkflow); 
                      setConfigStr(JSON.stringify(selectedWorkflow.config, null, 2));
                      setIsEditingWorkflow(true); 
                    }} 
                    className="text-gray-400 hover:text-carai-green transition-colors text-xs font-mono px-2 py-1 border border-transparent hover:border-carai-green rounded"
                  >
                    EDIT
                  </button>
                )}
                <button onClick={() => { setSelectedWorkflow(null); setIsEditingWorkflow(false); }} className="text-gray-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {isEditingWorkflow && editWorkflowData ? (
              <div className="space-y-4 font-mono text-sm overflow-auto pr-2">
                <div>
                  <label className="text-gray-500 text-[10px] uppercase tracking-widest mb-1 block">Name</label>
                  <input type="text" value={editWorkflowData.name} onChange={e => setEditWorkflowData({...editWorkflowData, name: e.target.value})} className="w-full bg-black border border-carai-border rounded p-2 text-gray-200 focus:border-carai-green outline-none" />
                </div>
                <div>
                  <label className="text-gray-500 text-[10px] uppercase tracking-widest mb-1 block">Description</label>
                  <textarea value={editWorkflowData.description} onChange={e => setEditWorkflowData({...editWorkflowData, description: e.target.value})} className="w-full bg-black border border-carai-border rounded p-2 text-gray-200 focus:border-carai-green outline-none h-20" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-500 text-[10px] uppercase tracking-widest mb-1 block">Intent</label>
                    <input type="text" value={editWorkflowData.intent} onChange={e => setEditWorkflowData({...editWorkflowData, intent: e.target.value})} className="w-full bg-black border border-carai-border rounded p-2 text-gray-200 focus:border-carai-green outline-none" />
                  </div>
                  <div>
                    <label className="text-gray-500 text-[10px] uppercase tracking-widest mb-1 block">Status</label>
                    <select value={editWorkflowData.status} onChange={e => {
                      const nextStatus = e.target.value as Workflow['status'];
                      setEditWorkflowData({...editWorkflowData, status: nextStatus});
                    }} className="w-full bg-black border border-carai-border rounded p-2 text-gray-200 focus:border-carai-green outline-none">
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Failing">Failing</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-gray-500 text-[10px] uppercase tracking-widest mb-1 block">Tags (comma separated)</label>
                  <input type="text" value={editWorkflowData.tags.join(', ')} onChange={e => setEditWorkflowData({...editWorkflowData, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})} className="w-full bg-black border border-carai-border rounded p-2 text-gray-200 focus:border-carai-green outline-none" />
                </div>
                <div>
                  <label className="text-gray-500 text-[10px] uppercase tracking-widest mb-1 block">Configuration (JSON)</label>
                  <textarea 
                    value={configStr} 
                    onChange={e => setConfigStr(e.target.value)} 
                    className="w-full bg-black border border-carai-border rounded p-2 text-gray-200 focus:border-carai-green outline-none h-32 font-mono text-xs" 
                  />
                </div>
                <div className="mt-6 pt-4 border-t border-carai-border flex justify-end gap-3">
                  <button onClick={() => setIsEditingWorkflow(false)} className="px-4 py-2 border border-gray-600 text-gray-300 rounded hover:bg-gray-800 transition-colors font-mono text-sm">Cancel</button>
                  <button onClick={() => {
                    let parsedConfig = editWorkflowData.config;
                    try {
                      parsedConfig = JSON.parse(configStr);
                    } catch (e) {
                      alert("Invalid JSON in configuration. Please fix before saving.");
                      return;
                    }
                    const finalData = { ...editWorkflowData, config: parsedConfig };
                    setWorkflows(prev => prev.map(w => w.id === finalData.id ? finalData : w));
                    setSelectedWorkflow(finalData);
                    setIsEditingWorkflow(false);
                  }} className="px-4 py-2 bg-carai-green text-black rounded hover:bg-emerald-400 transition-colors font-mono text-sm">Save Changes</button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 font-mono text-sm overflow-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black p-3 rounded border border-carai-border">
                    <div className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Name</div>
                    <div className="text-gray-200">{selectedWorkflow.name}</div>
                  </div>
                  <div className="bg-black p-3 rounded border border-carai-border">
                    <div className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">ID</div>
                    <div className="text-gray-200">{selectedWorkflow.id}</div>
                  </div>
                  <div className="bg-black p-3 rounded border border-carai-border">
                    <div className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Intent</div>
                    <div className="text-carai-green">{selectedWorkflow.intent}</div>
                  </div>
                  <div className="bg-black p-3 rounded border border-carai-border">
                    <div className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Status</div>
                    <div className={`${selectedWorkflow.status === 'Active' ? 'text-carai-green' : selectedWorkflow.status === 'Failing' ? 'text-red-500' : 'text-gray-400'}`}>
                      {selectedWorkflow.status}
                    </div>
                  </div>
                  <div className="col-span-2 bg-black p-3 rounded border border-carai-border">
                    <div className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Description</div>
                    <div className="text-gray-300 text-xs leading-relaxed">{selectedWorkflow.description}</div>
                  </div>
                </div>

                <div>
                  <div className="text-gray-500 text-[10px] uppercase tracking-widest mb-2">Tags</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedWorkflow.tags.length > 0 ? selectedWorkflow.tags.map(t => (
                      <span key={t} className="text-xs bg-black border border-carai-border px-2 py-1 rounded text-gray-400">
                        {t}
                      </span>
                    )) : <span className="text-gray-600 text-xs italic">No tags assigned</span>}
                  </div>
                </div>

                <div>
                  <div className="text-gray-500 text-[10px] uppercase tracking-widest mb-2">Configurations</div>
                  <pre className="bg-black p-3 rounded border border-carai-border text-xs text-gray-300 overflow-auto">
                    {JSON.stringify(selectedWorkflow.config, null, 2)}
                  </pre>
                </div>

                <div>
                  <div className="text-gray-500 text-[10px] uppercase tracking-widest mb-2">Recent Activity</div>
                  <div className="bg-black rounded border border-carai-border text-xs text-gray-300 overflow-hidden">
                    {executionHistory.filter(h => h.workflowId === selectedWorkflow.id).length > 0 ? (
                      <div className="max-h-40 overflow-auto">
                        {executionHistory.filter(h => h.workflowId === selectedWorkflow.id).map((h, i) => (
                          <div key={h.id} className={`flex justify-between p-3 ${i !== 0 ? 'border-t border-gray-800' : ''}`}>
                            <span className="text-gray-500">{h.timestamp}</span>
                            <span className={h.outcome === 'success' ? 'text-carai-green' : 'text-red-500'}>{h.outcome.toUpperCase()}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-600 italic">No recent activity recorded.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {!isEditingWorkflow && (
              <div className="mt-6 pt-4 border-t border-carai-border flex justify-end">
                <button 
                  onClick={() => {
                    handleQuickAction(selectedWorkflow.intent, selectedWorkflow.id);
                    setSelectedWorkflow(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-carai-green text-black rounded hover:bg-emerald-400 transition-colors font-mono text-sm"
                >
                  <Play className="w-4 h-4" /> Run Workflow
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Theme Modal */}
      {isThemeModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-carai-panel border border-carai-border rounded-lg p-6 w-96 max-w-[90vw] shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-mono font-bold text-gray-200">THEME SETTINGS</h2>
              <button onClick={() => setIsThemeModalOpen(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Backgrounds */}
            <div className="mb-6">
              <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Background</h3>
              <div className="grid grid-cols-3 gap-2">
                {BACKGROUNDS.map(bg => (
                  <button 
                    key={bg.id}
                    onClick={() => setTheme({...theme, bg})}
                    className={`p-2 rounded border ${theme.bg.id === bg.id ? 'border-carai-green' : 'border-carai-border'} hover:border-gray-400 transition-colors flex flex-col items-center gap-2`}
                    style={{ backgroundColor: bg.bg }}
                  >
                    <div className="w-full h-6 rounded border border-carai-border" style={{ backgroundColor: bg.panel }}></div>
                    <span className="text-[10px] font-mono text-gray-300">{bg.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Accents */}
            <div className="mb-6">
              <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Accent Color</h3>
              <div className="flex gap-3">
                {ACCENTS.map(acc => (
                  <button 
                    key={acc.id}
                    onClick={() => setTheme({...theme, accent: acc})}
                    className={`w-8 h-8 rounded-full border-2 ${theme.accent.id === acc.id ? 'border-white' : 'border-transparent'} transition-all`}
                    style={{ backgroundColor: acc.color, boxShadow: theme.accent.id === acc.id ? `0 0 10px ${acc.glow}` : 'none' }}
                    title={acc.name}
                  />
                ))}
              </div>
            </div>

            {/* Fonts */}
            <div className="mb-6">
              <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Typography</h3>
              <div className="flex flex-col gap-2">
                {FONTS.map(f => (
                  <button 
                    key={f.id}
                    onClick={() => setTheme({...theme, font: f})}
                    className={`p-3 rounded border text-left ${theme.font.id === f.id ? 'border-carai-green text-carai-green' : 'border-carai-border text-gray-400'} hover:border-gray-400 transition-colors`}
                    style={{ fontFamily: f.sans }}
                  >
                    <span className="text-sm font-medium">{f.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {approvalRequest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-[#110000] border border-red-500/50 rounded-lg p-6 w-[500px] max-w-[90vw] shadow-[0_0_30px_rgba(239,68,68,0.3)]">
            <div className="flex items-center gap-3 mb-6 border-b border-red-500/30 pb-4">
              <AlertTriangle className="w-6 h-6 text-red-500 animate-pulse" />
              <h2 className="text-lg font-mono font-bold text-red-500 tracking-widest">AUTHORIZATION REQUIRED</h2>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-300 mb-2 font-mono">High-privilege action detected. Please confirm execution details:</p>
              <div className="bg-black/50 border border-red-500/20 p-4 rounded overflow-auto max-h-48">
                <pre className="font-mono text-xs text-orange-400 whitespace-pre-wrap">
                  {JSON.stringify(approvalRequest.intentDetails, null, 2)}
                </pre>
              </div>
              <div className="mt-3 text-xs font-mono text-gray-500">
                Execution ID: <span className="text-gray-400">{approvalRequest.executionId}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={handleAbortApproval}
                className="flex-1 py-3 font-mono text-sm tracking-wider rounded border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors"
              >
                ❌ ABORT
              </button>
              <button 
                onClick={handleConfirmApproval}
                className="flex-1 py-3 font-mono text-sm tracking-wider rounded bg-red-600 text-white hover:bg-red-500 shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all"
              >
                ✅ CONFIRM EXECUTION
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
