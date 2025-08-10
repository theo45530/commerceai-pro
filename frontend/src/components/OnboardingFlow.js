import React, { useState } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Typography,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  Grid,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Business as BusinessIcon,
  Store as StoreIcon,
  Campaign as CampaignIcon,
  Support as SupportIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

const OnboardingFlow = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    industry: '',
    targetAudience: '',
    products: '',
    budget: '',
    platforms: [],
    goals: []
  });
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const steps = [
    {
      label: 'Business Setup',
      description: 'Tell us about your business',
      icon: BusinessIcon,
      color: '#8B5CF6'
    },
    {
      label: 'Store Connection',
      description: 'Connect your e-commerce platform',
      icon: StoreIcon,
      color: '#EF4444'
    },
    {
      label: 'Marketing Goals',
      description: 'Define your marketing objectives',
      icon: CampaignIcon,
      color: '#F59E0B'
    },
    {
      label: 'AI Agent Setup',
      description: 'Configure your AI agents',
      icon: SupportIcon,
      color: '#10B981'
    }
  ];

  const businessTypes = [
    'Fashion & Apparel',
    'Electronics',
    'Home & Garden',
    'Beauty & Personal Care',
    'Food & Beverage',
    'Sports & Outdoor',
    'Automotive',
    'Health & Wellness',
    'Jewelry & Accessories',
    'Other'
  ];

  const industries = [
    'E-commerce Retail',
    'Dropshipping',
    'Subscription Service',
    'Digital Products',
    'Services',
    'Manufacturing',
    'Wholesale',
    'Other'
  ];

  const targetAudiences = [
    'B2C (Business to Consumer)',
    'B2B (Business to Business)',
    'B2B2C (Business to Business to Consumer)',
    'D2C (Direct to Consumer)'
  ];

  const budgetRanges = [
    'Under $1,000/month',
    '$1,000 - $5,000/month',
    '$5,000 - $10,000/month',
    '$10,000 - $25,000/month',
    '$25,000 - $50,000/month',
    'Over $50,000/month'
  ];

  const platformOptions = [
    { id: 'shopify', name: 'Shopify', icon: '🛍️' },
    { id: 'woocommerce', name: 'WooCommerce', icon: '🛒' },
    { id: 'magento', name: 'Magento', icon: '🏪' },
    { id: 'bigcommerce', name: 'BigCommerce', icon: '🏬' }
  ];

  const goalOptions = [
    { id: 'increase-sales', name: 'Increase Sales', icon: '📈' },
    { id: 'brand-awareness', name: 'Brand Awareness', icon: '🎯' },
    { id: 'customer-retention', name: 'Customer Retention', icon: '🔄' },
    { id: 'market-expansion', name: 'Market Expansion', icon: '🌍' },
    { id: 'lead-generation', name: 'Lead Generation', icon: '🎣' },
    { id: 'website-traffic', name: 'Website Traffic', icon: '🚀' }
  ];

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePlatformToggle = (platformId) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platformId)
        ? prev.platforms.filter(id => id !== platformId)
        : [...prev.platforms, platformId]
    }));
  };

  const handleGoalToggle = (goalId) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.includes(goalId)
        ? prev.goals.filter(id => id !== goalId)
        : [...prev.goals, goalId]
    }));
  };

  const handleComplete = async () => {
    setLoading(true);
    
    try {
      // Simulate API call to save onboarding data
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setShowSuccess(true);
      setTimeout(() => {
        onComplete(formData);
      }, 3000);
    } catch (error) {
      console.error('Onboarding completion failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = (step) => {
    switch (step) {
      case 0:
        return formData.businessName && formData.businessType && formData.industry;
      case 1:
        return formData.platforms.length > 0;
      case 2:
        return formData.goals.length > 0 && formData.budget;
      case 3:
        return true; // AI Agent setup is always valid
      default:
        return false;
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Let's get to know your business
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Business Name"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange('businessName', e.target.value)}
                  placeholder="Enter your business name"
                  required
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Business Type</InputLabel>
                  <Select
                    value={formData.businessType}
                    onChange={(e) => handleInputChange('businessType', e.target.value)}
                    label="Business Type"
                  >
                    {businessTypes.map((type) => (
                      <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Industry</InputLabel>
                  <Select
                    value={formData.industry}
                    onChange={(e) => handleInputChange('industry', e.target.value)}
                    label="Industry"
                  >
                    {industries.map((industry) => (
                      <MenuItem key={industry} value={industry}>{industry}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Target Audience</InputLabel>
                  <Select
                    value={formData.targetAudience}
                    onChange={(e) => handleInputChange('targetAudience', e.target.value)}
                    label="Target Audience"
                  >
                    {targetAudiences.map((audience) => (
                      <MenuItem key={audience} value={audience}>{audience}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Products/Services"
                  value={formData.products}
                  onChange={(e) => handleInputChange('products', e.target.value)}
                  placeholder="Describe your main products or services"
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Connect your e-commerce platform
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Select the platforms you currently use or plan to use
            </Typography>
            
            <Grid container spacing={2}>
              {platformOptions.map((platform) => (
                <Grid item xs={12} sm={6} md={4} key={platform.id}>
                  <Card
                    variant={formData.platforms.includes(platform.id) ? "elevation" : "outlined"}
                    sx={{
                      cursor: 'pointer',
                      border: formData.platforms.includes(platform.id) ? `2px solid ${steps[1].color}` : '1px solid #e0e0e0',
                      '&:hover': {
                        border: `2px solid ${steps[1].color}`,
                        transform: 'translateY(-2px)',
                        transition: 'all 0.3s ease'
                      }
                    }}
                    onClick={() => handlePlatformToggle(platform.id)}
                  >
                    <CardContent sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h3" sx={{ mb: 1 }}>
                        {platform.icon}
                      </Typography>
                      <Typography variant="subtitle1" gutterBottom>
                        {platform.name}
                      </Typography>
                      {formData.platforms.includes(platform.id) && (
                        <CheckCircleIcon sx={{ color: steps[1].color }} />
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            
            {formData.platforms.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Please select at least one e-commerce platform to continue
              </Alert>
            )}
          </Box>
        );

      case 2:
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Define your marketing goals
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Select your primary marketing objectives
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {goalOptions.map((goal) => (
                <Grid item xs={12} sm={6} md={4} key={goal.id}>
                  <Card
                    variant={formData.goals.includes(goal.id) ? "elevation" : "outlined"}
                    sx={{
                      cursor: 'pointer',
                      border: formData.goals.includes(goal.id) ? `2px solid ${steps[2].color}` : '1px solid #e0e0e0',
                      '&:hover': {
                        border: `2px solid ${steps[2].color}`,
                        transform: 'translateY(-2px)',
                        transition: 'all 0.3s ease'
                      }
                    }}
                    onClick={() => handleGoalToggle(goal.id)}
                  >
                    <CardContent sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h3" sx={{ mb: 1 }}>
                        {goal.icon}
                      </Typography>
                      <Typography variant="subtitle2" gutterBottom>
                        {goal.name}
                      </Typography>
                      {formData.goals.includes(goal.id) && (
                        <CheckCircleIcon sx={{ color: steps[2].color }} />
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            
            <FormControl fullWidth required>
              <InputLabel>Marketing Budget</InputLabel>
              <Select
                value={formData.budget}
                onChange={(e) => handleInputChange('budget', e.target.value)}
                label="Marketing Budget"
              >
                {budgetRanges.map((budget) => (
                  <MenuItem key={budget} value={budget}>{budget}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {formData.goals.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Please select at least one marketing goal to continue
              </Alert>
            )}
          </Box>
        );

      case 3:
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              AI Agent Configuration
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Based on your setup, we'll configure the following AI agents:
            </Typography>
            
            <Grid container spacing={2}>
              {[
                { name: 'AI Advertising Agent', description: 'Optimize ad campaigns and performance', color: '#8B5CF6' },
                { name: 'AI Customer Service Agent', description: '24/7 customer support across platforms', color: '#3B82F6' },
                { name: 'AI Analysis Agent', description: 'Product optimization and conversion insights', color: '#10B981' },
                { name: 'AI Email Marketing Agent', description: 'Branded email campaigns and sequences', color: '#F59E0B' },
                { name: 'AI Page Generator Agent', description: 'Complete store generation and optimization', color: '#EF4444' },
                { name: 'AI Content Creator Agent', description: 'Viral content for social media', color: '#F97316' }
              ].map((agent, index) => (
                <Grid item xs={12} sm={6} key={index}>
                  <Card sx={{ border: `2px solid ${agent.color}20` }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Avatar sx={{ bgcolor: agent.color, mr: 2, width: 32, height: 32 }}>
                          <CheckCircleIcon />
                        </Avatar>
                        <Typography variant="subtitle1" sx={{ color: agent.color }}>
                          {agent.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {agent.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            
            <Alert severity="success" sx={{ mt: 3 }}>
              <strong>Ready to launch!</strong> Your AI agents will be automatically configured based on your business profile.
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          🚀 Welcome to Ekko!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Let's set up your AI-powered e-commerce platform in just a few steps
        </Typography>
      </Box>

      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepLabel
              StepIconComponent={() => (
                <Avatar sx={{ bgcolor: step.color, width: 32, height: 32 }}>
                  <step.icon />
                </Avatar>
              )}
            >
              <Typography variant="h6">{step.label}</Typography>
              <Typography variant="body2" color="text.secondary">
                {step.description}
              </Typography>
            </StepLabel>
            <StepContent>
              {renderStepContent(index)}
              <Box sx={{ mb: 2, mt: 3 }}>
                <div>
                  <Button
                    variant="contained"
                    onClick={index === steps.length - 1 ? handleComplete : handleNext}
                    disabled={!isStepValid(index) || loading}
                    endIcon={index === steps.length - 1 ? <CheckCircleIcon /> : <ArrowForwardIcon />}
                    sx={{ mr: 1 }}
                  >
                    {index === steps.length - 1 ? 'Complete Setup' : 'Continue'}
                  </Button>
                  <Button
                    disabled={index === 0}
                    onClick={handleBack}
                    startIcon={<ArrowBackIcon />}
                  >
                    Back
                  </Button>
                </div>
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>

      {/* Progress Bar */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Setup Progress: {Math.round(((activeStep + 1) / steps.length) * 100)}%
        </Typography>
        <LinearProgress 
          variant="determinate" 
          value={((activeStep + 1) / steps.length) * 100}
          sx={{ height: 8, borderRadius: 4 }}
        />
      </Box>

      {/* Success Dialog */}
      <Dialog open={showSuccess} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} />
            Setup Complete!
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Congratulations! Your Ekko platform has been successfully configured.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            We're now setting up your AI agents and optimizing them for your business. 
            You'll be redirected to your dashboard in a moment.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setShowSuccess(false)}>
            Continue
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OnboardingFlow;
