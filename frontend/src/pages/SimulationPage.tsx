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
  CircularProgress, 
  Container,
  Checkbox,
  FormControlLabel,
  Grid
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddIcon from '@mui/icons-material/Add';
import { getAgents, createSimulation, getSimulation, stepSimulation } from '../api/client';
import type { Agent, Simulation, SimulationMessage } from '../api/client';

export default function SimulationPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [topic, setTopic] = useState('');
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRun, setAutoRun] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    getAgents().then(setAgents).catch(console.error);
  }, []);

  useEffect(() => {
    if (simulation) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [simulation?.messages]);

  // Auto-run logic
  useEffect(() => {
    let interval: any;
    if (autoRun && simulation) {
      interval = setInterval(handleStep, 4000); // Step every 4 seconds
    }
    return () => clearInterval(interval);
  }, [autoRun, simulation]);

  const handleStart = async () => {
    if (selectedAgents.length < 2 || !topic) return;
    setLoading(true);
    try {
      const sim = await createSimulation(`Sim ${new Date().toLocaleTimeString()}`, selectedAgents, topic);
      setSimulation(sim);
    } catch (e) {
      console.error(e);
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
      setAutoRun(false); // Stop on error
    }
  };

  const toggleAgent = (id: string) => {
    setSelectedAgents(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  if (!simulation) {
    return (
      <Container maxWidth="md">
        <Paper sx={{ p: 4, mt: 4 }}>
          <Typography variant="h4" gutterBottom>Start Multi-Agent Simulation</Typography>
          
          <Typography variant="h6" sx={{ mt: 3 }}>1. Select Agents (Min 2)</Typography>
          <Grid container spacing={2}>
            {agents.map(agent => (
              <Grid item key={agent.id} xs={12} sm={6}>
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

          <Typography variant="h6" sx={{ mt: 3 }}>2. Set Topic</Typography>
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
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <Paper sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Topic: {topic}</Typography>
        <Box>
          <Button 
            variant={autoRun ? "outlined" : "contained"} 
            color={autoRun ? "error" : "primary"}
            onClick={() => setAutoRun(!autoRun)}
            startIcon={autoRun ? null : <PlayArrowIcon />}
          >
            {autoRun ? 'Stop Auto-Run' : 'Auto-Run'}
          </Button>
          <Button 
            variant="contained" 
            onClick={handleStep} 
            disabled={autoRun}
            sx={{ ml: 2 }}
          >
            Step Once
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
        <List>
          {simulation.messages.map((msg, index) => (
            <ListItem key={index} alignItems="flex-start">
              <Paper sx={{ p: 2, width: '100%', bgcolor: msg.sender_id === 'system' ? 'grey.200' : 'background.paper' }}>
                <Typography variant="subtitle2" color="primary">
                  {msg.sender_name}
                </Typography>
                <Typography variant="body1">{msg.content}</Typography>
              </Paper>
            </ListItem>
          ))}
          <div ref={messagesEndRef} />
        </List>
      </Paper>
    </Box>
  );
}
