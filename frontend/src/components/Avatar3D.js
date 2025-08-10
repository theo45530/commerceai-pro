import React, { useState, useEffect } from 'react';
import { Box, Typography, keyframes } from '@mui/material';
import { styled } from '@mui/material/styles';

// Animations keyframes
const float = keyframes`
  0%, 100% { transform: translateY(0px) rotateY(0deg); }
  25% { transform: translateY(-10px) rotateY(90deg); }
  50% { transform: translateY(-5px) rotateY(180deg); }
  75% { transform: translateY(-15px) rotateY(270deg); }
`;

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.5), 0 0 40px rgba(99, 102, 241, 0.3), 0 0 60px rgba(99, 102, 241, 0.1); }
  50% { box-shadow: 0 0 30px rgba(99, 102, 241, 0.8), 0 0 60px rgba(99, 102, 241, 0.5), 0 0 90px rgba(99, 102, 241, 0.3); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const rotate3D = keyframes`
  0% { transform: rotateX(0deg) rotateY(0deg); }
  25% { transform: rotateX(15deg) rotateY(90deg); }
  50% { transform: rotateX(0deg) rotateY(180deg); }
  75% { transform: rotateX(-15deg) rotateY(270deg); }
  100% { transform: rotateX(0deg) rotateY(360deg); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// Styled components
const Avatar3DContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'agentType'
})(({ theme, agentType, size = 'medium' }) => {
  const sizeMap = {
    small: { width: 80, height: 80, fontSize: '2rem' },
    medium: { width: 120, height: 120, fontSize: '3rem' },
    large: { width: 160, height: 160, fontSize: '4rem' },
    xlarge: { width: 200, height: 200, fontSize: '5rem' }
  };

  const colors = {
    'customer-service': {
      primary: '#3b82f6',
      secondary: '#1e40af',
      accent: '#60a5fa',
      glow: 'rgba(59, 130, 246, 0.6)'
    },
    'advertising': {
      primary: '#10b981',
      secondary: '#047857',
      accent: '#34d399',
      glow: 'rgba(16, 185, 129, 0.6)'
    },
    'email': {
      primary: '#f59e0b',
      secondary: '#d97706',
      accent: '#fbbf24',
      glow: 'rgba(245, 158, 11, 0.6)'
    },
    'analysis': {
      primary: '#8b5cf6',
      secondary: '#7c3aed',
      accent: '#a78bfa',
      glow: 'rgba(139, 92, 246, 0.6)'
    },
    'page-generator': {
      primary: '#06b6d4',
      secondary: '#0891b2',
      accent: '#22d3ee',
      glow: 'rgba(6, 182, 212, 0.6)'
    },
    'content-creator': {
      primary: '#ef4444',
      secondary: '#dc2626',
      accent: '#f87171',
      glow: 'rgba(239, 68, 68, 0.6)'
    }
  };

  const colorScheme = colors[agentType] || colors['customer-service'];
  const dimensions = sizeMap[size];

  return {
    width: dimensions.width,
    height: dimensions.height,
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${colorScheme.primary} 0%, ${colorScheme.secondary} 50%, ${colorScheme.accent} 100%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    animation: `${float} 6s ease-in-out infinite`,
    transformStyle: 'preserve-3d',
    perspective: '1000px',
    
    '&::before': {
      content: '""',
      position: 'absolute',
      top: '-5px',
      left: '-5px',
      right: '-5px',
      bottom: '-5px',
      borderRadius: '50%',
      background: `linear-gradient(45deg, ${colorScheme.primary}, ${colorScheme.accent}, ${colorScheme.secondary}, ${colorScheme.primary})`,
      backgroundSize: '400% 400%',
      animation: `${shimmer} 3s ease-in-out infinite`,
      zIndex: -1,
      filter: 'blur(10px)',
      opacity: 0.7
    },
    
    '&::after': {
      content: '""',
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: '120%',
      height: '120%',
      borderRadius: '50%',
      background: `radial-gradient(circle, ${colorScheme.glow} 0%, transparent 70%)`,
      transform: 'translate(-50%, -50%)',
      animation: `${glow} 4s ease-in-out infinite`,
      zIndex: -2
    },
    
    '&:hover': {
      transform: 'scale(1.1) rotateY(180deg)',
      animation: `${rotate3D} 2s ease-in-out infinite, ${pulse} 1s ease-in-out infinite`,
      boxShadow: `0 20px 40px ${colorScheme.glow}, 0 0 60px ${colorScheme.glow}`,
      
      '& .avatar-icon': {
        transform: 'scale(1.2) rotateZ(360deg)',
        color: '#ffffff',
        textShadow: `0 0 20px ${colorScheme.glow}`
      },
      
      '& .avatar-particles': {
        opacity: 1,
        transform: 'scale(1.5)'
      }
    },
    
    '& .avatar-icon': {
      fontSize: dimensions.fontSize,
      color: '#ffffff',
      transition: 'all 0.5s ease',
      textShadow: '0 2px 10px rgba(0,0,0,0.3)',
      zIndex: 1
    },
    
    '& .avatar-particles': {
      position: 'absolute',
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      opacity: 0,
      transition: 'all 0.5s ease',
      background: `conic-gradient(from 0deg, ${colorScheme.primary}, ${colorScheme.accent}, ${colorScheme.secondary}, ${colorScheme.primary})`,
      animation: `${rotate3D} 8s linear infinite`,
      zIndex: 0
    }
  };
});

const Avatar3DLabel = styled(Typography, {
  shouldForwardProp: (prop) => prop !== 'agentType'
})(({ theme, agentType }) => {
  const colors = {
    'customer-service': '#3b82f6',
    'advertising': '#10b981',
    'email': '#f59e0b',
    'analysis': '#8b5cf6',
    'page-generator': '#06b6d4',
    'content-creator': '#ef4444'
  };

  return {
    marginTop: theme.spacing(2),
    fontWeight: 700,
    fontSize: '1.1rem',
    background: `linear-gradient(135deg, ${colors[agentType] || colors['customer-service']}, #ffffff)`,
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textAlign: 'center',
    textShadow: '0 2px 10px rgba(0,0,0,0.3)',
    transition: 'all 0.3s ease',
    
    '&:hover': {
      transform: 'scale(1.05)',
      textShadow: `0 0 20px ${colors[agentType] || colors['customer-service']}`
    }
  };
});

const Avatar3D = ({ 
  agentType = 'customer-service', 
  icon, 
  label, 
  size = 'medium',
  onClick,
  animated = true,
  showLabel = true,
  ...props 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (animated) {
      // Générer des particules pour l'effet 3D
      const newParticles = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        angle: (i * 30) * (Math.PI / 180),
        delay: i * 0.1
      }));
      setParticles(newParticles);
    }
  }, [animated]);

  const handleClick = () => {
    if (onClick) {
      onClick(agentType);
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      {...props}
    >
      <Avatar3DContainer 
        agentType={agentType} 
        size={size}
        className="avatar-3d-container"
      >
        <Box className="avatar-particles" />
        <Box className="avatar-icon">
          {icon}
        </Box>
        
        {/* Particules flottantes */}
        {animated && particles.map((particle) => (
          <Box
            key={particle.id}
            sx={{
              position: 'absolute',
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              opacity: isHovered ? 0.8 : 0.3,
              transform: `
                rotate(${particle.angle}rad) 
                translateX(${size === 'large' ? 100 : size === 'medium' ? 80 : 60}px) 
                rotate(-${particle.angle}rad)
              `,
              transition: `all 0.5s ease ${particle.delay}s`,
              animation: isHovered ? `${pulse} 1s ease-in-out infinite ${particle.delay}s` : 'none',
              boxShadow: '0 0 10px rgba(255,255,255,0.8)'
            }}
          />
        ))}
      </Avatar3DContainer>
      
      {showLabel && label && (
        <Avatar3DLabel agentType={agentType}>
          {label}
        </Avatar3DLabel>
      )}
    </Box>
  );
};

export default Avatar3D;