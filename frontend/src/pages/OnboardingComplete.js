import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Fade,
  Slide,
  Zoom,
  Chip
} from '@mui/material';
import {
  CheckCircle,
  ArrowForward,
  Celebration
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import SintraBackground from '../components/SintraBackground';
import AgentAvatar from '../components/AgentAvatar';

const OnboardingComplete = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  const handleContinue = () => {
    navigate('/dashboard');
  };

  return (
    <SintraBackground>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          py: 4,
          position: 'relative',
          zIndex: 1
        }}
      >
        <Container maxWidth="md">
          {/* En-tête de félicitations */}
          <Fade in={true} timeout={1000}>
            <Box sx={{ textAlign: 'center', mb: 6 }}>
              <Zoom in={true} timeout={1500}>
                <Box sx={{ mb: 4 }}>
                  <AgentAvatar agentType="marketing" size={120} showPulse={true} />
                </Box>
              </Zoom>
              
              <Slide in={true} direction="down" timeout={2000}>
                <Box>
                  <Typography
                    variant="h2"
                    sx={{
                      background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                      fontWeight: 800,
                      mb: 2,
                      textShadow: '0 2px 10px rgba(255,255,255,0.1)'
                    }}
                  >
                    Félicitations ! 🎉
                  </Typography>
                  
                  <Chip
                    icon={<Celebration />}
                    label="Configuration terminée"
                    sx={{
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '1.1rem',
                      px: 3,
                      py: 1,
                      mb: 3,
                      '& .MuiChip-icon': {
                        color: 'white'
                      }
                    }}
                  />
                  
                  <Typography
                    variant="h5"
                    sx={{
                      color: 'rgba(255,255,255,0.9)',
                      fontWeight: 400,
                      mb: 4
                    }}
                  >
                    Votre compte CommerceAI Pro est maintenant configuré et prêt à l'emploi !
                  </Typography>
                </Box>
              </Slide>
            </Box>
          </Fade>

          {/* Carte de résumé */}
          <Fade in={true} timeout={2500}>
            <Card
              sx={{
                mb: 4,
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 4,
                boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
                transition: 'all 0.3s ease'
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  <CheckCircle
                    sx={{
                      fontSize: 80,
                      color: '#22c55e',
                      mb: 2,
                      filter: 'drop-shadow(0 4px 8px rgba(34, 197, 94, 0.3))'
                    }}
                  />
                  
                  <Typography
                    variant="h4"
                    sx={{
                      color: 'white',
                      fontWeight: 700,
                      mb: 2
                    }}
                  >
                    Configuration réussie !
                  </Typography>
                  
                  <Typography
                    variant="body1"
                    sx={{
                      color: 'rgba(255,255,255,0.8)',
                      fontSize: '1.1rem',
                      lineHeight: 1.6,
                      maxWidth: '600px',
                      mx: 'auto'
                    }}
                  >
                    Votre profil d'entreprise a été créé avec succès. Nos agents IA sont maintenant 
                    configurés pour optimiser vos campagnes marketing et booster vos ventes.
                  </Typography>
                </Box>

                {/* Prochaines étapes */}
                <Box sx={{ mt: 4 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      color: 'white',
                      fontWeight: 600,
                      mb: 3,
                      textAlign: 'center'
                    }}
                  >
                    Prochaines étapes :
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {[
                      '🤖 Explorez vos agents IA personnalisés',
                      '📊 Consultez votre tableau de bord analytique',
                      '🚀 Lancez votre première campagne optimisée',
                      '💡 Découvrez les recommandations IA'
                    ].map((step, index) => (
                      <Slide key={index} in={true} direction="left" timeout={3000 + index * 200}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            p: 2,
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: 2,
                            border: '1px solid rgba(255,255,255,0.2)'
                          }}
                        >
                          <Typography
                            variant="body1"
                            sx={{
                              color: 'white',
                              fontWeight: 500,
                              fontSize: '1rem'
                            }}
                          >
                            {step}
                          </Typography>
                        </Box>
                      </Slide>
                    ))}
                  </Box>
                </Box>

                {/* Bouton d'action */}
                <Slide in={true} direction="up" timeout={3500}>
                  <Box sx={{ textAlign: 'center', mt: 4 }}>
                    <Button
                      variant="contained"
                      size="large"
                      endIcon={<ArrowForward />}
                      onClick={handleContinue}
                      sx={{
                        background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
                        color: 'white',
                        borderRadius: 3,
                        px: 6,
                        py: 2,
                        fontSize: '1.2rem',
                        fontWeight: 700,
                        boxShadow: '0 8px 32px rgba(14, 165, 233, 0.4)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                          transform: 'translateY(-3px)',
                          boxShadow: '0 12px 40px rgba(14, 165, 233, 0.5)'
                        }
                      }}
                    >
                      Accéder au Dashboard
                    </Button>
                  </Box>
                </Slide>
              </CardContent>
            </Card>
          </Fade>

          {/* Message de sécurité */}
          <Fade in={true} timeout={4000}>
            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '0.9rem'
                }}
              >
                🔒 Vos données sont sécurisées et protégées par un chiffrement de niveau entreprise
              </Typography>
            </Box>
          </Fade>
        </Container>
      </Box>
    </SintraBackground>
  );
};

export default OnboardingComplete;