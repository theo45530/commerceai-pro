import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,

  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Paper,
  Alert,
  Tabs,
  Tab,
  Chip,
  Container,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Insights as InsightsIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import axios from 'axios';
import HumanAvatar3D from '../../components/HumanAvatar3D';

// Styled components
const PageContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  background: '#0a0a0a',
  color: '#ffffff',
  padding: theme.spacing(3),
}));

const HeaderCard = styled(Card)(({ theme }) => ({
  background: 'rgba(20, 20, 20, 0.95)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '16px',
  marginBottom: theme.spacing(4),
  padding: theme.spacing(3),
}));

const StyledCard = styled(Card)(({ theme }) => ({
  background: 'rgba(30, 30, 30, 0.9)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '16px',
  color: '#ffffff',
  '& .MuiCardContent-root': {
    color: '#ffffff',
  },
}));

const StyledTabs = styled(Tabs)(({ theme }) => ({
  '& .MuiTab-root': {
    color: 'rgba(255, 255, 255, 0.7)',
    '&.Mui-selected': {
      color: '#6366f1',
    },
  },
  '& .MuiTabs-indicator': {
    backgroundColor: '#6366f1',
  },
}));



const MetricCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  background: 'rgba(40, 40, 40, 0.8)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  textAlign: 'center',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-2px)',
  },
}));

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
  
  // Analysis data
  const [analysisType, setAnalysisType] = useState('sales');
  const [dateRange, setDateRange] = useState('30');
  const [platform, setPlatform] = useState('all');
  const [analysisResult, setAnalysisResult] = useState(null);

  
  // Mock analytics data
  const [analyticsData] = useState({
    sales: {
      total: 125430,
      growth: 12.5,
      orders: 1247,
      avgOrder: 100.58
    },
    traffic: {
      visitors: 45230,
      pageViews: 123450,
      bounceRate: 32.1,
      sessionDuration: '3:42'
    },
    conversion: {
      rate: 2.8,
      leads: 892,
      customers: 234,
      revenue: 89340
    },
    products: [
      { name: 'Produit A', sales: 45, revenue: 12500 },
      { name: 'Produit B', sales: 32, revenue: 8900 },
      { name: 'Produit C', sales: 28, revenue: 7800 },
      { name: 'Produit D', sales: 21, revenue: 5600 },
    ]
  });

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError(null);
  };

  const handleAnalysis = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const result = await axios.post('/api/agents/analysis/generate', {
        type: analysisType,
        dateRange,
        platform,
      });
      setAnalysisResult(result.data);
    } catch (err) {
      console.error('Error generating analysis:', err);
      setError(err.response?.data?.message || 'Failed to generate analysis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <Container maxWidth="xl">
        <HeaderCard>
          <Box display="flex" alignItems="center" gap={3}>
            <HumanAvatar3D agentType="analysis" size={80} />
            <Box>
              <Typography variant="h4" gutterBottom sx={{ color: '#ffffff', fontWeight: 600 }}>
                Agent Analyse IA
              </Typography>
              <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Analysez vos données et obtenez des insights précieux
              </Typography>
            </Box>
          </Box>
        </HeaderCard>

        <StyledCard>
          <StyledTabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="analysis tabs"
            variant="fullWidth"
          >
            <Tab icon={<AnalyticsIcon />} label="Analyse" />
            <Tab icon={<TrendingUpIcon />} label="Tendances" />
            <Tab icon={<AssessmentIcon />} label="Rapports" />
            <Tab icon={<InsightsIcon />} label="Insights" />
          </StyledTabs>

          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={4}>
                <Typography variant="h6" gutterBottom>
                  Générer une Analyse
                </Typography>
                <form onSubmit={handleAnalysis}>
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Type d'analyse</InputLabel>
                    <Select
                      value={analysisType}
                      label="Type d'analyse"
                      onChange={(e) => setAnalysisType(e.target.value)}
                      disabled={loading}
                      sx={{
                        color: '#ffffff',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.5)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#6366f1',
                        },
                      }}
                    >
                      <MenuItem value="sales">Ventes</MenuItem>
                      <MenuItem value="traffic">Trafic</MenuItem>
                      <MenuItem value="conversion">Conversion</MenuItem>
                      <MenuItem value="products">Produits</MenuItem>
                      <MenuItem value="customers">Clients</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Période</InputLabel>
                    <Select
                      value={dateRange}
                      label="Période"
                      onChange={(e) => setDateRange(e.target.value)}
                      disabled={loading}
                      sx={{
                        color: '#ffffff',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.5)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#6366f1',
                        },
                      }}
                    >
                      <MenuItem value="7">7 derniers jours</MenuItem>
                      <MenuItem value="30">30 derniers jours</MenuItem>
                      <MenuItem value="90">3 derniers mois</MenuItem>
                      <MenuItem value="365">12 derniers mois</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Plateforme</InputLabel>
                    <Select
                      value={platform}
                      label="Plateforme"
                      onChange={(e) => setPlatform(e.target.value)}
                      disabled={loading}
                      sx={{
                        color: '#ffffff',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.5)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#6366f1',
                        },
                      }}
                    >
                      <MenuItem value="all">Toutes</MenuItem>
                      <MenuItem value="shopify">Shopify</MenuItem>
                      <MenuItem value="woocommerce">WooCommerce</MenuItem>
                      <MenuItem value="magento">Magento</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={20} /> : <BarChartIcon />}
                    disabled={loading}
                    sx={{
                      background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #5855eb, #7c3aed)',
                      },
                    }}
                  >
                    Générer l'analyse
                  </Button>
                </form>
              </Grid>
              
              <Grid item xs={12} md={8}>
                <Typography variant="h6" gutterBottom>
                  Résultats de l'Analyse
                </Typography>
                
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                
                {analysisResult && (
                  <Paper sx={{ p: 3, bgcolor: 'rgba(40, 40, 40, 0.8)', maxHeight: 500, overflow: 'auto' }}>
                    <Typography variant="h6" gutterBottom>
                      {analysisResult.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.6 }}>
                      {analysisResult.insights}
                    </Typography>
                    {analysisResult.recommendations && (
                      <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Recommandations:
                        </Typography>
                        <List>
                          {analysisResult.recommendations.map((rec, index) => (
                            <ListItem key={index}>
                              <ListItemText primary={rec} />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}
                  </Paper>
                )}
                
                {!loading && !error && !analysisResult && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      Les résultats de l'analyse apparaîtront ici
                    </Typography>
                  </Box>
                )}
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              Tendances et Métriques
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <MetricCard>
                  <Typography variant="h4" sx={{ color: '#10b981', fontWeight: 'bold' }}>
                    €{analyticsData.sales.total.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Chiffre d'affaires
                  </Typography>
                  <Chip 
                    label={`+${analyticsData.sales.growth}%`} 
                    size="small" 
                    sx={{ mt: 1, bgcolor: '#10b981', color: '#ffffff' }}
                  />
                </MetricCard>
              </Grid>
              <Grid item xs={12} md={3}>
                <MetricCard>
                  <Typography variant="h4" sx={{ color: '#6366f1', fontWeight: 'bold' }}>
                    {analyticsData.traffic.visitors.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Visiteurs
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Taux de rebond: {analyticsData.traffic.bounceRate}%
                  </Typography>
                </MetricCard>
              </Grid>
              <Grid item xs={12} md={3}>
                <MetricCard>
                  <Typography variant="h4" sx={{ color: '#f59e0b', fontWeight: 'bold' }}>
                    {analyticsData.conversion.rate}%
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Taux de conversion
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    {analyticsData.conversion.customers} clients
                  </Typography>
                </MetricCard>
              </Grid>
              <Grid item xs={12} md={3}>
                <MetricCard>
                  <Typography variant="h4" sx={{ color: '#ef4444', fontWeight: 'bold' }}>
                    €{analyticsData.sales.avgOrder}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Panier moyen
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    {analyticsData.sales.orders} commandes
                  </Typography>
                </MetricCard>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>
              Rapports Détaillés
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Fonctionnalité en développement...
            </Typography>
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" gutterBottom>
              Insights IA
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper sx={{ p: 3, bgcolor: 'rgba(40, 40, 40, 0.8)' }}>
                  <Typography variant="h6" gutterBottom sx={{ color: '#6366f1' }}>
                    🎯 Recommandations Personnalisées
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText 
                        primary="Optimiser les campagnes publicitaires"
                        secondary="Votre taux de conversion mobile est 23% plus bas que la moyenne. Considérez optimiser l'expérience mobile."
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Cibler de nouveaux segments"
                        secondary="Les clients âgés de 25-34 ans montrent un potentiel d'achat 40% plus élevé."
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Améliorer la rétention"
                        secondary="Implémenter un programme de fidélité pourrait augmenter la rétention de 15%."
                      />
                    </ListItem>
                  </List>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>
        </StyledCard>
      </Container>
    </PageContainer>
  );
}