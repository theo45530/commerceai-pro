import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Avatar,
  LinearProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Campaign as CampaignIcon,
  Support as SupportIcon,
  Analytics as AnalyticsIcon,
  Email as EmailIcon,
  Store as StoreIcon,
  VideoLibrary as VideoIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Dashboard as DashboardIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import axios from 'axios';
import RealTimeDashboard from './RealTimeDashboard';

const UnifiedDashboard = () => {
  const [agents, setAgents] = useState(null);
  const [platformConnections, setPlatformConnections] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionDialog, setConnectionDialog] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [connectionType, setConnectionType] = useState('');
  const [credentials, setCredentials] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [showRealTimeDashboard, setShowRealTimeDashboard] = useState(false);

  // AI Agents configuration
  const aiAgents = [
    {
      id: 'advertising',
      name: 'AI Advertising Agent',
      description: 'Generates ad campaigns, optimizes performance, and manages A/B testing',
      icon: CampaignIcon,
      color: '#8B5CF6',
      status: 'active',
      platforms: ['meta-ads', 'google-ads', 'tiktok-ads'],
      features: ['Campaign Generation', 'Performance Optimization', 'A/B Testing', 'Audience Targeting']
    },
    {
      id: 'customer-service',
      name: 'AI Customer Service Agent',
      description: 'Provides 24/7 customer support across all platforms',
      icon: SupportIcon,
      color: '#3B82F6',
      status: 'active',
      platforms: ['whatsapp', 'instagram', 'tiktok', 'email', 'shopify'],
      features: ['Multi-Platform Support', 'Human-like Responses', '24/7 Availability', 'Escalation Handling']
    },
    {
      id: 'analysis',
      name: 'AI Analysis Agent',
      description: 'Analyzes product listings and provides conversion optimization insights',
      icon: AnalyticsIcon,
      color: '#10B981',
      status: 'active',
      platforms: ['shopify', 'woocommerce'],
      features: ['Product Optimization', 'Cart Analysis', 'Payment Recommendations', 'Trust Building']
    },
    {
      id: 'email-marketing',
      name: 'AI Email Marketing Agent',
      description: 'Creates branded email sequences and automated campaigns',
      icon: EmailIcon,
      color: '#F59E0B',
      status: 'active',
      platforms: ['email', 'shopify'],
      features: ['Branded Templates', 'Welcome Series', 'Cart Recovery', 'Promotional Campaigns']
    },
    {
      id: 'page-generator',
      name: 'AI Page Generator Agent',
      description: 'Generates complete Shopify stores with optimized content',
      icon: StoreIcon,
      color: '#EF4444',
      status: 'active',
      platforms: ['shopify'],
      features: ['Store Generation', 'Product Copywriting', 'Image Processing', 'SEO Optimization']
    },
    {
      id: 'content-creator',
      name: 'AI Content Creator Agent',
      description: 'Generates viral content for TikTok and Instagram',
      icon: VideoIcon,
      color: '#F97316',
      status: 'active',
      platforms: ['tiktok', 'instagram'],
      features: ['Viral Content', 'Trending Scripts', 'Comment Management', 'Hashtag Optimization']
    }
  ];

  useEffect(() => {
    fetchPlatformConnections();
    fetchAgentsStatus();
  }, []);

  const fetchPlatformConnections = async () => {
    try {
      const response = await axios.get('/api/platforms/connection-status');
      setPlatformConnections(response.data.connections || []);
    } catch (error) {
      console.error('Failed to fetch platform connections:', error);
    }
  };

  const fetchAgentsStatus = async () => {
    try {
      // Simulate fetching agent status from backend
      const agentsWithStatus = aiAgents.map(agent => ({
        ...agent,
        status: Math.random() > 0.2 ? 'active' : 'warning',
        performance: Math.floor(Math.random() * 100),
        lastActivity: new Date(Date.now() - Math.random() * 86400000).toISOString()
      }));
      
      setAgents(agentsWithStatus);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch agents status:', error);
      setLoading(false);
    }
  };

  const handleConnectPlatform = async () => {
    try {
      const response = await axios.post('/api/platforms/connect-simple', {
        platform: selectedPlatform,
        connectionType,
        credentials
      });

      if (response.data.success) {
        setSnackbar({
          open: true,
          message: response.data.message,
          severity: 'success'
        });
        setConnectionDialog(false);
        fetchPlatformConnections();
        resetConnectionForm();
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Connection failed',
        severity: 'error'
      });
    }
  };

  const resetConnectionForm = () => {
    setSelectedPlatform('');
    setConnectionType('');
    setCredentials({});
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircleIcon />;
      case 'warning': return <WarningIcon />;
      case 'error': return <ErrorIcon />;
      default: return <ErrorIcon />;
    }
  };

  const getConnectionTypes = (platform) => {
    const types = {
      'shopify': ['shopify-store'],
      'whatsapp': ['whatsapp-business'],
      'instagram': ['instagram-business'],
      'tiktok': ['tiktok-business'],
      'email': ['email-service']
    };
    return types[platform] || [];
  };

  const getCredentialsFields = (connectionType) => {
    switch (connectionType) {
      case 'shopify-store':
        return [{ name: 'storeUrl', label: 'Store URL', placeholder: 'your-store.myshopify.com' }];
      case 'whatsapp-business':
        return [{ name: 'phoneNumber', label: 'Phone Number', placeholder: '+1234567890' }];
      case 'instagram-business':
      case 'tiktok-business':
        return [{ name: 'username', label: 'Username', placeholder: '@yourbusiness' }];
      case 'email-service':
        return [
          { name: 'email', label: 'Email', placeholder: 'your@email.com' },
          { name: 'password', label: 'Password', type: 'password' }
        ];
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', p: 3 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading AI Agents...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            🤖 Ekko AI Agents Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage all your AI agents and platform connections from one unified dashboard
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant={showRealTimeDashboard ? "outlined" : "contained"}
            startIcon={<DashboardIcon />}
            onClick={() => setShowRealTimeDashboard(false)}
          >
            Overview
          </Button>
          <Button
            variant={showRealTimeDashboard ? "contained" : "outlined"}
            startIcon={<TimelineIcon />}
            onClick={() => setShowRealTimeDashboard(true)}
          >
            Real-Time
          </Button>
        </Box>
      </Box>

      {/* Conditional Dashboard Content */}
      {showRealTimeDashboard ? (
        <RealTimeDashboard />
      ) : (
        <>
          {/* Platform Connections Status */}
          <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">🔌 Platform Connections</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setConnectionDialog(true)}
            >
              Connect Platform
            </Button>
          </Box>
          
          <Grid container spacing={2}>
            {(platformConnections || []).map((connection) => (
              <Grid item xs={12} sm={6} md={4} key={connection.platform}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {connection.platformName}
                    </Typography>
                    <Chip
                      label={connection.status}
                      color={connection.status === 'connected' ? 'success' : 'warning'}
                      size="small"
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {connection.accountName}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            
            {platformConnections.length === 0 && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  No platforms connected yet. Click "Connect Platform" to get started.
                </Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* AI Agents Grid */}
      <Grid container spacing={3}>
        {(agents || []).map((agent) => (
          <Grid item xs={12} md={6} lg={4} key={agent.id}>
            <Card 
              sx={{ 
                height: '100%',
                border: `2px solid ${agent.color}20`,
                '&:hover': {
                  border: `2px solid ${agent.color}`,
                  transform: 'translateY(-2px)',
                  transition: 'all 0.3s ease'
                }
              }}
            >
              <CardContent>
                {/* Agent Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: agent.color, mr: 2 }}>
                    <agent.icon />
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {agent.name}
                    </Typography>
                    <Chip
                      icon={getStatusIcon(agent.status)}
                      label={agent.status}
                      color={getStatusColor(agent.status)}
                      size="small"
                    />
                  </Box>
                </Box>

                {/* Agent Description */}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {agent.description}
                </Typography>

                {/* Performance Bar */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">Performance</Typography>
                    <Typography variant="body2">{agent.performance}%</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={agent.performance}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                {/* Features */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Features:</strong>
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {agent.features.map((feature, index) => (
                      <Chip
                        key={index}
                        label={feature}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    ))}
                  </Box>
                </Box>

                {/* Supported Platforms */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Platforms:</strong>
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {agent.platforms.map((platform) => (
                      <Chip
                        key={platform}
                        label={platform}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    ))}
                  </Box>
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<SettingsIcon />}
                    fullWidth
                  >
                    Configure
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={agent.status === 'active' ? <PauseIcon /> : <PlayIcon />}
                    fullWidth
                    sx={{ bgcolor: agent.color }}
                  >
                    {agent.status === 'active' ? 'Pause' : 'Activate'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))})
      </Grid>
        </>
      )}

      {/* Connection Dialog */}
      <Dialog open={connectionDialog} onClose={() => setConnectionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Connect New Platform</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Platform</InputLabel>
              <Select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                label="Platform"
              >
                <MenuItem value="shopify">Shopify</MenuItem>
                <MenuItem value="whatsapp">WhatsApp Business</MenuItem>
                <MenuItem value="instagram">Instagram Business</MenuItem>
                <MenuItem value="tiktok">TikTok Business</MenuItem>
                <MenuItem value="email">Email Service</MenuItem>
              </Select>
            </FormControl>

            {selectedPlatform && (
              <FormControl fullWidth>
                <InputLabel>Connection Type</InputLabel>
                <Select
                  value={connectionType}
                  onChange={(e) => setConnectionType(e.target.value)}
                  label="Connection Type"
                >
                  {getConnectionTypes(selectedPlatform).map((type) => (
                    <MenuItem key={type} value={type}>
                      {type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {connectionType && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {getCredentialsFields(connectionType).map((field) => (
                  <TextField
                    key={field.name}
                    label={field.label}
                    type={field.type || 'text'}
                    placeholder={field.placeholder}
                    value={credentials[field.name] || ''}
                    onChange={(e) => setCredentials({
                      ...credentials,
                      [field.name]: e.target.value
                    })}
                    fullWidth
                  />
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConnectionDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleConnectPlatform}
            variant="contained"
            disabled={!selectedPlatform || !connectionType}
          >
            Connect
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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

export default UnifiedDashboard;
