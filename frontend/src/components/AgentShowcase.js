import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Fade,
  Slide,
  Zoom,
  keyframes
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  SupportAgent,
  Campaign,
  Email,
  Analytics,
  Web,
  Create,
  AutoAwesome,
  Rocket
} from '@mui/icons-material';
import Avatar3D from './Avatar3D';

// Animations
const slideInFromLeft = keyframes`
  0% {
    transform: translateX(-100px) rotateY(-90deg);
    opacity: 0;
  }
  100% {
    transform: translateX(0) rotateY(0deg);
    opacity: 1;
  }
`;

const slideInFromRight = keyframes`
  0% {
    transform: translateX(100px) rotateY(90deg);
    opacity: 0;
  }
  100% {
    transform: translateX(0) rotateY(0deg);
    opacity: 1;
  }
`;

const fadeInUp = keyframes`
  0% {
    transform: translateY(50px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
`;

const backgroundPulse = keyframes`
  0%, 100% {
    background: radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 40% 80%, rgba(245, 158, 11, 0.1) 0%, transparent 50%);
  }
  50% {
    background: radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.2) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(16, 185, 129, 0.2) 0%, transparent 50%),
                radial-gradient(circle at 40% 80%, rgba(245, 158, 11, 0.2) 0%, transparent 50%);
  }
`;

// Styled components
const ShowcaseContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(6, 0),
  background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
  minHeight: '100vh',
  overflow: 'hidden',
  animation: `${backgroundPulse} 8s ease-in-out infinite`,
  
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `
      radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 75% 75%, rgba(16, 185, 129, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.05) 0%, transparent 70%)
    `,
    zIndex: 0
  },
  
  '& > *': {
    position: 'relative',
    zIndex: 1
  }
}));

const ShowcaseTitle = styled(Typography)(({ theme }) => ({
  fontSize: '3.5rem',
  fontWeight: 800,
  background: 'linear-gradient(135deg, #ffffff 0%, #a78bfa 50%, #60a5fa 100%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  textAlign: 'center',
  marginBottom: theme.spacing(2),
  textShadow: '0 4px 20px rgba(255,255,255,0.1)',
  animation: `${fadeInUp} 1s ease-out`,
  
  [theme.breakpoints.down('md')]: {
    fontSize: '2.5rem'
  },
  
  [theme.breakpoints.down('sm')]: {
    fontSize: '2rem'
  }
}));

const ShowcaseSubtitle = styled(Typography)(({ theme }) => ({
  fontSize: '1.3rem',
  color: 'rgba(255, 255, 255, 0.8)',
  textAlign: 'center',
  marginBottom: theme.spacing(6),
  maxWidth: '600px',
  margin: '0 auto',
  marginBottom: theme.spacing(6),
  animation: `${fadeInUp} 1s ease-out 0.2s both`,
  
  [theme.breakpoints.down('sm')]: {
    fontSize: '1.1rem'
  }
}));

const AgentCard = styled(Card)(({ theme, index }) => ({
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '24px',
  padding: theme.spacing(3),
  height: '100%',
  transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
  cursor: 'pointer',
  position: 'relative',
  overflow: 'hidden',
  animation: index % 2 === 0 
    ? `${slideInFromLeft} 0.8s ease-out ${index * 0.1}s both`
    : `${slideInFromRight} 0.8s ease-out ${index * 0.1}s both`,
  
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
    opacity: 0,
    transition: 'opacity 0.3s ease',
    zIndex: 0
  },
  
  '&:hover': {
    transform: 'translateY(-10px) scale(1.02)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.3), 0 0 60px rgba(99, 102, 241, 0.2)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    
    '&::before': {
      opacity: 1
    }
  },
  
  '& > *': {
    position: 'relative',
    zIndex: 1
  }
}));

const AgentTitle = styled(Typography)(({ theme, agentType }) => {
  const colors = {
    'customer-service': '#3b82f6',
    'advertising': '#10b981',
    'email': '#f59e0b',
    'analysis': '#8b5cf6',
    'page-generator': '#06b6d4',
    'content-creator': '#ef4444'
  };
  
  return {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: '#ffffff',
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
    textAlign: 'center',
    textShadow: `0 2px 10px ${colors[agentType] || colors['customer-service']}40`
  };
});

const AgentDescription = styled(Typography)(({ theme }) => ({
  fontSize: '0.95rem',
  color: 'rgba(255, 255, 255, 0.7)',
  textAlign: 'center',
  lineHeight: 1.6
}));

const agents = [
  {
    type: 'customer-service',
    icon: <SupportAgent />,
    title: 'Service Client IA',
    description: 'Réponses automatisées intelligentes et support client 24/7 avec une IA conversationnelle avancée.'
  },
  {
    type: 'advertising',
    icon: <Campaign />,
    title: 'Publicité Intelligente',
    description: 'Optimisation automatique des campagnes publicitaires avec ciblage précis et ROI maximisé.'
  },
  {
    type: 'email',
    icon: <Email />,
    title: 'Email Marketing',
    description: 'Campagnes email personnalisées avec segmentation intelligente et taux de conversion optimisés.'
  },
  {
    type: 'analysis',
    icon: <Analytics />,
    title: 'Analyse Prédictive',
    description: 'Insights avancés et prédictions de tendances pour des décisions business éclairées.'
  },
  {
    type: 'page-generator',
    icon: <Web />,
    title: 'Générateur de Pages',
    description: 'Création automatique de pages web optimisées pour la conversion et le SEO.'
  },
  {
    type: 'content-creator',
    icon: <Create />,
    title: 'Créateur de Contenu',
    description: 'Génération automatique de contenu engageant et optimisé pour votre audience.'
  }
];

const AgentShowcase = ({ onAgentSelect, selectedAgents = [], variant = 'showcase' }) => {
  const [visibleAgents, setVisibleAgents] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (variant === 'showcase') {
      // Initialiser avec un tableau vide pour l'animation
      setVisibleAgents([]);
      // Animation séquentielle pour l'affichage showcase
      const timer = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev < agents.length - 1) {
            setVisibleAgents((prevVisible) => [...(prevVisible || []), prev]);
            return prev + 1;
          } else {
            clearInterval(timer);
            return prev;
          }
        });
      }, 200);

      return () => clearInterval(timer);
    } else {
      // Affichage immédiat pour les autres variantes
      setVisibleAgents(agents.map((_, index) => index));
    }
  }, [variant]);

  const handleAgentClick = (agentType) => {
    if (onAgentSelect) {
      onAgentSelect(agentType);
    }
  };

  if (variant === 'compact') {
    return (
      <Box sx={{ py: 4 }}>
        <Grid container spacing={3}>
          {agents.map((agent, index) => (
            <Grid item xs={12} sm={6} md={4} key={agent.type}>
              <Zoom in={true} timeout={500 + index * 100}>
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  onClick={() => handleAgentClick(agent.type)}
                  sx={{
                    cursor: 'pointer',
                    transition: 'transform 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.05)'
                    }
                  }}
                >
                  <Avatar3D
                    agentType={agent.type}
                    icon={agent.icon}
                    label={agent.title}
                    size="medium"
                    animated={true}
                  />
                </Box>
              </Zoom>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <ShowcaseContainer>
      <Box sx={{ maxWidth: '1400px', margin: '0 auto', px: 3 }}>
        <ShowcaseTitle variant="h1">
          <AutoAwesome sx={{ fontSize: '4rem', mr: 2, verticalAlign: 'middle' }} />
          Vos Agents IA
          <Rocket sx={{ fontSize: '4rem', ml: 2, verticalAlign: 'middle' }} />
        </ShowcaseTitle>
        
        <ShowcaseSubtitle>
          Découvrez notre écosystème d'intelligence artificielle conçu pour révolutionner votre e-commerce
        </ShowcaseSubtitle>

        <Grid container spacing={4}>
          {agents.map((agent, index) => (
            <Grid item xs={12} sm={6} lg={4} key={agent.type}>
              <Fade 
                in={variant === 'showcase' ? visibleAgents.includes(index) : true} 
                timeout={800}
              >
                <AgentCard 
                  index={index}
                  onClick={() => handleAgentClick(agent.type)}
                  sx={{
                    opacity: selectedAgents.includes(agent.type) ? 1 : 0.9,
                    border: selectedAgents.includes(agent.type) 
                      ? '2px solid rgba(99, 102, 241, 0.5)' 
                      : '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <Avatar3D
                      agentType={agent.type}
                      icon={agent.icon}
                      size="large"
                      animated={true}
                      showLabel={false}
                    />
                    
                    <AgentTitle agentType={agent.type}>
                      {agent.title}
                    </AgentTitle>
                    
                    <AgentDescription>
                      {agent.description}
                    </AgentDescription>
                  </CardContent>
                </AgentCard>
              </Fade>
            </Grid>
          ))}
        </Grid>
      </Box>
    </ShowcaseContainer>
  );
};

export default AgentShowcase;