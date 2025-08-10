import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  Alert,
  Button,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Badge,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Analytics as AnalyticsIcon,
  Speed as SpeedIcon,
  Psychology as PsychologyIcon,
  Sync as SyncIcon
} from '@mui/icons-material';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend
);

const RealTimeDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [platformData, setPlatformData] = useState({});
  const [agentActivities, setAgentActivities] = useState([]);
  const [feedbackStats, setFeedbackStats] = useState(null);
  const [autonomyStatus, setAutonomyStatus] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);

  // WebSocket connection
  useEffect(() => {
    if (!realTimeUpdates) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setWsConnected(true);
      
      // Subscribe to channels
      ws.send(JSON.stringify({ type: 'subscribe', channel: 'platform_data' }));
      ws.send(JSON.stringify({ type: 'subscribe', channel: 'agent_activities' }));
      ws.send(JSON.stringify({ type: 'subscribe', channel: 'agent_feedback' }));
      ws.send(JSON.stringify({ type: 'subscribe', channel: 'agent_autonomy' }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleRealtimeUpdate(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setWsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [realTimeUpdates]);

  // Handle real-time updates
  const handleRealtimeUpdate = useCallback((data) => {
    switch (data.type) {
      case 'platform_data_updated':
        setPlatformData(prev => ({
          ...prev,
          [data.platform]: data.data
        }));
        break;
      
      case 'agent_decision':
      case 'action_started':
      case 'action_completed':
      case 'action_failed':
        // Refresh activities
        fetchAgentActivities();
        break;
      
      case 'feedback_generated':
        // Refresh feedback stats
        fetchFeedbackStats();
        break;
      
      case 'autonomy_status_changed':
        // Refresh autonomy status
        fetchAutonomyStatus();
        break;
      
      default:
        console.log('Unknown real-time update:', data);
    }
  }, []);

  // Fetch dashboard summary
  const fetchDashboardSummary = async () => {
    try {
      const response = await fetch('/api/dashboard/summary', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const result = await response.json();
      if (result.success) {
        setDashboardData(result.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
      setError('Failed to fetch dashboard summary');
    }
  };

  // Fetch platform data
  const fetchPlatformData = async () => {
    try {
      const response = await fetch('/api/platform-data', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const result = await response.json();
      if (result.success) {
        setPlatformData(result.data);
      }
    } catch (error) {
      console.error('Error fetching platform data:', error);
    }
  };

  // Fetch agent activities
  const fetchAgentActivities = async () => {
    try {
      const response = await fetch('/api/agent-activities?limit=50', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const result = await response.json();
      if (result.success) {
        setAgentActivities(result.data);
      }
    } catch (error) {
      console.error('Error fetching agent activities:', error);
    }
  };

  // Fetch feedback statistics
  const fetchFeedbackStats = async () => {
    try {
      const response = await fetch('/api/agent-feedback/statistics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const result = await response.json();
      if (result.success) {
        setFeedbackStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching feedback stats:', error);
    }
  };

  // Fetch autonomy status
  const fetchAutonomyStatus = async () => {
    try {
      const response = await fetch('/api/agent-autonomy/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const result = await response.json();
      if (result.success) {
        setAutonomyStatus(result.data);
      }
    } catch (error) {
      console.error('Error fetching autonomy status:', error);
    }
  };

  // Initial data fetch
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchDashboardSummary(),
          fetchPlatformData(),
          fetchAgentActivities(),
          fetchFeedbackStats(),
          fetchAutonomyStatus()
        ]);
      } catch (error) {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Refresh all data
  const handleRefresh = () => {
    fetchDashboardSummary();
    fetchPlatformData();
    fetchAgentActivities();
    fetchFeedbackStats();
    fetchAutonomyStatus();
  };

  // Force platform sync
  const handlePlatformSync = async (platform) => {
    try {
      await fetch(`/api/platform-data/${platform}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      // Data will be updated via WebSocket
    } catch (error) {
      console.error('Error syncing platform:', error);
    }
  };

  // Toggle agent autonomy
  const toggleAgentAutonomy = async (agentType, agentId, enabled) => {
    try {
      const action = enabled ? 'enable' : 'disable';
      await fetch(`/api/agent-autonomy/${agentType}/${agentId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      fetchAutonomyStatus();
    } catch (error) {
      console.error('Error toggling agent autonomy:', error);
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'healthy':
      case 'active':
        return 'success';
      case 'warning':
      case 'pending':
        return 'warning';
      case 'failed':
      case 'error':
      case 'stopped':
        return 'error';
      default:
        return 'default';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
      case 'healthy':
      case 'active':
        return <CheckCircleIcon />;
      case 'warning':
      case 'pending':
        return <WarningIcon />;
      case 'failed':
      case 'error':
      case 'stopped':
        return <ErrorIcon />;
      default:
        return null;
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  // Format duration
  const formatDuration = (duration) => {
    if (!duration) return 'N/A';
    return `${(duration / 1000).toFixed(2)}s`;
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Real-Time Dashboard
        </Typography>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Loading dashboard data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={handleRefresh}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Real-Time Dashboard
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={realTimeUpdates}
                onChange={(e) => setRealTimeUpdates(e.target.checked)}
              />
            }
            label="Real-time Updates"
          />
          <Chip
            icon={wsConnected ? <CheckCircleIcon /> : <ErrorIcon />}
            label={wsConnected ? 'Connected' : 'Disconnected'}
            color={wsConnected ? 'success' : 'error'}
            size="small"
          />
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      {dashboardData && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Active Platforms
                </Typography>
                <Typography variant="h4">
                  {dashboardData.platforms.active}/{dashboardData.platforms.total}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Last update: {formatTimestamp(dashboardData.platforms.lastUpdate)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Agent Activities
                </Typography>
                <Typography variant="h4">
                  {dashboardData.agents.totalActivities}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Success rate: {dashboardData.agents.successRate.toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Active Agents
                </Typography>
                <Typography variant="h4">
                  {dashboardData.agents.activeAgents}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Errors: {dashboardData.agents.errors}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Feedback Items
                </Typography>
                <Typography variant="h4">
                  {dashboardData.feedback.total}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Pending: {dashboardData.feedback.pending}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)}>
          <Tab label="Platform Data" icon={<SyncIcon />} />
          <Tab label="Agent Activities" icon={<SpeedIcon />} />
          <Tab label="Agent Learning" icon={<PsychologyIcon />} />
          <Tab label="Autonomy Control" icon={<AnalyticsIcon />} />
        </Tabs>
      </Box>

      {/* Platform Data Tab */}
      {selectedTab === 0 && (
        <Grid container spacing={3}>
          {Object.entries(platformData).map(([platform, data]) => (
            <Grid item xs={12} md={6} lg={4} key={platform}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                      {platform}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        icon={getStatusIcon(data.syncStatus?.status)}
                        label={data.syncStatus?.status || 'Unknown'}
                        color={getStatusColor(data.syncStatus?.status)}
                        size="small"
                      />
                      <IconButton
                        size="small"
                        onClick={() => handlePlatformSync(platform)}
                        title="Force Sync"
                      >
                        <RefreshIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  {data.data && data.data.metrics && (
                    <Box>
                      {Object.entries(data.data.metrics).slice(0, 4).map(([metric, value]) => (
                        <Box key={metric} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" color="textSecondary">
                            {metric}:
                          </Typography>
                          <Typography variant="body2">
                            {typeof value === 'number' ? value.toLocaleString() : value}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                  
                  <Typography variant="caption" color="textSecondary">
                    Last updated: {formatTimestamp(data.lastUpdated)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Agent Activities Tab */}
      {selectedTab === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>Agent</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Platform</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Impact</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {agentActivities.slice(0, 20).map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell>
                    <Typography variant="body2">
                      {formatTimestamp(activity.timestamp)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {activity.agentType}:{activity.agentId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={activity.type} size="small" />
                  </TableCell>
                  <TableCell>
                    {activity.platform ? (
                      <Chip label={activity.platform} size="small" variant="outlined" />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(activity.status)}
                      label={activity.status}
                      color={getStatusColor(activity.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDuration(activity.duration)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={activity.impact}
                      color={activity.impact === 'high' ? 'error' : activity.impact === 'medium' ? 'warning' : 'default'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Agent Learning Tab */}
      {selectedTab === 2 && feedbackStats && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Feedback Overview
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    Total Feedback: {feedbackStats.totalFeedback}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Processed: {feedbackStats.processed}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Pending: {feedbackStats.pending}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(feedbackStats.processed / feedbackStats.totalFeedback) * 100}
                  sx={{ mb: 1 }}
                />
                <Typography variant="caption">
                  Processing Rate: {((feedbackStats.processed / feedbackStats.totalFeedback) * 100).toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Feedback by Type
                </Typography>
                {feedbackStats.byType && Object.entries(feedbackStats.byType).map(([type, count]) => (
                  <Box key={type} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">{type}:</Typography>
                    <Typography variant="body2">{count}</Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Autonomy Control Tab */}
      {selectedTab === 3 && autonomyStatus && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Agent Autonomy Status
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Total Autonomous Agents: {autonomyStatus.totalAgents || 0}
                </Typography>
                
                {autonomyStatus.agents && Object.entries(autonomyStatus.agents).map(([agentKey, status]) => {
                  const [agentType, agentId] = agentKey.split(':');
                  return (
                    <Box key={agentKey} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Box>
                        <Typography variant="subtitle1">
                          {agentType}:{agentId}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Last Decision: {status.lastDecision ? formatTimestamp(status.lastDecision) : 'Never'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Decisions: {status.totalDecisions || 0} | Success Rate: {(status.successRate || 0).toFixed(1)}%
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Chip
                          label={status.enabled ? 'Autonomous' : 'Manual'}
                          color={status.enabled ? 'success' : 'default'}
                          icon={status.enabled ? <PlayIcon /> : <PauseIcon />}
                        />
                        <Switch
                          checked={status.enabled || false}
                          onChange={(e) => toggleAgentAutonomy(agentType, agentId, e.target.checked)}
                        />
                      </Box>
                    </Box>
                  );
                })}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default RealTimeDashboard;