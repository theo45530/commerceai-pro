import React from 'react';
import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import ModernNavigation from './ModernNavigation';
import AnimatedBackground from './AnimatedBackground';

const LayoutContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
  position: 'relative',
  overflow: 'hidden'
}));

const ContentContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  zIndex: 1,
  minHeight: 'calc(100vh - 80px)' // Hauteur moins la navbar
}));

const ModernLayout = ({ children, showNavigation = true, showBackground = true }) => {
  return (
    <LayoutContainer>
      {showBackground && <AnimatedBackground />}
      {showNavigation && <ModernNavigation />}
      <ContentContainer>
        {children}
      </ContentContainer>
    </LayoutContainer>
  );
};

export default ModernLayout;