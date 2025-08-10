import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Tooltip,
  Fade,
  keyframes
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Dashboard,
  AutoAwesome,
  Settings,
  Logout,
  AccountCircle,
  Notifications,
  Menu as MenuIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Animations
const glow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3); }
  50% { box-shadow: 0 0 30px rgba(99, 102, 241, 0.6); }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-3px); }
`;

// Styled components
const ModernAppBar = styled(AppBar)(({ theme }) => ({
  background: 'rgba(15, 15, 35, 0.95)',
  backdropFilter: 'blur(20px)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
}));

const LogoContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  
  '&:hover': {
    transform: 'scale(1.05)'
  }
}));

const NavButton = styled(Button)(({ theme }) => ({
  color: 'rgba(255, 255, 255, 0.8)',
  fontWeight: 500,
  textTransform: 'none',
  borderRadius: '12px',
  padding: theme.spacing(1, 2),
  transition: 'all 0.3s ease',
  
  '&:hover': {
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    transform: 'translateY(-2px)'
  }
}));

const ProfileAvatar = styled(Avatar)(({ theme }) => ({
  width: 40,
  height: 40,
  background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
  animation: `${glow} 3s ease-in-out infinite`,
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  
  '&:hover': {
    transform: 'scale(1.1)'
  }
}));

const NotificationIcon = styled(IconButton)(({ theme }) => ({
  color: 'rgba(255, 255, 255, 0.8)',
  animation: `${float} 3s ease-in-out infinite`,
  
  '&:hover': {
    color: '#6366f1',
    background: 'rgba(99, 102, 241, 0.1)'
  }
}));

const ModernNavigation = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMobileMenuOpen = (event) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
    handleProfileMenuClose();
  };

  const navigationItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <Dashboard /> },
    { label: 'Agents IA', path: '/agents', icon: <AutoAwesome /> },
    { label: 'Paramètres', path: '/settings', icon: <Settings /> }
  ];

  return (
    <ModernAppBar position="sticky">
      <Toolbar sx={{ justifyContent: 'space-between', py: 1 }}>
        {/* Logo et titre */}
        <LogoContainer onClick={() => navigate('/dashboard')}>
          <Box
            sx={{
              width: 40,
              height: 40,
              background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: `${glow} 3s ease-in-out infinite`
            }}
          >
            <AutoAwesome sx={{ color: 'white', fontSize: 24 }} />
          </Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            CommerceAI Pro
          </Typography>
        </LogoContainer>

        {/* Navigation desktop */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
          {navigationItems.map((item) => (
            <NavButton
              key={item.path}
              startIcon={item.icon}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </NavButton>
          ))}
        </Box>

        {/* Actions utilisateur */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Notifications">
            <NotificationIcon>
              <Notifications />
            </NotificationIcon>
          </Tooltip>

          {/* Menu mobile */}
          <IconButton
            sx={{ display: { xs: 'flex', md: 'none' }, color: 'white' }}
            onClick={handleMobileMenuOpen}
          >
            <MenuIcon />
          </IconButton>

          {/* Avatar utilisateur */}
          <Tooltip title="Profil utilisateur">
            <ProfileAvatar onClick={handleProfileMenuOpen}>
              {user?.displayName?.[0] || user?.email?.[0] || 'U'}
            </ProfileAvatar>
          </Tooltip>
        </Box>

        {/* Menu profil */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleProfileMenuClose}
          TransitionComponent={Fade}
          PaperProps={{
            sx: {
              background: 'rgba(15, 15, 35, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              mt: 1
            }
          }}
        >
          <MenuItem
            onClick={() => {
              navigate('/profile');
              handleProfileMenuClose();
            }}
            sx={{ color: 'white', '&:hover': { background: 'rgba(255, 255, 255, 0.1)' } }}
          >
            <AccountCircle sx={{ mr: 2 }} />
            Mon Profil
          </MenuItem>
          <MenuItem
            onClick={() => {
              navigate('/settings');
              handleProfileMenuClose();
            }}
            sx={{ color: 'white', '&:hover': { background: 'rgba(255, 255, 255, 0.1)' } }}
          >
            <Settings sx={{ mr: 2 }} />
            Paramètres
          </MenuItem>
          <MenuItem
            onClick={handleLogout}
            sx={{ color: '#ef4444', '&:hover': { background: 'rgba(239, 68, 68, 0.1)' } }}
          >
            <Logout sx={{ mr: 2 }} />
            Déconnexion
          </MenuItem>
        </Menu>

        {/* Menu mobile */}
        <Menu
          anchorEl={mobileMenuAnchor}
          open={Boolean(mobileMenuAnchor)}
          onClose={handleMobileMenuClose}
          TransitionComponent={Fade}
          PaperProps={{
            sx: {
              background: 'rgba(15, 15, 35, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              mt: 1
            }
          }}
        >
          {navigationItems.map((item) => (
            <MenuItem
              key={item.path}
              onClick={() => {
                navigate(item.path);
                handleMobileMenuClose();
              }}
              sx={{ color: 'white', '&:hover': { background: 'rgba(255, 255, 255, 0.1)' } }}
            >
              {item.icon}
              <Typography sx={{ ml: 2 }}>{item.label}</Typography>
            </MenuItem>
          ))}
        </Menu>
      </Toolbar>
    </ModernAppBar>
  );
};

export default ModernNavigation;