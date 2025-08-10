import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Paper,
  Avatar,
  Chip,
  Fade,
  Slide,
  Zoom
} from '@mui/material';
import {
  RocketLaunch,
  Store,
  ConnectWithoutContact,
  Dashboard,

  AutoAwesome,
  TrendingUp,
  Speed,
  Security,
  Star
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import SintraBackground from '../components/SintraBackground';
import AgentAvatar from '../components/AgentAvatar';
import AgentShowcase from '../components/AgentShowcase';

const Onboarding = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const { 
    getProgressPercentage,
    nextStep,
    isOnboardingComplete
  } = useOnboarding();

  useEffect(() => {
    // Seulement rediriger si l'onboarding est explicitement marqué comme terminé
    if (isOnboardingComplete === true) {
      navigate('/dashboard');
      return;
    }

    // Vérifier le statut d'onboarding depuis localStorage seulement si on a un utilisateur
    if (currentUser && currentUser.id) {
      const savedOnboardingStatus = localStorage.getItem(`onboarding_${currentUser.id}`);
      if (savedOnboardingStatus) {
        try {
          const status = JSON.parse(savedOnboardingStatus);
          if (status.complete) {
            navigate('/dashboard');
            return;
          }
        } catch (error) {
          console.error('Erreur lors de la lecture du statut d\'onboarding:', error);
        }
      }
    }
  }, [currentUser, isOnboardingComplete, navigate]);

  // Afficher l'écran de chargement seulement si l'authentification est vraiment en cours
  if (authLoading && !currentUser) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
            Chargement...
          </Typography>
          <LinearProgress sx={{ width: 200 }} />
        </Box>
      </Box>
    );
  }

  const steps = [
    { label: 'Bienvenue', icon: <RocketLaunch /> },
    { label: 'Votre Marque', icon: <Store /> },
    { label: 'Connexions', icon: <ConnectWithoutContact /> },
    { label: 'Dashboard', icon: <Dashboard /> }
  ];

  const features = [
    {
      icon: <AutoAwesome sx={{ fontSize: 40, color: '#6366f1' }} />,
      title: 'IA Avancée',
      description: '6 agents IA spécialisés pour automatiser votre e-commerce'
    },
    {
      icon: <TrendingUp sx={{ fontSize: 40, color: '#10b981' }} />,
      title: 'Croissance Rapide',
      description: 'Augmentez vos ventes de 300% en moyenne'
    },
    {
      icon: <Speed sx={{ fontSize: 40, color: '#f59e0b' }} />,
      title: 'Automatisation',
      description: 'Économisez 20h par semaine sur les tâches répétitives'
    },
    {
      icon: <Security sx={{ fontSize: 40, color: '#ef4444' }} />,
      title: 'Sécurité',
      description: 'Protection avancée et conformité RGPD'
    }
  ];

  const handleStartOnboarding = () => {
    // Petit délai pour l'animation
    setTimeout(() => {
      nextStep();
      navigate('/brand-setup');
    }, 150);
  };

  const handleSkipToDashboard = () => {
    // Marquer l'onboarding comme terminé et aller au dashboard
    if (currentUser && currentUser.id) {
      const status = {
        complete: true,
        step: 4, // COMPLETE
        brandInfo: {},
        platformConnections: {},
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(`onboarding_${currentUser.id}`, JSON.stringify(status));
      // Forcer le rechargement de la page pour que les contextes se mettent à jour
      window.location.href = '/dashboard';
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <SintraBackground>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header avec progression */}
        <Fade in={true} timeout={1000}>
          <Box sx={{ mb: 6, textAlign: 'center' }}>
            <Zoom in={true} timeout={1200}>
              <Box sx={{ mb: 3 }}>
                <AgentAvatar 
                  agentType="customer-service" 
                  size={120}
                  showPulse={true}
                />
              </Box>
            </Zoom>
            
            <Typography
              variant="h1"
              sx={{
                background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 800,
                mb: 2,
                textShadow: '0 4px 8px rgba(0,0,0,0.3)',
                fontSize: { xs: '2.5rem', md: '3.5rem' }
              }}
            >
              Bienvenue sur CommerceAI Pro
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <Chip
                icon={<Star />}
                label="Powered by AI"
                sx={{
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
                  color: 'white',
                  fontWeight: 600,
                  px: 2,
                  py: 1,
                  fontSize: '1rem',
                  boxShadow: '0 8px 32px rgba(14, 165, 233, 0.3)'
                }}
              />
            </Box>
            
            <Typography
              variant="h5"
              sx={{
                color: 'rgba(255,255,255,0.95)',
                mb: 4,
                maxWidth: 700,
                mx: 'auto',
                fontWeight: 400,
                lineHeight: 1.6,
                textShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            >
              Transformez votre e-commerce avec nos agents IA ultra-intelligents.
              Une expérience révolutionnaire vous attend.
              Configurons votre plateforme en quelques étapes simples.
            </Typography>
          </Box>
        </Fade>
          
        {/* Stepper avec design moderne */}
        <Slide in={true} direction="up" timeout={1500}>
          <Paper 
            sx={{ 
              p: 4, 
              mb: 6, 
              borderRadius: 4, 
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 25px 50px rgba(0,0,0,0.1)'
            }}
          >
            <Stepper activeStep={0} alternativeLabel>
              {steps.map((step, index) => (
                <Step key={step.label}>
                  <StepLabel
                    StepIconComponent={() => (
                      <Avatar
                        sx={{
                          width: 56,
                          height: 56,
                          background: index === 0 
                            ? 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)'
                            : 'rgba(255,255,255,0.1)',
                          color: 'white',
                          border: '2px solid rgba(255,255,255,0.2)',
                          boxShadow: index === 0 
                            ? '0 8px 32px rgba(14, 165, 233, 0.4)'
                            : '0 4px 16px rgba(0,0,0,0.1)',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {step.icon}
                      </Avatar>
                    )}
                  >
                    <Typography
                      sx={{
                        color: index === 0 ? 'white' : 'rgba(255,255,255,0.7)',
                        fontWeight: index === 0 ? 600 : 400,
                        mt: 1
                      }}
                    >
                      {step.label}
                    </Typography>
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
            
            {/* Barre de progression */}
            <Box sx={{ mt: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Progression
                </Typography>
                <Chip
                  label={`${getProgressPercentage()}%`}
                  size="small"
                  sx={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    fontWeight: 600
                  }}
                />
              </Box>
              <LinearProgress
                variant="determinate"
                value={getProgressPercentage()}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  background: 'rgba(255,255,255,0.1)',
                  '& .MuiLinearProgress-bar': {
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderRadius: 4,
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)'
                  }
                }}
              />
            </Box>
          </Paper>
        </Slide>

        {/* Contenu principal avec grille */}
        <Fade in={true} timeout={2000}>
          <Card
            sx={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4,
              boxShadow: '0 25px 50px rgba(0,0,0,0.1)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 35px 70px rgba(0,0,0,0.15)',
                background: 'rgba(255,255,255,0.08)'
              }
            }}
          >
            <CardContent sx={{ p: 6 }}>
              <Grid container spacing={6} alignItems="center">
                {/* Section Présentation */}
                <Grid item xs={12} md={6}>
                  <Typography
                    variant="h4"
                    sx={{
                      color: 'white',
                      fontWeight: 'bold',
                      mb: 3,
                      textShadow: '0 4px 8px rgba(0,0,0,0.3)'
                    }}
                  >
                    Révolutionnez votre E-commerce
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: 'rgba(255,255,255,0.9)',
                      mb: 4,
                      fontSize: '1.1rem',
                      lineHeight: 1.7
                    }}
                  >
                    CommerceAI Pro vous donne accès à une suite complète d'agents IA 
                    qui transforment votre façon de gérer votre business en ligne.
                  </Typography>
                  
                  <Box sx={{ mb: 4 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        color: 'white',
                        fontWeight: 'bold',
                        mb: 2
                      }}
                    >
                      Ce qui vous attend :
                    </Typography>
                    
                    <Grid container spacing={2}>
                      {features.map((feature, index) => (
                        <Grid item xs={12} sm={6} key={index}>
                          <Zoom in={true} timeout={1000 + index * 200}>
                            <Card
                              sx={{
                                height: '100%',
                                background: 'rgba(255,255,255,0.1)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: 3,
                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                cursor: 'pointer',
                                '&:hover': {
                                  transform: 'translateY(-8px) scale(1.02)',
                                  boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
                                  background: 'rgba(255,255,255,0.15)',
                                  border: '1px solid rgba(255,255,255,0.3)'
                                }
                              }}
                            >
                              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                                <Box 
                                  sx={{ 
                                    mb: 2,
                                    '& svg': {
                                      filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                                    }
                                  }}
                                >
                                  {feature.icon}
                                </Box>
                                <Typography
                                  variant="h6"
                                  sx={{ 
                                    fontWeight: 'bold', 
                                    mb: 1, 
                                    color: 'white',
                                    textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                  }}
                                >
                                  {feature.title}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{ 
                                    color: 'rgba(255,255,255,0.9)',
                                    lineHeight: 1.6
                                  }}
                                >
                                  {feature.description}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Zoom>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                </Grid>

                {/* Section Agents IA */}
                <Grid item xs={12} md={6}>
                  <Typography
                    variant="h5"
                    sx={{
                      color: 'white',
                      fontWeight: 'bold',
                      mb: 3,
                      textAlign: 'center',
                      textShadow: '0 4px 8px rgba(0,0,0,0.3)'
                    }}
                  >
                    Rencontrez vos Agents IA
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: 'rgba(255,255,255,0.8)',
                      mb: 4,
                      textAlign: 'center'
                    }}
                  >
                    Une équipe d'agents intelligents prêts à révolutionner votre e-commerce
                  </Typography>
                  
                  <AgentShowcase 
                    variant="compact"
                    onAgentSelect={(agent) => process.env.NODE_ENV === 'development' && console.log('Agent sélectionné:', agent)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Fade>

        {/* Call to Action ultra moderne */}
        <Fade in={true} timeout={3000}>
          <Box sx={{ textAlign: 'center', mt: 6 }}>
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="h4"
                sx={{
                  color: 'white',
                  fontWeight: 700,
                  mb: 2,
                  textShadow: '0 4px 8px rgba(0,0,0,0.3)'
                }}
              >
                Prêt à transformer votre e-commerce ?
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: 'rgba(255,255,255,0.8)',
                  mb: 4,
                  fontWeight: 400
                }}
              >
                Rejoignez des milliers d'entrepreneurs qui ont révolutionné leur business
              </Typography>
            </Box>
            
            <Zoom in={true} timeout={3500}>
              <Button
                variant="contained"
                size="large"
                onClick={handleStartOnboarding}
                startIcon={<RocketLaunch />}
                sx={{
                  px: 8,
                  py: 3,
                  fontSize: '1.3rem',
                  fontWeight: 700,
                  borderRadius: 4,
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 50%, #6366f1 100%)',
                  boxShadow: '0 20px 40px rgba(14, 165, 233, 0.4)',
                  border: '2px solid rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                    transition: 'left 0.5s'
                  },
                  '&:hover': {
                    transform: 'translateY(-4px) scale(1.05)',
                    boxShadow: '0 25px 50px rgba(14, 165, 233, 0.6)',
                    '&:before': {
                      left: '100%'
                    }
                  }
                }}
              >
                Commencer l'aventure IA
              </Button>
            </Zoom>
            
            {/* Bouton pour passer directement au dashboard */}
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="outlined"
                onClick={handleSkipToDashboard}
                startIcon={<Dashboard />}
                sx={{
                  color: 'rgba(255,255,255,0.9)',
                  borderColor: 'rgba(255,255,255,0.3)',
                  px: 4,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 500,
                  borderRadius: 3,
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: 'rgba(255,255,255,0.6)',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                Passer au Dashboard
              </Button>
            </Box>
            
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 3 }}>
              <Chip
                icon={<Speed />}
                label="Configuration en 3 étapes"
                sx={{
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              />
              <Chip
                icon={<AutoAwesome />}
                label="5 minutes seulement"
                sx={{
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              />
              <Chip
                icon={<Security />}
                label="100% sécurisé"
                sx={{
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              />
            </Box>
          </Box>
        </Fade>

        {/* Footer */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255,255,255,0.7)'
            }}
          >
            🔒 Vos données sont sécurisées et chiffrées
          </Typography>
        </Box>
      </Container>
    </SintraBackground>
  );
};

export default Onboarding;