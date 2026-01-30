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
  CircularProgress
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { createAgent, getAgent, updateAgent } from '../api/client';
import type { AgentCreate } from '../api/client';

export default function AgentBuilder() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [purpose, setPurpose] = useState('');
  
  // Personality Traits (0.0 to 1.0)
  const [traits, setTraits] = useState({
    formality: 0.5,
    verbosity: 0.5,
    creativity: 0.5,
    empathy: 0.5,
    assertiveness: 0.5
  });

  useEffect(() => {
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
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [id, isEditing]);

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
          </Grid>

          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={() => navigate('/')}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {submitting ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Agent')}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
