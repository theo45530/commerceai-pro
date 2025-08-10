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
  Chip,
  Container,
} from '@mui/material';
import {
  Create as CreateIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  Article as ArticleIcon,
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
      id={`content-tabpanel-${index}`}
      aria-labelledby={`content-tab-${index}`}
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

export default function ContentCreator() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Content creation
  const [contentType] = useState('article');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professional');
  const [targetAudience, setTargetAudience] = useState('');
  const [keywords, setKeywords] = useState('');

  const [contentResult, setContentResult] = useState(null);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError(null);
  };

  const handleCreateContent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setContentResult(null);

    try {
      const result = await axios.post('/api/agents/content/create', {
        type: contentType,
        topic,
        tone,
        targetAudience,
        keywords: keywords.split(',').map(k => k.trim()),
      });
      setContentResult(result.data);
    } catch (err) {
      console.error('Error creating content:', err);
      setError(err.response?.data?.message || 'Failed to create content');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <Container maxWidth="xl">
        <HeaderCard>
          <Box display="flex" alignItems="center" gap={3}>
            <HumanAvatar3D agentType="content-creator" size={80} />
            <Box>
              <Typography variant="h4" gutterBottom sx={{ color: '#ffffff', fontWeight: 600 }}>
                Agent Créateur de Contenu IA
              </Typography>
              <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Créez du contenu engageant avec l'intelligence artificielle
              </Typography>
            </Box>
          </Box>
        </HeaderCard>

        <StyledCard>
          <StyledTabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="content tabs"
            variant="fullWidth"
          >
            <Tab icon={<ArticleIcon />} label="Articles" />
            <Tab icon={<ImageIcon />} label="Images" />
            <Tab icon={<VideoIcon />} label="Vidéos" />
            <Tab icon={<CreateIcon />} label="Posts Sociaux" />
          </StyledTabs>

          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Créer un Article
                </Typography>
                <form onSubmit={handleCreateContent}>
                  <StyledTextField
                    fullWidth
                    label="Sujet de l'article"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
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
                      <MenuItem value="casual">Décontracté</MenuItem>
                      <MenuItem value="friendly">Amical</MenuItem>
                      <MenuItem value="formal">Formel</MenuItem>
                      <MenuItem value="creative">Créatif</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <StyledTextField
                    fullWidth
                    label="Audience cible"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    disabled={loading}
                    sx={{ mb: 3 }}
                  />
                  
                  <StyledTextField
                    fullWidth
                    label="Mots-clés (séparés par des virgules)"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    disabled={loading}
                    sx={{ mb: 3 }}
                  />
                  
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading || !topic}
                    sx={{
                      background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #5855eb, #7c3aed)',
                      },
                    }}
                  >
                    {loading ? <CircularProgress size={20} /> : 'Créer l\'article'}
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
                
                {contentResult && (
                  <Paper sx={{ p: 3, bgcolor: 'rgba(40, 40, 40, 0.8)', maxHeight: 400, overflow: 'auto' }}>
                    <Typography variant="h6" gutterBottom>
                      {contentResult.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.6 }}>
                      {contentResult.content}
                    </Typography>
                    {contentResult.keywords && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Mots-clés:
                        </Typography>
                        {contentResult.keywords.map((keyword, index) => (
                          <Chip
                            key={index}
                            label={keyword}
                            size="small"
                            sx={{ mr: 1, mb: 1, bgcolor: 'rgba(99, 102, 241, 0.2)', color: '#ffffff' }}
                          />
                        ))}
                      </Box>
                    )}
                  </Paper>
                )}
                
                {!loading && !error && !contentResult && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      Le contenu généré apparaîtra ici
                    </Typography>
                  </Box>
                )}
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              Génération d'images
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Fonctionnalité en développement...
            </Typography>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>
              Création de vidéos
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Fonctionnalité en développement...
            </Typography>
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" gutterBottom>
              Posts pour réseaux sociaux
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