import React, { useState } from 'react';
import {
  Box,
  Card,

  Grid,
  Typography,
  TextField,
  Button,

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
  Container,
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
  Person as PersonIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Api as ApiIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import HumanAvatar3D from '../components/HumanAvatar3D';
import DocumentationFixer from '../components/DocumentationFixer';

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

  const handleSaveProfile = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await axios.put('/api/user/profile', {
        name,
        email,
      });
      setSuccess(true);
    } catch (err) {
      setError('Erreur lors de la sauvegarde du profil');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await axios.put('/api/user/password', {
        currentPassword,
        newPassword,
      });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError('Erreur lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectPlatform = async (platform) => {
    try {
      const response = await axios.post(`/api/platforms/${platform}/connect`);
      if (response.data.authUrl) {
        window.open(response.data.authUrl, '_blank');
      }
    } catch (err) {
      setError(`Erreur lors de la connexion à ${platform}`);
    }
  };

  const handleDisconnectPlatform = async (platform) => {
    try {
      await axios.post(`/api/platforms/${platform}/disconnect`);
      setPlatformAccounts(prev => ({
        ...prev,
        [platform]: { connected: false, accountName: '' }
      }));
    } catch (err) {
      setError(`Erreur lors de la déconnexion de ${platform}`);
    }
  };

  const platformIcons = {
    meta: FacebookIcon,
    instagram: InstagramIcon,
    shopify: ShopifyIcon,
    tiktok_ads: TikTokIcon,
    tiktok: TikTokIcon,
    gmail: GmailIcon,
    whatsapp: WhatsAppIcon,
  };

  const platformNames = {
    meta: 'Meta (Facebook)',
    instagram: 'Instagram',
    shopify: 'Shopify',
    tiktok_ads: 'TikTok Ads',
    tiktok: 'TikTok',
    gmail: 'Gmail',
    whatsapp: 'WhatsApp',
  };

  return (
    <PageContainer>
      <Container maxWidth="xl">
        <HeaderCard>
          <Box display="flex" alignItems="center" gap={3}>
            <HumanAvatar3D agentType="settings" size={80} />
            <Box>
              <Typography variant="h4" gutterBottom sx={{ color: '#ffffff', fontWeight: 600 }}>
                Paramètres
              </Typography>
              <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Gérez votre profil, sécurité et connexions
              </Typography>
            </Box>
          </Box>
        </HeaderCard>

        <StyledCard>
          <StyledTabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="settings tabs"
            variant="fullWidth"
          >
            <Tab icon={<PersonIcon />} label="Profil" />
            <Tab icon={<SecurityIcon />} label="Sécurité" />
            <Tab icon={<NotificationsIcon />} label="Notifications" />
            <Tab icon={<ApiIcon />} label="Plateformes" />
            <Tab icon={<BuildIcon />} label="Documentation" />
          </StyledTabs>

          {error && (
            <Alert severity="error" sx={{ m: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ m: 3 }}>
              Paramètres sauvegardés avec succès !
            </Alert>
          )}

          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" gutterBottom>
              Informations du profil
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <StyledTextField
                  fullWidth
                  label="Nom complet"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StyledTextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
              </Grid>
            </Grid>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={handleSaveProfile}
              disabled={loading}
              sx={{
                background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #5855eb, #7c3aed)',
                },
              }}
            >
              Sauvegarder
            </Button>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              Changer le mot de passe
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <StyledTextField
                  fullWidth
                  label="Mot de passe actuel"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StyledTextField
                  fullWidth
                  label="Nouveau mot de passe"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <StyledTextField
                  fullWidth
                  label="Confirmer le mot de passe"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />
              </Grid>
            </Grid>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={handleChangePassword}
              disabled={loading || !currentPassword || !newPassword || !confirmPassword}
              sx={{
                background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #5855eb, #7c3aed)',
                },
              }}
            >
              Changer le mot de passe
            </Button>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>
              Préférences de notification
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
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
              label="Notifications par email"
              sx={{ display: 'block', mb: 2, color: '#ffffff' }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={marketingEmails}
                  onChange={(e) => setMarketingEmails(e.target.checked)}
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
              label="Emails marketing"
              sx={{ display: 'block', mb: 2, color: '#ffffff' }}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" gutterBottom>
              Connexions aux plateformes
            </Typography>
            <List>
              {Object.entries(platformAccounts).map(([platform, account]) => {
                const IconComponent = platformIcons[platform];
                return (
                  <ListItem key={platform} sx={{ color: '#ffffff' }}>
                    <IconComponent sx={{ mr: 2, color: '#6366f1' }} />
                    <ListItemText
                      primary={platformNames[platform]}
                      secondary={
                        account.connected ? (
                          <Chip
                            label="Connecté"
                            color="success"
                            size="small"
                            sx={{ mt: 1 }}
                          />
                        ) : (
                          <Chip
                            label="Non connecté"
                            color="default"
                            size="small"
                            sx={{ mt: 1 }}
                          />
                        )
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => 
                          account.connected 
                            ? handleDisconnectPlatform(platform)
                            : handleConnectPlatform(platform)
                        }
                        sx={{ color: account.connected ? '#ef4444' : '#6366f1' }}
                      >
                        {account.connected ? <LinkOffIcon /> : <LinkIcon />}
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
          </TabPanel>

          <TabPanel value={tabValue} index={4}>
            <DocumentationFixer user={currentUser} />
          </TabPanel>
        </StyledCard>
      </Container>
    </PageContainer>
  );
}