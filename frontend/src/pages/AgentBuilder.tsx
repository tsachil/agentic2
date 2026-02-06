import { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Paper, 
  Container, 
  Slider,
  Grid,
  Stack,
  CircularProgress,
  Switch,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { createAgent, getAgent, updateAgent, getTools, addToolToAgent, removeToolFromAgent } from '../api/client';
import type { AgentCreate, Tool } from '../api/client';
import ConstructionIcon from '@mui/icons-material/Construction';

export default function AgentBuilder() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [purpose, setPurpose] = useState('');
  
  const [allTools, setAllTools] = useState<Tool[]>([]);
  const [activeToolIds, setActiveToolIds] = useState<string[]>([]);
  
  // Personality Traits (0.0 to 1.0)
  const [traits, setTraits] = useState({
    formality: 0.5,
    verbosity: 0.5,
    creativity: 0.5,
    empathy: 0.5,
    assertiveness: 0.5
  });

  useEffect(() => {
    fetchTools();
    if (isEditing && id) {
      (async () => {
        setLoading(true);
        try {
          const agent = await getAgent(id);
          setName(agent.name);
          setDescription(agent.description || '');
          setPurpose(agent.purpose || '');
          if (agent.personality_config) {
            setTraits(prev => ({ ...prev, ...agent.personality_config }));
          }
          if (agent.tools) {
            setActiveToolIds(agent.tools.map(t => t.id));
          }
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [id, isEditing]);

  const fetchTools = async () => {
    try {
      const data = await getTools();
      setAllTools(data);
    } catch (error) {
      console.error("Failed to fetch tools", error);
    }
  };

  const handleToolToggle = async (toolId: string) => {
    if (!id) return;
    
    const isActive = activeToolIds.includes(toolId);
    try {
      if (isActive) {
        await removeToolFromAgent(id, toolId);
        setActiveToolIds(prev => prev.filter(tid => tid !== toolId));
      } else {
        await addToolToAgent(id, toolId);
        setActiveToolIds(prev => [...prev, toolId]);
      }
    } catch (error) {
      console.error("Failed to toggle tool", error);
    }
  };

  const handleTraitChange = (trait: keyof typeof traits) => (_: Event, newValue: number | number[]) => {
    setTraits(prev => ({ ...prev, [trait]: newValue as number }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const agentData: AgentCreate = {
      name,
      description,
      purpose,
      personality_config: traits
    };
    
    try {
      if (isEditing && id) {
        await updateAgent(id, agentData);
      } else {
        await createAgent(agentData);
      }
      navigate('/');
    } catch (error) {
      console.error("Failed to save agent", error);
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {isEditing ? 'Edit Agent' : 'Create New Agent'}
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <Grid container spacing={4}>
            {/* Basic Info Section */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" gutterBottom>Basic Information</Typography>
              <TextField
                margin="normal"
                required
                fullWidth
                label="Agent Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <TextField
                margin="normal"
                fullWidth
                label="Description"
                multiline
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label="Primary Purpose"
                multiline
                rows={3}
                helperText="What is this agent's main goal?"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </Grid>

            {/* Personality Section */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="h6" gutterBottom>Personality Configuration</Typography>
              <Stack spacing={3} sx={{ mt: 2 }}>
                
                <Box>
                  <Typography gutterBottom>Formality (Casual ↔ Formal)</Typography>
                  <Slider 
                    aria-label="Formality"
                    value={traits.formality} 
                    min={0} max={1} step={0.1}
                    valueLabelDisplay="auto"
                    onChange={handleTraitChange('formality')} 
                  />
                </Box>

                <Box>
                  <Typography gutterBottom>Verbosity (Concise ↔ Detailed)</Typography>
                  <Slider 
                    aria-label="Verbosity"
                    value={traits.verbosity} 
                    min={0} max={1} step={0.1}
                    valueLabelDisplay="auto"
                    onChange={handleTraitChange('verbosity')} 
                  />
                </Box>

                <Box>
                  <Typography gutterBottom>Creativity (Conservative ↔ Innovative)</Typography>
                  <Slider 
                    aria-label="Creativity"
                    value={traits.creativity} 
                    min={0} max={1} step={0.1}
                    valueLabelDisplay="auto"
                    onChange={handleTraitChange('creativity')} 
                  />
                </Box>

                <Box>
                  <Typography gutterBottom>Empathy (Robot ↔ Empathetic)</Typography>
                  <Slider 
                    aria-label="Empathy"
                    value={traits.empathy} 
                    min={0} max={1} step={0.1}
                    valueLabelDisplay="auto"
                    onChange={handleTraitChange('empathy')} 
                  />
                </Box>

                 <Box>
                  <Typography gutterBottom>Assertiveness (Passive ↔ Assertive)</Typography>
                  <Slider 
                    aria-label="Assertiveness"
                    value={traits.assertiveness} 
                    min={0} max={1} step={0.1}
                    valueLabelDisplay="auto"
                    onChange={handleTraitChange('assertiveness')} 
                  />
                </Box>

              </Stack>
            </Grid>

            {/* Tools Section */}
            {isEditing && (
                <Grid size={{ xs: 12 }}>
                    <Divider sx={{ my: 4 }} />
                    <Typography variant="h6" gutterBottom>Capabilities & Tools</Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        Enable specific tools to allow this agent to perform actions or fetch external data.
                    </Typography>
                    
                    {allTools.length === 0 ? (
                        <Box sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                No tools available in the library. <Button onClick={() => navigate('/tools')}>Go to Tool Library</Button>
                            </Typography>
                        </Box>
                    ) : (
                        <List sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #eee' }}>
                            {allTools.map((tool) => (
                                <ListItem key={tool.id} divider>
                                    <ListItemIcon>
                                        <ConstructionIcon color={activeToolIds.includes(tool.id) ? "primary" : "disabled"} />
                                    </ListItemIcon>
                                    <ListItemText 
                                        primary={tool.name} 
                                        secondary={tool.description} 
                                    />
                                    <Switch
                                        edge="end"
                                        onChange={() => handleToolToggle(tool.id)}
                                        checked={activeToolIds.includes(tool.id)}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Grid>
            )}
          </Grid>

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={() => navigate('/')}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} /> : null}
            >
              {submitting ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Agent')}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
