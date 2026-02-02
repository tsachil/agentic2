import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLogs, getAgents } from '../api/client';
import type { AgentExecutionLog, Agent } from '../api/client';
import { useNotification } from '../context/NotificationContext';
import { format } from 'date-fns';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ConstructionIcon from '@mui/icons-material/Construction';
import SearchIcon from '@mui/icons-material/Search';
import { 
    Button, Accordion, AccordionSummary, AccordionDetails, Typography,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip,
    Dialog, DialogTitle, DialogContent, DialogActions, Box, IconButton,
    TextField, InputAdornment, TableSortLabel, LinearProgress
} from '@mui/material';

type Order = 'asc' | 'desc';

const AgentInspector: React.FC = () => {
  const [logs, setLogs] = useState<AgentExecutionLog[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Search & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<keyof AgentExecutionLog | 'agent_name'>('created_at');

  // Detail Modal State
  const [selectedLog, setSelectedLog] = useState<AgentExecutionLog | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { showNotification } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAgents();
    fetchLogs();
    
    // Auto-refresh logs every 5 seconds
    const interval = setInterval(() => {
        fetchLogs(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchAgents = async () => {
    try {
      const data = await getAgents();
      setAgents(data);
    } catch (error) {
      console.error('Failed to fetch agents', error);
    }
  };

  const fetchLogs = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getLogs({ 
          limit: 100 // Fetch recent 100 logs
      });
      setLogs(data);
    } catch (error) {
      if (!silent) showNotification('Failed to fetch logs', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const getAgentName = (id: string) => {
    const agent = agents.find(a => a.id === id);
    return agent ? agent.name : id.substring(0, 8);
  };

  const handleRequestSort = (property: keyof AgentExecutionLog | 'agent_name') => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const filteredLogs = useMemo(() => {
      const query = searchQuery.toLowerCase();
      return logs.filter(log => {
          const agentName = getAgentName(log.agent_id).toLowerCase();
          const prompt = (log.prompt_context.user_prompt || '').toLowerCase();
          const response = (log.raw_response || '').toLowerCase();
          const thought = (log.thought_process || '').toLowerCase();
          
          return agentName.includes(query) || 
                 prompt.includes(query) || 
                 response.includes(query) || 
                 thought.includes(query);
      });
  }, [logs, searchQuery, agents]);

  const sortedLogs = useMemo(() => {
      return [...filteredLogs].sort((a, b) => {
          let aValue: any = '';
          let bValue: any = '';

          if (orderBy === 'agent_name') {
              aValue = getAgentName(a.agent_id).toLowerCase();
              bValue = getAgentName(b.agent_id).toLowerCase();
          } else if (orderBy === 'created_at') {
              aValue = new Date(a.created_at).getTime();
              bValue = new Date(b.created_at).getTime();
          } else {
              // @ts-ignore
              aValue = a[orderBy] || '';
              // @ts-ignore
              bValue = b[orderBy] || '';
          }

          if (bValue < aValue) {
              return order === 'asc' ? 1 : -1;
          }
          if (bValue > aValue) {
              return order === 'asc' ? -1 : 1;
          }
          return 0;
      });
  }, [filteredLogs, order, orderBy, agents]);

  const handleViewDetails = (log: AgentExecutionLog) => {
      setSelectedLog(log);
      setModalOpen(true);
  };

  const truncate = (str: string, length: number = 50) => {
      if (!str) return '';
      return str.length > length ? str.substring(0, length) + '...' : str;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center">
            <Button 
            startIcon={<ArrowBackIcon />} 
            onClick={() => navigate('/')}
            variant="text"
            color="inherit"
            sx={{ mr: 2 }}
            >
            Back
            </Button>
            <h1 className="text-2xl font-bold text-gray-800">Flight Recorder</h1>
        </div>
        
        {/* Search Bar */}
        <TextField
            size="small"
            placeholder="Search all fields..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
                startAdornment: (
                    <InputAdornment position="start">
                        <SearchIcon color="action" />
                    </InputAdornment>
                ),
            }}
            sx={{ width: 300, bgcolor: 'white' }}
        />
      </div>

      {/* Main Content - Table View */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
            {loading && <LinearProgress />}
            <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell width="180px">
                                <TableSortLabel
                                    active={orderBy === 'created_at'}
                                    direction={orderBy === 'created_at' ? order : 'asc'}
                                    onClick={() => handleRequestSort('created_at')}
                                >
                                    Time
                                </TableSortLabel>
                            </TableCell>
                            <TableCell width="150px">
                                <TableSortLabel
                                    active={orderBy === 'agent_name'}
                                    direction={orderBy === 'agent_name' ? order : 'asc'}
                                    onClick={() => handleRequestSort('agent_name')}
                                >
                                    Agent
                                </TableSortLabel>
                            </TableCell>
                            <TableCell>Input</TableCell>
                            <TableCell>Thought Process</TableCell>
                            <TableCell>Response</TableCell>
                            <TableCell width="120px">Tools Used</TableCell>
                            <TableCell width="80px" align="center">Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedLogs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                                    <Typography color="text.secondary">
                                        {logs.length === 0 ? 'No execution logs found.' : 'No logs match your search.'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedLogs.map((log) => (
                                <TableRow key={log.id} hover>
                                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                                        {format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                                        <div className="text-xs text-gray-400 font-mono mt-0.5">{log.execution_time_ms}ms</div>
                                    </TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={getAgentName(log.agent_id)} 
                                            size="small" 
                                            sx={{ bgcolor: 'indigo.50', color: 'indigo.700', fontWeight: 500 }} 
                                        />
                                    </TableCell>
                                    <TableCell sx={{ maxWidth: 200 }} className="truncate">
                                        <span title={log.prompt_context.user_prompt}>{truncate(log.prompt_context.user_prompt, 40)}</span>
                                    </TableCell>
                                    <TableCell sx={{ maxWidth: 200 }} className="truncate">
                                        <span className="text-gray-500 italic" title={log.thought_process || ''}>
                                            {log.thought_process ? truncate(log.thought_process, 40) : '-'}
                                        </span>
                                    </TableCell>
                                    <TableCell sx={{ maxWidth: 250 }} className="truncate">
                                        <span title={log.raw_response}>{truncate(log.raw_response.replace(/<thought>[\s\S]*?<\/thought>/, ''), 50)}</span>
                                    </TableCell>
                                    <TableCell>
                                        {log.tool_events && log.tool_events.length > 0 ? (
                                            <Chip 
                                                icon={<ConstructionIcon sx={{ fontSize: 14 }} />} 
                                                label={log.tool_events.length} 
                                                size="small" 
                                                color="default" 
                                                variant="outlined" 
                                            />
                                        ) : (
                                            <span className="text-gray-300 text-xs">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell align="center">
                                        <IconButton size="small" onClick={() => handleViewDetails(log)} color="primary">
                                            <VisibilityIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        maxWidth="lg" 
        fullWidth
        scroll="paper"
      >
        {selectedLog && (
            <>
                <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider', px: 3, py: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                {getAgentName(selectedLog.agent_id).charAt(0)}
                            </div>
                            <div>
                                <Typography variant="h6" sx={{ lineHeight: 1.2 }}>{getAgentName(selectedLog.agent_id)}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {format(new Date(selectedLog.created_at), 'PPP pp')} • {selectedLog.execution_time_ms}ms
                                </Typography>
                            </div>
                        </Box>
                        <Chip label={selectedLog.simulation_id ? 'Simulation' : 'Chat Session'} size="small" />
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 0, bgcolor: '#f9fafb' }}>
                    <div className="p-6 space-y-6">
                        {/* 1. Internal Monologue */}
                        <div className="relative">
                            <div className="absolute top-0 left-0 -ml-2 -mt-2 bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded shadow-sm border border-yellow-200 z-10 flex items-center">
                                <span className="mr-1">🤔</span> Chain of Thought
                            </div>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 pt-8 text-gray-800 font-serif whitespace-pre-wrap leading-relaxed shadow-inner">
                                {selectedLog.thought_process || <span className="text-gray-400 italic">No thought process captured.</span>}
                            </div>
                        </div>

                        {/* 2. Tool Execution Events */}
                        {selectedLog.tool_events && selectedLog.tool_events.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Tool Executions</h4>
                                {selectedLog.tool_events.map((event, idx) => (
                                    <div key={idx} className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col shadow-sm">
                                        <div className="bg-gray-50 px-4 py-2 flex justify-between items-center border-b border-gray-200">
                                            <div className="flex items-center">
                                                <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded mr-2 uppercase">Tool</span>
                                                <span className="font-mono text-sm font-bold text-gray-700">{event.tool}</span>
                                            </div>
                                            <span className="text-[10px] text-gray-400 font-mono italic">Execution {idx + 1}</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                                            <div className="p-3">
                                                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Input Arguments</span>
                                                <pre className="text-xs font-mono text-gray-600 bg-gray-50 p-2 rounded truncate overflow-x-auto">
                                                    {JSON.stringify(event.input, null, 2)}
                                                </pre>
                                            </div>
                                            <div className="p-3">
                                                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Result Output</span>
                                                <pre className="text-xs font-mono text-green-700 bg-green-50/50 p-2 rounded overflow-x-auto max-h-40">
                                                    {event.output}
                                                </pre>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 3. Public Response */}
                        <div className="relative">
                            <div className="absolute top-0 right-0 -mr-2 -mt-2 bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded shadow-sm border border-green-200 z-10 flex items-center">
                                <span className="mr-1">💬</span> Response
                            </div>
                            <div className="bg-white border border-gray-200 rounded-lg p-6 text-gray-900 whitespace-pre-wrap leading-relaxed shadow-sm">
                                {selectedLog.raw_response.replace(/<thought>[\s\S]*?<\/thought>/, '').trim()}
                            </div>
                        </div>
                        
                        {/* 4. Detailed Context (Accordion) */}
                        <Accordion elevation={0} sx={{ '&:before': { display: 'none' }, border: '1px solid #e5e7eb', borderRadius: '0.5rem !important', overflow: 'hidden' }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#fff' }}>
                                <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: '#6b7280' }}>
                                    View Full Context & System Prompt
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: 0 }}>
                                <div className="bg-gray-900 p-4 overflow-x-auto">
                                    <div className="space-y-4">
                                        <div>
                                            <span className="text-indigo-400 text-xs uppercase font-bold block mb-1">System Prompt</span>
                                            <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap bg-gray-950 p-3 rounded border border-gray-800">
                                                {selectedLog.prompt_context.system_prompt}
                                            </pre>
                                        </div>
                                        
                                        {selectedLog.prompt_context.history && selectedLog.prompt_context.history.length > 0 && (
                                            <div>
                                                <span className="text-blue-400 text-xs uppercase font-bold block mb-1">History Context</span>
                                                <div className="bg-gray-950 p-3 rounded border border-gray-800 space-y-2 max-h-60 overflow-y-auto">
                                                    {selectedLog.prompt_context.history.map((msg, i) => (
                                                        <div key={i} className="text-xs font-mono border-b border-gray-800 pb-2 last:border-0">
                                                            <span className={msg.role === 'user' ? 'text-green-400 font-bold' : 'text-blue-400 font-bold'}>{msg.role.toUpperCase()}:</span> 
                                                            <span className="text-gray-400 ml-2">{msg.content}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <span className="text-green-400 text-xs uppercase font-bold block mb-1">Current Input</span>
                                            <pre className="text-gray-300 text-sm font-mono whitespace-pre-wrap bg-gray-950 p-3 rounded border-l-4 border-green-500">
                                                {selectedLog.prompt_context.user_prompt}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            </AccordionDetails>
                        </Accordion>
                    </div>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Button onClick={() => setModalOpen(false)}>Close</Button>
                </DialogActions>
            </>
        )}
      </Dialog>
    </div>
  );
};

export default AgentInspector;