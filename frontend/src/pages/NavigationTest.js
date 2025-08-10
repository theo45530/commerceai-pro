import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Box, Typography, Paper, Grid } from '@mui/material';
import { Home, Login, Dashboard, Settings, Clear } from '@mui/icons-material';

export default function NavigationTest() {
  const navigate = useNavigate();

  const pages = [
    { name: 'Login', path: '/login', icon: <Login /> },
    { name: 'Dashboard', path: '/dashboard', icon: <Dashboard /> },
    { name: 'Home', path: '/', icon: <Home /> },
    { name: 'Onboarding', path: '/onboarding', icon: <Settings /> },
    { name: 'Brand Setup', path: '/brand-setup', icon: <Settings /> },
    { name: 'Platform Connections', path: '/platform-connections', icon: <Settings /> },
    { name: 'Onboarding Complete', path: '/onboarding-complete', icon: <Settings /> },
    { name: 'Dashboard Intro', path: '/dashboard-intro', icon: <Settings /> },
    { name: 'Clear Storage', path: '/clear-storage', icon: <Clear /> },
    { name: 'Settings', path: '/settings', icon: <Settings /> }
  ];

  const handleNavigate = (path) => {
    process.env.NODE_ENV === 'development' && console.log(`Navigating to: ${path}`);
    navigate(path);
  };

  const handleClearStorage = () => {
    localStorage.clear();
    alert('LocalStorage vidé ! Vous pouvez maintenant naviguer librement.');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f5f5f5',
        p: 3
      }}
    >
      <Paper
        sx={{
          p: 4,
          maxWidth: 800,
          width: '100%'
        }}
      >
        <Typography variant="h4" gutterBottom textAlign="center">
          🧭 Navigation Test
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
          Toutes les protections de routes sont temporairement désactivées.
          Cliquez sur n'importe quel bouton pour naviguer.
        </Typography>

        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Button
            variant="contained"
            color="warning"
            onClick={handleClearStorage}
            startIcon={<Clear />}
            sx={{ mb: 2 }}
          >
            Vider le LocalStorage
          </Button>
        </Box>

        <Grid container spacing={2}>
          {pages.map((page) => (
            <Grid item xs={12} sm={6} md={4} key={page.path}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={page.icon}
                onClick={() => handleNavigate(page.path)}
                sx={{
                  py: 2,
                  height: '60px',
                  fontSize: '1rem'
                }}
              >
                {page.name}
              </Button>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 3, p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
          <Typography variant="body2" color="primary">
            💡 <strong>Info :</strong> Les routes protégées sont temporairement désactivées.
            Vous pouvez maintenant accéder à toutes les pages sans authentification.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}