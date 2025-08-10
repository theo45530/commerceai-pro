import React from 'react';
import { Box } from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';

const float = keyframes`
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
  }
`;

const pulse = keyframes`
  0%, 100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.1);
  }
`;

const drift = keyframes`
  0% {
    transform: translateX(-100px) translateY(0px);
  }
  50% {
    transform: translateX(100px) translateY(-50px);
  }
  100% {
    transform: translateX(-100px) translateY(0px);
  }
`;

const BackgroundContainer = styled(Box)(({ theme }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
  zIndex: -1,
  overflow: 'hidden',
  
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
    zIndex: 1
  }
}));

const FloatingShape = styled(Box)(({ theme, size, color, delay }) => ({
  position: 'absolute',
  width: size,
  height: size,
  background: color,
  borderRadius: '50%',
  animation: `${float} 6s ease-in-out infinite`,
  animationDelay: delay,
  filter: 'blur(1px)',
  opacity: 0.6
}));

const PulsingOrb = styled(Box)(({ theme, size, color, delay }) => ({
  position: 'absolute',
  width: size,
  height: size,
  background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
  borderRadius: '50%',
  animation: `${pulse} 4s ease-in-out infinite`,
  animationDelay: delay,
  filter: 'blur(2px)'
}));

const DriftingElement = styled(Box)(({ theme, delay }) => ({
  position: 'absolute',
  width: '200px',
  height: '200px',
  background: 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
  borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
  animation: `${drift} 20s ease-in-out infinite`,
  animationDelay: delay,
  filter: 'blur(3px)',
  opacity: 0.3
}));

const SintraBackground = ({ children }) => {
  return (
    <Box sx={{ position: 'relative', minHeight: '100vh' }}>
      <BackgroundContainer>
        {/* Floating shapes */}
        <FloatingShape 
          size="60px" 
          color="rgba(255, 255, 255, 0.1)" 
          delay="0s"
          sx={{ top: '10%', left: '10%' }}
        />
        <FloatingShape 
          size="40px" 
          color="rgba(139, 92, 246, 0.2)" 
          delay="2s"
          sx={{ top: '20%', right: '15%' }}
        />
        <FloatingShape 
          size="80px" 
          color="rgba(240, 147, 251, 0.15)" 
          delay="4s"
          sx={{ bottom: '20%', left: '20%' }}
        />
        <FloatingShape 
          size="50px" 
          color="rgba(255, 255, 255, 0.08)" 
          delay="1s"
          sx={{ bottom: '30%', right: '25%' }}
        />
        
        {/* Pulsing orbs */}
        <PulsingOrb 
          size="120px" 
          color="rgba(139, 92, 246, 0.3)" 
          delay="0s"
          sx={{ top: '15%', left: '60%' }}
        />
        <PulsingOrb 
          size="80px" 
          color="rgba(240, 147, 251, 0.2)" 
          delay="3s"
          sx={{ bottom: '25%', left: '70%' }}
        />
        
        {/* Drifting elements */}
        <DriftingElement 
          delay="0s"
          sx={{ top: '5%', left: '30%' }}
        />
        <DriftingElement 
          delay="10s"
          sx={{ bottom: '10%', right: '20%' }}
        />
        
        {/* Gradient overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 100%)',
            zIndex: 2
          }}
        />
      </BackgroundContainer>
      
      {/* Content */}
      <Box sx={{ position: 'relative', zIndex: 10 }}>
        {children}
      </Box>
    </Box>
  );
};

export default SintraBackground;