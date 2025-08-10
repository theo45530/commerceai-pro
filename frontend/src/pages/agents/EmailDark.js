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
  Email as EmailIcon,
  Campaign as CampaignIcon,
  Analytics as AnalyticsIcon,
  Send as SendIcon,
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

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    color: '#ffffff',
    '& fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#6366f1',
    },
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(255, 255, 255, 0.7)',
    '&.Mui-focused': {
      color: '#6366f1',
    },
  },
}));

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`email-tabpanel-${index}`}
      aria-labelledby={`email-tab-${index}`}
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

export default function Email() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Email creation
  const [emailType, setEmailType] = useState('marketing');
  const [subject, setSubject] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [callToAction, setCallToAction] = useState('');
  const [tone, setTone] = useState('professional');
  const [emailResult, setEmailResult] = useState(null);

  
  // Campaign stats
  const [campaignStats] = useState({
    sent: 1250,
    opened: 425,
    clicked: 89,
    converted: 23,
    openRate: 34,
    clickRate: 7.1,
    conversionRate: 1.8
  });

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError(null);
  };

  const handleCreateEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setEmailResult(null);

    try {
      const result = await axios.post('/api/agents/email/create', {
        type: emailType,
        subject,
        targetAudience,
        callToAction,
        tone,
      });
      setEmailResult(result.data);
    } catch (err) {
      console.error('Error creating email:', err);
      setError(err.response?.data?.message || 'Failed to create email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <Container maxWidth="xl">
        <HeaderCard>
          <Box display="flex" alignItems="center" gap={3}>
            <HumanAvatar3D agentType="email" size={80} />
            <Box>
              <Typography variant="h4" gutterBottom sx={{ color: '#ffffff', fontWeight: 600 }}>
                Agent Email Marketing IA
              </Typography>
              <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Créez des campagnes email performantes avec l'IA
              </Typography>
            </Box>
          </Box>
        </HeaderCard>

        <StyledCard>
          <StyledTabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="email tabs"
            variant="fullWidth"
          >
            <Tab icon={<EmailIcon />} label="Créer Email" />
            <Tab icon={<CampaignIcon />} label="Campagnes" />
            <Tab icon={<AnalyticsIcon />} label="Analytics" />
          </StyledTabs>

          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Créer un Email
                </Typography>
                <form onSubmit={handleCreateEmail}>
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Type d'email</InputLabel>
                    <Select
                      value={emailType}
                      label="Type d'email"
                      onChange={(e) => setEmailType(e.target.value)}
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
                      <MenuItem value="marketing">Marketing</MenuItem>
                      <MenuItem value="newsletter">Newsletter</MenuItem>
                      <MenuItem value="promotional">Promotionnel</MenuItem>
                      <MenuItem value="welcome">Bienvenue</MenuItem>
                      <MenuItem value="follow-up">Suivi</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <StyledTextField
                    fullWidth
                    label="Sujet de l'email"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={loading}
                    sx={{ mb: 3 }}
                  />
                  
                  <StyledTextField
                    fullWidth
                    label="Audience cible"
                    multiline
                    rows={2}
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    disabled={loading}
                    sx={{ mb: 3 }}
                  />
                  
                  <StyledTextField
                    fullWidth
                    label="Call-to-Action"
                    value={callToAction}
                    onChange={(e) => setCallToAction(e.target.value)}
                    disabled={loading}
                    sx={{ mb: 3 }}
                  />
                  
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Ton</InputLabel>
                    <Select
                      value={tone}
                      label="Ton"
                      onChange={(e) => setTone(e.target.value)}
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
                      <MenuItem value="professional">Professionnel</MenuItem>
                      <MenuItem value="friendly">Amical</MenuItem>
                      <MenuItem value="urgent">Urgent</MenuItem>
                      <MenuItem value="casual">Décontracté</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                    disabled={loading || !subject}
                    sx={{
                      background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #5855eb, #7c3aed)',
                      },
                    }}
                  >
                    Générer l'email
                  </Button>
                </form>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Aperçu de l'email
                </Typography>
                
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                
                {emailResult && (
                  <Paper sx={{ p: 3, bgcolor: 'rgba(40, 40, 40, 0.8)', maxHeight: 500, overflow: 'auto' }}>
                    <Typography variant="h6" gutterBottom sx={{ borderBottom: '1px solid rgba(255,255,255,0.2)', pb: 1 }}>
                      Sujet: {emailResult.subject}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.6 }}>
                        {emailResult.content}
                      </Typography>
                    </Box>
                    {emailResult.cta && (
                      <Box sx={{ mt: 3, textAlign: 'center' }}>
                        <Button
                          variant="contained"
                          sx={{
                            background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
                            color: '#ffffff',
                            fontWeight: 'bold',
                          }}
                        >
                          {emailResult.cta}
                        </Button>
                      </Box>
                    )}
                  </Paper>
                )}
                
                {!loading && !error && !emailResult && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      L'aperçu de l'email apparaîtra ici
                    </Typography>
                  </Box>
                )}
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              Mes Campagnes
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Fonctionnalité en développement...
            </Typography>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>
              Analytics des Campagnes
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, bgcolor: 'rgba(40, 40, 40, 0.8)', textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: '#6366f1', fontWeight: 'bold' }}>
                    {campaignStats.sent}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Emails envoyés
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, bgcolor: 'rgba(40, 40, 40, 0.8)', textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: '#10b981', fontWeight: 'bold' }}>
                    {campaignStats.openRate}%
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Taux d'ouverture
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, bgcolor: 'rgba(40, 40, 40, 0.8)', textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: '#f59e0b', fontWeight: 'bold' }}>
                    {campaignStats.clickRate}%
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Taux de clic
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 2, bgcolor: 'rgba(40, 40, 40, 0.8)', textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: '#ef4444', fontWeight: 'bold' }}>
                    {campaignStats.conversionRate}%
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Taux de conversion
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>
        </StyledCard>
      </Container>
    </PageContainer>
  );
}