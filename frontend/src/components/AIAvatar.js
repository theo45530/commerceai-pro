import React, { useState, useEffect } from 'react';
import { Box, Avatar, Typography, Chip } from '@mui/material';
import { keyframes } from '@mui/system';
import {
  AutoAwesome,
  Psychology,
  TrendingUp,
  Speed,
  Security,
  Analytics,
  Campaign,
  Inventory,
  Support,
  SmartToy
} from '@mui/icons-material';

// Animations 3D
const float = keyframes`
  0%, 100% {
    transform: translateY(0px) rotateY(0deg);
  }
  50% {
    transform: translateY(-10px) rotateY(180deg);
  }
`;

const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 20px rgba(14, 165, 233, 0.3);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 30px rgba(14, 165, 233, 0.6);
  }
`;

const glow = keyframes`
  0%, 100% {
    filter: brightness(1) saturate(1);
  }
  50% {
    filter: brightness(1.2) saturate(1.3);
  }
`;

const rotate3D = keyframes`
  0% {
    transform: perspective(1000px) rotateY(0deg) rotateX(0deg);
  }
  25% {
    transform: perspective(1000px) rotateY(90deg) rotateX(10deg);
  }
  50% {
    transform: perspective(1000px) rotateY(180deg) rotateX(0deg);
  }
  75% {
    transform: perspective(1000px) rotateY(270deg) rotateX(-10deg);
  }
  100% {
    transform: perspective(1000px) rotateY(360deg) rotateX(0deg);
  }
`;

// Définition des agents IA avec leurs caractéristiques
const aiAgents = {
  marketing: {
    name: 'Luna',
    role: 'Agent Marketing IA',
    icon: Campaign,
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#667eea',
    description: 'Optimise vos campagnes publicitaires',
    skills: ['SEO', 'Publicité', 'Analytics', 'Contenu']
  },
  analytics: {
    name: 'Nova',
    role: 'Agent Analytics IA',
    icon: Analytics,
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: '#f093fb',
    description: 'Analyse vos données en temps réel',
    skills: ['Big Data', 'Prédictions', 'KPIs', 'Rapports']
  },
  inventory: {
    name: 'Zara',
    role: 'Agent Inventaire IA',
    icon: Inventory,
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    color: '#4facfe',
    description: 'Gère votre stock intelligemment',
    skills: ['Stock', 'Prévisions', 'Commandes', 'Logistique']
  },
  support: {
    name: 'Aria',
    role: 'Agent Support IA',
    icon: Support,
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    color: '#43e97b',
    description: 'Support client 24/7 automatisé',
    skills: ['Chat', 'Tickets', 'FAQ', 'Résolution']
  },
  optimization: {
    name: 'Kai',
    role: 'Agent Optimisation IA',
    icon: TrendingUp,
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    color: '#fa709a',
    description: 'Optimise vos performances',
    skills: ['Conversion', 'UX', 'A/B Testing', 'ROI']
  },
  security: {
    name: 'Orion',
    role: 'Agent Sécurité IA',
    icon: Security,
    gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    color: '#a8edea',
    description: 'Protège vos données',
    skills: ['Cybersécurité', 'Monitoring', 'Alertes', 'Compliance']
  }
};

const AIAvatar = ({ 
  agentType = 'marketing', 
  size = 'large', 
  animated = true, 
  showInfo = true,
  interactive = true,
  style = {},
  onClick
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const agent = aiAgents[agentType] || aiAgents.marketing;
  const IconComponent = agent.icon;

  const sizes = {
    small: { avatar: 40, icon: 20 },
    medium: { avatar: 60, icon: 30 },
    large: { avatar: 80, icon: 40 },
    xlarge: { avatar: 120, icon: 60 }
  };

  const currentSize = sizes[size] || sizes.large;

  useEffect(() => {
    if (animated) {
      const interval = setInterval(() => {
        setIsActive(prev => !prev);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [animated]);

  const handleClick = () => {
    if (onClick) onClick(agent);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: interactive ? 'pointer' : 'default',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isHovered && interactive ? 'scale(1.05)' : 'scale(1)',
        ...style
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* Avatar 3D avec animations */}
      <Box
        sx={{
          position: 'relative',
          mb: showInfo ? 2 : 0
        }}
      >
        <Avatar
          sx={{
            width: currentSize.avatar,
            height: currentSize.avatar,
            background: agent.gradient,
            boxShadow: `0 8px 32px ${agent.color}40`,
            border: '3px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            animation: animated ? `${float} 6s ease-in-out infinite, ${pulse} 4s ease-in-out infinite` : 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              animation: animated ? `${rotate3D} 2s ease-in-out, ${glow} 2s ease-in-out infinite` : 'none',
              transform: 'scale(1.1)',
              boxShadow: `0 12px 48px ${agent.color}60`
            }
          }}
        >
          <IconComponent 
            sx={{ 
              fontSize: currentSize.icon, 
              color: 'white',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
            }} 
          />
        </Avatar>

        {/* Particules flottantes */}
        {animated && (
          <>
            {[...Array(3)].map((_, i) => (
              <Box
                key={i}
                sx={{
                  position: 'absolute',
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: agent.color,
                  top: `${20 + i * 20}%`,
                  left: `${10 + i * 30}%`,
                  animation: `${float} ${3 + i}s ease-in-out infinite`,
                  animationDelay: `${i * 0.5}s`,
                  opacity: 0.6
                }}
              />
            ))}
          </>
        )}

        {/* Indicateur d'activité */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: isActive ? '#22c55e' : '#6b7280',
            border: '2px solid white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            animation: isActive ? `${pulse} 2s ease-in-out infinite` : 'none'
          }}
        />
      </Box>

      {/* Informations de l'agent */}
      {showInfo && (
        <Box sx={{ textAlign: 'center', maxWidth: 200 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              background: agent.gradient,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 0.5
            }}
          >
            {agent.name}
          </Typography>
          
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              mb: 1,
              fontWeight: 500
            }}
          >
            {agent.role}
          </Typography>
          
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              mb: 1.5,
              fontSize: '0.8rem'
            }}
          >
            {agent.description}
          </Typography>

          {/* Compétences */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
            {agent.skills.slice(0, 2).map((skill, index) => (
              <Chip
                key={index}
                label={skill}
                size="small"
                sx={{
                  background: `${agent.color}20`,
                  color: agent.color,
                  fontWeight: 500,
                  fontSize: '0.7rem',
                  height: 20
                }}
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

// Composant pour afficher une grille d'avatars
export const AIAvatarGrid = ({ agents = Object.keys(aiAgents), onAgentClick }) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 3,
        p: 2
      }}
    >
      {agents.map((agentType) => (
        <AIAvatar
          key={agentType}
          agentType={agentType}
          size="large"
          animated={true}
          showInfo={true}
          interactive={true}
          onClick={onAgentClick}
        />
      ))}
    </Box>
  );
};

export default AIAvatar;
export { aiAgents };