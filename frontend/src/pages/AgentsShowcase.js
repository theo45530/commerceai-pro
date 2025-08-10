import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Fade,
  Slide,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ArrowBack,
  Dashboard,
  PlayArrow,
  Pause
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import AnimatedBackground from '../components/AnimatedBackground';
import AgentShowcase from '../components/AgentShowcase';

const AgentsShowcase = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  const handleAgentSelect = (agentType) => {
    setSelectedAgents(prev => {
      if (prev.includes(agentType)) {
        return prev.filter(agent => agent !== agentType);
      } else {
        return [...prev, agentType];
      }
    });
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <AnimatedBackground variant="particles" particles={true} intensity="high">
      {/* Header avec navigation */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: 'rgba(15, 15, 35, 0.9)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          py: 2
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Tooltip title="Retour">
                <IconButton
                  onClick={handleGoBack}
                  sx={{
                    color: 'white',
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.2)',
                      transform: 'scale(1.05)'
                    }
                  }}
                >
                  <ArrowBack />
                </IconButton>
              </Tooltip>
              
              <Typography
                variant="h6"
                sx={{
                  color: 'white',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #ffffff 0%, #a78bfa 50%, #60a5fa 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                Showcase des Agents IA
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Tooltip title={isAutoPlay ? "Pause" : "Play"}>
                <IconButton
                  onClick={() => setIsAutoPlay(!isAutoPlay)}
                  sx={{
                    color: 'white',
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.2)',
                      transform: 'scale(1.05)'
                    }
                  }}
                >
                  {isAutoPlay ? <Pause /> : <PlayArrow />}
                </IconButton>
              </Tooltip>
              
              <Button
                variant="contained"
                startIcon={<Dashboard />}
                onClick={handleGoToDashboard}
                sx={{
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
                  borderRadius: 3,
                  px: 3,
                  py: 1,
                  fontWeight: 600,
                  boxShadow: '0 8px 32px rgba(14, 165, 233, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 40px rgba(14, 165, 233, 0.4)'
                  }
                }}
              >
                Dashboard
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Contenu principal */}
      <Box sx={{ pt: 12 }}>
        <Fade in={true} timeout={1000}>
          <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* Titre et description */}
            <Box sx={{ textAlign: 'center', mb: 6 }}>
              <Slide in={true} direction="down" timeout={1200}>
                <Typography
                  variant="h2"
                  sx={{
                    fontSize: { xs: '2.5rem', md: '4rem' },
                    fontWeight: 900,
                    background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 3,
                    textShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    letterSpacing: '-0.02em'
                  }}
                >
                  L'Écosystème IA
                </Typography>
              </Slide>
              
              <Slide in={true} direction="up" timeout={1400}>
                <Typography
                  variant="h5"
                  sx={{
                    color: 'rgba(255,255,255,0.9)',
                    maxWidth: '800px',
                    mx: 'auto',
                    fontWeight: 400,
                    lineHeight: 1.6,
                    mb: 4
                  }}
                >
                  Découvrez en détail chaque agent IA et leurs capacités extraordinaires.
                  Cliquez sur les agents pour les sélectionner et voir leurs interactions.
                </Typography>
              </Slide>
              
              {selectedAgents.length > 0 && (
                <Fade in={true} timeout={800}>
                  <Box
                    sx={{
                      background: 'rgba(99, 102, 241, 0.1)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      borderRadius: 3,
                      p: 3,
                      maxWidth: '600px',
                      mx: 'auto'
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        color: 'white',
                        fontWeight: 600,
                        mb: 1
                      }}
                    >
                      Agents sélectionnés ({selectedAgents.length})
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        color: 'rgba(255, 255, 255, 0.8)'
                      }}
                    >
                      {selectedAgents.join(', ')}
                    </Typography>
                  </Box>
                </Fade>
              )}
            </Box>

            {/* Showcase des agents */}
            <AgentShowcase
              variant="showcase"
              onAgentSelect={handleAgentSelect}
              selectedAgents={selectedAgents}
            />

            {/* Call to action */}
            <Fade in={true} timeout={2000}>
              <Box sx={{ textAlign: 'center', mt: 8 }}>
                <Typography
                  variant="h4"
                  sx={{
                    color: 'white',
                    fontWeight: 700,
                    mb: 3,
                    textShadow: '0 4px 8px rgba(0,0,0,0.3)'
                  }}
                >
                  Prêt à utiliser ces agents ?
                </Typography>
                
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Dashboard />}
                  onClick={handleGoToDashboard}
                  sx={{
                    px: 6,
                    py: 2.5,
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    borderRadius: 4,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    boxShadow: '0 20px 40px rgba(16, 185, 129, 0.4)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-4px) scale(1.05)',
                      boxShadow: '0 25px 50px rgba(16, 185, 129, 0.6)'
                    }
                  }}
                >
                  Accéder au Dashboard
                </Button>
              </Box>
            </Fade>
          </Container>
        </Fade>
      </Box>
    </AnimatedBackground>
  );
};

export default AgentsShowcase;