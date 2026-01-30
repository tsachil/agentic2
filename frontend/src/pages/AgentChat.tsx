import { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  IconButton, 
  List, 
  ListItem, 
  ListItemText, 
  CircularProgress,
  Divider,
  Breadcrumbs,
  Link as MuiLink
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { useParams, Link } from 'react-router-dom';
import { getAgent, executeAgent } from '../api/client';
import type { Agent } from '../api/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AgentChat() {
  const { id } = useParams<{ id: string }>();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      getAgent(id).then(setAgent).catch(console.error);
    }
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !id) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const result = await executeAgent(id, input, messages);
      const assistantMessage: Message = { role: 'assistant', content: result.response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error", error);
    } finally {
      setLoading(false);
    }
  };

  if (!agent) return <CircularProgress />;

  return (
    <Box sx={{ height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <MuiLink component={Link} to="/" underline="hover" color="inherit">Dashboard</MuiLink>
        <Typography color="text.primary">{agent.name} Chat</Typography>
      </Breadcrumbs>

      <Paper elevation={3} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Chat Header */}
        <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
          <Typography variant="h6">{agent.name}</Typography>
          <Typography variant="caption">{agent.purpose}</Typography>
        </Box>

        {/* Message List */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
          <List>
            {messages.length === 0 && (
                <Typography sx={{ textAlign: 'center', mt: 4, color: 'text.secondary' }}>
                    Send a message to start the conversation with {agent.name}.
                </Typography>
            )}
            {messages.map((msg, index) => (
              <ListItem key={index} sx={{ 
                flexDirection: 'column', 
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                mb: 2 
              }}>
                <Paper sx={{ 
                  p: 2, 
                  bgcolor: msg.role === 'user' ? 'primary.light' : 'grey.100',
                  color: msg.role === 'user' ? 'white' : 'black',
                  maxWidth: '80%'
                }}>
                  <ListItemText primary={msg.content} />
                </Paper>
                <Typography variant="caption" sx={{ mt: 0.5 }}>
                  {msg.role === 'user' ? 'You' : agent.name}
                </Typography>
              </ListItem>
            ))}
            {loading && (
              <ListItem sx={{ justifyContent: 'flex-start' }}>
                <CircularProgress size={20} />
              </ListItem>
            )}
            <div ref={messagesEndRef} />
          </List>
        </Box>

        <Divider />

        {/* Input Area */}
        <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
          />
          <IconButton color="primary" onClick={handleSend} disabled={loading || !input.trim()}>
            <SendIcon />
          </IconButton>
        </Box>
      </Paper>
    </Box>
  );
}
