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
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Web as WebIcon,
  Code as CodeIcon,
  Palette as DesignIcon,
  Preview as PreviewIcon,
  Download as DownloadIcon,
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

const CodeBlock = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  background: '#1a1a1a',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '8px',
  fontFamily: 'Monaco, Consolas, "Courier New", monospace',
  fontSize: '14px',
  overflow: 'auto',
  maxHeight: '400px',
}));

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`page-tabpanel-${index}`}
      aria-labelledby={`page-tab-${index}`}
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

export default function PageGenerator() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Page generation
  const [pageType, setPageType] = useState('landing');
  const [pageName, setPageName] = useState('');
  const [description, setDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [features, setFeatures] = useState('');
  const [colorScheme, setColorScheme] = useState('modern');
  const [includeContact, setIncludeContact] = useState(true);
  const [includeBlog, setIncludeBlog] = useState(false);
  const [includeEcommerce, setIncludeEcommerce] = useState(false);
  const [generatedPage, setGeneratedPage] = useState(null);
  
  // Generated pages history
  const [generatedPages] = useState(null);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError(null);
  };

  const handleGeneratePage = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setGeneratedPage(null);

    try {
      const result = await axios.post('/api/agents/page-generator/create', {
        type: pageType,
        name: pageName,
        description,
        targetAudience,
        features,
        colorScheme,
        options: {
          includeContact,
          includeBlog,
          includeEcommerce
        }
      });
      setGeneratedPage(result.data);
    } catch (err) {
      console.error('Error generating page:', err);
      setError(err.response?.data?.message || 'Failed to generate page');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <Container maxWidth="xl">
        <HeaderCard>
          <Box display="flex" alignItems="center" gap={3}>
            <HumanAvatar3D agentType="pageGenerator" size={80} />
            <Box>
              <Typography variant="h4" gutterBottom sx={{ color: '#ffffff', fontWeight: 600 }}>
                Agent Générateur de Pages IA
              </Typography>
              <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Créez des pages web professionnelles en quelques clics
              </Typography>
            </Box>
          </Box>
        </HeaderCard>

        <StyledCard>
          <StyledTabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="page generator tabs"
            variant="fullWidth"
          >
            <Tab icon={<WebIcon />} label="Créer Page" />
            <Tab icon={<CodeIcon />} label="Code" />
            <Tab icon={<DesignIcon />} label="Mes Pages" />
            <Tab icon={<PreviewIcon />} label="Aperçu" />
          </StyledTabs>

          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Créer une Nouvelle Page
                </Typography>
                <form onSubmit={handleGeneratePage}>
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Type de page</InputLabel>
                    <Select
                      value={pageType}
                      label="Type de page"
                      onChange={(e) => setPageType(e.target.value)}
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
                      <MenuItem value="landing">Landing Page</MenuItem>
                      <MenuItem value="ecommerce">E-commerce</MenuItem>
                      <MenuItem value="blog">Blog</MenuItem>
                      <MenuItem value="portfolio">Portfolio</MenuItem>
                      <MenuItem value="corporate">Corporate</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <StyledTextField
                    fullWidth
                    label="Nom de la page"
                    value={pageName}
                    onChange={(e) => setPageName(e.target.value)}
                    disabled={loading}
                    sx={{ mb: 3 }}
                  />
                  
                  <StyledTextField
                    fullWidth
                    label="Description"
                    multiline
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={loading}
                    sx={{ mb: 3 }}
                  />
                  
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
                    label="Fonctionnalités souhaitées"
                    multiline
                    rows={2}
                    value={features}
                    onChange={(e) => setFeatures(e.target.value)}
                    disabled={loading}
                    sx={{ mb: 3 }}
                  />
                  
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Palette de couleurs</InputLabel>
                    <Select
                      value={colorScheme}
                      label="Palette de couleurs"
                      onChange={(e) => setColorScheme(e.target.value)}
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
                      <MenuItem value="modern">Moderne</MenuItem>
                      <MenuItem value="classic">Classique</MenuItem>
                      <MenuItem value="vibrant">Vibrant</MenuItem>
                      <MenuItem value="minimal">Minimaliste</MenuItem>
                      <MenuItem value="dark">Sombre</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Options supplémentaires
                    </Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={includeContact}
                          onChange={(e) => setIncludeContact(e.target.checked)}
                          disabled={loading}
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: '#6366f1',
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: '#6366f1',
                            },
                          }}
                        />
                      }
                      label="Inclure formulaire de contact"
                      sx={{ color: 'rgba(255, 255, 255, 0.9)' }}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={includeBlog}
                          onChange={(e) => setIncludeBlog(e.target.checked)}
                          disabled={loading}
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: '#6366f1',
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: '#6366f1',
                            },
                          }}
                        />
                      }
                      label="Inclure section blog"
                      sx={{ color: 'rgba(255, 255, 255, 0.9)' }}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={includeEcommerce}
                          onChange={(e) => setIncludeEcommerce(e.target.checked)}
                          disabled={loading}
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: '#6366f1',
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: '#6366f1',
                            },
                          }}
                        />
                      }
                      label="Inclure fonctionnalités e-commerce"
                      sx={{ color: 'rgba(255, 255, 255, 0.9)' }}
                    />
                  </Box>
                  
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={20} /> : <WebIcon />}
                    disabled={loading || !pageName}
                    sx={{
                      background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #5855eb, #7c3aed)',
                      },
                    }}
                  >
                    Générer la page
                  </Button>
                </form>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Aperçu de la Page
                </Typography>
                
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                
                {generatedPage && (
                  <Paper sx={{ p: 3, bgcolor: 'rgba(40, 40, 40, 0.8)', maxHeight: 500, overflow: 'auto' }}>
                    <Typography variant="h6" gutterBottom>
                      {generatedPage.name}
                    </Typography>
                    <Chip 
                      label={generatedPage.type} 
                      size="small" 
                      sx={{ mb: 2, bgcolor: '#6366f1', color: '#ffffff' }}
                    />
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)', mb: 2 }}>
                      {generatedPage.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button size="small" variant="outlined" startIcon={<PreviewIcon />}>
                        Aperçu
                      </Button>
                      <Button size="small" variant="outlined" startIcon={<DownloadIcon />}>
                        Télécharger
                      </Button>
                      <Button size="small" variant="outlined" startIcon={<CodeIcon />}>
                        Voir le code
                      </Button>
                    </Box>
                  </Paper>
                )}
                
                {!loading && !error && !generatedPage && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      L'aperçu de la page apparaîtra ici
                    </Typography>
                  </Box>
                )}
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              Code Généré
            </Typography>
            {generatedPage && generatedPage.code ? (
              <CodeBlock>
                <pre style={{ margin: 0, color: '#ffffff' }}>
                  {generatedPage.code}
                </pre>
              </CodeBlock>
            ) : (
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Générez une page pour voir le code
              </Typography>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>
              Mes Pages Générées
            </Typography>
            <Grid container spacing={2}>
              {(generatedPages || []).map((page) => (
                <Grid item xs={12} md={4} key={page.id}>
                  <Paper sx={{ p: 3, bgcolor: 'rgba(40, 40, 40, 0.8)' }}>
                    <Typography variant="h6" gutterBottom>
                      {page.name}
                    </Typography>
                    <Chip 
                      label={page.type} 
                      size="small" 
                      sx={{ mb: 1, bgcolor: '#6366f1', color: '#ffffff' }}
                    />
                    <Chip 
                      label={page.status} 
                      size="small" 
                      sx={{ 
                        mb: 2, 
                        ml: 1,
                        bgcolor: page.status === 'completed' ? '#10b981' : '#f59e0b', 
                        color: '#ffffff' 
                      }}
                    />
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
                      Créé le {page.createdAt}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button size="small" variant="outlined">
                        Modifier
                      </Button>
                      <Button size="small" variant="outlined">
                        Dupliquer
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" gutterBottom>
              Aperçu en Temps Réel
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