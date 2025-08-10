import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Grid,
  Paper,
  Avatar,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Fade,
  Slide,
  Zoom,
  Chip
} from '@mui/material';
import {
  Store,
  Language,
  CalendarToday,
  Category,
  ArrowBack,
  ArrowForward,
  CheckCircle,
  Info,
  Business,
  Public,
  TrendingUp,
  Star
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import SintraBackground from '../components/SintraBackground';
import AgentAvatar from '../components/AgentAvatar';

const BrandSetup = () => {
  const navigate = useNavigate();
  const { currentUser, loading, logout } = useAuth();
  const { updateOnboardingStep } = useOnboarding();
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    businessAge: '',
    targetMarket: '',
    businessDescription: ''
  });

  useEffect(() => {
    if (!loading && !currentUser) {
      navigate('/login');
    }
  }, [currentUser, loading, navigate]);

  // Show loading while auth is being determined
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        <Typography variant="h6" color="white">
          Chargement...
        </Typography>
      </Box>
    );
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Le nom de l\'entreprise est requis';
    }
    
    if (!formData.businessType) {
      newErrors.businessType = 'Le type d\'entreprise est requis';
    }
    
    if (!formData.businessAge) {
      newErrors.businessAge = 'L\'âge de l\'entreprise est requis';
    }
    
    if (!formData.targetMarket) {
      newErrors.targetMarket = 'Le marché cible est requis';
    }
    
    if (!formData.businessDescription.trim()) {
      newErrors.businessDescription = 'La description de l\'entreprise est requise';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      // Simulation d'une sauvegarde
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mise à jour du contexte d'onboarding
      updateOnboardingStep('brand-setup', true);
      
      // Navigation vers l'étape de connexion des plateformes
      navigate('/platform-connections');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      setErrors({ submit: 'Erreur lors de la sauvegarde. Veuillez réessayer.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/onboarding');
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  return (
    <SintraBackground>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          py: 4,
          position: 'relative',
          zIndex: 1
        }}
      >
        <Container maxWidth="md">
          {/* En-tête */}
          <Fade in={true} timeout={1000}>
            <Box sx={{ textAlign: 'center', mb: 6 }}>
              <Slide in={true} direction="down" timeout={1500}>
                <Paper
                  elevation={0}
                  sx={{
                    background: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 4,
                    p: 4,
                    mb: 4,
                    textAlign: 'center'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                    <AgentAvatar agentType="marketing" size={120} showPulse={true} />
                  </Box>
                  
                  <Typography
                    variant="h3"
                    sx={{
                      color: '#000000',
                      fontWeight: 700,
                      mb: 2,
                      textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    Configuration de votre marque
                  </Typography>
                  
                  <Chip
                    icon={<Star />}
                    label="Powered by AI"
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      fontWeight: 600,
                      mb: 3
                    }}
                  />
                  
                  <Typography
                    variant="h6"
                    sx={{
                      color: '#333333',
                      fontWeight: 400
                    }}
                  >
                    Parlez-nous de votre entreprise pour personnaliser votre expérience
                  </Typography>
                </Paper>
              </Slide>
            </Box>
          </Fade>

          {/* Formulaire principal */}
          <Fade in={true} timeout={2000}>
            <Card
              sx={{
                mb: 4,
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 4,
                overflow: 'visible'
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Grid container spacing={3}>
                  {/* Nom de l'entreprise */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Nom de votre entreprise"
                      value={formData.businessName}
                      onChange={(e) => handleInputChange('businessName', e.target.value)}
                      error={!!errors.businessName}
                      helperText={errors.businessName}
                      InputProps={{
                        startAdornment: <Business sx={{ mr: 1, color: '#666666' }} />
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          backdropFilter: 'blur(10px)',
                          borderRadius: 2,
                          '& fieldset': {
                            borderColor: 'rgba(255,255,255,0.3)'
                          },
                          '&:hover fieldset': {
                            borderColor: 'rgba(255,255,255,0.5)'
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#0ea5e9'
                          }
                        },
                        '& .MuiInputLabel-root': {
                          color: '#333333'
                        },
                        '& .MuiOutlinedInput-input': {
                          color: '#000000'
                        },
                        '& .MuiFormHelperText-root': {
                          color: '#666666'
                        }
                      }}
                    />
                  </Grid>

                  {/* Type d'entreprise */}
                  <Grid item xs={12} sm={6}>
                    <FormControl 
                      fullWidth 
                      error={!!errors.businessType}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          backdropFilter: 'blur(10px)',
                          borderRadius: 2,
                          '& fieldset': {
                            borderColor: 'rgba(255,255,255,0.3)'
                          },
                          '&:hover fieldset': {
                            borderColor: 'rgba(255,255,255,0.5)'
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#0ea5e9'
                          }
                        },
                        '& .MuiInputLabel-root': {
                          color: '#333333'
                        },
                        '& .MuiSelect-select': {
                          color: '#000000'
                        }
                      }}
                    >
                      <InputLabel>Type d'entreprise</InputLabel>
                      <Select
                        value={formData.businessType}
                        onChange={(e) => handleInputChange('businessType', e.target.value)}
                        label="Type d'entreprise"
                      >
                        <MenuItem value="ecommerce">E-commerce</MenuItem>
                        <MenuItem value="retail">Commerce de détail</MenuItem>
                        <MenuItem value="service">Services</MenuItem>
                        <MenuItem value="manufacturing">Fabrication</MenuItem>
                        <MenuItem value="technology">Technologie</MenuItem>
                        <MenuItem value="consulting">Conseil</MenuItem>
                        <MenuItem value="other">Autre</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Âge de l'entreprise */}
                  <Grid item xs={12} sm={6}>
                    <FormControl 
                      fullWidth 
                      error={!!errors.businessAge}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          backdropFilter: 'blur(10px)',
                          borderRadius: 2,
                          '& fieldset': {
                            borderColor: 'rgba(255,255,255,0.3)'
                          },
                          '&:hover fieldset': {
                            borderColor: 'rgba(255,255,255,0.5)'
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#0ea5e9'
                          }
                        },
                        '& .MuiInputLabel-root': {
                          color: '#333333'
                        },
                        '& .MuiSelect-select': {
                          color: '#000000'
                        }
                      }}
                    >
                      <InputLabel>Âge de l'entreprise</InputLabel>
                      <Select
                        value={formData.businessAge}
                        onChange={(e) => handleInputChange('businessAge', e.target.value)}
                        label="Âge de l'entreprise"
                      >
                        <MenuItem value="startup">Startup (0-2 ans)</MenuItem>
                        <MenuItem value="young">Jeune entreprise (2-5 ans)</MenuItem>
                        <MenuItem value="established">Établie (5-10 ans)</MenuItem>
                        <MenuItem value="mature">Mature (10+ ans)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Marché cible */}
                  <Grid item xs={12}>
                    <FormControl 
                      fullWidth 
                      error={!!errors.targetMarket}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          backdropFilter: 'blur(10px)',
                          borderRadius: 2,
                          '& fieldset': {
                            borderColor: 'rgba(255,255,255,0.3)'
                          },
                          '&:hover fieldset': {
                            borderColor: 'rgba(255,255,255,0.5)'
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#0ea5e9'
                          }
                        },
                        '& .MuiInputLabel-root': {
                          color: '#333333'
                        },
                        '& .MuiSelect-select': {
                          color: '#000000'
                        }
                      }}
                    >
                      <InputLabel>Marché cible principal</InputLabel>
                      <Select
                        value={formData.targetMarket}
                        onChange={(e) => handleInputChange('targetMarket', e.target.value)}
                        label="Marché cible principal"
                      >
                        <MenuItem value="local">Local</MenuItem>
                        <MenuItem value="national">National</MenuItem>
                        <MenuItem value="international">International</MenuItem>
                        <MenuItem value="b2b">B2B</MenuItem>
                        <MenuItem value="b2c">B2C</MenuItem>
                        <MenuItem value="both">B2B et B2C</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Description de l'entreprise */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="Description de votre entreprise"
                      value={formData.businessDescription}
                      onChange={(e) => handleInputChange('businessDescription', e.target.value)}
                      error={!!errors.businessDescription}
                      helperText={errors.businessDescription || "Décrivez votre activité, vos produits/services, et ce qui vous différencie"}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          backdropFilter: 'blur(10px)',
                          borderRadius: 2,
                          '& fieldset': {
                            borderColor: 'rgba(255,255,255,0.3)'
                          },
                          '&:hover fieldset': {
                            borderColor: 'rgba(255,255,255,0.5)'
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#0ea5e9'
                          }
                        },
                        '& .MuiInputLabel-root': {
                          color: '#333333'
                        },
                        '& .MuiOutlinedInput-input': {
                          color: '#000000'
                        },
                        '& .MuiFormHelperText-root': {
                          color: '#666666'
                        }
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Fade>

          {/* Boutons d'action */}
          <Slide in={true} direction="up" timeout={2500}>
            <Card
              sx={{
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 4
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<ArrowBack />}
                      onClick={handleBack}
                      sx={{
                        borderColor: '#333333',
                        color: '#000000',
                        '&:hover': {
                          borderColor: '#000000',
                          backgroundColor: 'rgba(0,0,0,0.1)'
                        }
                      }}
                    >
                      Retour
                    </Button>
                    
                    <Button
                      variant="text"
                      onClick={handleLogout}
                      sx={{
                        color: '#666666',
                        '&:hover': {
                          backgroundColor: 'rgba(0,0,0,0.1)',
                          color: '#000000'
                        }
                      }}
                    >
                      Déconnexion
                    </Button>
                  </Box>
                  
                  <Button
                    variant="contained"
                    endIcon={<ArrowForward />}
                    onClick={handleSubmit}
                    disabled={isLoading}
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      fontWeight: 600,
                      px: 4,
                      py: 1.5,
                      borderRadius: 2,
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 10px 25px rgba(102, 126, 234, 0.4)'
                      },
                      '&:disabled': {
                        background: 'rgba(0,0,0,0.2)',
                        color: 'rgba(0,0,0,0.5)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {isLoading ? 'Sauvegarde...' : 'Continuer'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Slide>
        </Container>
      </Box>
    </SintraBackground>
  );
};

export default BrandSetup;