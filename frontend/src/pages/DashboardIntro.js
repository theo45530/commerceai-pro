import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Paper,
  Avatar,
  Chip,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
  Fade,
  Zoom,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CheckCircle,
  Dashboard,
  RocketLaunch,
  AutoAwesome,
  TrendingUp,
  Security,
  Speed,
  SupportAgent,
  Campaign,
  Create,
  Analytics,
  Web,
  Email,
  ArrowForward,
  PlayArrow,
  Celebration
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../contexts/OnboardingContext';

const DashboardIntro = () => {
  const navigate = useNavigate();
  const { currentUser, loading } = useAuth();
  const { brandInfo, platformConnections, completeOnboarding } = useOnboarding();
  const [currentStep, setCurrentStep] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (!loading && !currentUser) {
      navigate('/login');
      return;
    }

    if (currentUser) {
      // Animation d'introduction
      setShowCelebration(true);
      const timer = setTimeout(() => {
        setCurrentStep(1);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [currentUser, loading, navigate]);

  // Show loading while auth is being determined
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        <Typography variant="h6" color="white">
          Chargement...
        </Typography>
      </Box>
    );
  }

  const agents = [
    {
      id: 'customer-service',
      name: 'Service Client IA',
      icon: <SupportAgent sx={{ fontSize: 40, color: '#6366f1' }} />,
      description: 'Réponses automatiques 24/7',
      status: 'Prêt',
      color: '#6366f1'
    },
    {
      id: 'advertising',
      name: 'Publicité IA',
      icon: <Campaign sx={{ fontSize: 40, color: '#10b981' }} />,
      description: 'Campagnes optimisées automatiquement',
      status: 'Prêt',
      color: '#10b981'
    },
    {
      id: 'content-creator',
      name: 'Créateur de Contenu',
      icon: <Create sx={{ fontSize: 40, color: '#f59e0b' }} />,
      description: 'Contenu engageant pour vos réseaux',
      status: 'Prêt',
      color: '#f59e0b'
    },
    {
      id: 'analysis',
      name: 'Analyse IA',
      icon: <Analytics sx={{ fontSize: 40, color: '#ef4444' }} />,
      description: 'Insights et recommandations',
      status: 'Prêt',
      color: '#ef4444'
    },
    {
      id: 'page-generator',
      name: 'Générateur de Pages',
      icon: <Web sx={{ fontSize: 40, color: '#8b5cf6' }} />,
      description: 'Pages de vente optimisées',
      status: 'Prêt',
      color: '#8b5cf6'
    },
    {
      id: 'email',
      name: 'Email Marketing IA',
      icon: <Email sx={{ fontSize: 40, color: '#06b6d4' }} />,
      description: 'Campagnes email personnalisées',
      status: 'Prêt',
      color: '#06b6d4'
    }
  ];

  const connectedPlatforms = Object.entries(platformConnections)
    .filter(([_, connection]) => connection.connected)
    .map(([platform, _]) => platform);

  const handleStartDashboard = async () => {
    try {
      await completeOnboarding();
      navigate('/');
    } catch (error) {
      console.error('Erreur lors de la finalisation:', error);
      navigate('/');
    }
  };

  const handleExploreAgent = (agentId) => {
    navigate(`/agents/${agentId}`);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        py: 4,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Particules d'animation */}
      {showCelebration && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 1
          }}
        >
          {[...Array(20)].map((_, i) => (
            <Zoom
              key={i}
              in={showCelebration}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: ['#fbbf24', '#10b981', '#6366f1', '#ef4444'][Math.floor(Math.random() * 4)],
                  animation: 'float 3s ease-in-out infinite',
                  '@keyframes float': {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-20px)' }
                  }
                }}
              />
            </Zoom>
          ))}
        </Box>
      )}

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
        {/* Header de félicitations */}
        <Fade in={showCelebration} timeout={1000}>
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Avatar
              sx={{
                width: 100,
                height: 100,
                bgcolor: '#10b981',
                mx: 'auto',
                mb: 3,
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': { transform: 'scale(1)' },
                  '50%': { transform: 'scale(1.1)' },
                  '100%': { transform: 'scale(1)' }
                }
              }}
            >
              <Celebration sx={{ fontSize: 50 }} />
            </Avatar>
            
            <Typography
              variant="h2"
              sx={{
                color: 'white',
                fontWeight: 'bold',
                mb: 2,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}
            >
              Félicitations {brandInfo.brandName ? brandInfo.brandName : currentUser?.firstName} ! 🎉
            </Typography>
            
            <Typography
              variant="h5"
              sx={{
                color: 'rgba(255,255,255,0.9)',
                mb: 3,
                maxWidth: 800,
                mx: 'auto'
              }}
            >
              Votre plateforme CommerceAI Pro est maintenant configurée et prête à transformer votre e-commerce !
            </Typography>

            <Chip
              icon={<CheckCircle />}
              label="Configuration terminée avec succès"
              sx={{
                bgcolor: '#10b981',
                color: 'white',
                fontSize: '1.1rem',
                py: 3,
                px: 2
              }}
            />
          </Box>
        </Fade>

        {/* Résumé de la configuration */}
        <Fade in={currentStep >= 1} timeout={1000}>
          <Paper sx={{ p: 4, mb: 4, borderRadius: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, textAlign: 'center' }}>
              Résumé de votre configuration
            </Typography>
            
            <Grid container spacing={3}>
              {/* Informations de la marque */}
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%', bgcolor: '#f8fafc' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ bgcolor: '#6366f1', mr: 2 }}>
                        <RocketLaunch />
                      </Avatar>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        Votre Marque
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Nom :</strong> {brandInfo.brandName || 'Non défini'}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Site web :</strong> {brandInfo.websiteUrl || 'Non défini'}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Secteur :</strong> {brandInfo.industry || 'Non défini'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Âge :</strong> {brandInfo.businessAge || 'Non défini'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Plateformes connectées */}
              <Grid item xs={12} md={6}>
                <Card sx={{ height: '100%', bgcolor: '#f0fdf4' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ bgcolor: '#10b981', mr: 2 }}>
                        <CheckCircle />
                      </Avatar>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        Plateformes Connectées
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {connectedPlatforms.length > 0 ? (
                        connectedPlatforms.map((platform) => (
                          <Chip
                            key={platform}
                            label={platform.charAt(0).toUpperCase() + platform.slice(1)}
                            color="success"
                            size="small"
                          />
                        ))
                      ) : (
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>
                          Aucune plateforme connectée
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ mt: 2, color: '#6b7280' }}>
                      {connectedPlatforms.length} plateforme(s) prête(s) à l'emploi
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Fade>

        {/* Agents IA disponibles */}
        <Fade in={currentStep >= 1} timeout={1500}>
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h4"
              sx={{
                color: 'white',
                fontWeight: 'bold',
                textAlign: 'center',
                mb: 4,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}
            >
              Vos 6 Agents IA sont prêts ! 🤖
            </Typography>
            
            <Grid container spacing={3}>
              {agents.map((agent, index) => (
                <Grid item xs={12} sm={6} md={4} key={agent.id}>
                  <Zoom
                    in={currentStep >= 1}
                    style={{ transitionDelay: `${index * 200}ms` }}
                  >
                    <Card
                      sx={{
                        height: '100%',
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                        border: '2px solid transparent',
                        borderRadius: 3,
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                          borderColor: agent.color
                        }
                      }}
                      onClick={() => handleExploreAgent(agent.id)}
                    >
                      <CardContent sx={{ p: 3, textAlign: 'center' }}>
                        <Box sx={{ mb: 2 }}>
                          {agent.icon}
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                          {agent.name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>
                          {agent.description}
                        </Typography>
                        <Chip
                          icon={<CheckCircle />}
                          label={agent.status}
                          color="success"
                          size="small"
                        />
                        <Box sx={{ mt: 2 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<PlayArrow />}
                            sx={{
                              borderColor: agent.color,
                              color: agent.color,
                              '&:hover': {
                                borderColor: agent.color,
                                bgcolor: `${agent.color}10`
                              }
                            }}
                          >
                            Explorer
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Zoom>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Fade>

        {/* Prochaines étapes */}
        <Fade in={currentStep >= 1} timeout={2000}>
          <Paper sx={{ p: 4, mb: 4, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.95)' }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, textAlign: 'center' }}>
              Prochaines étapes recommandées
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Avatar sx={{ bgcolor: '#6366f1', mx: 'auto', mb: 1 }}>
                    <Campaign />
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    1. Créer votre première campagne
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Avatar sx={{ bgcolor: '#10b981', mx: 'auto', mb: 1 }}>
                    <Analytics />
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    2. Analyser vos performances
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Avatar sx={{ bgcolor: '#f59e0b', mx: 'auto', mb: 1 }}>
                    <Create />
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    3. Générer du contenu
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Avatar sx={{ bgcolor: '#ef4444', mx: 'auto', mb: 1 }}>
                    <SupportAgent />
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    4. Configurer le support client
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Fade>

        {/* Bouton d'accès au dashboard */}
        <Fade in={currentStep >= 1} timeout={2500}>
          <Box sx={{ textAlign: 'center' }}>
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowForward />}
              onClick={handleStartDashboard}
              sx={{
                bgcolor: '#10b981',
                px: 6,
                py: 2,
                fontSize: '1.2rem',
                fontWeight: 'bold',
                borderRadius: 3,
                textTransform: 'none',
                boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)',
                '&:hover': {
                  bgcolor: '#059669',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 15px 20px -3px rgba(16, 185, 129, 0.4)'
                }
              }}
            >
              Accéder à mon Dashboard
            </Button>
            
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255,255,255,0.8)',
                mt: 2
              }}
            >
              🚀 Votre aventure CommerceAI Pro commence maintenant !
            </Typography>
          </Box>
        </Fade>
      </Container>
    </Box>
  );
};

export default DashboardIntro;