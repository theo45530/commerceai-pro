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
  IconButton,
} from '@mui/material';
import {
  Email as EmailIcon,
  Description as TemplateIcon,
  Announcement as CampaignIcon,
  Send as SendIcon,
  ShoppingCart as ShoppingCartIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import axios from 'axios';

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
  const [templates, setTemplates] = useState(null);
  
  // Create Template
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState('welcome');
  const [brandInfo, setBrandInfo] = useState('');
  const [templateResult, setTemplateResult] = useState(null);
  
  // Create Campaign
  const [campaignName, setCampaignName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [subject, setSubject] = useState('');
  const [audience, setAudience] = useState('');
  const [campaignResult, setCampaignResult] = useState(null);
  
  // Test Email
  const [testTemplateId, setTestTemplateId] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState(null);
  
  // Abandoned Cart
  const [cartInfo, setCartInfo] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [cartResult, setCartResult] = useState(null);

  useEffect(() => {
    // Fetch templates for dropdowns
    const fetchTemplates = async () => {
      try {
        const response = await axios.get('/api/agents/email/templates');
        setTemplates(response.data || []);
      } catch (err) {
        console.error('Error fetching templates:', err);
      }
    };

    fetchTemplates();
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError(null);
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setTemplateResult(null);

    try {
      const result = await axios.post('/api/agents/email/template', {
        name: templateName,
        type: templateType,
        brandInfo,
      });
      setTemplateResult(result.data);
      // Refresh templates list
      const response = await axios.get('/api/agents/email/templates');
      setTemplates(response.data || []);
    } catch (err) {
      console.error('Error creating template:', err);
      setError(err.response?.data?.message || 'Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCampaignResult(null);

    try {
      const result = await axios.post('/api/agents/email/campaign', {
        name: campaignName,
        templateId,
        subject,
        audience,
      });
      setCampaignResult(result.data);
    } catch (err) {
      console.error('Error creating campaign:', err);
      setError(err.response?.data?.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setTestResult(null);

    try {
      const result = await axios.post('/api/agents/email/test', {
        templateId: testTemplateId,
        email: testEmail,
      });
      setTestResult(result.data);
    } catch (err) {
      console.error('Error sending test email:', err);
      setError(err.response?.data?.message || 'Failed to send test email');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCartEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCartResult(null);

    try {
      const result = await axios.post('/api/agents/email/abandoned-cart', {
        cartInfo,
        email: customerEmail,
      });
      setCartResult(result.data);
    } catch (err) {
      console.error('Error creating abandoned cart email:', err);
      setError(err.response?.data?.message || 'Failed to create abandoned cart email');
    } finally {
      setLoading(false);
    }
  };

  const handleViewTemplate = (templateId) => {
    // Placeholder for viewing template
    process.env.NODE_ENV === 'development' && console.log('View template:', templateId);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Email Marketing AI Agent
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Create email templates, campaigns, and automated emails
      </Typography>

      <Card sx={{ mt: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="email tabs">
            <Tab icon={<TemplateIcon />} label="Create Template" id="email-tab-0" />
            <Tab icon={<CampaignIcon />} label="Create Campaign" id="email-tab-1" />
            <Tab icon={<SendIcon />} label="Test Email" id="email-tab-2" />
            <Tab icon={<ShoppingCartIcon />} label="Abandoned Cart" id="email-tab-3" />
          </Tabs>
        </Box>

        {/* Create Template */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={5}>
              <form onSubmit={handleCreateTemplate}>
                {error && tabValue === 0 && (
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
                    <MenuItem value="welcome">Welcome Email</MenuItem>
                    <MenuItem value="newsletter">Newsletter</MenuItem>
                    <MenuItem value="promotion">Promotional</MenuItem>
                    <MenuItem value="abandoned_cart">Abandoned Cart</MenuItem>
                    <MenuItem value="order_confirmation">Order Confirmation</MenuItem>
                    <MenuItem value="feedback">Feedback Request</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Brand Information"
                  multiline
                  rows={4}
                  placeholder="Describe your brand, products, tone of voice, etc."
                  value={brandInfo}
                  onChange={(e) => setBrandInfo(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading && tabValue === 0 ? <CircularProgress size={20} /> : <TemplateIcon />}
                  disabled={loading || !templateName || !brandInfo}
                >
                  Generate Template
                </Button>
              </form>
            </Grid>
            <Grid item xs={12} md={7}>
              {loading && tabValue === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : templateResult ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Template Created Successfully
                  </Typography>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      {templateResult.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Type: {templateResult.type}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" gutterBottom>
                      Preview:
                    </Typography>
                    <Box sx={{ mt: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#fff' }}>
                      <div dangerouslySetInnerHTML={{ __html: templateResult.html }} />
                    </Box>
                  </Paper>
                </Box>
              ) : (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Your Templates
                  </Typography>
                  {(templates && templates.length > 0) ? (
                    <List>
                      {(templates || []).map((template) => (
                        <ListItem
                          key={template.id}
                          secondaryAction={
                            <IconButton edge="end" onClick={() => handleViewTemplate(template.id)}>
                              <VisibilityIcon />
                            </IconButton>
                          }
                        >
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

        {/* Create Campaign */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={5}>
              <form onSubmit={handleCreateCampaign}>
                {error && tabValue === 1 && (
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
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="template-select-label">Select Template</InputLabel>
                  <Select
                    labelId="template-select-label"
                    value={templateId}
                    label="Select Template"
                    onChange={(e) => setTemplateId(e.target.value)}
                    disabled={loading}
                  >
                    {(templates || []).map((template) => (
                      <MenuItem key={template.id} value={template.id}>
                        {template.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Email Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <TextField
                  fullWidth
                  label="Target Audience"
                  multiline
                  rows={2}
                  placeholder="Describe your target audience"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading && tabValue === 1 ? <CircularProgress size={20} /> : <CampaignIcon />}
                  disabled={loading || !campaignName || !templateId || !subject}
                >
                  Create Campaign
                </Button>
              </form>
            </Grid>
            <Grid item xs={12} md={7}>
              {loading && tabValue === 1 ? (
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
                          Subject: {campaignResult.subject}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Template: {campaignResult.templateName}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    AI Recommendations:
                  </Typography>
                  <List dense>
                    {campaignResult.recommendations?.map((rec, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={rec} />
                      </ListItem>
                    ))}
                  </List>
                  
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    Predicted Metrics:
                  </Typography>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Typography variant="subtitle2">Open Rate</Typography>
                        <Typography variant="h6">{campaignResult.predictedMetrics?.openRate}%</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="subtitle2">Click Rate</Typography>
                        <Typography variant="h6">{campaignResult.predictedMetrics?.clickRate}%</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="subtitle2">Conversion</Typography>
                        <Typography variant="h6">{campaignResult.predictedMetrics?.conversionRate}%</Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Typography variant="body2" color="text.secondary">
                    Fill out the form to create an email campaign
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Test Email */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={5}>
              <form onSubmit={handleSendTestEmail}>
                {error && tabValue === 2 && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="test-template-label">Select Template</InputLabel>
                  <Select
                    labelId="test-template-label"
                    value={testTemplateId}
                    label="Select Template"
                    onChange={(e) => setTestTemplateId(e.target.value)}
                    disabled={loading}
                  >
                    {(templates || []).map((template) => (
                      <MenuItem key={template.id} value={template.id}>
                        {template.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Test Email Address"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading && tabValue === 2 ? <CircularProgress size={20} /> : <SendIcon />}
                  disabled={loading || !testTemplateId || !testEmail}
                >
                  Send Test Email
                </Button>
              </form>
            </Grid>
            <Grid item xs={12} md={7}>
              {loading && tabValue === 2 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : testResult ? (
                <Box>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Test email sent successfully!
                  </Alert>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Email Details
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Recipient: {testResult.email}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Template: {testResult.templateName}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          Status: {testResult.status}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Preview:
                  </Typography>
                  <Box sx={{ mt: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#fff' }}>
                    <div dangerouslySetInnerHTML={{ __html: testResult.preview }} />
                  </Box>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Typography variant="body2" color="text.secondary">
                    Select a template and enter an email address to send a test
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Abandoned Cart */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={5}>
              <form onSubmit={handleCreateCartEmail}>
                {error && tabValue === 3 && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                <TextField
                  fullWidth
                  label="Customer Email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <TextField
                  fullWidth
                  label="Cart Information"
                  multiline
                  rows={4}
                  placeholder="List products in cart, prices, etc."
                  value={cartInfo}
                  onChange={(e) => setCartInfo(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading && tabValue === 3 ? <CircularProgress size={20} /> : <ShoppingCartIcon />}
                  disabled={loading || !customerEmail || !cartInfo}
                >
                  Generate Cart Recovery Email
                </Button>
              </form>
            </Grid>
            <Grid item xs={12} md={7}>
              {loading && tabValue === 3 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : cartResult ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Abandoned Cart Email Generated
                  </Typography>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Subject: {cartResult.subject}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Recipient: {cartResult.email}
                    </Typography>
                  </Paper>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Email Content:
                  </Typography>
                  <Box sx={{ mt: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#fff' }}>
                    <div dangerouslySetInnerHTML={{ __html: cartResult.html }} />
                  </Box>
                  
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
                    AI Strategy Notes:
                  </Typography>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                    <Typography variant="body2">
                      {cartResult.strategy}
                    </Typography>
                  </Paper>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Typography variant="body2" color="text.secondary">
                    Enter customer and cart details to generate a recovery email
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