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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Avatar,
  Switch,
  FormControlLabel,
  Slider,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Snackbar,
  IconButton,
  Tooltip,
  Badge
} from '@mui/material';
import {
  SmartToy as AIIcon,
  Campaign as CampaignIcon,
  Support as SupportIcon,
  Analytics as AnalyticsIcon,
  Email as EmailIcon,
  Store as StoreIcon,
  Create as CreateIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

const AIAgentManager = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [configDialog, setConfigDialog] = useState(false);
  const [monitoringDialog, setMonitoringDialog] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const agentConfigs = {
    advertising: {
      id: 'advertising',
      name: 'AI Advertising Agent',
      icon: CampaignIcon,
      color: '#8B5CF6',
      description: 'Generates ad campaigns & audiences, analyzes in real time, and optimizes performance',
      status: 'active',
      performance: 95,
      features: ['Campaign Generation', 'Real-time Analysis', 'A/B Testing', 'Creative Optimization'],
      platforms: ['Facebook Ads', 'Google Ads', 'TikTok Ads', 'Instagram Ads'],
      config: {
        budget: 1000,
        targetAudience: 'E-commerce customers',
        optimizationFrequency: 'hourly',
        creativeTesting: true,
        autoScaling: true
      }
    },
    customerService: {
      id: 'customer-service',
      name: 'AI Customer Service Agent',
      icon: SupportIcon,
      color: '#3B82F6',
      description: 'Automatic customer responses across all platforms with human-like conversation',
      status: 'active',
      performance: 92,
      features: ['Multi-platform Support', 'Natural Language', '24/7 Availability', 'Escalation Handling'],
      platforms: ['WhatsApp', 'Instagram', 'TikTok', 'Email', 'Shopify Chat'],
      config: {
        responseTime: 'immediate',
        languages: ['English', 'French', 'Spanish'],
        escalationThreshold: 3,
        workingHours: '24/7'
      }
    },
    analysis: {
      id: 'analysis',
      name: 'AI Analysis Agent',
      icon: AnalyticsIcon,
      color: '#10B981',
      description: 'Analyzes product listings, shopping cart, and provides conversion optimization advice',
      status: 'active',
      performance: 88,
      features: ['Product Analysis', 'Conversion Optimization', 'Payment Method Analysis', 'Trust Building'],
      platforms: ['Shopify', 'WooCommerce', 'Magento', 'BigCommerce'],
      config: {
        analysisFrequency: 'daily',
        focusAreas: ['product-pages', 'checkout', 'trust-elements'],
        recommendations: true,
        competitorAnalysis: true
      }
    },
    emailMarketing: {
      id: 'email-marketing',
      name: 'AI Email Marketing Agent',
      icon: EmailIcon,
      color: '#F59E0B',
      description: 'Generates branded email sequences, welcome emails, and abandoned cart reminders',
      status: 'active',
      performance: 90,
      features: ['Email Sequences', 'Branded Templates', 'Image Generation', 'A/B Testing'],
      platforms: ['Gmail', 'Mailchimp', 'SendGrid', 'Klaviyo'],
      config: {
        emailFrequency: 'weekly',
        branding: true,
        imageGeneration: true,
        personalization: true
      }
    },
    pageGenerator: {
      id: 'page-generator',
      name: 'AI Page Generator Agent',
      icon: StoreIcon,
      color: '#EF4444',
      description: 'Generates complete Shopify stores with optimized pages and branded content',
      status: 'active',
      performance: 87,
      features: ['Store Generation', 'Page Optimization', 'Content Scraping', 'Image Processing'],
      platforms: ['Shopify', 'WooCommerce', 'Custom Websites'],
      config: {
        pageTypes: ['home', 'product', 'about', 'faq', 'contact'],
        contentScraping: true,
        imageProcessing: true,
        seoOptimization: true
      }
    },
    contentCreator: {
      id: 'content-creator',
      name: 'AI Content Creator Agent',
      icon: CreateIcon,
      color: '#F97316',
      description: 'Generates viral TikTok/Instagram content and manages social media engagement',
      status: 'active',
      performance: 93,
      features: ['Content Generation', 'Image Creation', 'Video Editing', 'Comment Management'],
      platforms: ['TikTok', 'Instagram', 'Facebook', 'YouTube'],
      config: {
        contentType: ['images', 'videos', 'stories'],
        postingFrequency: 'daily',
        aiGeneration: true,
        commentModeration: true
      }
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    setLoading(true);
    try {
      // Simulate API call - replace with actual endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAgents(Object.values(agentConfigs));
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAgentAction = async (agentId, action) => {
    try {
      // Simulate API call - replace with actual endpoint
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setAgents(prev => prev.map(agent => 
        agent.id === agentId 
          ? { ...agent, status: action === 'start' ? 'active' : action === 'stop' ? 'stopped' : 'paused' }
          : agent
      ));

      setSnackbar({
        open: true,
        message: `Agent ${action}ed successfully`,
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to ${action} agent`,
        severity: 'error'
      });
    }
  };

  const handleConfigSave = async () => {
    try {
      // Simulate API call - replace with actual endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSnackbar({
        open: true,
        message: 'Agent configuration saved successfully',
        severity: 'success'
      });
      setConfigDialog(false);
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to save configuration',
        severity: 'error'
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'stopped': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <PlayIcon />;
      case 'paused': return <PauseIcon />;
      case 'stopped': return <StopIcon />;
      default: return <InfoIcon />;
    }
  };

  const renderConfigTab = () => (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Agent Configuration
      </Typography>
      
      {selectedAgent && (
        <Grid container spacing={3}>
          {Object.entries(selectedAgent.config).map(([key, value]) => (
            <Grid item xs={12} md={6} key={key}>
              {typeof value === 'boolean' ? (
                <FormControlLabel
                  control={
                    <Switch
                      checked={value}
                      onChange={(e) => setSelectedAgent({
                        ...selectedAgent,
                        config: { ...selectedAgent.config, [key]: e.target.checked }
                      })}
                    />
                  }
                  label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                />
              ) : typeof value === 'number' ? (
                <Box>
                  <Typography variant="body2" gutterBottom>
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </Typography>
                  <Slider
                    value={value}
                    onChange={(e, newValue) => setSelectedAgent({
                      ...selectedAgent,
                      config: { ...selectedAgent.config, [key]: newValue }
                    })}
                    min={0}
                    max={key === 'budget' ? 10000 : 100}
                    step={key === 'budget' ? 100 : 1}
                    valueLabelDisplay="auto"
                  />
                </Box>
              ) : (
                <TextField
                  fullWidth
                  label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  value={value}
                  onChange={(e) => setSelectedAgent({
                    ...selectedAgent,
                    config: { ...selectedAgent.config, [key]: e.target.value }
                  })}
                />
              )}
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  const renderMonitoringTab = () => (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Performance Monitoring
      </Typography>
      
      {selectedAgent && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance Metrics
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h4" sx={{ color: selectedAgent.color, mr: 2 }}>
                    {selectedAgent.performance}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Overall Performance
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={selectedAgent.performance}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Activity
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircleIcon color="success" />
                    </ListItemIcon>
                    <ListItemText primary="Campaign optimized" secondary="2 hours ago" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <TrendingUpIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary="Performance improved by 15%" secondary="1 day ago" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <InfoIcon color="info" />
                    </ListItemIcon>
                    <ListItemText primary="New feature activated" secondary="3 days ago" />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );

  if (loading && agents.length === 0) {
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
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          🤖 AI Agent Manager
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure, monitor, and control all your AI agents from one central dashboard
        </Typography>
      </Box>

      {/* Agents Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {agents.map((agent) => (
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
                    {agent.features.slice(0, 3).map((feature, index) => (
                      <Chip
                        key={index}
                        label={feature}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    ))}
                    {agent.features.length > 3 && (
                      <Chip
                        label={`+${agent.features.length - 3} more`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<SettingsIcon />}
                    onClick={() => {
                      setSelectedAgent(agent);
                      setConfigDialog(true);
                    }}
                  >
                    Configure
                  </Button>
                  
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<TrendingUpIcon />}
                    onClick={() => {
                      setSelectedAgent(agent);
                      setMonitoringDialog(true);
                    }}
                  >
                    Monitor
                  </Button>
                  
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={agent.status === 'active' ? <PauseIcon /> : <PlayIcon />}
                    onClick={() => handleAgentAction(agent.id, agent.status === 'active' ? 'pause' : 'start')}
                    sx={{ bgcolor: agent.color }}
                  >
                    {agent.status === 'active' ? 'Pause' : 'Start'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Configuration Dialog */}
      <Dialog open={configDialog} onClose={() => setConfigDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Configure {selectedAgent?.name}
        </DialogTitle>
        <DialogContent>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
            <Tab label="Configuration" />
            <Tab label="Monitoring" />
          </Tabs>
          
          {activeTab === 0 && renderConfigTab()}
          {activeTab === 1 && renderMonitoringTab()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialog(false)}>Cancel</Button>
          <Button onClick={handleConfigSave} variant="contained">
            Save Configuration
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

export default AIAgentManager;
