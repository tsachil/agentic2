import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Button, Grid, Card, CardContent, CardActions, Chip, Divider, 
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, FormControl, InputLabel,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getTools, deleteTool, seedTools, createTool, updateTool, getToolLogs, testTool } from '../api/client';
import type { Tool, ToolCreate, ToolExecutionLog } from '../api/client';
import { useNotification } from '../context/NotificationContext';
import ConstructionIcon from '@mui/icons-material/Construction';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { format } from 'date-fns';

const ToolLibrary: React.FC = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [selectedToolLogs, setSelectedToolLogs] = useState<ToolExecutionLog[]>([]);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [selectedToolName, setSelectedToolName] = useState('');
  
  // Test State
  const [testInput, setTestInput] = useState('{}');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  // Edit Mode State
  const [editingToolId, setEditingToolId] = useState<string | null>(null);
  
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState<ToolCreate>({
    name: '',
    description: '',
    type: 'api',
    parameter_schema: { type: 'object', properties: {} },
    configuration: { url: '', method: 'GET', headers: {} }
  });

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    setLoading(true);
    try {
      const data = await getTools();
      setTools(data);
    } catch (error) {
      showNotification('Failed to fetch tools', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this tool?')) {
      try {
        await deleteTool(id);
        showNotification('Tool deleted successfully', 'success');
        fetchTools();
      } catch (error) {
        showNotification('Failed to delete tool', 'error');
      }
    }
  };

  const handleSeed = async () => {
    try {
      await seedTools();
      showNotification('Built-in tools seeded!', 'success');
      fetchTools();
    } catch (error) {
      showNotification('Failed to seed tools', 'error');
    }
  };

  const handleOpenCreate = () => {
      setEditingToolId(null);
      setFormData({
        name: '',
        description: '',
        type: 'api',
        parameter_schema: { type: 'object', properties: {} },
        configuration: { url: '', method: 'GET', headers: {} }
      });
      setOpenModal(true);
  };

  const handleEdit = (tool: Tool) => {
      setEditingToolId(tool.id);
      setFormData({
          name: tool.name,
          description: tool.description,
          type: tool.type,
          parameter_schema: JSON.stringify(tool.parameter_schema, null, 2), // Pre-format JSON string
          configuration: tool.configuration || { url: '', method: 'GET', headers: {} }
      });
      setOpenModal(true);
  };

  const handleSave = async () => {
    try {
        // Simple JSON validation for schema
        const schema = typeof formData.parameter_schema === 'string' 
            ? JSON.parse(formData.parameter_schema) 
            : formData.parameter_schema;
            
        const payload = {
            ...formData,
            parameter_schema: schema
        };

        if (editingToolId) {
            await updateTool(editingToolId, payload);
            showNotification('Tool updated successfully', 'success');
        } else {
            await createTool(payload);
            showNotification('Tool created successfully', 'success');
        }
        
        setOpenModal(false);
        fetchTools();
    } catch (error: any) {
        showNotification(`Failed to save tool: ${error.message || 'Invalid JSON'}`, 'error');
    }
  };

  const handleShowHistory = async (tool: Tool) => {
      setSelectedToolName(tool.name);
      setHistoryModalOpen(true);
      setSelectedToolLogs([]); // Clear previous
      try {
          const logs = await getToolLogs(tool.id);
          setSelectedToolLogs(logs);
      } catch (error) {
          showNotification('Failed to fetch tool history', 'error');
      }
  };

  const handleOpenTest = (tool: Tool) => {
      setSelectedTool(tool);
      // Try to generate a sample JSON from schema keys
      const sample: any = {};
      if (tool.parameter_schema?.properties) {
          Object.keys(tool.parameter_schema.properties).forEach(key => {
              sample[key] = "";
          });
      }
      setTestInput(JSON.stringify(sample, null, 2));
      setTestResult(null);
      setTestModalOpen(true);
  };

  const handleRunTest = async () => {
      if (!selectedTool) return;
      setTesting(true);
      setTestResult(null);
      try {
          const args = JSON.parse(testInput);
          const res = await testTool(selectedTool.id, args);
          setTestResult(res.result);
      } catch (error: any) {
          setTestResult(`Error: ${error.message || 'Invalid JSON or Request Failed'}`);
      } finally {
          setTesting(false);
      }
  };

  const formatOutput = (output: string) => {
      try {
          // Attempt to parse if it's a JSON string
          const parsed = JSON.parse(output);
          return JSON.stringify(parsed, null, 2);
      } catch {
          return output;
      }
  };

  return (
    <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
            <Button 
                startIcon={<ArrowBackIcon />} 
                onClick={() => navigate('/')}
                sx={{ mr: 2 }}
            >
                Back
            </Button>
            <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
                Tool Library
            </Typography>
            <Button variant="outlined" sx={{ mr: 2 }} onClick={handleSeed}>
                Seed Built-in Tools
            </Button>
            <Button variant="contained" onClick={handleOpenCreate}>
                Create Custom Tool (API)
            </Button>
        </Box>

        {tools.length === 0 ? (
            <Box sx={{ textAlign: 'center', mt: 8, color: 'text.secondary' }}>
                <ConstructionIcon sx={{ fontSize: 60, mb: 2, opacity: 0.5 }} />
                <Typography variant="h6">No tools found</Typography>
                <Typography>Click "Seed Built-in Tools" to get started or create a new API tool.</Typography>
            </Box>
        ) : (
            <Grid container spacing={3}>
                {tools.map((tool) => (
                    <Grid item xs={12} sm={6} md={4} key={tool.id}>
                        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <CardContent sx={{ flexGrow: 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                    <Typography variant="h6">
                                        {tool.name}
                                    </Typography>
                                    <Chip 
                                        label={tool.type} 
                                        size="small" 
                                        color={tool.type === 'builtin' ? 'primary' : 'secondary'} 
                                        variant="outlined"
                                    />
                                </Box>
                                <Typography variant="body2" color="text.secondary" paragraph>
                                    {tool.description}
                                </Typography>
                                
                                <Divider sx={{ my: 1 }} />
                                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 1 }}>
                                    Parameters: {Object.keys(tool.parameter_schema?.properties || {}).join(', ') || 'None'}
                                </Typography>
                                {tool.type === 'api' && (
                                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontStyle: 'italic' }}>
                                        Endpoint: {tool.configuration?.url}
                                    </Typography>
                                )}
                            </CardContent>
                            <CardActions>
                                <Button 
                                    size="small" 
                                    startIcon={<PlayArrowIcon />}
                                    onClick={() => handleOpenTest(tool)}
                                    color="success"
                                >
                                    Test
                                </Button>
                                <Button 
                                    size="small" 
                                    startIcon={<HistoryIcon />}
                                    onClick={() => handleShowHistory(tool)}
                                >
                                    History
                                </Button>
                                <Button 
                                    size="small" 
                                    startIcon={<EditIcon />}
                                    onClick={() => handleEdit(tool)}
                                >
                                    Edit
                                </Button>
                                <Box sx={{ flexGrow: 1 }} />
                                <Button 
                                    size="small" 
                                    color="error" 
                                    startIcon={<DeleteIcon />}
                                    onClick={() => handleDelete(tool.id)}
                                >
                                    Delete
                                </Button>
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        )}

        {/* Create/Edit Modal */}
        <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
            <DialogTitle>{editingToolId ? 'Edit Tool' : 'Create Custom API Tool'}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <TextField 
                        label="Tool Name (internal id)" 
                        helperText="Use underscores, e.g. get_weather"
                        fullWidth 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                    <TextField 
                        label="Description for Agent" 
                        helperText="Tell the agent WHEN to use this tool."
                        fullWidth 
                        multiline rows={2}
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                    
                    <Typography variant="subtitle2" sx={{ mt: 1 }}>API Configuration</Typography>
                    <TextField 
                        label="Endpoint URL" 
                        helperText="Supports dynamic parameters (e.g. /users/{user_id})"
                        fullWidth 
                        value={formData.configuration.url}
                        onChange={(e) => setFormData({...formData, configuration: {...formData.configuration, url: e.target.value}})}
                    />
                    <FormControl fullWidth>
                        <InputLabel>HTTP Method</InputLabel>
                        <Select
                            value={formData.configuration.method}
                            label="HTTP Method"
                            onChange={(e) => setFormData({...formData, configuration: {...formData.configuration, method: e.target.value}})}
                        >
                            <MenuItem value="GET">GET</MenuItem>
                            <MenuItem value="POST">POST</MenuItem>
                        </Select>
                    </FormControl>

                    <Typography variant="subtitle2" sx={{ mt: 1 }}>Parameter Schema (JSON Schema)</Typography>
                    <TextField 
                        fullWidth 
                        multiline rows={5}
                        placeholder='{ "type": "object", "properties": { "q": { "type": "string" } } }'
                        value={typeof formData.parameter_schema === 'string' ? formData.parameter_schema : JSON.stringify(formData.parameter_schema, null, 2)}
                        onChange={(e) => setFormData({...formData, parameter_schema: e.target.value})}
                        sx={{ fontFamily: 'monospace' }}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setOpenModal(false)}>Cancel</Button>
                <Button variant="contained" onClick={handleSave}>
                    {editingToolId ? 'Save Changes' : 'Create Tool'}
                </Button>
            </DialogActions>
        </Dialog>

        {/* History Modal */}
        <Dialog open={historyModalOpen} onClose={() => setHistoryModalOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle>Usage History: {selectedToolName}</DialogTitle>
            <DialogContent dividers>
                {selectedToolLogs.length === 0 ? (
                    <Typography color="text.secondary" align="center" py={4}>No usage history found for this tool.</Typography>
                ) : (
                    <TableContainer component={Paper} elevation={0} variant="outlined">
                        <Table size="small">
                            <TableHead sx={{ bgcolor: 'grey.100' }}>
                                <TableRow>
                                    <TableCell width="20%">Time</TableCell>
                                    <TableCell width="30%">Input</TableCell>
                                    <TableCell width="30%">URL</TableCell>
                                    <TableCell width="20%">Output</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {selectedToolLogs.map((log, index) => (
                                    <TableRow key={index} hover sx={{ verticalAlign: 'top' }}>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                            {format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                                            <Typography variant="caption" display="block" color="text.secondary">
                                                Agent: {log.agent_id.substring(0, 8)}...
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box component="pre" sx={{ m: 0, fontSize: '0.75rem', fontFamily: 'monospace', maxWidth: '100%', overflow: 'auto' }}>
                                                {JSON.stringify(log.input_args, null, 2)}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            {log.request_url ? (
                                                <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                                    {log.request_url}
                                                </Typography>
                                            ) : (
                                                <Typography variant="caption" color="text.secondary">-</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Accordion elevation={0} sx={{ 
                                                '&:before': { display: 'none' }, 
                                                bgcolor: 'transparent',
                                                minHeight: 'unset'
                                            }}>
                                                <AccordionSummary 
                                                    expandIcon={<ExpandMoreIcon fontSize="small" />} 
                                                    sx={{ 
                                                        minHeight: 'unset', 
                                                        p: 0,
                                                        '& .MuiAccordionSummary-content': { m: 0 } 
                                                    }}
                                                >
                                                    <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                                                        View Output
                                                    </Typography>
                                                </AccordionSummary>
                                                <AccordionDetails sx={{ p: 0, pt: 1 }}>
                                                    <Box component="pre" sx={{ 
                                                        m: 0, 
                                                        fontSize: '0.7rem', 
                                                        fontFamily: 'monospace', 
                                                        maxHeight: 200, 
                                                        overflow: 'auto',
                                                        bgcolor: 'grey.50',
                                                        p: 1,
                                                        borderRadius: 1,
                                                        border: '1px solid #eee'
                                                    }}>
                                                        {formatOutput(log.output_result)}
                                                    </Box>
                                                </AccordionDetails>
                                            </Accordion>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setHistoryModalOpen(false)}>Close</Button>
            </DialogActions>
        </Dialog>

        {/* Test Modal */}
        <Dialog open={testModalOpen} onClose={() => setTestModalOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Test Tool: {selectedTool?.name}</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Enter the JSON arguments for the tool execution.
                </Typography>
                <TextField 
                    fullWidth 
                    multiline rows={5}
                    label="Arguments (JSON)"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    sx={{ fontFamily: 'monospace', mb: 2 }}
                />
                {testResult && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1, border: '1px solid #ddd' }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}>RESULT:</Typography>
                        <Box component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                            {testResult}
                        </Box>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setTestModalOpen(false)}>Close</Button>
                <Button variant="contained" color="success" onClick={handleRunTest} disabled={testing}>
                    {testing ? 'Running...' : 'Run Test'}
                </Button>
            </DialogActions>
        </Dialog>
    </Box>
  );
};

export default ToolLibrary;