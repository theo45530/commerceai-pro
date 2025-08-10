import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Badge,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Support as SupportIcon,
  Chat as ChatIcon,
  MenuBook as KnowledgeIcon,
  Close as CloseIcon,
  Help as HelpIcon
} from '@mui/icons-material';
import ChatSupport from './ChatSupport';
import KnowledgeBase from './KnowledgeBase';

const SupportCenter = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleChatMessageReceived = () => {
    if (!isOpen || activeTab !== 0) {
      setUnreadMessages(prev => prev + 1);
    }
  };

  const handleOpenChat = () => {
    setIsOpen(true);
    setActiveTab(0);
    setUnreadMessages(0);
  };

  const handleOpenKnowledgeBase = () => {
    setIsOpen(true);
    setActiveTab(1);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const TabPanel = ({ children, value, index, ...other }) => (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`support-tabpanel-${index}`}
      aria-labelledby={`support-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );

  return (
    <>
      {/* Floating Action Buttons */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          zIndex: 1000
        }}
      >
        {/* Knowledge Base FAB */}
        <Tooltip title="Base de connaissances" placement="left">
          <Fab
            color="primary"
            onClick={handleOpenKnowledgeBase}
            sx={{ 
              width: 48, 
              height: 48,
              backgroundColor: theme.palette.info.main,
              '&:hover': {
                backgroundColor: theme.palette.info.dark
              }
            }}
          >
            <KnowledgeIcon />
          </Fab>
        </Tooltip>

        {/* Chat Support FAB */}
        <Tooltip title="Chat support" placement="left">
          <Badge badgeContent={unreadMessages} color="error">
            <Fab
              color="primary"
              onClick={handleOpenChat}
              sx={{ width: 56, height: 56 }}
            >
              <ChatIcon />
            </Fab>
          </Badge>
        </Tooltip>
      </Box>

      {/* Support Center Dialog */}
      <Dialog
        open={isOpen}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            height: isMobile ? '100%' : '80vh',
            maxHeight: isMobile ? '100%' : '800px',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 1,
            borderColor: 'divider',
            pb: 1
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SupportIcon sx={{ mr: 1 }} />
            <Typography variant="h6">
              Centre de Support
            </Typography>
          </Box>
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant={isMobile ? 'fullWidth' : 'standard'}
            >
              <Tab
                icon={<ChatIcon />}
                label="Chat Support"
                iconPosition="start"
                sx={{ minHeight: 48 }}
              />
              <Tab
                icon={<KnowledgeIcon />}
                label="Base de Connaissances"
                iconPosition="start"
                sx={{ minHeight: 48 }}
              />
            </Tabs>
          </Box>

          {/* Tab Panels */}
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <TabPanel value={activeTab} index={0}>
              <ChatSupport 
                user={user} 
                onMessageReceived={handleChatMessageReceived}
                isVisible={isOpen && activeTab === 0}
              />
            </TabPanel>
            
            <TabPanel value={activeTab} index={1}>
              <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
                <KnowledgeBase user={user} />
              </Box>
            </TabPanel>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Quick Help Tooltip */}
      {!isOpen && (
        <Tooltip
          title={
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Besoin d'aide ?
              </Typography>
              <Typography variant="caption" display="block">
                💬 Chat en direct avec notre équipe
              </Typography>
              <Typography variant="caption" display="block">
                📚 Consultez notre base de connaissances
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 1, fontStyle: 'italic' }}>
                Cliquez sur les boutons à droite →
              </Typography>
            </Box>
          }
          placement="left"
          arrow
          sx={{
            position: 'fixed',
            bottom: 100,
            right: 100,
            zIndex: 999
          }}
        >
          <Box
            sx={{
              position: 'fixed',
              bottom: 100,
              right: 100,
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: theme.palette.warning.main,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': {
                  transform: 'scale(1)',
                  opacity: 1
                },
                '50%': {
                  transform: 'scale(1.1)',
                  opacity: 0.7
                },
                '100%': {
                  transform: 'scale(1)',
                  opacity: 1
                }
              }
            }}
            onClick={() => setIsOpen(true)}
          >
            <HelpIcon sx={{ color: 'white', fontSize: 20 }} />
          </Box>
        </Tooltip>
      )}
    </>
  );
};

export default SupportCenter;