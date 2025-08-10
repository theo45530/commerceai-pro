import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
} from '@mui/material';
import { 
  Save as SaveIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  Store as ShopifyIcon,
  VideoLibrary as TikTokIcon,
  Email as GmailIcon,
  WhatsApp as WhatsAppIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
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

export default function Settings() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Profile settings
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  
  // Password settings
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(true);
  
  // API settings
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  
  // Platform accounts
  const [platformAccounts, setPlatformAccounts] = useState({
    meta: { connected: false, accountName: '' },
    instagram: { connected: false, accountName: '' },
    shopify: { connected: false, accountName: '' },
    tiktok_ads: { connected: false, accountName: '' },
    tiktok: { connected: false, accountName: '' },
    gmail: { connected: false, accountName: '' },
    whatsapp: { connected: false, accountName: '' },
  });

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError('');
    setSuccess(false);
  };

  // Set tab from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam !== null) {
      const tabIndex = parseInt(tabParam, 10);
      if (tabIndex >= 0 && tabIndex <= 4) {
        setTabValue(tabIndex);
      }
    }
  }, [location.search]);

  // Load platform accounts on component mount
  useEffect(() => {
    const loadPlatformAccounts = async () => {
      try {
        const response = await axios.get('/api/users/platforms');
        if (response.data.success) {
          setPlatformAccounts(response.data.platforms);
        }
      } catch (err) {
        console.error('Error loading platform accounts:', err);
      }
    };

    loadPlatformAccounts();
  }, []);

  // Handle OAuth callback parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const connectedPlatform = urlParams.get('connected');
    const accountName = urlParams.get('account');
    const error = urlParams.get('error');

    if (connectedPlatform && accountName) {
      setSuccess(true);
      setError('');
      setTabValue(2); // Switch to Platform Connections tab
      
      // Update platform accounts state
      setPlatformAccounts(prev => ({
        ...prev,
        [connectedPlatform]: {
          connected: true,
          accountName: decodeURIComponent(accountName)
        }
      }));
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error === 'authorization_failed') {
      setError('Échec de l\'autorisation. Veuillez réessayer.');
      setSuccess(false);
      setTabValue(2); // Switch to Platform Connections tab
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error === 'authorization_cancelled') {
      setError('Autorisation annulée par l\'utilisateur.');
      setSuccess(false);
      setTabValue(2); // Switch to Platform Connections tab
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError('');
    
    try {
      await axios.put('/api/users/profile', { name, email });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
      console.error('Error updating profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError('');
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }
    
    try {
      await axios.put('/api/users/password', {
        currentPassword,
        newPassword,
      });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password');
      console.error('Error updating password:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError('');
    
    try {
      await axios.put('/api/users/notifications', {
        emailNotifications,
        marketingEmails,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update notification settings');
      console.error('Error updating notification settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApiUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError('');
    
    try {
      await axios.put('/api/users/api-keys', {
        openaiApiKey,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update API settings');
      console.error('Error updating API settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectPlatform = async (platform) => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      
      // Get OAuth URL from API and redirect immediately
      const response = await axios.get(`/api/auth/oauth/${platform}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success && response.data.authUrl) {
        // Redirect to the OAuth URL
        window.location.href = response.data.authUrl;
      } else {
        setError(`Failed to get ${platform} OAuth URL`);
      }
    } catch (err) {
      setError(`Failed to connect ${platform} account: ${err.response?.data?.message || err.message}`);
      console.error(`Error connecting ${platform}:`, err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectPlatform = async (platform) => {
    setLoading(true);
    setError('');
    
    try {
      await axios.delete(`/api/auth/oauth/${platform}`);
      setPlatformAccounts(prev => ({
        ...prev,
        [platform]: { connected: false, accountName: '' }
      }));
      setSuccess(true);
    } catch (err) {
      setError(`Failed to disconnect ${platform} account`);
      console.error(`Error disconnecting ${platform}:`, err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Manage your account settings and preferences
      </Typography>

      <Card sx={{ mt: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs">
            <Tab label="Profile" id="settings-tab-0" />
            <Tab label="Password" id="settings-tab-1" />
            <Tab label="Notifications" id="settings-tab-2" />
            <Tab label="Platform Accounts" id="settings-tab-3" />
            <Tab label="API Keys" id="settings-tab-4" />
          </Tabs>
        </Box>

        {/* Profile Settings */}
        <TabPanel value={tabValue} index={0}>
          <form onSubmit={handleProfileUpdate}>
            {success && tabValue === 0 && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Profile updated successfully!
              </Alert>
            )}
            {error && tabValue === 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                  disabled={loading}
                >
                  Save Changes
                </Button>
              </Grid>
            </Grid>
          </form>
        </TabPanel>

        {/* Password Settings */}
        <TabPanel value={tabValue} index={1}>
          <form onSubmit={handlePasswordUpdate}>
            {success && tabValue === 1 && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Password updated successfully!
              </Alert>
            )}
            {error && tabValue === 1 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                  disabled={loading}
                >
                  Update Password
                </Button>
              </Grid>
            </Grid>
          </form>
        </TabPanel>

        {/* Notification Settings */}
        <TabPanel value={tabValue} index={2}>
          <form onSubmit={handleNotificationUpdate}>
            {success && tabValue === 2 && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Notification settings updated successfully!
              </Alert>
            )}
            {error && tabValue === 2 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                      disabled={loading}
                    />
                  }
                  label="Email Notifications"
                />
                <Typography variant="body2" color="text.secondary">
                  Receive email notifications for important updates and activity
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={marketingEmails}
                      onChange={(e) => setMarketingEmails(e.target.checked)}
                      disabled={loading}
                    />
                  }
                  label="Marketing Emails"
                />
                <Typography variant="body2" color="text.secondary">
                  Receive marketing emails about new features and offers
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                  disabled={loading}
                >
                  Save Preferences
                </Button>
              </Grid>
            </Grid>
          </form>
        </TabPanel>

        {/* Platform Accounts */}
        <TabPanel value={tabValue} index={3}>
          {success && tabValue === 3 && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Platform account updated successfully!
            </Alert>
          )}
          {error && tabValue === 3 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Typography variant="h6" gutterBottom>
            Connected Accounts
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Connect your social media and advertising platform accounts to enable AI-powered campaign management.
          </Typography>
          
          <List>
            {/* Meta Ads */}
            <ListItem>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FacebookIcon color="primary" />
                    <Typography>Meta Ads (Facebook)</Typography>
                    {platformAccounts.meta.connected && (
                      <Chip label="Connected" color="success" size="small" />
                    )}
                  </Box>
                }
                secondary={platformAccounts.meta.connected ? 
                  `Connected as: ${platformAccounts.meta.accountName}` : 
                  'Connect your Meta Ads account to create and manage Facebook campaigns'
                }
              />
              <ListItemSecondaryAction>
                {platformAccounts.meta.connected ? (
                  <IconButton 
                    edge="end" 
                    onClick={() => handleDisconnectPlatform('meta')}
                    disabled={loading}
                  >
                    <LinkOffIcon />
                  </IconButton>
                ) : (
                  <IconButton 
                    edge="end" 
                    onClick={() => handleConnectPlatform('meta')}
                    disabled={loading}
                  >
                    <LinkIcon />
                  </IconButton>
                )}
              </ListItemSecondaryAction>
            </ListItem>
            
            <Divider />
            
            {/* Instagram */}
            <ListItem>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <InstagramIcon color="primary" />
                    <Typography>Instagram</Typography>
                    {platformAccounts.instagram.connected && (
                      <Chip label="Connected" color="success" size="small" />
                    )}
                  </Box>
                }
                secondary={platformAccounts.instagram.connected ? 
                  `Connected as: ${platformAccounts.instagram.accountName}` : 
                  'Connect your Instagram account for content management'
                }
              />
              <ListItemSecondaryAction>
                {platformAccounts.instagram.connected ? (
                  <IconButton 
                    edge="end" 
                    onClick={() => handleDisconnectPlatform('instagram')}
                    disabled={loading}
                  >
                    <LinkOffIcon />
                  </IconButton>
                ) : (
                  <IconButton 
                    edge="end" 
                    onClick={() => handleConnectPlatform('instagram')}
                    disabled={loading}
                  >
                    <LinkIcon />
                  </IconButton>
                )}
              </ListItemSecondaryAction>
            </ListItem>
            
            <Divider />
            
            {/* Shopify */}
            <ListItem>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ShopifyIcon color="primary" />
                    <Typography>Shopify</Typography>
                    {platformAccounts.shopify.connected && (
                      <Chip label="Connected" color="success" size="small" />
                    )}
                  </Box>
                }
                secondary={platformAccounts.shopify.connected ? 
                  `Connected as: ${platformAccounts.shopify.accountName}` : 
                  'Connect your Shopify store for product and order management'
                }
              />
              <ListItemSecondaryAction>
                {platformAccounts.shopify.connected ? (
                  <IconButton 
                    edge="end" 
                    onClick={() => handleDisconnectPlatform('shopify')}
                    disabled={loading}
                  >
                    <LinkOffIcon />
                  </IconButton>
                ) : (
                  <IconButton 
                    edge="end" 
                    onClick={() => handleConnectPlatform('shopify')}
                    disabled={loading}
                  >
                    <LinkIcon />
                  </IconButton>
                )}
              </ListItemSecondaryAction>
            </ListItem>
            
            <Divider />
            
            {/* TikTok Ads */}
            <ListItem>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TikTokIcon color="primary" />
                    <Typography>TikTok Ads</Typography>
                    {platformAccounts.tiktok_ads.connected && (
                      <Chip label="Connected" color="success" size="small" />
                    )}
                  </Box>
                }
                secondary={platformAccounts.tiktok_ads.connected ? 
                  `Connected as: ${platformAccounts.tiktok_ads.accountName}` : 
                  'Connect your TikTok Ads account for advertising campaigns'
                }
              />
              <ListItemSecondaryAction>
                {platformAccounts.tiktok_ads.connected ? (
                  <IconButton 
                    edge="end" 
                    onClick={() => handleDisconnectPlatform('tiktok_ads')}
                    disabled={loading}
                  >
                    <LinkOffIcon />
                  </IconButton>
                ) : (
                  <IconButton 
                    edge="end" 
                    onClick={() => handleConnectPlatform('tiktok_ads')}
                    disabled={loading}
                  >
                    <LinkIcon />
                  </IconButton>
                )}
              </ListItemSecondaryAction>
            </ListItem>
            
            <Divider />
            
            {/* TikTok */}
            <ListItem>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TikTokIcon color="primary" />
                    <Typography>TikTok</Typography>
                    {platformAccounts.tiktok.connected && (
                      <Chip label="Connected" color="success" size="small" />
                    )}
                  </Box>
                }
                secondary={platformAccounts.tiktok.connected ? 
                  `Connected as: ${platformAccounts.tiktok.accountName}` : 
                  'Connect your TikTok account for content management'
                }
              />
              <ListItemSecondaryAction>
                {platformAccounts.tiktok.connected ? (
                  <IconButton 
                    edge="end" 
                    onClick={() => handleDisconnectPlatform('tiktok')}
                    disabled={loading}
                  >
                    <LinkOffIcon />
                  </IconButton>
                ) : (
                  <IconButton 
                    edge="end" 
                    onClick={() => handleConnectPlatform('tiktok')}
                    disabled={loading}
                  >
                    <LinkIcon />
                  </IconButton>
                )}
              </ListItemSecondaryAction>
            </ListItem>
            
            <Divider />
            
            {/* Gmail */}
            <ListItem>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GmailIcon color="primary" />
                    <Typography>Gmail</Typography>
                    {platformAccounts.gmail.connected && (
                      <Chip label="Connected" color="success" size="small" />
                    )}
                  </Box>
                }
                secondary={platformAccounts.gmail.connected ? 
                  `Connected as: ${platformAccounts.gmail.accountName}` : 
                  'Connect your Gmail account for email marketing campaigns'
                }
              />
              <ListItemSecondaryAction>
                {platformAccounts.gmail.connected ? (
                  <IconButton 
                    edge="end" 
                    onClick={() => handleDisconnectPlatform('gmail')}
                    disabled={loading}
                  >
                    <LinkOffIcon />
                  </IconButton>
                ) : (
                  <IconButton 
                    edge="end" 
                    onClick={() => handleConnectPlatform('gmail')}
                    disabled={loading}
                  >
                    <LinkIcon />
                  </IconButton>
                )}
              </ListItemSecondaryAction>
            </ListItem>
            
            <Divider />
            
            {/* WhatsApp */}
            <ListItem>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WhatsAppIcon color="primary" />
                    <Typography>WhatsApp Business</Typography>
                    {platformAccounts.whatsapp.connected && (
                      <Chip label="Connected" color="success" size="small" />
                    )}
                  </Box>
                }
                secondary={platformAccounts.whatsapp.connected ? 
                  `Connected as: ${platformAccounts.whatsapp.accountName}` : 
                  'Connect your WhatsApp Business account for customer service'
                }
              />
              <ListItemSecondaryAction>
                {platformAccounts.whatsapp.connected ? (
                  <IconButton 
                    edge="end" 
                    onClick={() => handleDisconnectPlatform('whatsapp')}
                    disabled={loading}
                  >
                    <LinkOffIcon />
                  </IconButton>
                ) : (
                  <IconButton 
                    edge="end" 
                    onClick={() => handleConnectPlatform('whatsapp')}
                    disabled={loading}
                  >
                    <LinkIcon />
                  </IconButton>
                )}
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </TabPanel>

        {/* API Settings */}
        <TabPanel value={tabValue} index={4}>
          <form onSubmit={handleApiUpdate}>
            {success && tabValue === 4 && (
              <Alert severity="success" sx={{ mb: 2 }}>
                API settings updated successfully!
              </Alert>
            )}
            {error && tabValue === 4 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="OpenAI API Key"
                  type="password"
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  disabled={loading}
                  helperText="Your OpenAI API key will be securely stored and used for AI-powered features"
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                  disabled={loading}
                >
                  Save API Settings
                </Button>
              </Grid>
            </Grid>
          </form>
        </TabPanel>
      </Card>
    </Box>
  );
}