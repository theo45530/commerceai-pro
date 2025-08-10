import React, { useState, useEffect } from 'react';
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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  CheckCircle,
  ConnectWithoutContact,
  Dashboard,
  ArrowBack,
  ArrowForward,
  Settings,
  Facebook,
  Google,
  Instagram,
  WhatsApp,
  ShoppingCart,
  Security,
  Email
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import SintraBackground from '../components/SintraBackground';

const PlatformConnections = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { 
    onboardingStep, 
    platformConnections,
    updatePlatformConnections,
    nextStep,
    previousStep,
    getProgressPercentage,
    ONBOARDING_STEPS
  } = useOnboarding();

  const [connections, setConnections] = useState(platformConnections);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionDialog, setConnectionDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Attendre que l'authentification soit vérifiée
    if (currentUser === null) {
      return; // Encore en cours de chargement
    }

    // Si pas d'utilisateur connecté, rediriger vers login
    if (!currentUser) {
      navigate('/login');
      return;
    }

    // Vérification temporairement désactivée pour déboguer
    // if (onboardingStep !== ONBOARDING_STEPS.PLATFORM_CONNECTIONS) {
    //   navigate('/onboarding');
    // }
  }, [currentUser, onboardingStep, navigate, ONBOARDING_STEPS]);

  // Handle OAuth callback parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const connectedPlatform = urlParams.get('connected');
    const accountName = urlParams.get('account');
    const isDemo = urlParams.get('demo');
    
    if (connectedPlatform && accountName) {
      // Update the connection state
      const updatedConnections = {
        ...connections,
        [connectedPlatform]: {
          connected: true,
          connectedAt: new Date().toISOString(),
          status: 'active',
          accountName: decodeURIComponent(accountName),
          demo: isDemo === 'true'
        }
      };
      
      setConnections(updatedConnections);
      updatePlatformConnections(updatedConnections);
      
      // Show success message
      const platformNames = {
        meta: 'Meta Ads',
        instagram: 'Instagram',
        shopify: 'Shopify',
        tiktok: 'TikTok',
        gmail: 'Gmail',
        whatsapp: 'WhatsApp Business'
      };
      
      setSuccessMessage(`✅ ${platformNames[connectedPlatform] || connectedPlatform} connecté avec succès !`);
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [connections, updatePlatformConnections]);

  const steps = [
    { label: 'Bienvenue', icon: <CheckCircle /> },
    { label: 'Votre Marque', icon: <CheckCircle /> },
    { label: 'Connexions', icon: <ConnectWithoutContact /> },
    { label: 'Dashboard', icon: <Dashboard /> }
  ];

  const platforms = [
    {
      id: 'meta',
      name: 'Meta Business',
      description: 'Facebook & Instagram Ads',
      icon: <Facebook sx={{ fontSize: 40, color: '#1877f2' }} />,
      color: '#1877f2',
      required: true,
      features: ['Campagnes publicitaires', 'Audiences personnalisées', 'Pixel de conversion'],
      setupFields: [
        { key: 'accessToken', label: 'Token d\'accès', type: 'password' },
        { key: 'adAccountId', label: 'ID du compte publicitaire', type: 'text' },
        { key: 'pixelId', label: 'ID du Pixel Facebook', type: 'text' }
      ]
    },
    {
      id: 'google',
      name: 'Google Ads',
      description: 'Publicités Google & YouTube',
      icon: <Google sx={{ fontSize: 40, color: '#4285f4' }} />,
      color: '#4285f4',
      required: true,
      features: ['Google Ads', 'YouTube Ads', 'Google Analytics'],
      setupFields: [
        { key: 'clientId', label: 'Client ID', type: 'text' },
        { key: 'clientSecret', label: 'Client Secret', type: 'password' },
        { key: 'customerId', label: 'Customer ID', type: 'text' }
      ]
    },
    {
      id: 'instagram',
      name: 'Instagram Business',
      description: 'Gestion du contenu Instagram',
      icon: <Instagram sx={{ fontSize: 40, color: '#E4405F' }} />,
      color: '#E4405F',
      required: false,
      features: ['Publication automatique', 'Stories', 'Analytics'],
      setupFields: [
        { key: 'accessToken', label: 'Token d\'accès Instagram', type: 'password' },
        { key: 'businessAccountId', label: 'ID du compte business', type: 'text' }
      ]
    },
    {
      id: 'tiktok',
      name: 'TikTok Ads',
      description: 'Publicités TikTok',
      icon: (
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(45deg, #ff0050, #00f2ea)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '16px'
          }}
        >
          TT
        </Box>
      ),
      color: '#ff0050',
      required: false,
      features: ['TikTok Ads Manager', 'Audiences', 'Créatifs vidéo'],
      setupFields: [
        { key: 'accessToken', label: 'Token d\'accès TikTok', type: 'password' },
        { key: 'advertiserId', label: 'Advertiser ID', type: 'text' }
      ]
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Business',
      description: 'Messagerie client automatisée',
      icon: <WhatsApp sx={{ fontSize: 40, color: '#25d366' }} />,
      color: '#25d366',
      required: false,
      features: ['Messages automatiques', 'Support client', 'Notifications'],
      setupFields: [
        { key: 'phoneNumberId', label: 'ID du numéro de téléphone', type: 'text' },
        { key: 'accessToken', label: 'Token d\'accès WhatsApp', type: 'password' }
      ]
    },
    {
      id: 'shopify',
      name: 'Shopify',
      description: 'Synchronisation e-commerce',
      icon: <ShoppingCart sx={{ fontSize: 40, color: '#96bf48' }} />,
      color: '#96bf48',
      required: false,
      features: ['Synchronisation produits', 'Commandes', 'Inventaire'],
      setupFields: [
        { key: 'shopDomain', label: 'Domaine de la boutique', type: 'text', placeholder: 'monshop.myshopify.com' },
        { key: 'accessToken', label: 'Token d\'accès Shopify', type: 'password' }
      ]
    },
    {
      id: 'gmail',
      name: 'Gmail',
      description: 'Automatisation email et newsletters',
      icon: <Email sx={{ fontSize: 40, color: '#EA4335' }} />,
      color: '#EA4335',
      required: false,
      features: ['Envoi d\'emails', 'Templates', 'Newsletters'],
      setupFields: [
        { key: 'clientId', label: 'Client ID Google', type: 'text' },
        { key: 'clientSecret', label: 'Client Secret Google', type: 'password' },
        { key: 'refreshToken', label: 'Refresh Token', type: 'password' }
      ]
    }
  ];

  const handleConnectPlatform = async (platform) => {
    setIsConnecting(true);
    
    try {
      const token = localStorage.getItem('token');
      
      // Get OAuth URL from API and redirect immediately
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/auth/oauth/${platform.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success && data.authUrl) {
        // Redirect to the OAuth URL for real platform connection
        window.location.href = data.authUrl;
      } else {
        console.error(`Failed to get ${platform.name} OAuth URL:`, data.message);
        // Fallback to manual setup dialog
        setSelectedPlatform(platform);
        setConnectionDialog(true);
      }
    } catch (error) {
      console.error(`Error connecting ${platform.name}:`, error);
      // Fallback to manual setup dialog
      setSelectedPlatform(platform);
      setConnectionDialog(true);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectionSubmit = async () => {
    if (!selectedPlatform) return;

    setIsConnecting(true);
    
    try {
      // Simuler la connexion à la plateforme
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const updatedConnections = {
        ...connections,
        [selectedPlatform.id]: {
          connected: true,
          connectedAt: new Date().toISOString(),
          status: 'active'
        }
      };
      
      setConnections(updatedConnections);
      await updatePlatformConnections(updatedConnections);
      
      setConnectionDialog(false);
      setSelectedPlatform(null);
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSkipConnection = (platformId) => {
    const updatedConnections = {
      ...connections,
      [platformId]: {
        connected: false,
        skipped: true,
        status: 'skipped'
      }
    };
    
    setConnections(updatedConnections);
    updatePlatformConnections(updatedConnections);
  };

  const getConnectionStatus = (platformId) => {
    const connection = connections[platformId];
    if (!connection) return 'not_connected';
    if (connection.connected) return 'connected';
    if (connection.skipped) return 'skipped';
    return 'not_connected';
  };

  const getConnectedCount = () => {
    return Object.values(connections).filter(conn => conn?.connected).length;
  };

  const getRequiredConnectedCount = () => {
    const requiredPlatforms = platforms.filter(p => p.required);
    return requiredPlatforms.filter(p => connections[p.id]?.connected).length;
  };

  const canProceed = () => {
    const requiredPlatforms = platforms.filter(p => p.required);
    return requiredPlatforms.every(p => connections[p.id]?.connected);
  };

  const handleContinue = async () => {
    if (!canProceed()) return;
    
    setIsLoading(true);
    
    try {
      await nextStep();
      navigate('/dashboard-intro');
    } catch (error) {
      console.error('Erreur lors de la navigation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    previousStep();
    navigate('/brand-setup');
  };

  return (
    <SintraBackground>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header avec progression */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography
            variant="h4"
            sx={{
              color: 'white',
              fontWeight: 'bold',
              mb: 2,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}
          >
            Connectez vos plateformes 🔗
          </Typography>
          
          {/* Success Message */}
          {successMessage && (
            <Alert 
              severity="success" 
              sx={{ 
                mb: 2, 
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                color: 'white',
                '& .MuiAlert-icon': {
                  color: '#4caf50'
                }
              }}
            >
              {successMessage}
            </Alert>
          )}
          
          {/* Stepper */}
          <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Stepper activeStep={onboardingStep} alternativeLabel>
              {steps.map((step, index) => (
                <Step key={step.label}>
                  <StepLabel
                    icon={
                      <Avatar
                        sx={{
                          bgcolor: index <= onboardingStep ? '#6366f1' : '#e5e7eb',
                          color: index <= onboardingStep ? 'white' : '#6b7280',
                          width: 40,
                          height: 40
                        }}
                      >
                        {step.icon}
                      </Avatar>
                    }
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: index <= onboardingStep ? '#1f2937' : '#6b7280',
                        fontWeight: index <= onboardingStep ? 'bold' : 'normal'
                      }}
                    >
                      {step.label}
                    </Typography>
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
            
            <Box sx={{ mt: 2 }}>
              <LinearProgress
                variant="determinate"
                value={getProgressPercentage()}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: '#e5e7eb',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: '#6366f1',
                    borderRadius: 4
                  }
                }}
              />
              <Typography variant="body2" sx={{ mt: 1, color: '#6b7280' }}>
                Progression: {getProgressPercentage()}%
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* Statistiques de connexion */}
        <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                État des connexions
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  {getConnectedCount()} sur {platforms.length} plateformes connectées
                </Typography>
                {getRequiredConnectedCount() < platforms.filter(p => p.required).length && (
                  <Chip
                    label={`${platforms.filter(p => p.required).length - getRequiredConnectedCount()} connexions requises restantes`}
                    color="warning"
                    size="small"
                  />
                )}
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <LinearProgress
                variant="determinate"
                value={(getConnectedCount() / platforms.length) * 100}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  bgcolor: '#e5e7eb',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: '#10b981',
                    borderRadius: 5
                  }
                }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Alerte pour les connexions requises */}
        {!canProceed() && (
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
            <Typography variant="body2">
              <strong>Connexions requises :</strong> Vous devez connecter Meta Business et Google Ads 
              pour accéder à toutes les fonctionnalités de CommerceAI Pro.
            </Typography>
          </Alert>
        )}

        {/* Grille des plateformes */}
        <Grid container spacing={3}>
          {platforms.map((platform) => {
            const status = getConnectionStatus(platform.id);
            
            return (
              <Grid item xs={12} sm={6} md={4} key={platform.id}>
                <Card
                  sx={{
                    height: '100%',
                    position: 'relative',
                    background: status === 'connected' 
                      ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'
                      : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: status === 'connected' ? '2px solid #10b981' : '1px solid #e5e7eb',
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                    }
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    {/* Badge de statut */}
                    <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
                      {status === 'connected' && (
                        <Chip
                          icon={<CheckCircle />}
                          label="Connecté"
                          color="success"
                          size="small"
                        />
                      )}
                      {status === 'skipped' && (
                        <Chip
                          label="Ignoré"
                          color="default"
                          size="small"
                        />
                      )}
                      {platform.required && status === 'not_connected' && (
                        <Chip
                          label="Requis"
                          color="error"
                          size="small"
                        />
                      )}
                    </Box>

                    {/* Icône et nom */}
                    <Box sx={{ textAlign: 'center', mb: 2 }}>
                      <Box sx={{ mb: 2 }}>
                        {platform.icon}
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                        {platform.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        {platform.description}
                      </Typography>
                    </Box>

                    {/* Fonctionnalités */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        Fonctionnalités :
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {platform.features.map((feature, index) => (
                          <Chip
                            key={index}
                            label={feature}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        ))}
                      </Box>
                    </Box>

                    {/* Boutons d'action */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {status === 'not_connected' && (
                        <>
                          <Button
                            variant="contained"
                            fullWidth
                            onClick={() => handleConnectPlatform(platform)}
                            sx={{
                              bgcolor: platform.color,
                              '&:hover': {
                                bgcolor: platform.color,
                                filter: 'brightness(0.9)'
                              }
                            }}
                          >
                            Connecter
                          </Button>
                          {!platform.required && (
                            <Button
                              variant="outlined"
                              onClick={() => handleSkipConnection(platform.id)}
                              sx={{ minWidth: 'auto', px: 1 }}
                            >
                              Ignorer
                            </Button>
                          )}
                        </>
                      )}
                      
                      {status === 'connected' && (
                        <Button
                          variant="outlined"
                          fullWidth
                          startIcon={<Settings />}
                          onClick={() => handleConnectPlatform(platform)}
                        >
                          Configurer
                        </Button>
                      )}
                      
                      {status === 'skipped' && (
                        <Button
                          variant="contained"
                          fullWidth
                          onClick={() => handleConnectPlatform(platform)}
                          sx={{
                            bgcolor: platform.color,
                            '&:hover': {
                              bgcolor: platform.color,
                              filter: 'brightness(0.9)'
                            }
                          }}
                        >
                          Connecter maintenant
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* Info box */}
        <Alert severity="info" sx={{ mt: 4, borderRadius: 2 }} icon={<Security />}>
          <Typography variant="body2">
            🔒 <strong>Sécurité garantie :</strong> Toutes vos données de connexion sont chiffrées 
            et stockées de manière sécurisée. Nous ne stockons jamais vos mots de passe.
          </Typography>
        </Alert>

        {/* Boutons de navigation */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={handleBack}
            sx={{
              borderColor: 'white',
              color: 'white',
              '&:hover': {
                borderColor: 'rgba(255,255,255,0.8)',
                bgcolor: 'rgba(255,255,255,0.1)'
              }
            }}
          >
            Retour
          </Button>
          
          <Button
            variant="contained"
            endIcon={<ArrowForward />}
            onClick={handleContinue}
            disabled={!canProceed() || isLoading}
            sx={{
              bgcolor: canProceed() ? '#10b981' : '#6b7280',
              px: 4,
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 'bold',
              borderRadius: 2,
              textTransform: 'none',
              '&:hover': {
                bgcolor: canProceed() ? '#059669' : '#6b7280'
              }
            }}
          >
            {isLoading ? 'Finalisation...' : 'Accéder au Dashboard'}
          </Button>
        </Box>
      </Container>

      {/* Dialog de connexion */}
      <Dialog
        open={connectionDialog}
        onClose={() => !isConnecting && setConnectionDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {selectedPlatform?.icon}
            <Box>
              <Typography variant="h6">
                Connecter {selectedPlatform?.name}
              </Typography>
              <Typography variant="body2" sx={{ color: '#6b7280' }}>
                {selectedPlatform?.description}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Pour connecter {selectedPlatform?.name}, vous devez fournir vos clés d'API. 
              Ces informations sont sécurisées et chiffrées.
            </Typography>
          </Alert>
          
          <Grid container spacing={2}>
            {selectedPlatform?.setupFields.map((field) => (
              <Grid item xs={12} key={field.key}>
                <TextField
                  fullWidth
                  label={field.label}
                  type={field.type}
                  placeholder={field.placeholder}
                  disabled={isConnecting}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setConnectionDialog(false)}
            disabled={isConnecting}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={handleConnectionSubmit}
            disabled={isConnecting}
            sx={{
              bgcolor: selectedPlatform?.color,
              '&:hover': {
                bgcolor: selectedPlatform?.color,
                filter: 'brightness(0.9)'
              }
            }}
          >
            {isConnecting ? 'Connexion...' : 'Connecter'}
          </Button>
        </DialogActions>
      </Dialog>
    </SintraBackground>
  );
};

export default PlatformConnections;