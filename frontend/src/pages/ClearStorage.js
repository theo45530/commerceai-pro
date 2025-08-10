import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Box, Typography, Paper, Alert } from '@mui/material';
import { Delete, Refresh } from '@mui/icons-material';

export default function ClearStorage() {
  const navigate = useNavigate();

  const handleClearOnboardingData = () => {
    // Supprimer toutes les données d'onboarding du localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('onboarding_')) {
        localStorage.removeItem(key);
      }
    });
    
    alert('Données d\'onboarding supprimées ! Vous pouvez maintenant accéder à /login normalement.');
  };

  const handleClearAllData = () => {
    localStorage.clear();
    alert('Toutes les données localStorage supprimées ! Redirection vers /login...');
    setTimeout(() => {
      navigate('/login');
    }, 1000);
  };

  const handleGoToLogin = () => {
    navigate('/login');
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
          maxWidth: 500,
          width: '100%',
          textAlign: 'center'
        }}
      >
        <Typography variant="h4" gutterBottom>
          Nettoyage du Storage
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          Si vous êtes redirigé automatiquement de /login vers /brand-setup, 
          c'est probablement dû aux données d'onboarding sauvegardées.
        </Alert>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<Delete />}
            onClick={handleClearOnboardingData}
            sx={{ py: 1.5 }}
          >
            Supprimer les données d'onboarding
          </Button>

          <Button
            variant="outlined"
            startIcon={<Delete />}
            onClick={handleClearAllData}
            color="warning"
            sx={{ py: 1.5 }}
          >
            Supprimer toutes les données localStorage
          </Button>

          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={handleGoToLogin}
            color="success"
            sx={{ py: 1.5 }}
          >
            Aller à la page de connexion
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}