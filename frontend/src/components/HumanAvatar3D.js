import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';

// Animation subtile de respiration
const breathe = keyframes`
  0%, 100% { transform: scale(1) translateY(0px); }
  50% { transform: scale(1.02) translateY(-2px); }
`;

// Animation de rotation douce
const gentleRotate = keyframes`
  0% { transform: rotateY(0deg); }
  100% { transform: rotateY(360deg); }
`;

// Conteneur de l'avatar humain
const HumanAvatarContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'agentType' && prop !== 'size'
})(({ theme, agentType, size = 'large' }) => {
  const sizeMap = {
    medium: { width: 120, height: 120 },
    large: { width: 160, height: 160 },
    xlarge: { width: 200, height: 200 }
  };

  const colors = {
    'customer-service': { primary: '#3b82f6', secondary: '#1e40af' },
    'advertising': { primary: '#10b981', secondary: '#047857' },
    'email': { primary: '#f59e0b', secondary: '#d97706' },
    'analysis': { primary: '#8b5cf6', secondary: '#7c3aed' },
    'page-generator': { primary: '#06b6d4', secondary: '#0891b2' },
    'content-creator': { primary: '#ef4444', secondary: '#dc2626' }
  };

  const colorScheme = colors[agentType] || colors['customer-service'];
  // Support both string and numeric sizes
  const dimensions = typeof size === 'number' ? { width: size, height: size } : sizeMap[size] || sizeMap['large'];

  return {
    width: dimensions.width,
    height: dimensions.height,
    position: 'relative',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    animation: `${breathe} 4s ease-in-out infinite`,
    
    '&:hover': {
      transform: 'scale(1.05)',
      animation: `${gentleRotate} 2s ease-in-out infinite`,
      
      '& .avatar-glow': {
        opacity: 0.8,
        transform: 'scale(1.2)'
      }
    }
  };
});

// Composant d'avatar humain 3D
const HumanAvatar3D = ({ 
  agentType = 'customer-service', 
  size = 'large',
  onClick,
  ...props 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Définition des avatars humains pour chaque type d'agent
  const avatarStyles = {
    'customer-service': {
      // Avatar féminin professionnel pour le service client
      head: '#fdbcb4', // Teint de peau
      hair: '#8b4513', // Cheveux bruns
      eyes: '#4a90e2',
      outfit: '#3b82f6' // Bleu professionnel
    },
    'advertising': {
      // Avatar masculin créatif pour la publicité
      head: '#f4c2a1',
      hair: '#2c1810',
      eyes: '#10b981',
      outfit: '#10b981'
    },
    'email': {
      // Avatar féminin dynamique pour l'email marketing
      head: '#e8b4a0',
      hair: '#ff6b35',
      eyes: '#f59e0b',
      outfit: '#f59e0b'
    },
    'analysis': {
      // Avatar masculin analytique
      head: '#d4a574',
      hair: '#4a4a4a',
      eyes: '#8b5cf6',
      outfit: '#8b5cf6'
    },
    'page-generator': {
      // Avatar féminin tech
      head: '#f2c2a7',
      hair: '#1a1a1a',
      eyes: '#06b6d4',
      outfit: '#06b6d4'
    },
    'content-creator': {
      // Avatar masculin créatif
      head: '#e6a885',
      hair: '#8b4513',
      eyes: '#ef4444',
      outfit: '#ef4444'
    }
  };

  const avatar = avatarStyles[agentType] || avatarStyles['customer-service'];

  const handleClick = () => {
    if (onClick) {
      onClick(agentType);
    }
  };

  return (
    <HumanAvatarContainer
      agentType={agentType}
      size={size}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      {...props}
    >
      {/* Effet de lueur */}
      <Box
        className="avatar-glow"
        sx={{
          position: 'absolute',
          top: '-10px',
          left: '-10px',
          right: '-10px',
          bottom: '-10px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${avatar.outfit}40 0%, transparent 70%)`,
          opacity: 0.4,
          transition: 'all 0.3s ease',
          zIndex: 0
        }}
      />
      
      {/* Corps de l'avatar */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${avatar.outfit} 0%, ${avatar.outfit}dd 100%)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: `0 8px 32px ${avatar.outfit}30`,
          border: `2px solid ${avatar.outfit}50`,
          zIndex: 1
        }}
      >
        {/* Tête */}
        <Box
          sx={{
            width: '45%',
            height: '45%',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${avatar.head} 0%, ${avatar.head}dd 100%)`,
            position: 'relative',
            marginTop: '10%',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          {/* Cheveux */}
          <Box
            sx={{
              position: 'absolute',
              top: '-15%',
              left: '10%',
              right: '10%',
              height: '60%',
              borderRadius: '50% 50% 40% 40%',
              background: `linear-gradient(135deg, ${avatar.hair} 0%, ${avatar.hair}aa 100%)`,
              zIndex: 1
            }}
          />
          
          {/* Yeux */}
          <Box
            sx={{
              position: 'absolute',
              top: '35%',
              left: '25%',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: avatar.eyes,
              boxShadow: `12px 0 0 ${avatar.eyes}`
            }}
          />
          
          {/* Sourire */}
          <Box
            sx={{
              position: 'absolute',
              bottom: '25%',
              left: '35%',
              width: '30%',
              height: '8px',
              borderRadius: '0 0 20px 20px',
              background: '#ff6b6b',
              opacity: 0.8
            }}
          />
        </Box>
        
        {/* Corps/Épaules */}
        <Box
          sx={{
            width: '70%',
            height: '35%',
            borderRadius: '20px 20px 0 0',
            background: `linear-gradient(135deg, ${avatar.outfit}ee 0%, ${avatar.outfit}cc 100%)`,
            marginTop: '5%',
            position: 'relative'
          }}
        >
          {/* Détails vestimentaires */}
          <Box
            sx={{
              position: 'absolute',
              top: '20%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '4px',
              height: '40%',
              background: `${avatar.outfit}aa`,
              borderRadius: '2px'
            }}
          />
        </Box>
      </Box>
    </HumanAvatarContainer>
  );
};

export default HumanAvatar3D;