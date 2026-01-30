import { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Fab,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useNavigate } from 'react-router-dom';
import { getAgents } from '../api/client';
import type { Agent } from '../api/client';

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const data = await getAgents();
        setAgents(data);
      } catch (error) {
        console.error("Failed to fetch agents", error);
      }
    };
    fetchAgents();
  }, []);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          My Agents
        </Typography>
        <Box>
            <Button 
            variant="outlined" 
            sx={{ mr: 2 }}
            onClick={() => navigate('/simulation')}
            >
            Run Simulation
            </Button>
            <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => navigate('/create-agent')}
            >
            New Agent
            </Button>
        </Box>
      </Box>

      {agents.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 8, color: 'text.secondary' }}>
          <SmartToyIcon sx={{ fontSize: 60, mb: 2, opacity: 0.5 }} />
          <Typography variant="h6">No agents created yet</Typography>
          <Typography>Create your first AI agent to get started.</Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {agents.map((agent) => (
            <Grid item xs={12} sm={6} md={4} key={agent.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {agent.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {agent.description || "No description provided."}
                  </Typography>
                  <Chip 
                    label={agent.status} 
                    color={agent.status === 'active' ? 'success' : 'default'} 
                    size="small" 
                  />
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => navigate(`/agent/${agent.id}/manage`)}>
                    Manage
                  </Button>
                  <Button size="small" color="secondary" onClick={() => navigate(`/agent/${agent.id}/chat`)}>
                    Chat
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Fab 
        color="primary" 
        aria-label="add" 
        sx={{ position: 'fixed', bottom: 32, right: 32 }}
        onClick={() => navigate('/create-agent')}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
}
