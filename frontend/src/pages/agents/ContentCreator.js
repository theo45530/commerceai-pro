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
  Article as ArticleIcon,
  ShoppingCart as ShoppingCartIcon,
  Share as ShareIcon,
  Email as EmailIcon,
  History as HistoryIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
import axios from 'axios';

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
  const [generatedContent, setGeneratedContent] = useState(null);
  
  // Blog Post
  const [blogTitle, setBlogTitle] = useState('');
  const [blogTopic, setBlogTopic] = useState('');
  const [blogKeywords, setBlogKeywords] = useState('');
  const [blogTone, setBlogTone] = useState('informative');
  const [blogResult, setBlogResult] = useState(null);
  
  // Product Description
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productFeatures, setProductFeatures] = useState('');
  const [productAudience, setProductAudience] = useState('');
  const [productResult, setProductResult] = useState(null);
  
  // Social Media
  const [socialPlatform, setSocialPlatform] = useState('instagram');
  const [socialTopic, setSocialTopic] = useState('');
  const [socialGoal, setSocialGoal] = useState('');
  const [socialTone, setSocialTone] = useState('casual');
  const [socialResult, setSocialResult] = useState(null);
  
  // Email Content
  const [emailType, setEmailType] = useState('newsletter');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContext, setEmailContext] = useState('');
  const [emailResult, setEmailResult] = useState(null);

  useEffect(() => {
    // Fetch previously generated content
    const fetchContent = async () => {
      try {
        const response = await axios.get('/api/agents/content/history');
        setGeneratedContent(response.data || []);
      } catch (err) {
        console.error('Error fetching content history:', err);
      }
    };

    fetchContent();
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError(null);
  };

  const handleBlogGeneration = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setBlogResult(null);

    try {
      const result = await axios.post('/api/agents/content/blog', {
        title: blogTitle,
        topic: blogTopic,
        keywords: blogKeywords,
        tone: blogTone,
      });
      setBlogResult(result.data);
      
      // Refresh content history
      const response = await axios.get('/api/agents/content/history');
      setGeneratedContent(response.data || []);
    } catch (err) {
      console.error('Error generating blog post:', err);
      setError(err.response?.data?.message || 'Failed to generate blog post');
    } finally {
      setLoading(false);
    }
  };

  const handleProductDescriptionGeneration = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setProductResult(null);

    try {
      const result = await axios.post('/api/agents/content/product', {
        name: productName,
        category: productCategory,
        features: productFeatures,
        targetAudience: productAudience,
      });
      setProductResult(result.data);
      
      // Refresh content history
      const response = await axios.get('/api/agents/content/history');
      setGeneratedContent(response.data || []);
    } catch (err) {
      console.error('Error generating product description:', err);
      setError(err.response?.data?.message || 'Failed to generate product description');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialMediaGeneration = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSocialResult(null);

    try {
      const result = await axios.post('/api/agents/content/social', {
        platform: socialPlatform,
        topic: socialTopic,
        goal: socialGoal,
        tone: socialTone,
      });
      setSocialResult(result.data);
      
      // Refresh content history
      const response = await axios.get('/api/agents/content/history');
      setGeneratedContent(response.data || []);
    } catch (err) {
      console.error('Error generating social media post:', err);
      setError(err.response?.data?.message || 'Failed to generate social media post');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailGeneration = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setEmailResult(null);

    try {
      const result = await axios.post('/api/agents/content/email', {
        type: emailType,
        subject: emailSubject,
        context: emailContext,
      });
      setEmailResult(result.data);
      
      // Refresh content history
      const response = await axios.get('/api/agents/content/history');
      setGeneratedContent(response.data || []);
    } catch (err) {
      console.error('Error generating email content:', err);
      setError(err.response?.data?.message || 'Failed to generate email content');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // Could add a toast notification here
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Content Creator AI Agent
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Generate blog posts, product descriptions, social media content, and email copy
      </Typography>

      <Card sx={{ mt: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="content creator tabs">
            <Tab icon={<ArticleIcon />} label="Blog Post" id="content-tab-0" />
            <Tab icon={<ShoppingCartIcon />} label="Product Description" id="content-tab-1" />
            <Tab icon={<ShareIcon />} label="Social Media" id="content-tab-2" />
            <Tab icon={<EmailIcon />} label="Email Content" id="content-tab-3" />
            <Tab icon={<HistoryIcon />} label="Content History" id="content-tab-4" />
          </Tabs>
        </Box>

        {/* Blog Post */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={5}>
              <form onSubmit={handleBlogGeneration}>
                {error && tabValue === 0 && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                <TextField
                  fullWidth
                  label="Blog Title"
                  value={blogTitle}
                  onChange={(e) => setBlogTitle(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <TextField
                  fullWidth
                  label="Topic/Theme"
                  multiline
                  rows={2}
                  placeholder="What is the main topic or theme of your blog post?"
                  value={blogTopic}
                  onChange={(e) => setBlogTopic(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <TextField
                  fullWidth
                  label="Keywords"
                  placeholder="Enter keywords separated by commas"
                  value={blogKeywords}
                  onChange={(e) => setBlogKeywords(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="blog-tone-label">Tone</InputLabel>
                  <Select
                    labelId="blog-tone-label"
                    value={blogTone}
                    label="Tone"
                    onChange={(e) => setBlogTone(e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value="informative">Informative</MenuItem>
                    <MenuItem value="conversational">Conversational</MenuItem>
                    <MenuItem value="professional">Professional</MenuItem>
                    <MenuItem value="humorous">Humorous</MenuItem>
                    <MenuItem value="persuasive">Persuasive</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading && tabValue === 0 ? <CircularProgress size={20} /> : <ArticleIcon />}
                  disabled={loading || !blogTitle || !blogTopic}
                >
                  Generate Blog Post
                </Button>
              </form>
            </Grid>
            <Grid item xs={12} md={7}>
              {loading && tabValue === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : blogResult ? (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Generated Blog Post
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => copyToClipboard(blogResult.content)}
                    >
                      Copy
                    </Button>
                  </Box>
                  
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      {blogResult.title}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      {blogResult.keywords?.split(',').map((keyword, index) => (
                        <Chip key={index} label={keyword.trim()} size="small" />
                      ))}
                    </Box>
                    <Divider sx={{ my: 1 }} />
                  </Paper>
                  
                  <Paper elevation={1} sx={{ p: 3, bgcolor: '#fff' }}>
                    <div dangerouslySetInnerHTML={{ __html: blogResult.content.replace(/\n/g, '<br/>') }} />
                  </Paper>
                  
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      SEO Recommendations:
                    </Typography>
                    <List dense>
                      {blogResult.seoRecommendations?.map((rec, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={rec} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Typography variant="body2" color="text.secondary">
                    Fill out the form to generate a blog post
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Product Description */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={5}>
              <form onSubmit={handleProductDescriptionGeneration}>
                {error && tabValue === 1 && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                <TextField
                  fullWidth
                  label="Product Name"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <TextField
                  fullWidth
                  label="Product Category"
                  placeholder="e.g., Electronics, Clothing, Home Goods"
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <TextField
                  fullWidth
                  label="Key Features"
                  multiline
                  rows={3}
                  placeholder="List the main features of your product"
                  value={productFeatures}
                  onChange={(e) => setProductFeatures(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <TextField
                  fullWidth
                  label="Target Audience"
                  placeholder="Who is this product for?"
                  value={productAudience}
                  onChange={(e) => setProductAudience(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading && tabValue === 1 ? <CircularProgress size={20} /> : <ShoppingCartIcon />}
                  disabled={loading || !productName || !productFeatures}
                >
                  Generate Description
                </Button>
              </form>
            </Grid>
            <Grid item xs={12} md={7}>
              {loading && tabValue === 1 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : productResult ? (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Generated Product Description
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => copyToClipboard(productResult.description)}
                    >
                      Copy
                    </Button>
                  </Box>
                  
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      {productResult.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Category: {productResult.category}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                  </Paper>
                  
                  <Paper elevation={1} sx={{ p: 3, bgcolor: '#fff', mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Short Description:
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {productResult.shortDescription}
                    </Typography>
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Full Description:
                    </Typography>
                    <div dangerouslySetInnerHTML={{ __html: productResult.description.replace(/\n/g, '<br/>') }} />
                  </Paper>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Feature Highlights:
                  </Typography>
                  <List dense>
                    {productResult.featureHighlights?.map((feature, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={feature} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Typography variant="body2" color="text.secondary">
                    Fill out the form to generate a product description
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Social Media */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={5}>
              <form onSubmit={handleSocialMediaGeneration}>
                {error && tabValue === 2 && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="social-platform-label">Platform</InputLabel>
                  <Select
                    labelId="social-platform-label"
                    value={socialPlatform}
                    label="Platform"
                    onChange={(e) => setSocialPlatform(e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value="instagram">Instagram</MenuItem>
                    <MenuItem value="facebook">Facebook</MenuItem>
                    <MenuItem value="twitter">Twitter/X</MenuItem>
                    <MenuItem value="linkedin">LinkedIn</MenuItem>
                    <MenuItem value="tiktok">TikTok</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Topic/Theme"
                  placeholder="What is your post about?"
                  value={socialTopic}
                  onChange={(e) => setSocialTopic(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <TextField
                  fullWidth
                  label="Goal"
                  placeholder="What do you want to achieve with this post? (e.g., engagement, sales, awareness)"
                  value={socialGoal}
                  onChange={(e) => setSocialGoal(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="social-tone-label">Tone</InputLabel>
                  <Select
                    labelId="social-tone-label"
                    value={socialTone}
                    label="Tone"
                    onChange={(e) => setSocialTone(e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value="casual">Casual</MenuItem>
                    <MenuItem value="professional">Professional</MenuItem>
                    <MenuItem value="humorous">Humorous</MenuItem>
                    <MenuItem value="inspirational">Inspirational</MenuItem>
                    <MenuItem value="promotional">Promotional</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading && tabValue === 2 ? <CircularProgress size={20} /> : <ShareIcon />}
                  disabled={loading || !socialTopic || !socialGoal}
                >
                  Generate Social Post
                </Button>
              </form>
            </Grid>
            <Grid item xs={12} md={7}>
              {loading && tabValue === 2 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : socialResult ? (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Generated Social Media Content
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => copyToClipboard(socialResult.content)}
                    >
                      Copy
                    </Button>
                  </Box>
                  
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Platform: {socialResult.platform.charAt(0).toUpperCase() + socialResult.platform.slice(1)}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip label={`Tone: ${socialResult.tone}`} size="small" />
                      <Chip label={`Goal: ${socialResult.goal}`} size="small" />
                    </Box>
                  </Paper>
                  
                  <Paper 
                    elevation={1} 
                    sx={{ 
                      p: 3, 
                      bgcolor: '#fff', 
                      mb: 3,
                      borderRadius: 2,
                      maxWidth: socialResult.platform === 'instagram' || socialResult.platform === 'facebook' ? '100%' : '500px',
                    }}
                  >
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                      {socialResult.content}
                    </Typography>
                    
                    {socialResult.hashtags && (
                      <Typography variant="body2" color="primary" sx={{ mt: 2 }}>
                        {socialResult.hashtags}
                      </Typography>
                    )}
                  </Paper>
                  
                  {socialResult.variations && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Alternative Versions:
                      </Typography>
                      <Grid container spacing={2}>
                        {socialResult.variations.map((variation, index) => (
                          <Grid item xs={12} key={index}>
                            <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                              <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                                {variation}
                              </Typography>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Typography variant="body2" color="text.secondary">
                    Fill out the form to generate social media content
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Email Content */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={5}>
              <form onSubmit={handleEmailGeneration}>
                {error && tabValue === 3 && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="email-type-label">Email Type</InputLabel>
                  <Select
                    labelId="email-type-label"
                    value={emailType}
                    label="Email Type"
                    onChange={(e) => setEmailType(e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value="newsletter">Newsletter</MenuItem>
                    <MenuItem value="welcome">Welcome Email</MenuItem>
                    <MenuItem value="promotional">Promotional</MenuItem>
                    <MenuItem value="abandoned_cart">Abandoned Cart</MenuItem>
                    <MenuItem value="follow_up">Follow-up</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Email Subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <TextField
                  fullWidth
                  label="Context/Details"
                  multiline
                  rows={4}
                  placeholder="Provide context for the email (e.g., product details, newsletter topics, etc.)"
                  value={emailContext}
                  onChange={(e) => setEmailContext(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading && tabValue === 3 ? <CircularProgress size={20} /> : <EmailIcon />}
                  disabled={loading || !emailSubject || !emailContext}
                >
                  Generate Email
                </Button>
              </form>
            </Grid>
            <Grid item xs={12} md={7}>
              {loading && tabValue === 3 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : emailResult ? (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Generated Email Content
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => copyToClipboard(emailResult.body)}
                    >
                      Copy
                    </Button>
                  </Box>
                  
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Subject: {emailResult.subject}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Type: {emailResult.type.charAt(0).toUpperCase() + emailResult.type.slice(1).replace('_', ' ')}
                    </Typography>
                  </Paper>
                  
                  <Paper elevation={1} sx={{ p: 3, bgcolor: '#fff', mb: 3 }}>
                    <div dangerouslySetInnerHTML={{ __html: emailResult.body.replace(/\n/g, '<br/>') }} />
                  </Paper>
                  
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Performance Tips:
                    </Typography>
                    <List dense>
                      {emailResult.tips?.map((tip, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={tip} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                  <Typography variant="body2" color="text.secondary">
                    Fill out the form to generate email content
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Content History */}
        <TabPanel value={tabValue} index={4}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Your Generated Content
            </Typography>
            {(generatedContent && generatedContent.length > 0) ? (
              <List>
                {(generatedContent || []).map((content) => (
                  <ListItem key={content.id}>
                    <ListItemText
                      primary={content.title || content.subject || content.name}
                      secondary={
                        <React.Fragment>
                          <Typography variant="body2" component="span" color="text.secondary">
                            Type: {content.contentType} | Created: {new Date(content.createdAt).toLocaleDateString()}
                          </Typography>
                        </React.Fragment>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => copyToClipboard(content.content || content.body || content.description)}>
                        <ContentCopyIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                <Typography variant="body2" color="text.secondary">
                  No content generated yet. Create your first content using the available tabs.
                </Typography>
              </Box>
            )}
          </Box>
        </TabPanel>
      </Card>
    </Box>
  );
}