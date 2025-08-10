import React, { useState } from 'react';
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
  Container,
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
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

export default function CustomerService() {
  const [customerMessage, setCustomerMessage] = useState('');
  const [platform, setPlatform] = useState('email');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const result = await axios.post('/api/agents/customer-service/response', {
        message: customerMessage,
        platform,
        context,
      });
      setResponse(result.data);
    } catch (err) {
      console.error('Error generating customer service response:', err);
      setError(err.response?.data?.message || 'Failed to generate response');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <Container maxWidth="xl">
        <HeaderCard>
          <Box display="flex" alignItems="center" gap={3}>
            <HumanAvatar3D agentType="customer-service" size={80} />
            <Box>
              <Typography variant="h4" gutterBottom sx={{ color: '#ffffff', fontWeight: 600 }}>
                Agent Service Client IA
              </Typography>
              <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Générez des réponses IA pour les demandes de service client
              </Typography>
            </Box>
          </Box>
        </HeaderCard>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <StyledCard>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Customer Inquiry
              </Typography>
              <form onSubmit={handleSubmit}>
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel id="platform-label">Platform</InputLabel>
                  <Select
                    labelId="platform-label"
                    value={platform}
                    label="Platform"
                    onChange={(e) => setPlatform(e.target.value)}
                    disabled={loading}
                  >
                    <MenuItem value="email">Email</MenuItem>
                    <MenuItem value="chat">Live Chat</MenuItem>
                    <MenuItem value="social">Social Media</MenuItem>
                    <MenuItem value="review">Product Review</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Customer Message"
                  multiline
                  rows={4}
                  value={customerMessage}
                  onChange={(e) => setCustomerMessage(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />

                <TextField
                  fullWidth
                  label="Additional Context (Optional)"
                  multiline
                  rows={2}
                  placeholder="Order details, customer history, etc."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  disabled={loading}
                  sx={{ mb: 3 }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                  disabled={loading || !customerMessage}
                >
                  Generate Response
                </Button>
              </form>
            </CardContent>
            </StyledCard>
          </Grid>

          <Grid item xs={12} md={6}>
            <StyledCard sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                AI Response
              </Typography>
              
              {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              )}
              
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              
              {response && (
                <Box>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', mb: 2 }}>
                    <Typography variant="body1">
                      {response.response}
                    </Typography>
                  </Paper>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Response Metrics:
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Tone: {response.metrics?.tone || 'Professional'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Sentiment: {response.metrics?.sentiment || 'Positive'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        Response Time: {response.metrics?.responseTime || '2 seconds'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}
              
              {!loading && !error && !response && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                  <Typography variant="body2" color="text.secondary">
                    Generated response will appear here
                  </Typography>
                </Box>
              )}
            </CardContent>
            </StyledCard>
          </Grid>
        </Grid>
      </Container>
    </PageContainer>
  );
}