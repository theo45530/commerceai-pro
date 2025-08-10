import React, { useState } from 'react';
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
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  CompareArrows as CompareArrowsIcon,
  Insights as InsightsIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import axios from 'axios';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analysis-tabpanel-${index}`}
      aria-labelledby={`analysis-tab-${index}`}
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

export default function Analysis() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Market Analysis
  const [industry, setIndustry] = useState('');
  const [targetMarket, setTargetMarket] = useState('');
  const [competitors, setCompetitors] = useState('');
  const [marketResult, setMarketResult] = useState([]);
  
  // Sales Analysis
  const [salesData, setSalesData] = useState('');
  const [timeframe, setTimeframe] = useState('monthly');
  const [salesResult, setSalesResult] = useState(null);
  
  // Competitor Analysis
  const [competitorNames, setCompetitorNames] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [competitorResult, setCompetitorResult] = useState(null);
  
  // Trend Analysis
  const [sector, setSector] = useState('');
  const [trendTimeframe, setTrendTimeframe] = useState('6months');
  const [trendResult, setTrendResult] = useState(null);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError(null);
  };

  const handleMarketAnalysis = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMarketResult(null);

    try {
      const result = await axios.post('/api/agents/analysis/market', {
        industry,
        targetMarket,
        competitors,
      });
      setMarketResult(result.data);
    } catch (err) {
      console.error('Error performing market analysis:', err);
      setError(err.response?.data?.message || 'Failed to perform market analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleSalesAnalysis = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSalesResult(null);

    try {
      const result = await axios.post('/api/agents/analysis/sales', {
        salesData,
        timeframe,
      });
      setSalesResult(result.data);
    } catch (err) {
      console.error('Error performing sales analysis:', err);
      setError(err.response?.data?.message || 'Failed to perform sales analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleCompetitorAnalysis = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCompetitorResult(null);

    try {
      const result = await axios.post('/api/agents/analysis/competitors', {
        competitorNames,
        businessDescription,
      });
      setCompetitorResult(result.data);
    } catch (err) {
      console.error('Error performing competitor analysis:', err);
      setError(err.response?.data?.message || 'Failed to perform competitor analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleTrendAnalysis = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setTrendResult(null);

    try {
      const result = await axios.post('/api/agents/analysis/trends', {
        sector,
        timeframe: trendTimeframe,
      });
      setTrendResult(result.data);
    } catch (err) {
      console.error('Error performing trend analysis:', err);
      setError(err.response?.data?.message || 'Failed to perform trend analysis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Analysis AI Agent
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Get deep insights into markets, sales, competitors, and trends
      </Typography>

      <Card sx={{ mt: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="analysis tabs">
            <Tab icon={<AssessmentIcon />} label="Market Analysis" id="analysis-tab-0" />
            <Tab icon={<TrendingUpIcon />} label="Sales Analysis" id="analysis-tab-1" />
            <Tab icon={<CompareArrowsIcon />} label="Competitor Analysis" id="analysis-tab-2" />
            <Tab icon={<InsightsIcon />} label="Trend Analysis" id="analysis-tab-3" />
          </Tabs>
        </Box>

        {/* Market Analysis */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={5}>
              <form onSubmit={handleMarketAnalysis}>
                {error && tabValue === 0 && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                <TextField
                  fullWidth
                  label="Industry"
                  placeholder="e.g., E-commerce, SaaS, Healthcare"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <TextField
                  fullWidth
                  label="Target Market"
                  placeholder="Describe your target demographic, geography, etc."
                  multiline
                  rows={2}
                  value={targetMarket}
                  onChange={(e) => setTargetMarket(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <TextField
                  fullWidth
                  label="Key Competitors"
                  placeholder="List main competitors (comma separated)"
                  value={competitors}
                  onChange={(e) => setCompetitors(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading && tabValue === 0 ? <CircularProgress size={20} /> : <AssessmentIcon />}
                  disabled={loading || !industry || !targetMarket}
                >
                  Analyze Market
                </Button>
              </form>
            </Grid>
            <Grid item xs={12} md={7}>
              {loading && tabValue === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : marketResult ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Market Analysis Results
                  </Typography>
                  
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Market Overview
                    </Typography>
                    <Typography variant="body2">
                      {marketResult.overview}
                    </Typography>
                  </Paper>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', height: '100%' }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Market Size & Growth
                        </Typography>
                        <List dense>
                          {marketResult.marketSize?.map((item, index) => (
                            <ListItem key={index}>
                              <ListItemText primary={item} />
                            </ListItem>
                          ))}
                        </List>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', height: '100%' }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Competitive Landscape
                        </Typography>
                        <List dense>
                          {marketResult.competitiveLandscape?.map((item, index) => (
                            <ListItem key={index}>
                              <ListItemText primary={item} />
                            </ListItem>
                          ))}
                        </List>
                      </Paper>
                    </Grid>
                  </Grid>
                  
                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
                    Opportunities & Threats
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>
                        Opportunities
                      </Typography>
                      <List dense>
                        {marketResult.opportunities?.map((item, index) => (
                          <ListItem key={index}>
                            <ListItemText primary={item} />
                          </ListItem>
                        ))}
                      </List>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" gutterBottom>
                        Threats
                      </Typography>
                      <List dense>
                        {marketResult.threats?.map((item, index) => (
                          <ListItem key={index}>
                            <ListItemText primary={item} />
                          </ListItem>
                        ))}
                      </List>
                    </Grid>
                  </Grid>
                  
                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
                    Strategic Recommendations
                  </Typography>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                    <List dense>
                      {marketResult.recommendations?.map((item, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={item} />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Typography variant="body2" color="text.secondary">
                    Fill out the form to generate a market analysis
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Sales Analysis */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={5}>
              <form onSubmit={handleSalesAnalysis}>
                {error && tabValue === 1 && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                <TextField
                  fullWidth
                  label="Sales Data"
                  multiline
                  rows={6}
                  placeholder="Paste your sales data here (CSV format preferred, or describe your sales performance)"
                  value={salesData}
                  onChange={(e) => setSalesData(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="timeframe-label">Analysis Timeframe</InputLabel>
                  <Select
                    labelId="timeframe-label"
                    value={timeframe}
                    label="Analysis Timeframe"
                    onChange={(e) => setTimeframe(e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="quarterly">Quarterly</MenuItem>
                    <MenuItem value="yearly">Yearly</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading && tabValue === 1 ? <CircularProgress size={20} /> : <TrendingUpIcon />}
                  disabled={loading || !salesData}
                >
                  Analyze Sales
                </Button>
              </form>
            </Grid>
            <Grid item xs={12} md={7}>
              {loading && tabValue === 1 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : salesResult ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Sales Analysis Results
                  </Typography>
                  
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Executive Summary
                    </Typography>
                    <Typography variant="body2">
                      {salesResult.summary}
                    </Typography>
                  </Paper>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', height: '100%' }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Key Performance Indicators
                        </Typography>
                        <List dense>
                          {salesResult.kpis?.map((kpi, index) => (
                            <ListItem key={index}>
                              <ListItemText 
                                primary={kpi.name} 
                                secondary={`${kpi.value} (${kpi.change > 0 ? '+' : ''}${kpi.change}%)`} 
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', height: '100%' }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Top Products/Services
                        </Typography>
                        <List dense>
                          {salesResult.topProducts?.map((product, index) => (
                            <ListItem key={index}>
                              <ListItemText 
                                primary={product.name} 
                                secondary={`Revenue: ${product.revenue} | Units: ${product.units}`} 
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Paper>
                    </Grid>
                  </Grid>
                  
                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
                    Trends & Patterns
                  </Typography>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 3 }}>
                    <List dense>
                      {salesResult.trends?.map((trend, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={trend} />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                  
                  <Typography variant="subtitle1" gutterBottom>
                    Recommendations
                  </Typography>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                    <List dense>
                      {salesResult.recommendations?.map((rec, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={rec} />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Typography variant="body2" color="text.secondary">
                    Enter your sales data to generate an analysis
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Competitor Analysis */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={5}>
              <form onSubmit={handleCompetitorAnalysis}>
                {error && tabValue === 2 && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                <TextField
                  fullWidth
                  label="Your Business Description"
                  multiline
                  rows={3}
                  placeholder="Briefly describe your business, products/services, and value proposition"
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <TextField
                  fullWidth
                  label="Competitor Names"
                  multiline
                  rows={2}
                  placeholder="List your main competitors (comma separated)"
                  value={competitorNames}
                  onChange={(e) => setCompetitorNames(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading && tabValue === 2 ? <CircularProgress size={20} /> : <CompareArrowsIcon />}
                  disabled={loading || !competitorNames || !businessDescription}
                >
                  Analyze Competitors
                </Button>
              </form>
            </Grid>
            <Grid item xs={12} md={7}>
              {loading && tabValue === 2 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : competitorResult ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Competitor Analysis Results
                  </Typography>
                  
                  {competitorResult.competitors?.map((competitor, index) => (
                    <Paper key={index} elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        {competitor.name}
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>
                            Strengths
                          </Typography>
                          <List dense>
                            {competitor.strengths?.map((item, i) => (
                              <ListItem key={i}>
                                <ListItemText primary={item} />
                              </ListItem>
                            ))}
                          </List>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" gutterBottom>
                            Weaknesses
                          </Typography>
                          <List dense>
                            {competitor.weaknesses?.map((item, i) => (
                              <ListItem key={i}>
                                <ListItemText primary={item} />
                              </ListItem>
                            ))}
                          </List>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                  
                  <Typography variant="subtitle1" gutterBottom>
                    Competitive Positioning
                  </Typography>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 3 }}>
                    <Typography variant="body2">
                      {competitorResult.positioning}
                    </Typography>
                  </Paper>
                  
                  <Typography variant="subtitle1" gutterBottom>
                    Strategic Recommendations
                  </Typography>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                    <List dense>
                      {competitorResult.recommendations?.map((rec, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={rec} />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Typography variant="body2" color="text.secondary">
                    Enter your business and competitor information to generate an analysis
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Trend Analysis */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={5}>
              <form onSubmit={handleTrendAnalysis}>
                {error && tabValue === 3 && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                <TextField
                  fullWidth
                  label="Industry/Sector"
                  placeholder="e.g., Fashion, Technology, Food & Beverage"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="trend-timeframe-label">Timeframe</InputLabel>
                  <Select
                    labelId="trend-timeframe-label"
                    value={trendTimeframe}
                    label="Timeframe"
                    onChange={(e) => setTrendTimeframe(e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value="3months">Next 3 Months</MenuItem>
                    <MenuItem value="6months">Next 6 Months</MenuItem>
                    <MenuItem value="1year">Next Year</MenuItem>
                    <MenuItem value="2years">Next 2 Years</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading && tabValue === 3 ? <CircularProgress size={20} /> : <TimelineIcon />}
                  disabled={loading || !sector}
                >
                  Analyze Trends
                </Button>
              </form>
            </Grid>
            <Grid item xs={12} md={7}>
              {loading && tabValue === 3 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : trendResult ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Trend Analysis Results
                  </Typography>
                  
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Overview
                    </Typography>
                    <Typography variant="body2">
                      {trendResult.overview}
                    </Typography>
                  </Paper>
                  
                  <Typography variant="subtitle1" gutterBottom>
                    Key Trends
                  </Typography>
                  {trendResult.trends?.map((trend, index) => (
                    <Paper key={index} elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {trend.name}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        {trend.description}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Chip 
                          size="small" 
                          label={`Impact: ${trend.impact}`} 
                          sx={{ mr: 1, mb: 1 }} 
                          color={trend.impact === 'High' ? 'error' : trend.impact === 'Medium' ? 'warning' : 'success'}
                        />
                        <Chip 
                          size="small" 
                          label={`Timeframe: ${trend.timeframe}`} 
                          sx={{ mr: 1, mb: 1 }} 
                        />
                      </Box>
                    </Paper>
                  ))}
                  
                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                    Opportunities
                  </Typography>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 3 }}>
                    <List dense>
                      {trendResult.opportunities?.map((item, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={item} />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                  
                  <Typography variant="subtitle1" gutterBottom>
                    Strategic Recommendations
                  </Typography>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                    <List dense>
                      {trendResult.recommendations?.map((rec, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={rec} />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Typography variant="body2" color="text.secondary">
                    Enter your industry/sector to analyze upcoming trends
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