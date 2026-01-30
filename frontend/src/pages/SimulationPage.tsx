import { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  TextField, 
  List, 
  ListItem, 
  ListItemText, 
  Container,
  Checkbox,
  FormControlLabel,
  Grid,
  Divider,
  ListItemButton,
  Breadcrumbs,
  Link as MuiLink
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddIcon from '@mui/icons-material/Add';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { Link } from 'react-router-dom';
import { getAgents, createSimulation, getSimulation, stepSimulation, getSimulations } from '../api/client';
import type { Agent, Simulation } from '../api/client';
import { useNotification } from '../context/NotificationContext';

const DRAWER_WIDTH = 280;

export default function SimulationPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [topic, setTopic] = useState('');
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRun, setAutoRun] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    getAgents().then(setAgents).catch(console.error);
    loadSimulations();
  }, []);

  const loadSimulations = () => {
    getSimulations().then(setSimulations).catch(console.error);
  };

  useEffect(() => {
    if (simulation) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [simulation?.messages]);

  // Auto-run logic
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (autoRun && simulation) {
      timeout = setTimeout(handleStep, 4000);
    }
    return () => clearTimeout(timeout);
  }, [autoRun, simulation]);

  const handleStart = async () => {
    if (selectedAgents.length < 2 || !topic) return;
    setLoading(true);
    try {
      const sim = await createSimulation(`Sim ${new Date().toLocaleTimeString()}`, selectedAgents, topic);
      setSimulation(sim);
      setSimulations([sim, ...simulations]);
      // Reset form
      setTopic('');
      setSelectedAgents([]);
    } catch {
      showNotification("Failed to start simulation", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleStep = async () => {
    if (!simulation) return;
    try {
      const msg = await stepSimulation(simulation.id);
      setSimulation(prev => prev ? {
        ...prev,
        messages: [...prev.messages, msg]
      } : null);
    } catch (e) {
      console.error(e);
      setAutoRun(false); 
    }
  };

  const selectSimulation = async (id: string) => {
    setLoading(true);
    try {
        const sim = await getSimulation(id);
        setSimulation(sim);
        setAutoRun(false);
    } catch {
        showNotification("Failed to load simulation", "error");
    } finally {
        setLoading(false);
    }
  };

  const toggleAgent = (id: string) => {
    setSelectedAgents(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 80px)' }}>
      {/* Sidebar */}
      <Paper elevation={2} sx={{ width: DRAWER_WIDTH, flexShrink: 0, overflow: 'auto', borderRight: 1, borderColor: 'divider' }}>
        <Box sx={{ p: 2 }}>
            <Button 
                fullWidth 
                variant="contained" 
                startIcon={<AddIcon />} 
                onClick={() => setSimulation(null)}
            >
                New Simulation
            </Button>
        </Box>
        <Divider />
        <List>
            {simulations.map(sim => (
                <ListItemButton 
                    key={sim.id} 
                    selected={simulation?.id === sim.id}
                    onClick={() => selectSimulation(sim.id)}
                >
                    <SmartToyIcon sx={{ mr: 2, fontSize: 20, color: 'text.secondary' }} />
                    <ListItemText 
                        primary={sim.name} 
                        secondary={sim.messages.length > 0 ? sim.messages[0].content.substring(0, 30) + '...' : 'No messages'}
                        primaryTypographyProps={{ noWrap: true, variant: 'body2' }}
                        secondaryTypographyProps={{ noWrap: true, fontSize: 11 }}
                    />
                </ListItemButton>
            ))}
             {simulations.length === 0 && (
                <Typography variant="body2" sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                    No past simulations
                </Typography>
            )}
        </List>
      </Paper>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
             <Breadcrumbs sx={{ mb: 1 }}>
                <MuiLink component={Link} to="/" underline="hover" color="inherit">Dashboard</MuiLink>
                <Typography color="text.primary">Simulations</Typography>
            </Breadcrumbs>
        </Box>

        {!simulation ? (
            // Create New Simulation View
            <Container maxWidth="md" sx={{ mt: 4, overflowY: 'auto' }}>
                <Paper sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom>Start Multi-Agent Simulation</Typography>
                
                <Typography variant="subtitle1" sx={{ mt: 3 }}>1. Select Agents (Min 2)</Typography>
                <Grid container spacing={2}>
                    {agents.map(agent => (
                    <Grid key={agent.id} size={{ xs: 12, sm: 6 }}>
                        <FormControlLabel
                        control={
                            <Checkbox 
                            checked={selectedAgents.includes(agent.id)}
                            onChange={() => toggleAgent(agent.id)}
                            />
                        }
                        label={agent.name}
                        />
                    </Grid>
                    ))}
                </Grid>

                <Typography variant="subtitle1" sx={{ mt: 3 }}>2. Set Topic</Typography>
                <TextField 
                    fullWidth 
                    label="Initial Topic / Situation" 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    margin="normal"
                />

                <Button 
                    variant="contained" 
                    size="large" 
                    startIcon={<PlayArrowIcon />}
                    disabled={selectedAgents.length < 2 || !topic || loading}
                    onClick={handleStart}
                    sx={{ mt: 4 }}
                >
                    {loading ? 'Initializing...' : 'Start Simulation'}
                </Button>
                </Paper>
            </Container>
        ) : (
            // Running Simulation View
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <Paper square elevation={0} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f5f5f5' }}>
                    <Typography variant="h6">{simulation.name}</Typography>
                    <Box>
                    <Button 
                        variant={autoRun ? "outlined" : "contained"} 
                        color={autoRun ? "error" : "primary"}
                        onClick={() => setAutoRun(!autoRun)}
                        startIcon={autoRun ? null : <PlayArrowIcon />}
                        size="small"
                    >
                        {autoRun ? 'Stop' : 'Auto-Run'}
                    </Button>
                    <Button 
                        variant="contained" 
                        onClick={handleStep} 
                        disabled={autoRun}
                        sx={{ ml: 2 }}
                        size="small"
                    >
                        Step Once
                    </Button>
                    </Box>
                </Paper>

                <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3 }}>
                    <List>
                    {simulation.messages.map((msg, index) => (
                        <ListItem key={index} alignItems="flex-start" sx={{ mb: 2 }}>
                        <Paper elevation={1} sx={{ p: 2, width: '100%', bgcolor: msg.sender_id === 'system' ? 'grey.200' : 'white' }}>
                            <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold' }}>
                            {msg.sender_name}
                            </Typography>
                            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{msg.content}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'right' }}>
                                {new Date(msg.created_at).toLocaleTimeString()}
                            </Typography>
                        </Paper>
                        </ListItem>
                    ))}
                    <div ref={messagesEndRef} />
                    </List>
                </Box>
            </Box>
        )}
      </Box>
    </Box>
  );
}