import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Alert,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

const DocumentationFixer = ({ user }) => {
  const [brokenLinks, setBrokenLinks] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [editingLink, setEditingLink] = useState(null);
  const [newUrl, setNewUrl] = useState('');
  const [fixedLinks, setFixedLinks] = useState([]);

  // Simulated broken links found in documentation
  const mockBrokenLinks = [
    {
      id: 1,
      text: 'Guide d\'installation',
      originalUrl: 'https://docs.commerceai-pro.com/installation',
      location: 'README.md:15',
      status: 'broken',
      suggestedFix: 'https://help.commerceai-pro.com/getting-started/installation'
    },
    {
      id: 2,
      text: 'API Documentation',
      originalUrl: 'https://api-docs.commerceai-pro.com',
      location: 'api-gateway/README.md:42',
      status: 'broken',
      suggestedFix: 'https://docs.commerceai-pro.com/api'
    },
    {
      id: 3,
      text: 'Configuration des agents',
      originalUrl: 'https://docs.commerceai-pro.com/agents/config',
      location: 'agents/README.md:28',
      status: 'broken',
      suggestedFix: 'https://help.commerceai-pro.com/agents/configuration'
    },
    {
      id: 4,
      text: 'Guide de déploiement',
      originalUrl: 'https://deploy.commerceai-pro.com',
      location: 'GUIDE-DEPLOIEMENT.md:5',
      status: 'broken',
      suggestedFix: 'https://docs.commerceai-pro.com/deployment'
    },
    {
      id: 5,
      text: 'Troubleshooting',
      originalUrl: 'https://support.commerceai-pro.com/troubleshooting',
      location: 'docs/TROUBLESHOOTING.md:1',
      status: 'broken',
      suggestedFix: 'https://help.commerceai-pro.com/troubleshooting'
    }
  ];

  useEffect(() => {
    // Auto-scan on component mount
    scanForBrokenLinks();
  }, []);

  const scanForBrokenLinks = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setBrokenLinks([]);

    // Simulate scanning process
    for (let i = 0; i <= 100; i += 10) {
      setScanProgress(i);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Set mock broken links
    setBrokenLinks(mockBrokenLinks);
    setIsScanning(false);
  };

  const fixLink = async (linkId, newUrl) => {
    try {
      // Simulate API call to fix the link
      const response = await fetch('/api/admin/fix-documentation-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          linkId,
          newUrl
        })
      });

      if (response.ok) {
        // Update local state
        setBrokenLinks(prev => prev.map(link => 
          link.id === linkId 
            ? { ...link, status: 'fixed', fixedUrl: newUrl }
            : link
        ));
        setFixedLinks(prev => [...prev, linkId]);
        setEditingLink(null);
        setNewUrl('');
      }
    } catch (error) {
      console.error('Error fixing link:', error);
    }
  };

  const handleEditLink = (link) => {
    setEditingLink(link.id);
    setNewUrl(link.suggestedFix || link.originalUrl);
  };

  const handleSaveLink = () => {
    if (editingLink && newUrl.trim()) {
      fixLink(editingLink, newUrl.trim());
    }
  };

  const handleCancelEdit = () => {
    setEditingLink(null);
    setNewUrl('');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'broken': return 'error';
      case 'fixed': return 'success';
      case 'checking': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'broken': return <LinkOffIcon />;
      case 'fixed': return <CheckIcon />;
      case 'checking': return <RefreshIcon />;
      default: return <LinkIcon />;
    }
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          🔗 Correcteur de Documentation
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Détection et correction automatique des liens cassés dans la documentation
        </Typography>
      </Box>

      {/* Scan Controls */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">
            Analyse des liens
          </Typography>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={scanForBrokenLinks}
            disabled={isScanning}
          >
            {isScanning ? 'Analyse en cours...' : 'Relancer l\'analyse'}
          </Button>
        </Box>

        {isScanning && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Analyse en cours... {scanProgress}%
            </Typography>
            <LinearProgress variant="determinate" value={scanProgress} />
          </Box>
        )}

        {!isScanning && brokenLinks.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {brokenLinks.filter(link => link.status === 'broken').length} liens cassés détectés
          </Alert>
        )}

        {!isScanning && brokenLinks.length === 0 && (
          <Alert severity="success">
            Aucun lien cassé détecté ! 🎉
          </Alert>
        )}
      </Paper>

      {/* Broken Links List */}
      {brokenLinks.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Liens à corriger
          </Typography>
          
          <List>
            {brokenLinks.map((link) => (
              <ListItem
                key={link.id}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1,
                  backgroundColor: link.status === 'fixed' ? 'success.light' : 'background.paper'
                }}
              >
                <ListItemIcon>
                  {getStatusIcon(link.status)}
                </ListItemIcon>
                
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1">
                        {link.text}
                      </Typography>
                      <Chip 
                        label={link.status === 'broken' ? 'Cassé' : 'Corrigé'} 
                        color={getStatusColor(link.status)}
                        size="small"
                      />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        📍 {link.location}
                      </Typography>
                      <Typography variant="body2" color="error.main" sx={{ mt: 0.5 }}>
                        ❌ {link.originalUrl}
                      </Typography>
                      {link.status === 'fixed' && link.fixedUrl && (
                        <Typography variant="body2" color="success.main" sx={{ mt: 0.5 }}>
                          ✅ {link.fixedUrl}
                        </Typography>
                      )}
                      {link.status === 'broken' && link.suggestedFix && (
                        <Typography variant="body2" color="info.main" sx={{ mt: 0.5 }}>
                          💡 Suggestion: {link.suggestedFix}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                
                {link.status === 'broken' && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Corriger le lien">
                      <IconButton
                        color="primary"
                        onClick={() => handleEditLink(link)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    {link.suggestedFix && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => fixLink(link.id, link.suggestedFix)}
                      >
                        Appliquer la suggestion
                      </Button>
                    )}
                  </Box>
                )}
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Edit Link Dialog */}
      <Dialog open={!!editingLink} onClose={handleCancelEdit} maxWidth="md" fullWidth>
        <DialogTitle>
          Corriger le lien
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Nouvelle URL"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelEdit} startIcon={<CancelIcon />}>
            Annuler
          </Button>
          <Button 
            onClick={handleSaveLink} 
            variant="contained" 
            startIcon={<SaveIcon />}
            disabled={!newUrl.trim()}
          >
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>

      {/* Summary */}
      {fixedLinks.length > 0 && (
        <Paper sx={{ p: 3, mt: 3, backgroundColor: 'success.light' }}>
          <Typography variant="h6" gutterBottom>
            ✅ Corrections appliquées
          </Typography>
          <Typography variant="body2">
            {fixedLinks.length} lien(s) corrigé(s) avec succès.
            Les modifications ont été appliquées aux fichiers de documentation.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default DocumentationFixer;