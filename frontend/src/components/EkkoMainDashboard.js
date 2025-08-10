import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
  Paper,
  Chip,
  Avatar,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
  IconButton,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  SmartToy as AIIcon,
  Campaign as CampaignIcon,
  Support as SupportIcon,
  Analytics as AnalyticsIcon,
  Email as EmailIcon,
  Store as StoreIcon,
  Create as CreateIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Add as AddIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  MonetizationOn as MonetizationOnIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon
} from '@mui/icons-material';

const EkkoMainDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  const [dashboardData, setDashboardData] = useState({
    overview: {
      totalRevenue: 125000,
      revenueGrowth: 23.5,
      totalOrders: 2847,
      ordersGrowth: 18.2,
      conversionRate: 3.8,
      conversionGrowth: 12.1,
      activeAgents: 6,
      platformConnections: 8
    },
    agents: [
      {
        id: 'advertising',
        name: 'AI Advertising Agent',
        icon: CampaignIcon,
        color: '#8B5CF6',
        status: 'active',
        performance: 95,
        lastActivity: '2 hours ago',
        revenue: 45000
      },
      {
        id: 'customer-service',
        name: 'AI Customer Service Agent',
        icon: SupportIcon,
        color: '#3B82F6',
        status: 'active',
        performance: 92,
        lastActivity: '5 minutes ago',
        revenue: 28000
      },
      {
        id: 'analysis',
        name: 'AI Analysis Agent',
        icon: AnalyticsIcon,
        color: '#10B981',
        status: 'active',
        performance: 88,
        lastActivity: '1 hour ago',
        revenue: 15000
      },
      {
        id: 'email-marketing',
        name: 'AI Email Marketing Agent',
        icon: EmailIcon,
        color: '#F59E0B',
        status: 'active',
        performance: 90,
        lastActivity: '30 minutes ago',
        revenue: 22000
      },
      {
        id: 'page-generator',
        name: 'AI Page Generator Agent',
        icon: StoreIcon,
        color: '#EF4444',
        status: 'active',
        performance: 87,
        lastActivity: '3 hours ago',
        revenue: 8000
      },
      {
        id: 'content-creator',
        name: 'AI Content Creator Agent',
        icon: CreateIcon,
        color: '#F97316',
        status: 'active',
        performance: 93,
        lastActivity: '1 hour ago',
        revenue: 6000
      }
    ],
    platforms: [
      { name: 'Shopify', status: 'connected', icon: '🛍️', color: '#96BF47' },
      { name: 'WhatsApp', status: 'connected', icon: '💬', color: '#25D366' },
      { name: 'Instagram', status: 'connected', icon: '📸', color: '#E4405F' },
      { name: 'Facebook', status: 'connected', icon: '📘', color: '#1877F2' },
      { name: 'TikTok', status: 'pending', icon: '🎵', color: '#000000' },
      { name: 'Google Ads', status: 'connected', icon: '🔍', color: '#4285F4' },
      { name: 'Email', status: 'connected', icon: '📧', color: '#EA4335' },
      { name: 'WooCommerce', status: 'disconnected', icon: '🛒', color: '#7F54B3' }
    ],
    recentActivity: [
      {
        type: 'campaign',
        message: 'AI Advertising Agent optimized campaign "Summer Sale" - CTR increased by 15%',
        time: '2 hours ago',
        icon: CampaignIcon,
        color: '#8B5CF6'
      },
      {
        type: 'customer',
        message: 'AI Customer Service Agent resolved 47 inquiries in the last hour',
        time: '1 hour ago',
        icon: SupportIcon,
        color: '#3B82F6'
      },
      {
        type: 'analysis',
        message: 'AI Analysis Agent identified 3 product pages for optimization',
        time: '3 hours ago',
        icon: AnalyticsIcon,
        color: '#10B981'
      },
      {
        type: 'email',
        message: 'AI Email Marketing Agent sent abandoned cart sequence to 234 customers',
        time: '4 hours ago',
        icon: EmailIcon,
        color: '#F59E0B'
      },
      {
        type: 'content',
        message: 'AI Content Creator Agent generated 5 new social media posts',
        time: '5 hours ago',
        icon: CreateIcon,
        color: '#F97316'
      }
    ]
  });

  useEffect(() => {
    // Simulate data loading
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'success';
      case 'pending': return 'warning';
      case 'disconnected': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected': return <CheckCircleIcon />;
      case 'pending': return <WarningIcon />;
      case 'disconnected': return <ErrorIcon />;
      default: return <InfoIcon />;
    }
  };

  const renderOverviewTab = () => (
    <Box>
      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <MonetizationOnIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" color="text.secondary">
                    Total Revenue
                  </Typography>
                  <Typography variant="h4">
                    ${dashboardData.overview.totalRevenue.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon sx={{ color: 'success.main', mr: 1 }} />
                <Typography variant="body2" color="success.main">
                  +{dashboardData.overview.revenueGrowth}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                  <PeopleIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" color="text.secondary">
                    Total Orders
                  </Typography>
                  <Typography variant="h4">
                    {dashboardData.overview.totalOrders.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon sx={{ color: 'success.main', mr: 1 }} />
                <Typography variant="body2" color="success.main">
                  +{dashboardData.overview.ordersGrowth}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <TrendingUpIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" color="text.secondary">
                    Conversion Rate
                  </Typography>
                  <Typography variant="h4">
                    {dashboardData.overview.conversionRate}%
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon sx={{ color: 'success.main', mr: 1 }} />
                <Typography variant="body2" color="success.main">
                  +{dashboardData.overview.conversionGrowth}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <AIIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" color="text.secondary">
                    Active Agents
                  </Typography>
                  <Typography variant="h4">
                    {dashboardData.overview.activeAgents}/6
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="success.main">
                All systems operational
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* AI Agents Performance */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            AI Agents Performance Overview
          </Typography>
          <Grid container spacing={3}>
            {dashboardData.agents.map((agent) => (
              <Grid item xs={12} sm={6} md={4} key={agent.id}>
                <Box sx={{ p: 2, border: `1px solid ${agent.color}20`, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: agent.color, mr: 2 }}>
                      <agent.icon />
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        {agent.name}
                      </Typography>
                      <Chip
                        icon={agent.status === 'active' ? <PlayIcon /> : <PauseIcon />}
                        label={agent.status}
                        color="success"
                        size="small"
                      />
                    </Box>
                  </Box>
                  
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
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Revenue: ${agent.revenue.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {agent.lastActivity}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent AI Activity
          </Typography>
          <List>
            {dashboardData.recentActivity.map((activity, index) => (
              <React.Fragment key={index}>
                <ListItem>
                  <ListItemIcon>
                    <Avatar sx={{ bgcolor: activity.color, width: 32, height: 32 }}>
                      <activity.icon sx={{ fontSize: 16 }} />
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={activity.message}
                    secondary={activity.time}
                  />
                </ListItem>
                {index < dashboardData.recentActivity.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </CardContent>
      </Card>
    </Box>
  );

  const renderAgentsTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
        AI Agent Management
      </Typography>
      
      <Grid container spacing={3}>
        {dashboardData.agents.map((agent) => (
          <Grid item xs={12} md={6} lg={4} key={agent.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: agent.color, mr: 2 }}>
                    <agent.icon />
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {agent.name}
                    </Typography>
                    <Chip
                      icon={agent.status === 'active' ? <PlayIcon /> : <PauseIcon />}
                      label={agent.status}
                      color="success"
                      size="small"
                    />
                  </Box>
                </Box>
                
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
                
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<SettingsIcon />}
                  >
                    Configure
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<TrendingUpIcon />}
                  >
                    Monitor
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={agent.status === 'active' ? <PauseIcon /> : <PlayIcon />}
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
    </Box>
  );

  const renderPlatformsTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
        Platform Connections
      </Typography>
      
      <Grid container spacing={3}>
        {dashboardData.platforms.map((platform, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h2" sx={{ mb: 1 }}>
                  {platform.icon}
                </Typography>
                <Typography variant="h6" gutterBottom>
                  {platform.name}
                </Typography>
                <Chip
                  icon={getStatusIcon(platform.status)}
                  label={platform.status}
                  color={getStatusColor(platform.status)}
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  startIcon={<SettingsIcon />}
                >
                  {platform.status === 'connected' ? 'Configure' : 'Connect'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  if (loading) {
    return (
      <Box sx={{ width: '100%', p: 3 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading Ekko Dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom>
          🤖 Ekko Dashboard
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Your AI-powered e-commerce command center
        </Typography>
      </Box>

      {/* Navigation Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant={isMobile ? 'scrollable' : 'fullWidth'}
          scrollButtons={isMobile ? 'auto' : false}
        >
          <Tab label="Overview" icon={<DashboardIcon />} />
          <Tab label="AI Agents" icon={<AIIcon />} />
          <Tab label="Platforms" icon={<StoreIcon />} />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && renderOverviewTab()}
      {activeTab === 1 && renderAgentsTab()}
      {activeTab === 2 && renderPlatformsTab()}
    </Container>
  );
};

export default EkkoMainDashboard;
