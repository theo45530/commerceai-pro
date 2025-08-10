import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Fade,
  Zoom,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
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
  CheckCircle,
  ArrowForward,
  Menu as MenuIcon,
  Facebook,
  Google,
  Instagram,
  WhatsApp,
  ShoppingCart,
  Star,
  People,
  Timeline,
  Insights
} from '@mui/icons-material';

const Landing = () => {
  const navigate = useNavigate();
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);

  const features = [
    {
      icon: <SupportAgent sx={{ fontSize: 50, color: '#6366f1' }} />,
      title: 'Service Client IA 24/7',
      description: 'Réponses automatiques intelligentes pour vos clients, disponibles 24h/24 et 7j/7.',
      benefits: ['Réduction de 80% du temps de réponse', 'Support multilingue', 'Intégration WhatsApp']
    },
    {
      icon: <Campaign sx={{ fontSize: 50, color: '#10b981' }} />,
      title: 'Publicité Optimisée par IA',
      description: 'Campagnes publicitaires automatiquement optimisées sur Meta, Google et TikTok.',
      benefits: ['ROI amélioré de 150%', 'Ciblage intelligent', 'Budget optimisé automatiquement']
    },
    {
      icon: <Create sx={{ fontSize: 50, color: '#f59e0b' }} />,
      title: 'Création de Contenu',
      description: 'Génération automatique de contenu engageant pour tous vos réseaux sociaux.',
      benefits: ['Contenu personnalisé', 'Publication automatique', 'Tendances intégrées']
    },
    {
      icon: <Analytics sx={{ fontSize: 50, color: '#ef4444' }} />,
      title: 'Analyse Avancée',
      description: 'Insights détaillés et recommandations pour optimiser vos performances.',
      benefits: ['Rapports en temps réel', 'Prédictions IA', 'KPIs personnalisés']
    },
    {
      icon: <Web sx={{ fontSize: 50, color: '#8b5cf6' }} />,
      title: 'Pages de Vente',
      description: 'Génération automatique de landing pages optimisées pour la conversion.',
      benefits: ['Taux de conversion +200%', 'A/B testing automatique', 'Mobile-first']
    },
    {
      icon: <Email sx={{ fontSize: 50, color: '#06b6d4' }} />,
      title: 'Email Marketing IA',
      description: 'Campagnes email personnalisées et automatisées pour maximiser l\'engagement.',
      benefits: ['Personnalisation avancée', 'Timing optimal', 'Segmentation intelligente']
    }
  ];

  const platforms = [
    { name: 'Meta', icon: <Facebook sx={{ color: '#1877f2' }} />, description: 'Facebook & Instagram Ads' },
    { name: 'Google', icon: <Google sx={{ color: '#4285f4' }} />, description: 'Google Ads & Analytics' },
    { name: 'Instagram', icon: <Instagram sx={{ color: '#E4405F' }} />, description: 'Contenu & Stories' },
    { name: 'WhatsApp', icon: <WhatsApp sx={{ color: '#25d366' }} />, description: 'Support client' },
    { name: 'Shopify', icon: <ShoppingCart sx={{ color: '#96bf48' }} />, description: 'E-commerce' },
    { name: 'TikTok', icon: <Box sx={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(45deg, #ff0050, #00f2ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: 'bold' }}>TT</Box>, description: 'Publicités vidéo' }
  ];

  const stats = [
    { number: '500+', label: 'Entreprises accompagnées', icon: <People /> },
    { number: '150%', label: 'Augmentation moyenne du ROI', icon: <TrendingUp /> },
    { number: '24/7', label: 'Support automatisé', icon: <SupportAgent /> },
    { number: '6', label: 'Agents IA spécialisés', icon: <AutoAwesome /> }
  ];

  const testimonials = [
    {
      name: 'Marie Dubois',
      company: 'Fashion Boutique',
      text: 'CommerceAI Pro a transformé notre e-commerce. Nos ventes ont augmenté de 200% en 3 mois !',
      rating: 5
    },
    {
      name: 'Thomas Martin',
      company: 'Tech Store',
      text: 'L\'automatisation du service client nous fait économiser 20h par semaine. Incroyable !',
      rating: 5
    },
    {
      name: 'Sophie Laurent',
      company: 'Beauty Brand',
      text: 'Les campagnes publicitaires optimisées par IA ont doublé notre taux de conversion.',
      rating: 5
    }
  ];

  const handleGetStarted = () => {
    navigate('/register');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* Navigation */}
      <AppBar position="fixed" sx={{ bgcolor: 'rgba(15, 15, 35, 0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Avatar sx={{ bgcolor: '#6366f1', mr: 2 }}>
              <RocketLaunch />
            </Avatar>
            <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 'bold' }}>
              CommerceAI Pro
            </Typography>
          </Box>
          
          {/* Desktop Menu */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2 }}>
            <Button color="inherit" sx={{ color: '#a0a0a0', '&:hover': { color: '#ffffff' } }}>Fonctionnalités</Button>
            <Button color="inherit" sx={{ color: '#a0a0a0', '&:hover': { color: '#ffffff' } }}>Tarifs</Button>
            <Button color="inherit" sx={{ color: '#a0a0a0', '&:hover': { color: '#ffffff' } }}>À propos</Button>
            <Button variant="outlined" onClick={handleLogin} sx={{ color: '#ff6b6b', borderColor: '#ff6b6b', '&:hover': { borderColor: '#ee5a24', bgcolor: 'rgba(255, 107, 107, 0.1)' } }}>
              Connexion
            </Button>
            <Button variant="contained" onClick={handleGetStarted} sx={{ background: 'linear-gradient(45deg, #ff6b6b, #ee5a24)', '&:hover': { background: 'linear-gradient(45deg, #ee5a24, #ff6b6b)' } }}>
              Commencer
            </Button>
          </Box>
          
          {/* Mobile Menu */}
          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              onClick={(e) => setMobileMenuAnchor(e.currentTarget)}
              sx={{ color: '#ffffff' }}
            >
              <MenuIcon />
            </IconButton>
            <Menu
              anchorEl={mobileMenuAnchor}
              open={Boolean(mobileMenuAnchor)}
              onClose={() => setMobileMenuAnchor(null)}
            >
              <MenuItem onClick={handleLogin}>Connexion</MenuItem>
              <MenuItem onClick={handleGetStarted}>Commencer</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
          pt: 12,
          pb: 8,
          color: 'white',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.15) 0%, transparent 50%)',
            zIndex: 1
          },
          '& > *': {
            position: 'relative',
            zIndex: 2
          }
        }}
      >
        <Container maxWidth="lg">
          <Fade in timeout={1000}>
            <Box>
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 'bold',
                  mb: 3,
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}
              >
                Transformez votre E-commerce avec l'IA
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  mb: 4,
                  opacity: 0.9,
                  maxWidth: 800,
                  mx: 'auto',
                  fontSize: { xs: '1.2rem', md: '1.5rem' }
                }}
              >
                6 agents IA spécialisés pour automatiser vos ventes, optimiser vos campagnes 
                et faire exploser votre chiffre d'affaires.
              </Typography>
              
              <Box sx={{ mb: 6 }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleGetStarted}
                  endIcon={<ArrowForward />}
                  sx={{
                    background: 'linear-gradient(45deg, #ff6b6b, #ee5a24)',
                    px: 4,
                    py: 2,
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    mr: 2,
                    mb: { xs: 2, sm: 0 },
                    boxShadow: '0 8px 32px rgba(255, 107, 107, 0.3)',
                    '&:hover': { 
                      background: 'linear-gradient(45deg, #ee5a24, #ff6b6b)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 12px 40px rgba(255, 107, 107, 0.4)'
                    }
                  }}
                >
                  Démarrer gratuitement
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    px: 4,
                    py: 2,
                    fontSize: '1.1rem',
                    '&:hover': {
                      borderColor: 'white',
                      bgcolor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  Voir la démo
                </Button>
              </Box>

              {/* Stats */}
              <Grid container spacing={4} sx={{ mt: 4 }}>
                {stats.map((stat, index) => (
                  <Grid item xs={6} md={3} key={index}>
                    <Zoom in timeout={1000 + index * 200}>
                      <Paper
                        sx={{
                          p: 3,
                          textAlign: 'center',
                          bgcolor: 'rgba(255,255,255,0.05)',
                          backdropFilter: 'blur(20px)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 3,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            bgcolor: 'rgba(255,255,255,0.1)',
                            transform: 'translateY(-4px)',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
                          }
                        }}
                      >
                        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', mx: 'auto', mb: 1 }}>
                          {stat.icon}
                        </Avatar>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                          {stat.number}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          {stat.label}
                        </Typography>
                      </Paper>
                    </Zoom>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Fade>
        </Container>
      </Box>

      {/* Features Section */}
      <Box sx={{ bgcolor: '#0a0a1a', py: 8 }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 2 }}>
            6 Agents IA pour dominer votre marché
          </Typography>
          <Typography variant="h6" sx={{ color: '#a0a0a0', maxWidth: 600, mx: 'auto' }}>
            Chaque agent est spécialisé dans un domaine précis pour maximiser vos résultats
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Zoom in timeout={500 + index * 100}>
                <Card
                  sx={{
                    height: '100%',
                    bgcolor: '#1a1a2e',
                    border: '1px solid rgba(255,255,255,0.1)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 20px 40px rgba(255, 107, 107, 0.2)',
                      border: '1px solid rgba(255, 107, 107, 0.3)'
                    }
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                      {feature.icon}
                      <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 2, mb: 1 }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#a0a0a0' }}>
                        {feature.description}
                      </Typography>
                    </Box>
                    
                    <List dense>
                      {feature.benefits.map((benefit, idx) => (
                        <ListItem key={idx} sx={{ px: 0 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckCircle sx={{ color: '#10b981', fontSize: 20 }} />
                          </ListItemIcon>
                          <ListItemText 
                            primary={benefit} 
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Zoom>
            </Grid>
          ))}
        </Grid>
      </Container>
      </Box>

      {/* Platforms Section */}
      <Box sx={{ bgcolor: '#16213e', py: 8 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 2 }}>
              Connectez toutes vos plateformes
            </Typography>
            <Typography variant="h6" sx={{ color: '#a0a0a0' }}>
              Intégration native avec les principales plateformes e-commerce et marketing
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {platforms.map((platform, index) => (
              <Grid item xs={6} sm={4} md={2} key={index}>
                <Fade in timeout={1000 + index * 100}>
                  <Paper
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      height: '100%',
                      bgcolor: '#1a1a2e',
                      border: '1px solid rgba(255,255,255,0.1)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 15px 30px rgba(255, 107, 107, 0.2)',
                        border: '1px solid rgba(255, 107, 107, 0.3)'
                      }
                    }}
                  >
                    <Box sx={{ mb: 2 }}>
                      {platform.icon}
                    </Box>
                    <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {platform.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#a0a0a0', fontSize: '0.8rem' }}>
                      {platform.description}
                    </Typography>
                  </Paper>
                </Fade>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Testimonials */}
      <Box sx={{ bgcolor: '#0a0a1a', py: 8 }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 2 }}>
            Ils ont transformé leur business
          </Typography>
          <Typography variant="h6" sx={{ color: '#a0a0a0' }}>
            Découvrez comment nos clients ont multiplié leurs ventes
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {testimonials.map((testimonial, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Fade in timeout={1000 + index * 200}>
                <Card sx={{ height: '100%', bgcolor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <CardContent sx={{ p: 4 }}>
                    <Box sx={{ display: 'flex', mb: 2 }}>
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} sx={{ color: '#fbbf24', fontSize: 20 }} />
                      ))}
                    </Box>
                    <Typography variant="body1" sx={{ mb: 3, fontStyle: 'italic' }}>
                      "{testimonial.text}"
                    </Typography>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {testimonial.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
                        {testimonial.company}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Fade>
            </Grid>
          ))}
        </Grid>
      </Container>
      </Box>

      {/* CTA Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
          py: 8,
          color: 'white',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 50% 50%, rgba(255, 107, 107, 0.2) 0%, transparent 70%)',
            zIndex: 1
          },
          '& > *': {
            position: 'relative',
            zIndex: 2
          }
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 2 }}>
            Prêt à révolutionner votre e-commerce ?
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
            Rejoignez les centaines d'entrepreneurs qui font confiance à CommerceAI Pro
          </Typography>
          
          <Button
            variant="contained"
            size="large"
            onClick={handleGetStarted}
            endIcon={<ArrowForward />}
            sx={{
              background: 'linear-gradient(45deg, #ff6b6b, #ee5a24)',
              px: 6,
              py: 2,
              fontSize: '1.3rem',
              fontWeight: 'bold',
              boxShadow: '0 12px 40px rgba(255, 107, 107, 0.4)',
              '&:hover': { 
                background: 'linear-gradient(45deg, #ee5a24, #ff6b6b)',
                transform: 'translateY(-2px)',
                boxShadow: '0 16px 50px rgba(255, 107, 107, 0.5)'
              }
            }}
          >
            Commencer maintenant - C'est gratuit
          </Button>
          
          <Typography variant="body2" sx={{ mt: 2, opacity: 0.8 }}>
            ✅ Aucune carte de crédit requise • ✅ Configuration en 5 minutes
          </Typography>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: '#1f2937', color: 'white', py: 6 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: '#6366f1', mr: 2 }}>
                  <RocketLaunch />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  CommerceAI Pro
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                La plateforme IA qui transforme votre e-commerce en machine à vendre.
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={8}>
              <Grid container spacing={4}>
                <Grid item xs={6} md={3}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                    Produit
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>Fonctionnalités</Typography>
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>Tarifs</Typography>
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>Intégrations</Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} md={3}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                    Support
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>Documentation</Typography>
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>Contact</Typography>
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>FAQ</Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} md={3}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                    Entreprise
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>À propos</Typography>
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>Blog</Typography>
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>Carrières</Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} md={3}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                    Légal
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>Confidentialité</Typography>
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>CGU</Typography>
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>Cookies</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 4, borderColor: '#374151' }} />
          
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#9ca3af' }}>
              © 2024 CommerceAI Pro. Tous droits réservés. Fait avec ❤️ pour les entrepreneurs.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default Landing;