import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Container, Typography, Box } from '@mui/material';

const TestDashboard = () => {
  const navigate = useNavigate();

  const handleCompleteOnboarding = () => {
    // Simuler un utilisateur avec onboarding complété
    const testUser = {
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User'
    };
    
    const onboardingStatus = {
      complete: true,
      step: 4,
      brandInfo: {
        brandName: 'Test Brand',
        websiteUrl: 'https://test.com',
        businessType: 'E-commerce',
        foundedYear: '2020',
        description: 'Test description',
        targetAudience: 'Test audience',
        mainProducts: 'Test products',
        monthlyRevenue: '10000',
        currentChallenges: []
      },
      platformConnections: {
        meta: { connected: false, status: 'disconnected', data: null },
        google: { connected: false, status: 'disconnected', data: null },
        instagram: { connected: false, status: 'disconnected', data: null },
        tiktok: { connected: false, status: 'disconnected', data: null },
        whatsapp: { connected: false, status: 'disconnected', data: null },
        shopify: { connected: false, status: 'disconnected', data: null },
        linkedin: { connected: false, status: 'disconnected', data: null },
        twitter: { connected: false, status: 'disconnected', data: null }
      },
      lastUpdated: new Date().toISOString()
    };
    
    // Sauvegarder dans localStorage
    localStorage.setItem(`onboarding_${testUser.id}`, JSON.stringify(onboardingStatus));
    localStorage.setItem('token', 'test-token-123');
    localStorage.setItem('currentUser', JSON.stringify(testUser));
    
    // Rediriger vers le dashboard
    navigate('/dashboard');
    window.location.reload();
  };

  const handleClearStorage = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box textAlign="center">
        <Typography variant="h4" gutterBottom>
          Test Dashboard Access
        </Typography>
        <Typography variant="body1" sx={{ mb: 4 }}>
          Utilisez ces boutons pour tester l'accès au dashboard
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleCompleteOnboarding}
            size="large"
          >
            Simuler Onboarding Complété
          </Button>
          
          <Button 
            variant="outlined" 
            color="secondary" 
            onClick={handleClearStorage}
            size="large"
          >
            Vider le Storage
          </Button>
        </Box>
        
        <Typography variant="caption" sx={{ mt: 2, display: 'block' }}>
          Ceci est une page de test pour contourner l'onboarding
        </Typography>
      </Box>
    </Container>
  );
};

export default TestDashboard;