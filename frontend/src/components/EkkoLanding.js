import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Paper,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  SmartToy as AIIcon,
  Campaign as CampaignIcon,
  Support as SupportIcon,
  Analytics as AnalyticsIcon,
  Email as EmailIcon,
  Store as StoreIcon,
  Create as CreateIcon,
  CheckCircle as CheckCircleIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  AutoAwesome as AutoAwesomeIcon,
  PlayArrow as PlayIcon,
  ArrowForward as ArrowForwardIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  MonetizationOn as MonetizationOnIcon,
  SupportAgent as SupportAgentIcon,
  Campaign as CampaignIcon2,
  Analytics as AnalyticsIcon2,
  Email as EmailIcon2,
  Store as StoreIcon2,
  Create as CreateIcon2
} from '@mui/icons-material';

const EkkoLanding = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [demoDialog, setDemoDialog] = useState(false);
  const [contactDialog, setContactDialog] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    business: '',
    message: ''
  });

  const features = [
    {
      icon: AutoAwesomeIcon,
      title: 'AI-Powered Automation',
      description: 'All your e-commerce tasks automated by intelligent AI agents that work 24/7',
      color: '#8B5CF6'
    },
    {
      icon: SpeedIcon,
      title: 'Lightning Fast Setup',
      description: 'Get your AI agents up and running in minutes, not days',
      color: '#EF4444'
    },
    {
      icon: SecurityIcon,
      title: 'Enterprise Security',
      description: 'Bank-level security with end-to-end encryption and compliance',
      color: '#10B981'
    },
    {
      icon: TrendingUpIcon,
      title: 'Proven Results',
      description: 'Average 300% increase in conversion rates for our customers',
      color: '#F59E0B'
    }
  ];

  const aiAgents = [
    {
      id: 'advertising',
      name: 'AI Advertising Agent',
      icon: CampaignIcon,
      color: '#8B5CF6',
      description: 'Generates ad campaigns & audiences, analyzes in real time, and optimizes performance',
      features: ['Campaign Generation', 'Real-time Analysis', 'A/B Testing', 'Creative Optimization'],
      platforms: ['Facebook Ads', 'Google Ads', 'TikTok Ads', 'Instagram Ads']
    },
    {
      id: 'customer-service',
      name: 'AI Customer Service Agent',
      icon: SupportIcon,
      color: '#3B82F6',
      description: 'Automatic customer responses across all platforms with human-like conversation',
      features: ['Multi-platform Support', 'Natural Language', '24/7 Availability', 'Escalation Handling'],
      platforms: ['WhatsApp', 'Instagram', 'TikTok', 'Email', 'Shopify Chat']
    },
    {
      id: 'analysis',
      name: 'AI Analysis Agent',
      icon: AnalyticsIcon,
      color: '#10B981',
      description: 'Analyzes product listings, shopping cart, and provides conversion optimization advice',
      features: ['Product Analysis', 'Conversion Optimization', 'Payment Method Analysis', 'Trust Building'],
      platforms: ['Shopify', 'WooCommerce', 'Magento', 'BigCommerce']
    },
    {
      id: 'email-marketing',
      name: 'AI Email Marketing Agent',
      icon: EmailIcon,
      color: '#F59E0B',
      description: 'Generates branded email sequences, welcome emails, and abandoned cart reminders',
      features: ['Email Sequences', 'Branded Templates', 'Image Generation', 'A/B Testing'],
      platforms: ['Gmail', 'Mailchimp', 'SendGrid', 'Klaviyo']
    },
    {
      id: 'page-generator',
      name: 'AI Page Generator Agent',
      icon: StoreIcon,
      color: '#EF4444',
      description: 'Generates complete Shopify stores with optimized pages and branded content',
      features: ['Store Generation', 'Page Optimization', 'Content Scraping', 'Image Processing'],
      platforms: ['Shopify', 'WooCommerce', 'Custom Websites']
    },
    {
      id: 'content-creator',
      name: 'AI Content Creator Agent',
      icon: CreateIcon,
      color: '#F97316',
      description: 'Generates viral TikTok/Instagram content and manages social media engagement',
      features: ['Content Generation', 'Image Creation', 'Video Editing', 'Comment Management'],
      platforms: ['TikTok', 'Instagram', 'Facebook', 'YouTube']
    }
  ];

  const platforms = [
    { name: 'Shopify', icon: '🛍️', color: '#96BF47' },
    { name: 'WhatsApp', icon: '💬', color: '#25D366' },
    { name: 'Instagram', icon: '📸', color: '#E4405F' },
    { name: 'Facebook', icon: '📘', color: '#1877F2' },
    { name: 'TikTok', icon: '🎵', color: '#000000' },
    { name: 'Google Ads', icon: '🔍', color: '#4285F4' },
    { name: 'Email', icon: '📧', color: '#EA4335' },
    { name: 'WooCommerce', icon: '🛒', color: '#7F54B3' }
  ];

  const testimonials = [
    {
      name: 'Sarah Chen',
      business: 'Fashion Boutique',
      text: 'Ekko transformed our business. Our AI agents handle everything from customer service to ad optimization. Sales increased by 400% in just 3 months!',
      rating: 5
    },
    {
      name: 'Marcus Rodriguez',
      business: 'Electronics Store',
      text: 'The AI page generator created our entire store in minutes. The content was perfectly tailored to our products. Absolutely incredible!',
      rating: 5
    },
    {
      name: 'Emma Thompson',
      business: 'Beauty Products',
      text: 'Customer service is now 24/7 and our AI handles 90% of inquiries. Our team can focus on product development instead of repetitive tasks.',
      rating: 5
    }
  ];

  const handleContactSubmit = async () => {
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    setContactDialog(false);
    setContactForm({ name: '', email: '', business: '', message: '' });
  };

  return (
    <Box>
      {/* Hero Section */}
      <Box 
        sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: 8,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
                🤖 Ekko
              </Typography>
              <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
                The Future of E-commerce is AI-Powered
              </Typography>
              <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
                Transform your online business with intelligent AI agents that handle everything from advertising to customer service, 24/7.
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PlayIcon />}
                  onClick={() => setDemoDialog(true)}
                  sx={{ 
                    bgcolor: 'white', 
                    color: 'primary.main',
                    '&:hover': { bgcolor: 'grey.100' }
                  }}
                >
                  Watch Demo
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<ArrowForwardIcon />}
                  onClick={() => setContactDialog(true)}
                  sx={{ 
                    borderColor: 'white', 
                    color: 'white',
                    '&:hover': { borderColor: 'grey.300', bgcolor: 'rgba(255,255,255,0.1)' }
                  }}
                >
                  Get Started
                </Button>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box sx={{ textAlign: 'center' }}>
                <Avatar 
                  sx={{ 
                    width: 200, 
                    height: 200, 
                    mx: 'auto', 
                    bgcolor: 'rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <AIIcon sx={{ fontSize: 100 }} />
                </Avatar>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" textAlign="center" gutterBottom>
          Why Choose Ekko?
        </Typography>
        <Typography variant="h6" textAlign="center" color="text.secondary" sx={{ mb: 6 }}>
          Built for modern e-commerce businesses that want to scale without limits
        </Typography>
        
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card sx={{ height: '100%', textAlign: 'center' }}>
                <CardContent>
                  <Avatar sx={{ bgcolor: feature.color, width: 64, height: 64, mx: 'auto', mb: 2 }}>
                    <feature.icon sx={{ fontSize: 32 }} />
                  </Avatar>
                  <Typography variant="h6" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* AI Agents Section */}
      <Box sx={{ bgcolor: 'grey.50', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" textAlign="center" gutterBottom>
            Meet Your AI Team
          </Typography>
          <Typography variant="h6" textAlign="center" color="text.secondary" sx={{ mb: 6 }}>
            Six specialized AI agents working together to grow your business
          </Typography>
          
          <Grid container spacing={4}>
            {aiAgents.map((agent) => (
              <Grid item xs={12} md={6} lg={4} key={agent.id}>
                <Card sx={{ height: '100%', border: `2px solid ${agent.color}20` }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ bgcolor: agent.color, mr: 2 }}>
                        <agent.icon />
                      </Avatar>
                      <Typography variant="h6">
                        {agent.name}
                      </Typography>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {agent.description}
                    </Typography>
                    
                    <Typography variant="body2" gutterBottom>
                      <strong>Features:</strong>
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                      {agent.features.slice(0, 2).map((feature, index) => (
                        <Chip
                          key={index}
                          label={feature}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      ))}
                      {agent.features.length > 2 && (
                        <Chip
                          label={`+${agent.features.length - 2} more`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                    
                    <Typography variant="body2" gutterBottom>
                      <strong>Platforms:</strong>
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {agent.platforms.slice(0, 3).map((platform, index) => (
                        <Chip
                          key={index}
                          label={platform}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      ))}
                      {agent.platforms.length > 3 && (
                        <Chip
                          label={`+${agent.platforms.length - 3} more`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Platforms Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" textAlign="center" gutterBottom>
          Seamless Integration
        </Typography>
        <Typography variant="h6" textAlign="center" color="text.secondary" sx={{ mb: 6 }}>
          Connect all your platforms in minutes with our simplified connection system
        </Typography>
        
        <Grid container spacing={3} justifyContent="center">
          {platforms.map((platform, index) => (
            <Grid item key={index}>
              <Paper 
                elevation={2}
                sx={{ 
                  p: 3, 
                  textAlign: 'center',
                  border: `2px solid ${platform.color}20`,
                  '&:hover': {
                    border: `2px solid ${platform.color}`,
                    transform: 'translateY(-4px)',
                    transition: 'all 0.3s ease'
                  }
                }}
              >
                <Typography variant="h2" sx={{ mb: 1 }}>
                  {platform.icon}
                </Typography>
                <Typography variant="h6">
                  {platform.name}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Testimonials Section */}
      <Box sx={{ bgcolor: 'grey.50', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" textAlign="center" gutterBottom>
            What Our Customers Say
          </Typography>
          <Typography variant="h6" textAlign="center" color="text.secondary" sx={{ mb: 6 }}>
            Join thousands of successful e-commerce businesses
          </Typography>
          
          <Grid container spacing={4}>
            {testimonials.map((testimonial, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', mb: 2 }}>
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <StarIcon key={i} sx={{ color: 'warning.main' }} />
                      ))}
                    </Box>
                    
                    <Typography variant="body1" sx={{ mb: 3, fontStyle: 'italic' }}>
                      "{testimonial.text}"
                    </Typography>
                    
                    <Box>
                      <Typography variant="h6">
                        {testimonial.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {testimonial.business}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 8 }}>
        <Container maxWidth="lg" sx={{ textAlign: 'center' }}>
          <Typography variant="h3" gutterBottom>
            Ready to Transform Your Business?
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
            Start your free trial today and see the power of AI-driven e-commerce
          </Typography>
          
          <Button
            variant="contained"
            size="large"
            startIcon={<ArrowForwardIcon />}
            onClick={() => setContactDialog(true)}
            sx={{ 
              bgcolor: 'white', 
              color: 'primary.main',
              '&:hover': { bgcolor: 'grey.100' }
            }}
          >
            Start Free Trial
          </Button>
        </Container>
      </Box>

      {/* Demo Dialog */}
      <Dialog open={demoDialog} onClose={() => setDemoDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Ekko Platform Demo</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>
              🎥 Demo Video Coming Soon
            </Typography>
            <Typography variant="body1" color="text.secondary">
              We're preparing an amazing demo that showcases all the AI agents in action.
              Contact us to schedule a personalized demo of the Ekko platform.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDemoDialog(false)}>Close</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              setDemoDialog(false);
              setContactDialog(true);
            }}
          >
            Schedule Demo
          </Button>
        </DialogActions>
      </Dialog>

      {/* Contact Dialog */}
      <Dialog open={contactDialog} onClose={() => setContactDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Get Started with Ekko</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Name"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Business Name"
                  value={contactForm.business}
                  onChange={(e) => setContactForm({ ...contactForm, business: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Message"
                  multiline
                  rows={4}
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  placeholder="Tell us about your business and how we can help..."
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContactDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleContactSubmit}
            disabled={!contactForm.name || !contactForm.email}
          >
            Send Message
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EkkoLanding;
