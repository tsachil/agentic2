import { useEffect } from 'react';
import {
  Box, 
  CssBaseline, 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  Button
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { Routes, Route, Navigate } from 'react-router-dom';
import React from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AgentBuilder from './pages/AgentBuilder';
import AgentChat from './pages/AgentChat';
import SimulationPage from './pages/SimulationPage';
import { useAuthStore } from './store/authStore';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
});

function Layout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);

  useEffect(() => {
      fetchProfile();
  }, []);

  return (    <Box sx={{ flexGrow: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Agentic Platform
          </Typography>
          <Typography variant="subtitle1" sx={{ mr: 2 }}>
            Welcome, {user?.full_name || user?.email}
          </Typography>
          <Button color="inherit" onClick={logout}>Logout</Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth={false} sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        {children}
      </Container>
    </Box>
  );
}

function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const token = useAuthStore((state) => state.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return (
    <Layout>
      {children}
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/create-agent" element={
          <ProtectedRoute>
            <AgentBuilder />
          </ProtectedRoute>
        } />
        <Route path="/agent/:id/manage" element={
          <ProtectedRoute>
            <AgentBuilder />
          </ProtectedRoute>
        } />
        <Route path="/agent/:id/chat" element={
          <ProtectedRoute>
            <AgentChat />
          </ProtectedRoute>
        } />
        <Route path="/simulation" element={
          <ProtectedRoute>
            <SimulationPage />
          </ProtectedRoute>
        } />
      </Routes>
    </ThemeProvider>
  );
}

export default App;