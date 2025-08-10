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
  ListItemSecondaryAction,
  IconButton,
  Chip,
} from '@mui/material';
import {
  WebAsset as WebAssetIcon,
  ShoppingCart as ShoppingCartIcon,
  ViewList as ViewListIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import axios from 'axios';

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
  const [templates, setTemplates] = useState(null);
  const [generatedPages, setGeneratedPages] = useState(null);
  
  // Landing Page
  const [landingPageName, setLandingPageName] = useState('');
  const [businessInfo, setBusinessInfo] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [callToAction, setCallToAction] = useState('');
  const [landingPageResult, setLandingPageResult] = useState(null);
  
  // Product Page
  const [productPageName, setProductPageName] = useState('');
  const [productInfo, setProductInfo] = useState('');
  const [productFeatures, setProductFeatures] = useState('');
  const [productBenefits, setProductBenefits] = useState('');
  const [productPageResult, setProductPageResult] = useState(null);
  
  // Template
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState('landing');
  const [templateContent, setTemplateContent] = useState('');
  const [templateResult, setTemplateResult] = useState(null);

  useEffect(() => {
    // Fetch templates and generated pages
    const fetchData = async () => {
      try {
        const templatesResponse = await axios.get('/api/agents/pages/templates');
        setTemplates(templatesResponse.data || []);
        
        const pagesResponse = await axios.get('/api/agents/pages/generated');
        setGeneratedPages(pagesResponse.data || []);
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError(null);
  };

  const handleLandingPageGeneration = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setLandingPageResult(null);

    try {
      const result = await axios.post('/api/agents/pages/generate/landing', {
        name: landingPageName,
        businessInfo,
        targetAudience,
        callToAction,
      });
      setLandingPageResult(result.data);
      
      // Refresh generated pages list
      const pagesResponse = await axios.get('/api/agents/pages/generated');
      setGeneratedPages(pagesResponse.data || []);
    } catch (err) {
      console.error('Error generating landing page:', err);
      setError(err.response?.data?.message || 'Failed to generate landing page');
    } finally {
      setLoading(false);
    }
  };

  const handleProductPageGeneration = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setProductPageResult(null);

    try {
      const result = await axios.post('/api/agents/pages/generate/product', {
        name: productPageName,
        productInfo,
        features: productFeatures,
        benefits: productBenefits,
      });
      setProductPageResult(result.data);
      
      // Refresh generated pages list
      const pagesResponse = await axios.get('/api/agents/pages/generated');
      setGeneratedPages(pagesResponse.data || []);
    } catch (err) {
      console.error('Error generating product page:', err);
      setError(err.response?.data?.message || 'Failed to generate product page');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateCreation = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setTemplateResult(null);

    try {
      const result = await axios.post('/api/agents/pages/templates', {
        name: templateName,
        type: templateType,
        content: templateContent,
      });
      setTemplateResult(result.data);
      
      // Refresh templates list
      const templatesResponse = await axios.get('/api/agents/pages/templates');
      setTemplates(templatesResponse.data || []);
    } catch (err) {
      console.error('Error creating template:', err);
      setError(err.response?.data?.message || 'Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPage = (pageId) => {
    window.open(`/api/agents/pages/view/${pageId}`, '_blank');
  };

  const handleDownloadPage = (pageId) => {
    window.open(`/api/agents/pages/download/${pageId}`, '_blank');
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Page Generator AI Agent
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Generate landing pages, product pages, and manage page templates
      </Typography>

      <Card sx={{ mt: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="page generator tabs">
            <Tab icon={<WebAssetIcon />} label="Landing Page" id="page-tab-0" />
            <Tab icon={<ShoppingCartIcon />} label="Product Page" id="page-tab-1" />
            <Tab icon={<AddIcon />} label="Create Template" id="page-tab-2" />
            <Tab icon={<ViewListIcon />} label="Generated Pages" id="page-tab-3" />
          </Tabs>
        </Box>

        {/* Landing Page */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={5}>
              <form onSubmit={handleLandingPageGeneration}>
                {error && tabValue === 0 && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                <TextField
                  fullWidth
                  label="Page Name"
                  value={landingPageName}
                  onChange={(e) => setLandingPageName(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <TextField
                  fullWidth
                  label="Business Information"
                  multiline
                  rows={3}
                  placeholder="Describe your business, products/services, and unique value proposition"
                  value={businessInfo}
                  onChange={(e) => setBusinessInfo(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <TextField
                  fullWidth
                  label="Target Audience"
                  multiline
                  rows={2}
                  placeholder="Describe your ideal customers and their needs"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <TextField
                  fullWidth
                  label="Call to Action"
                  placeholder="What action do you want visitors to take? (e.g., Sign up, Buy now)"
                  value={callToAction}
                  onChange={(e) => setCallToAction(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading && tabValue === 0 ? <CircularProgress size={20} /> : <WebAssetIcon />}
                  disabled={loading || !landingPageName || !businessInfo || !targetAudience}
                >
                  Generate Landing Page
                </Button>
              </form>
            </Grid>
            <Grid item xs={12} md={7}>
              {loading && tabValue === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : landingPageResult ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Landing Page Generated Successfully
                  </Typography>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      {landingPageResult.name}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Page ID: {landingPageResult.id}
                        </Typography>
                      </Grid>
                    </Grid>
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleViewPage(landingPageResult.id)}
                      >
                        View Page
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={() => handleDownloadPage(landingPageResult.id)}
                      >
                        Download HTML
                      </Button>
                    </Box>
                  </Paper>
                  
                  <Typography variant="subtitle1" gutterBottom>
                    Page Preview
                  </Typography>
                  <Paper 
                    elevation={1} 
                    sx={{ 
                      p: 0, 
                      height: 400, 
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                  >
                    <Box 
                      sx={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        right: 0, 
                        bottom: 0,
                        overflow: 'hidden',
                        '& iframe': {
                          border: 'none',
                          width: '100%',
                          height: '100%',
                          transform: 'scale(0.8)',
                          transformOrigin: 'top left',
                        }
                      }}
                    >
                      <iframe 
                        title="Page Preview" 
                        src={`/api/agents/pages/view/${landingPageResult.id}`}
                        sandbox="allow-same-origin"
                      />
                    </Box>
                  </Paper>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Typography variant="body2" color="text.secondary">
                    Fill out the form to generate a landing page
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Product Page */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={5}>
              <form onSubmit={handleProductPageGeneration}>
                {error && tabValue === 1 && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                <TextField
                  fullWidth
                  label="Page Name"
                  value={productPageName}
                  onChange={(e) => setProductPageName(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <TextField
                  fullWidth
                  label="Product Information"
                  multiline
                  rows={3}
                  placeholder="Describe your product, including name, price, category, etc."
                  value={productInfo}
                  onChange={(e) => setProductInfo(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <TextField
                  fullWidth
                  label="Product Features"
                  multiline
                  rows={2}
                  placeholder="List the key features of your product (comma separated)"
                  value={productFeatures}
                  onChange={(e) => setProductFeatures(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <TextField
                  fullWidth
                  label="Product Benefits"
                  multiline
                  rows={2}
                  placeholder="Describe how your product benefits customers"
                  value={productBenefits}
                  onChange={(e) => setProductBenefits(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading && tabValue === 1 ? <CircularProgress size={20} /> : <ShoppingCartIcon />}
                  disabled={loading || !productPageName || !productInfo || !productFeatures}
                >
                  Generate Product Page
                </Button>
              </form>
            </Grid>
            <Grid item xs={12} md={7}>
              {loading && tabValue === 1 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : productPageResult ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Product Page Generated Successfully
                  </Typography>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      {productPageResult.name}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Page ID: {productPageResult.id}
                        </Typography>
                      </Grid>
                    </Grid>
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleViewPage(productPageResult.id)}
                      >
                        View Page
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={() => handleDownloadPage(productPageResult.id)}
                      >
                        Download HTML
                      </Button>
                    </Box>
                  </Paper>
                  
                  <Typography variant="subtitle1" gutterBottom>
                    Page Preview
                  </Typography>
                  <Paper 
                    elevation={1} 
                    sx={{ 
                      p: 0, 
                      height: 400, 
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                  >
                    <Box 
                      sx={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        right: 0, 
                        bottom: 0,
                        overflow: 'hidden',
                        '& iframe': {
                          border: 'none',
                          width: '100%',
                          height: '100%',
                          transform: 'scale(0.8)',
                          transformOrigin: 'top left',
                        }
                      }}
                    >
                      <iframe 
                        title="Page Preview" 
                        src={`/api/agents/pages/view/${productPageResult.id}`}
                        sandbox="allow-same-origin"
                      />
                    </Box>
                  </Paper>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Typography variant="body2" color="text.secondary">
                    Fill out the form to generate a product page
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Create Template */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={5}>
              <form onSubmit={handleTemplateCreation}>
                {error && tabValue === 2 && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                <TextField
                  fullWidth
                  label="Template Name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="template-type-label">Template Type</InputLabel>
                  <Select
                    labelId="template-type-label"
                    value={templateType}
                    label="Template Type"
                    onChange={(e) => setTemplateType(e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value="landing">Landing Page</MenuItem>
                    <MenuItem value="product">Product Page</MenuItem>
                    <MenuItem value="about">About Page</MenuItem>
                    <MenuItem value="contact">Contact Page</MenuItem>
                    <MenuItem value="blog">Blog Page</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Template HTML Content"
                  multiline
                  rows={10}
                  placeholder="Enter HTML template with placeholders like {{title}}, {{content}}, etc."
                  value={templateContent}
                  onChange={(e) => setTemplateContent(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading && tabValue === 2 ? <CircularProgress size={20} /> : <AddIcon />}
                  disabled={loading || !templateName || !templateContent}
                >
                  Create Template
                </Button>
              </form>
            </Grid>
            <Grid item xs={12} md={7}>
              {loading && tabValue === 2 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : templateResult ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Template Created Successfully
                  </Typography>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      {templateResult.name}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Type: {templateResult.type}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          ID: {templateResult.id}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                  
                  <Typography variant="subtitle1" gutterBottom>
                    Available Templates
                  </Typography>
                  <List>
                    {(templates || []).map((template) => (
                      <ListItem key={template.id}>
                        <ListItemText
                          primary={template.name}
                          secondary={`Type: ${template.type}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ) : (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Available Templates
                  </Typography>
                  {(templates && templates.length > 0) ? (
                    <List>
                      {(templates || []).map((template) => (
                        <ListItem key={template.id}>
                          <ListItemText
                            primary={template.name}
                            secondary={`Type: ${template.type}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No templates found. Create your first template!
                    </Typography>
                  )}
                </Box>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Generated Pages */}
        <TabPanel value={tabValue} index={3}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Your Generated Pages
            </Typography>
            {(generatedPages && generatedPages.length > 0) ? (
              <List>
                {(generatedPages || []).map((page) => (
                  <ListItem key={page.id}>
                    <ListItemText
                      primary={page.name}
                      secondary={
                        <React.Fragment>
                          <Typography variant="body2" component="span" color="text.secondary">
                            Type: {page.type} | Created: {new Date(page.createdAt).toLocaleDateString()}
                          </Typography>
                        </React.Fragment>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => handleViewPage(page.id)}>
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton edge="end" onClick={() => handleDownloadPage(page.id)}>
                        <DownloadIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                <Typography variant="body2" color="text.secondary">
                  No pages generated yet. Create your first page using the Landing Page or Product Page tabs.
                </Typography>
              </Box>
            )}
          </Box>
        </TabPanel>
      </Card>
    </Box>
  );
}