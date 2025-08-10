import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,

  TextField,
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

  Container,
} from '@mui/material';
import {
  Announcement as CampaignIcon,
  Analytics as AnalyticsIcon,
  Tune as TuneIcon,
  Compare as CompareIcon,
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
      const result = await axios.post('/api/agents/advertising/create-campaign', {
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

  return (
    <PageContainer>
      <Container maxWidth="xl">
        <HeaderCard>
          <Box display="flex" alignItems="center" gap={3}>
            <HumanAvatar3D agentType="advertising" size={80} />
            <Box>
              <Typography variant="h4" gutterBottom sx={{ color: '#ffffff', fontWeight: 600 }}>
                Agent Publicité IA
              </Typography>
              <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Créez et optimisez vos campagnes publicitaires avec l'IA
              </Typography>
            </Box>
          </Box>
        </HeaderCard>

        <StyledCard>
          <StyledTabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="advertising tabs"
            variant="fullWidth"
          >
            <Tab icon={<CampaignIcon />} label="Créer Campagne" />
            <Tab icon={<AnalyticsIcon />} label="Analyser Performance" />
            <Tab icon={<TuneIcon />} label="Optimiser" />
            <Tab icon={<CompareIcon />} label="Test A/B" />
          </StyledTabs>

          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Nouvelle Campagne
                </Typography>
                <form onSubmit={handleCreateCampaign}>
                  <TextField
                    fullWidth
                    label="Nom de la campagne"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    disabled={loading}
                    sx={{ mb: 3 }}
                  />
                  
                  <TextField
                    fullWidth
                    label="Produit/Service"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    disabled={loading}
                    sx={{ mb: 3 }}
                  />
                  
                  <TextField
                    fullWidth
                    label="Audience cible"
                    multiline
                    rows={3}
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    disabled={loading}
                    sx={{ mb: 3 }}
                  />
                  
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>Plateforme</InputLabel>
                    <Select
                      value={platform}
                      label="Plateforme"
                      onChange={(e) => setPlatform(e.target.value)}
                      disabled={loading}
                    >
                      <MenuItem value="facebook">Facebook Ads</MenuItem>
                      <MenuItem value="google">Google Ads</MenuItem>
                      <MenuItem value="instagram">Instagram</MenuItem>
                      <MenuItem value="linkedin">LinkedIn</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <TextField
                    fullWidth
                    label="Budget (€)"
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    disabled={loading}
                    sx={{ mb: 3 }}
                  />
                  
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading || !campaignName || !product}
                    sx={{
                      background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #5855eb, #7c3aed)',
                      },
                    }}
                  >
                    {loading ? <CircularProgress size={20} /> : 'Créer la campagne'}
                  </Button>
                </form>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Résultat
                </Typography>
                
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                
                {campaignResult && (
                  <Paper sx={{ p: 3, bgcolor: 'rgba(40, 40, 40, 0.8)' }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Campagne créée avec succès !
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      {campaignResult.message}
                    </Typography>
                  </Paper>
                )}
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              Analyse des performances
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Fonctionnalité en développement...
            </Typography>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>
              Optimisation des campagnes
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Fonctionnalité en développement...
            </Typography>
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" gutterBottom>
              Tests A/B
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Fonctionnalité en développement...
            </Typography>
          </TabPanel>
        </StyledCard>
      </Container>
    </PageContainer>
  );
}