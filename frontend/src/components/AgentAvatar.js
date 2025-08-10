import React from 'react';
import { Avatar, Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  SupportAgent,
  Campaign,
  Email,
  Analytics,
  Web,
  Create,
  SmartToy,
  Psychology,
  AutoAwesome
} from '@mui/icons-material';

const StyledAvatar = styled(Avatar)(({ theme, agentcolor }) => ({
  width: 80,
  height: 80,
  background: agentcolor,
  boxShadow: `0 8px 32px ${agentcolor}40`,
  border: `3px solid ${agentcolor}20`,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'visible',
  
  '&::before': {
    content: '""',
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    background: agentcolor,
    borderRadius: '50%',
    opacity: 0.2,
    animation: 'pulse 2s infinite',
    zIndex: -1
  },
  
  '&:hover': {
    transform: 'scale(1.1) rotate(5deg)',
    boxShadow: `0 12px 48px ${agentcolor}60`,
  },
  
  '& .MuiSvgIcon-root': {
    fontSize: '2rem',
    color: 'white',
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
  },
  
  '@keyframes pulse': {
    '0%': {
      transform: 'scale(1)',
      opacity: 0.2
    },
    '50%': {
      transform: 'scale(1.05)',
      opacity: 0.1
    },
    '100%': {
      transform: 'scale(1)',
      opacity: 0.2
    }
  }
}));

const agentConfigs = {
  'customer-service': {
    icon: SupportAgent,
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#667eea'
  },
  'advertising': {
    icon: Campaign,
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: '#f093fb'
  },
  'email': {
    icon: Email,
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    color: '#4facfe'
  },
  'analysis': {
    icon: Analytics,
    gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    color: '#8b5cf6'
  },
  'page-generator': {
    icon: Web,
    gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    color: '#06b6d4'
  },
  'content-creator': {
    icon: Create,
    gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    color: '#ef4444'
  },
  'ai-assistant': {
    icon: SmartToy,
    gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    color: '#a18cd1'
  },
  'psychology': {
    icon: Psychology,
    gradient: 'linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)',
    color: '#fad0c4'
  },
  'magic': {
    icon: AutoAwesome,
    gradient: 'linear-gradient(135deg, #ff8a80 0%, #ffb74d 100%)',
    color: '#ff8a80'
  }
};

const AgentAvatar = ({ agentType = 'customer-service', size = 80, className }) => {
  const config = agentConfigs[agentType] || agentConfigs['customer-service'];
  const IconComponent = config.icon;
  
  return (
    <Box className={className}>
      <StyledAvatar
        agentcolor={config.gradient}
        sx={{
          width: size,
          height: size,
          background: config.gradient
        }}
      >
        <IconComponent />
      </StyledAvatar>
    </Box>
  );
};

export default AgentAvatar;
export { agentConfigs };