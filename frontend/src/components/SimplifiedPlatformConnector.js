import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  LinearProgress,
  Avatar,
  Snackbar
} from '@mui/material';
import {
  Store as StoreIcon,
  WhatsApp as WhatsAppIcon,
  Instagram as InstagramIcon,
  Facebook as FacebookIcon,
  VideoCall as TikTokIcon,
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Add as AddIcon
} from '@mui/icons-material';

const SimplifiedPlatformConnector = () => {
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [connectionData, setConnectionData] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const platformConfigs = {
    shopify: {
      name: 'Shopify Store',
      icon: StoreIcon,
      color: '#96BF47',
      description: 'Connect your Shopify store for product management and sales tracking',
      fields: [
        { name: 'storeUrl', label: 'Store URL', placeholder: 'yourstore.myshopify.com', type: 'text' },
        { name: 'accessToken', label: 'Access Token', placeholder: 'shpat_...', type: 'password' }
      ],
      helpText: 'Get your access token from Shopify Admin > Apps > App and sales channel settings > Develop apps > Create an app > Admin API access scopes'
    },
    whatsapp: {
      name: 'WhatsApp Business',
      icon: WhatsAppIcon,
      color: '#25D366',
      description: 'Connect WhatsApp Business for customer support and messaging',
      fields: [
        { name: 'phoneNumber', label: 'Phone Number', placeholder: '+1234567890', type: 'tel' },
        { name: 'businessId', label: 'Business ID', placeholder: '123456789', type: 'text' }
      ],
      helpText: 'Your WhatsApp Business account will be connected through our secure integration'
    },
    instagram: {
      name: 'Instagram Business',
      icon: InstagramIcon,
      color: '#E4405F',
      description: 'Connect Instagram for social media management and content creation',
      fields: [
        { name: 'username', label: 'Username', placeholder: '@yourbusiness', type: 'text' },
        { name: 'accessToken', label: 'Access Token', placeholder: 'IGQVJ...', type: 'password' }
      ],
      helpText: 'Connect through Facebook Business Manager for Instagram access'
    },
    facebook: {
      name: 'Facebook Ads',
      icon: FacebookIcon,
      color: '#1877F2',
      description: 'Connect Facebook Ads for campaign management and optimization',
      fields: [
        { name: 'adAccountId', label: 'Ad Account ID', placeholder: 'act_123456789', type: 'text' },
        { name: 'accessToken', label: 'Access Token', placeholder: 'EAAG...', type: 'password' }
      ],
      helpText: 'Get your ad account ID from Facebook Ads Manager > Settings > Account settings'
    },
    tiktok: {
      name: 'TikTok Ads',
      icon: TikTokIcon,
      color: '#000000',
      description: 'Connect TikTok Ads for video advertising and audience targeting',
      fields: [
        { name: 'advertiserId', label: 'Advertiser ID', placeholder: '123456789', type: 'text' },
        { name: 'accessToken', label: 'Access Token', placeholder: 'TikTok token...', type: 'password' }
      ],
      helpText: 'Access your TikTok Ads Manager to get the advertiser ID and access token'
    },
    email: {
      name: 'Email Service',
      icon: EmailIcon,
      color: '#EA4335',
      description: 'Connect your email service for marketing campaigns and automation',
      fields: [
        { name: 'smtpHost', label: 'SMTP Host', placeholder: 'smtp.gmail.com', type: 'text' },
        { name: 'smtpPort', label: 'SMTP Port', placeholder: '587', type: 'number' },
        { name: 'email', label: 'Email Address', placeholder: 'your@email.com', type: 'email' },
        { name: 'password', label: 'App Password', placeholder: 'App password', type: 'password' }
      ],
      helpText: 'Use app passwords for Gmail or enable 2FA for other providers'
    }
  };

  useEffect(() => {
    loadPlatformConnections();
  }, []);

  const loadPlatformConnections = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/platforms/connection-status');
      if (response.ok) {
        const data = await response.json();
        setPlatforms(data.connections || []);
      }
    } catch (error) {
      console.error('Error loading platform connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectPlatform = async () => {
    if (!selectedPlatform || !connectionData[selectedPlatform]) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'warning'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/platforms/connect-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: selectedPlatform,
          credentials: connectionData[selectedPlatform]
        })
      });

      if (response.ok) {
        const result = await response.json();
        setSnackbar({
          open: true,
          message: `${platformConfigs[selectedPlatform].name} connected successfully!`,
          severity: 'success'
        });
        setDialogOpen(false);
        setSelectedPlatform('');
        setConnectionData({});
        loadPlatformConnections();
      } else {
        const error = await response.json();
        setSnackbar({
          open: true,
          message: error.message || 'Connection failed',
          severity: 'error'
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Connection failed. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectPlatform = async (platform) => {
    try {
      const response = await fetch(`/api/platforms/disconnect/${platform}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSnackbar({
          open: true,
          message: `${platformConfigs[platform].name} disconnected successfully`,
          severity: 'success'
        });
        loadPlatformConnections();
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Disconnection failed',
        severity: 'error'
      });
    }
  };

  const getConnectionStatus = (platform) => {
    const connection = platforms.find(p => p.platform === platform);
    if (!connection) return 'disconnected';
    return connection.status;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'success';
      case 'connecting': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected': return <CheckCircleIcon />;
      case 'connecting': return <WarningIcon />;
      case 'error': return <ErrorIcon />;
      default: return <InfoIcon />;
    }
  };

  if (loading && platforms.length === 0) {
    return (
      <Box sx={{ width: '100%', p: 3 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading platform connections...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Platform Connections
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Connect your platforms to enable AI agents to work seamlessly across all your channels
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {Object.entries(platformConfigs).map(([key, config]) => {
          const status = getConnectionStatus(key);
          const isConnected = status === 'connected';
          
          return (
            <Grid item xs={12} sm={6} md={4} key={key}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: config.color, mr: 2, width: 48, height: 48 }}>
                      <config.icon />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        {config.name}
                      </Typography>
                      <Chip 
                        label={status} 
                        color={getStatusColor(status)}
                        size="small"
                        icon={getStatusIcon(status)}
                      />
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flex: 1 }}>
                    {config.description}
                  </Typography>
                  
                  <Box sx={{ mt: 'auto' }}>
                    {!isConnected && (
                      <Button
                        variant="contained"
                        fullWidth
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => {
                          setSelectedPlatform(key);
                          setDialogOpen(true);
                        }}
                        sx={{ bgcolor: config.color }}
                      >
                        Connect
                      </Button>
                    )}
                    
                    {isConnected && (
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        onClick={() => handleDisconnectPlatform(key)}
                      >
                        Disconnect
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Connect {selectedPlatform && platformConfigs[selectedPlatform]?.name}
        </DialogTitle>
        <DialogContent>
          {selectedPlatform && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                {platformConfigs[selectedPlatform].helpText}
              </Alert>
              
              <Grid container spacing={2}>
                {platformConfigs[selectedPlatform].fields.map((field) => (
                  <Grid item xs={12} key={field.name}>
                    <TextField
                      fullWidth
                      label={field.label}
                      type={field.type}
                      placeholder={field.placeholder}
                      value={connectionData[selectedPlatform]?.[field.name] || ''}
                      onChange={(e) => setConnectionData({
                        ...connectionData,
                        [selectedPlatform]: {
                          ...connectionData[selectedPlatform],
                          [field.name]: e.target.value
                        }
                      })}
                      required
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleConnectPlatform}
            variant="contained"
            disabled={loading}
            sx={{ bgcolor: selectedPlatform ? platformConfigs[selectedPlatform]?.color : 'primary.main' }}
          >
            {loading ? 'Connecting...' : 'Connect'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SimplifiedPlatformConnector;
