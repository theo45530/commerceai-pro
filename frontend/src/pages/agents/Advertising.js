import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Paper,
  Divider,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  Announcement as CampaignIcon,
  Analytics as AnalyticsIcon,
  Tune as TuneIcon,
  Compare as CompareIcon,
} from '@mui/icons-material';
import axios from 'axios';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`advertising-tabpanel-${index}`}
      aria-labelledby={`advertising-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function Advertising() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Create Campaign
  const [campaignName, setCampaignName] = useState('');
  const [product, setProduct] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState('facebook');
  const [budget, setBudget] = useState('');
  const [campaignResult, setCampaignResult] = useState(null);
  
  // Performance Analysis
  const [campaignId, setCampaignId] = useState('');
  const [campaigns, setCampaigns] = useState(null);
  const [campaignPerformance, setCampaignPerformance] = useState(null);
  
  // Optimization
  const [optimizationCampaignId, setOptimizationCampaignId] = useState('');
  const [optimizationGoal, setOptimizationGoal] = useState('conversions');
  const [optimizationResult, setOptimizationResult] = useState(null);
  
  // A/B Testing
  const [abTestCampaignId, setAbTestCampaignId] = useState('');
  const [abTestElement, setAbTestElement] = useState('headline');
  const [abTestResult, setAbTestResult] = useState(null);

  useEffect(() => {
    // Fetch campaigns for dropdowns
    const fetchCampaigns = async () => {
      try {
        const response = await axios.get('/api/agents/advertising/campaigns');
        setCampaigns(response.data || []);
      } catch (err) {
        console.error('Error fetching campaigns:', err);
      }
    };

    fetchCampaigns();
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError(null);
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCampaignResult(null);

    try {
      const result = await axios.post('/api/agents/advertising/campaign', {
        name: campaignName,
        product,
        targetAudience,
        platform,
        budget: parseFloat(budget),
      });
      setCampaignResult(result.data);
    } catch (err) {
      console.error('Error creating campaign:', err);
      setError(err.response?.data?.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzePerformance = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCampaignPerformance(null);

    try {
      const result = await axios.get(`/api/agents/advertising/performance/${campaignId}`);
      setCampaignPerformance(result.data);
    } catch (err) {
      console.error('Error analyzing performance:', err);
      setError(err.response?.data?.message || 'Failed to analyze campaign performance');
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeCampaign = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOptimizationResult(null);

    try {
      const result = await axios.post('/api/agents/advertising/optimize', {
        campaignId: optimizationCampaignId,
        goal: optimizationGoal,
      });
      setOptimizationResult(result.data);
    } catch (err) {
      console.error('Error optimizing campaign:', err);
      setError(err.response?.data?.message || 'Failed to optimize campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAbTest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAbTestResult(null);

    try {
      const result = await axios.post('/api/agents/advertising/ab-test', {
        campaignId: abTestCampaignId,
        element: abTestElement,
      });
      setAbTestResult(result.data);
    } catch (err) {
      console.error('Error creating A/B test:', err);
      setError(err.response?.data?.message || 'Failed to create A/B test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Advertising AI Agent
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Create, analyze, and optimize your advertising campaigns
      </Typography>

      <Card sx={{ mt: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="advertising tabs">
            <Tab icon={<CampaignIcon />} label="Create Campaign" id="advertising-tab-0" />
            <Tab icon={<AnalyticsIcon />} label="Performance Analysis" id="advertising-tab-1" />
            <Tab icon={<TuneIcon />} label="Optimization" id="advertising-tab-2" />
            <Tab icon={<CompareIcon />} label="A/B Testing" id="advertising-tab-3" />
          </Tabs>
        </Box>

        {/* Create Campaign */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <form onSubmit={handleCreateCampaign}>
                {error && tabValue === 0 && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                <TextField
                  fullWidth
                  label="Campaign Name"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <TextField
                  fullWidth
                  label="Product or Service"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <TextField
                  fullWidth
                  label="Target Audience"
                  multiline
                  rows={2}
                  placeholder="Describe your target audience (age, interests, demographics)"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="platform-label">Platform</InputLabel>
                  <Select
                    labelId="platform-label"
                    value={platform}
                    label="Platform"
                    onChange={(e) => setPlatform(e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value="facebook">Facebook</MenuItem>
                    <MenuItem value="instagram">Instagram</MenuItem>
                    <MenuItem value="google">Google Ads</MenuItem>
                    <MenuItem value="linkedin">LinkedIn</MenuItem>
                    <MenuItem value="tiktok">TikTok</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Daily Budget ($)"
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading && tabValue === 0 ? <CircularProgress size={20} /> : <CampaignIcon />}
                  disabled={loading || !campaignName || !product || !targetAudience || !budget}
                >
                  Create Campaign
                </Button>
              </form>
            </Grid>
            <Grid item xs={12} md={6}>
              {loading && tabValue === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : campaignResult ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Campaign Created Successfully
                  </Typography>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      {campaignResult.name}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Platform: {campaignResult.platform}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Budget: ${campaignResult.budget}/day
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    AI-Generated Ad Copy:
                  </Typography>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
                    <Typography variant="body1" gutterBottom>
                      <strong>Headline:</strong> {campaignResult.adCopy?.headline}
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      <strong>Description:</strong> {campaignResult.adCopy?.description}
                    </Typography>
                  </Paper>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Targeting Recommendations:
                  </Typography>
                  <List dense>
                    {campaignResult.targeting?.map((target, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={target} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Typography variant="body2" color="text.secondary">
                    Fill out the form to create an AI-optimized ad campaign
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Performance Analysis */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <form onSubmit={handleAnalyzePerformance}>
                {error && tabValue === 1 && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="campaign-label">Select Campaign</InputLabel>
                  <Select
                    labelId="campaign-label"
                    value={campaignId}
                    label="Select Campaign"
                    onChange={(e) => setCampaignId(e.target.value)}
                    disabled={loading}
                  >
                    {(campaigns || []).map((campaign) => (
                      <MenuItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading && tabValue === 1 ? <CircularProgress size={20} /> : <AnalyticsIcon />}
                  disabled={loading || !campaignId}
                >
                  Analyze Performance
                </Button>
              </form>
            </Grid>
            <Grid item xs={12} md={8}>
              {loading && tabValue === 1 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : campaignPerformance ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Performance Analysis
                  </Typography>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={3}>
                        <Typography variant="subtitle2">Impressions</Typography>
                        <Typography variant="h6">{campaignPerformance.metrics?.impressions}</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="subtitle2">Clicks</Typography>
                        <Typography variant="h6">{campaignPerformance.metrics?.clicks}</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="subtitle2">CTR</Typography>
                        <Typography variant="h6">{campaignPerformance.metrics?.ctr}%</Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="subtitle2">Conversions</Typography>
                        <Typography variant="h6">{campaignPerformance.metrics?.conversions}</Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    AI Analysis:
                  </Typography>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
                    <Typography variant="body1">
                      {campaignPerformance.analysis}
                    </Typography>
                  </Paper>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Key Insights:
                  </Typography>
                  <List dense>
                    {campaignPerformance.insights?.map((insight, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={insight} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Typography variant="body2" color="text.secondary">
                    Select a campaign to analyze its performance
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Optimization */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <form onSubmit={handleOptimizeCampaign}>
                {error && tabValue === 2 && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="optimization-campaign-label">Select Campaign</InputLabel>
                  <Select
                    labelId="optimization-campaign-label"
                    value={optimizationCampaignId}
                    label="Select Campaign"
                    onChange={(e) => setOptimizationCampaignId(e.target.value)}
                    disabled={loading}
                  >
                    {(campaigns || []).map((campaign) => (
                      <MenuItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="optimization-goal-label">Optimization Goal</InputLabel>
                  <Select
                    labelId="optimization-goal-label"
                    value={optimizationGoal}
                    label="Optimization Goal"
                    onChange={(e) => setOptimizationGoal(e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value="conversions">Increase Conversions</MenuItem>
                    <MenuItem value="clicks">Increase Clicks</MenuItem>
                    <MenuItem value="reach">Maximize Reach</MenuItem>
                    <MenuItem value="roi">Improve ROI</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading && tabValue === 2 ? <CircularProgress size={20} /> : <TuneIcon />}
                  disabled={loading || !optimizationCampaignId}
                >
                  Optimize Campaign
                </Button>
              </form>
            </Grid>
            <Grid item xs={12} md={8}>
              {loading && tabValue === 2 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : optimizationResult ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Optimization Recommendations
                  </Typography>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
                    <Typography variant="body1">
                      {optimizationResult.summary}
                    </Typography>
                  </Paper>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Recommended Changes:
                  </Typography>
                  <List>
                    {optimizationResult.recommendations?.map((rec, index) => (
                      <ListItem key={index}>
                        <ListItemText 
                          primary={rec.title} 
                          secondary={rec.description} 
                        />
                      </ListItem>
                    ))}
                  </List>
                  
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    Expected Impact:
                  </Typography>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                    <Grid container spacing={2}>
                      {optimizationResult.impact && Object.entries(optimizationResult.impact).map(([key, value]) => (
                        <Grid item xs={4} key={key}>
                          <Typography variant="subtitle2">{key}</Typography>
                          <Typography variant="h6" color={value.includes('+') ? 'success.main' : 'error.main'}>
                            {value}
                          </Typography>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Typography variant="body2" color="text.secondary">
                    Select a campaign and goal to get AI optimization recommendations
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* A/B Testing */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <form onSubmit={handleCreateAbTest}>
                {error && tabValue === 3 && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="ab-test-campaign-label">Select Campaign</InputLabel>
                  <Select
                    labelId="ab-test-campaign-label"
                    value={abTestCampaignId}
                    label="Select Campaign"
                    onChange={(e) => setAbTestCampaignId(e.target.value)}
                    disabled={loading}
                  >
                    {(campaigns || []).map((campaign) => (
                      <MenuItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="ab-test-element-label">Test Element</InputLabel>
                  <Select
                    labelId="ab-test-element-label"
                    value={abTestElement}
                    label="Test Element"
                    onChange={(e) => setAbTestElement(e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value="headline">Headline</MenuItem>
                    <MenuItem value="description">Description</MenuItem>
                    <MenuItem value="image">Image Concept</MenuItem>
                    <MenuItem value="cta">Call to Action</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading && tabValue === 3 ? <CircularProgress size={20} /> : <CompareIcon />}
                  disabled={loading || !abTestCampaignId}
                >
                  Generate A/B Test
                </Button>
              </form>
            </Grid>
            <Grid item xs={12} md={8}>
              {loading && tabValue === 3 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : abTestResult ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    A/B Test Variations
                  </Typography>
                  
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#e3f2fd', height: '100%' }}>
                        <Chip label="Variation A" color="primary" size="small" sx={{ mb: 1 }} />
                        <Typography variant="body1" gutterBottom>
                          {abTestResult.variations?.a}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#e8f5e9', height: '100%' }}>
                        <Chip label="Variation B" color="success" size="small" sx={{ mb: 1 }} />
                        <Typography variant="body1" gutterBottom>
                          {abTestResult.variations?.b}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Testing Rationale:
                  </Typography>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
                    <Typography variant="body1">
                      {abTestResult.rationale}
                    </Typography>
                  </Paper>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Implementation Tips:
                  </Typography>
                  <List dense>
                    {abTestResult.tips?.map((tip, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={tip} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Typography variant="body2" color="text.secondary">
                    Select a campaign and element to generate A/B test variations
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </TabPanel>
      </Card>
    </Box>
  );
}