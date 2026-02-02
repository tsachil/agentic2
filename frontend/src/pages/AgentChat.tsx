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
  Link as MuiLink,
  ListItemButton,
  Button,
  Tooltip
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AddIcon from '@mui/icons-material/Add';
import ChatIcon from '@mui/icons-material/Chat';
import { useParams, Link } from 'react-router-dom';
import { getAgent, createSession, getSessions, executeSessionChat, getSessionHistory } from '../api/client';
import type { Agent, ChatSession } from '../api/client';
import { useNotification } from '../context/NotificationContext';
import ConstructionIcon from '@mui/icons-material/Construction';
import { Chip } from '@mui/material';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  tool_calls?: any[];
}

const DRAWER_WIDTH = 280;

export default function AgentChat() {
  const { id } = useParams<{ id: string }>();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const { showNotification } = useNotification();

  // Load Agent and Sessions on mount
  useEffect(() => {
    if (id) {
      getAgent(id).then(setAgent).catch(console.error);
      loadSessions();
    }
  }, [id]);

  const loadSessions = async () => {
    if (!id) return;
    try {
      const data = await getSessions(id);
      setSessions(data);
      if (data.length > 0 && !currentSessionId) {
        selectSession(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const createNewSession = async () => {
    if (!id) return;
    try {
      const session = await createSession(id);
      setSessions([session, ...sessions]);
      selectSession(session.id);
    } catch {
      showNotification("Failed to create session", "error");
    }
  };

  const selectSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setLoading(true);
    try {
      const history = await getSessionHistory(sessionId);
      const typedHistory: Message[] = history.map(h => ({
          role: h.role as 'user' | 'assistant',
          content: h.content,
          tool_calls: h.tool_calls
      }));
      setMessages(typedHistory);
    } catch {
      showNotification("Failed to load history", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !currentSessionId) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const result = await executeSessionChat(currentSessionId, input);
      const assistantMessage: Message = { 
        role: 'assistant', 
        content: result.response,
        tool_calls: result.tool_calls
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error", error);
      showNotification("Failed to send message", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!agent) return <CircularProgress />;

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 80px)' }}>
      {/* Sidebar */}
      <Paper elevation={2} sx={{ width: DRAWER_WIDTH, flexShrink: 0, overflow: 'auto', borderRight: 1, borderColor: 'divider' }}>
        <Box sx={{ p: 2 }}>
            <Button 
                fullWidth 
                variant="contained" 
                startIcon={<AddIcon />} 
                onClick={createNewSession}
            >
                New Chat
            </Button>
        </Box>
        <Divider />
        <List>
            {sessions.map(session => (
                <ListItemButton 
                    key={session.id} 
                    selected={session.id === currentSessionId}
                    onClick={() => selectSession(session.id)}
                >
                    <ChatIcon sx={{ mr: 2, fontSize: 20, color: 'text.secondary' }} />
                    <ListItemText 
                        primary={session.name} 
                        primaryTypographyProps={{ noWrap: true, variant: 'body2' }}
                        secondary={new Date(session.created_at).toLocaleDateString()}
                    />
                </ListItemButton>
            ))}
            {sessions.length === 0 && (
                <Typography variant="body2" sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                    No previous chats
                </Typography>
            )}
        </List>
      </Paper>

      {/* Main Chat Area */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
             <Breadcrumbs sx={{ mb: 1 }}>
                <MuiLink component={Link} to="/" underline="hover" color="inherit">Dashboard</MuiLink>
                <Typography color="text.primary">{agent.name}</Typography>
            </Breadcrumbs>
            <Typography variant="h6">{agent.name}</Typography>
            <Typography variant="caption" color="text.secondary">{agent.purpose}</Typography>
        </Box>

        {/* Messages */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3, bgcolor: '#f5f5f5' }}>
          {!currentSessionId ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 10, opacity: 0.6 }}>
                  <ChatIcon sx={{ fontSize: 60, mb: 2 }} />
                  <Typography>Select a chat or start a new one</Typography>
              </Box>
          ) : (
            <List>
                {messages.length === 0 && (
                    <Typography sx={{ textAlign: 'center', mt: 4, color: 'text.secondary' }}>
                        Start chatting with {agent.name}...
                    </Typography>
                )}
                {messages.map((msg, index) => (
                <ListItem key={index} sx={{ 
                    flexDirection: 'column', 
                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    mb: 1
                }}>
                    <Paper elevation={1} sx={{ 
                    p: 2, 
                    bgcolor: msg.role === 'user' ? 'primary.main' : 'white',
                    color: msg.role === 'user' ? 'white' : 'text.primary',
                    maxWidth: '70%',
                    borderRadius: 2,
                    position: 'relative'
                    }}>
                    {msg.tool_calls && msg.tool_calls.length > 0 && (
                        <Box sx={{ mb: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {msg.tool_calls.map((call, i) => (
                                <Chip 
                                    key={i}
                                    icon={<ConstructionIcon sx={{ fontSize: '12px !important' }} />}
                                    label={`Used tool: ${call.tool}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ 
                                        fontSize: '10px', 
                                        height: '20px',
                                        bgcolor: 'rgba(0,0,0,0.03)',
                                        borderColor: 'divider'
                                    }}
                                />
                            ))}
                        </Box>
                    )}
                    <Typography variant="body1">{msg.content}</Typography>
                    </Paper>
                </ListItem>
                ))}
                {loading && (
                <ListItem sx={{ justifyContent: 'flex-start' }}>
                    <Paper sx={{ p: 2, bgcolor: 'white', borderRadius: 2 }}>
                        <CircularProgress size={20} />
                    </Paper>
                </ListItem>
                )}
                <div ref={messagesEndRef} />
            </List>
          )}
        </Box>

        {/* Input */}
        <Paper elevation={3} sx={{ p: 2, display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || !currentSessionId}
            size="small"
            aria-label="Message input"
          />
          <Tooltip title="Send message (Enter)">
            <span>
              <IconButton
                color="primary"
                onClick={handleSend}
                disabled={loading || !input.trim() || !currentSessionId}
                aria-label="Send message"
              >
                <SendIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Paper>
      </Box>
    </Box>
  );
}