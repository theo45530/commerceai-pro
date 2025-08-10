import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Chip,
  Badge
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Dashboard,
  SmartToy,
  Analytics,
  Settings,
  Notifications,
  AccountCircle,
  Logout,
  Person
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(20px)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  color: '#1a1a1a'
}));

const NavButton = styled(Button)(({ theme }) => ({
  color: '#666666',
  fontWeight: 500,
  textTransform: 'none',
  borderRadius: '12px',
  padding: '8px 16px',
  margin: '0 4px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  
  '&:hover': {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
  },
  
  '&.active': {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
  }
}));

const Logo = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  fontSize: '1.5rem',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  cursor: 'pointer'
}));

const StyledIconButton = styled(IconButton)(({ theme }) => ({
  color: '#666666',
  borderRadius: '12px',
  margin: '0 4px',
  transition: 'all 0.3s ease',
  
  '&:hover': {
    background: 'rgba(102, 126, 234, 0.1)',
    color: '#667eea',
    transform: 'translateY(-2px)'
  }
}));

const SintraNavbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    handleMenuClose();
  };

  const handleNavigation = (path) => {
    navigate(path);
    setCurrentPath(path);
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <Dashboard /> },
    { label: 'Agents IA', path: '/agents', icon: <SmartToy /> },
    { label: 'Analytics', path: '/analytics', icon: <Analytics /> }
  ];

  return (
    <StyledAppBar position="fixed" elevation={0}>
      <Toolbar sx={{ justifyContent: 'space-between', px: 3 }}>
        {/* Logo */}
        <Logo onClick={() => handleNavigation('/dashboard')}>
          CommerceAI Pro
        </Logo>

        {/* Navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {navItems.map((item) => (
            <NavButton
              key={item.path}
              startIcon={item.icon}
              onClick={() => handleNavigation(item.path)}
              className={currentPath === item.path ? 'active' : ''}
            >
              {item.label}
            </NavButton>
          ))}
        </Box>

        {/* Right side */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Status chip */}
          <Chip
            label="Pro"
            size="small"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontWeight: 600,
              mr: 2
            }}
          />
          
          {/* Notifications */}
          <StyledIconButton>
            <Badge badgeContent={3} color="error">
              <Notifications />
            </Badge>
          </StyledIconButton>

          {/* Settings */}
          <StyledIconButton onClick={() => handleNavigation('/settings')}>
            <Settings />
          </StyledIconButton>

          {/* Profile */}
          <StyledIconButton onClick={handleProfileMenuOpen}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                fontSize: '0.9rem'
              }}
            >
              {user?.displayName?.[0] || user?.email?.[0] || 'U'}
            </Avatar>
          </StyledIconButton>

          {/* Profile Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            PaperProps={{
              sx: {
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '16px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                mt: 1
              }
            }}
          >
            <MenuItem onClick={() => { handleNavigation('/profile'); handleMenuClose(); }}>
              <Person sx={{ mr: 2 }} />
              Profil
            </MenuItem>
            <MenuItem onClick={() => { handleNavigation('/settings'); handleMenuClose(); }}>
              <Settings sx={{ mr: 2 }} />
              Paramètres
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 2 }} />
              Déconnexion
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </StyledAppBar>
  );
};

export default SintraNavbar;