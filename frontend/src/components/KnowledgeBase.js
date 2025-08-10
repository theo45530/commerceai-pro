import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  CardActions,
  Breadcrumbs,
  Link,
  Alert,
  CircularProgress,
  Rating,
  Divider,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Article as ArticleIcon,
  Category as CategoryIcon,
  Help as HelpIcon,
  Star as StarIcon,
  Visibility as ViewIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const KnowledgeBase = ({ user }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [popularArticles, setPopularArticles] = useState([]);
  const [recentArticles, setRecentArticles] = useState([]);

  // FAQ data structure
  const faqData = {
    'getting-started': {
      title: 'Premiers pas',
      icon: '🚀',
      articles: [
        {
          id: 'setup-account',
          title: 'Comment configurer mon compte ?',
          content: `Pour configurer votre compte CommerceAI Pro :

1. **Inscription** : Créez votre compte avec votre email professionnel
2. **Vérification** : Confirmez votre email via le lien reçu
3. **Configuration de l'organisation** : Renseignez les informations de votre entreprise
4. **Connexion des plateformes** : Connectez vos comptes (Facebook, Google Ads, Shopify, etc.)
5. **Configuration des agents IA** : Personnalisez vos agents selon vos besoins

💡 **Conseil** : Commencez par connecter une seule plateforme pour vous familiariser avec l'interface.`,
          tags: ['compte', 'configuration', 'démarrage'],
          helpful: 45,
          notHelpful: 3,
          views: 234
        },
        {
          id: 'connect-platforms',
          title: 'Comment connecter mes plateformes publicitaires ?',
          content: `Pour connecter vos plateformes :

**Facebook/Meta :**
1. Allez dans Paramètres > Connexions
2. Cliquez sur "Connecter Facebook"
3. Autorisez l'accès à vos comptes publicitaires
4. Sélectionnez les comptes à synchroniser

**Google Ads :**
1. Cliquez sur "Connecter Google Ads"
2. Connectez-vous avec votre compte Google
3. Autorisez l'accès à Google Ads
4. Sélectionnez vos comptes

**Shopify :**
1. Entrez l'URL de votre boutique
2. Installez l'application CommerceAI
3. Autorisez les permissions nécessaires

⚠️ **Important** : Assurez-vous d'avoir les droits administrateur sur ces comptes.`,
          tags: ['plateformes', 'connexion', 'facebook', 'google', 'shopify'],
          helpful: 67,
          notHelpful: 5,
          views: 189
        }
      ]
    },
    'ai-agents': {
      title: 'Agents IA',
      icon: '🤖',
      articles: [
        {
          id: 'agent-types',
          title: 'Quels sont les différents types d\'agents IA ?',
          content: `CommerceAI Pro propose plusieurs agents spécialisés :

**🎯 Agent d'Analyse**
- Analyse des performances publicitaires
- Recommandations d'optimisation
- Rapports détaillés

**✍️ Agent de Génération de Contenu**
- Création de textes publicitaires
- Génération d'images
- Adaptation multi-plateforme

**📧 Agent Email Marketing**
- Campagnes automatisées
- Segmentation intelligente
- A/B testing

**🛒 Agent E-commerce**
- Optimisation des fiches produits
- Gestion des stocks
- Recommandations de prix

**💬 Agent Service Client**
- Réponses automatiques
- Escalade intelligente
- Support multicanal`,
          tags: ['agents', 'types', 'fonctionnalités'],
          helpful: 89,
          notHelpful: 2,
          views: 456
        },
        {
          id: 'customize-agents',
          title: 'Comment personnaliser mes agents IA ?',
          content: `Pour personnaliser vos agents :

**1. Configuration de base**
- Nom et description de l'agent
- Objectifs spécifiques
- Ton de communication

**2. Paramètres avancés**
- Seuils de performance
- Fréquence d'exécution
- Règles métier spécifiques

**3. Intégrations**
- Connexion aux plateformes
- Webhooks personnalisés
- API externes

**4. Formation**
- Données d'entraînement
- Exemples de bonnes pratiques
- Feedback continu

🔧 **Astuce** : Commencez avec les paramètres par défaut puis ajustez selon vos résultats.`,
          tags: ['personnalisation', 'configuration', 'paramètres'],
          helpful: 34,
          notHelpful: 1,
          views: 123
        }
      ]
    },
    'billing': {
      title: 'Facturation',
      icon: '💳',
      articles: [
        {
          id: 'plans-pricing',
          title: 'Quels sont les différents plans tarifaires ?',
          content: `Nos plans tarifaires :

**🆓 Plan Gratuit**
- 1 000 requêtes IA/mois
- 2 agents IA
- Support email
- Intégrations de base

**🚀 Plan Starter (29€/mois)**
- 10 000 requêtes IA/mois
- 5 agents IA
- Support prioritaire
- Toutes les intégrations
- Analytics avancés

**💼 Plan Professional (99€/mois)**
- 50 000 requêtes IA/mois
- Agents illimités
- Support 24/7
- API complète
- Webhooks
- Multi-utilisateurs

**🏢 Plan Enterprise (sur devis)**
- Requêtes illimitées
- Infrastructure dédiée
- Support dédié
- Conformité avancée
- Intégrations sur mesure`,
          tags: ['plans', 'tarifs', 'pricing'],
          helpful: 78,
          notHelpful: 4,
          views: 567
        },
        {
          id: 'upgrade-plan',
          title: 'Comment changer de plan ?',
          content: `Pour changer de plan :

**Mise à niveau :**
1. Allez dans Paramètres > Abonnement
2. Sélectionnez le nouveau plan
3. Confirmez le paiement
4. Les nouvelles fonctionnalités sont activées immédiatement

**Rétrogradation :**
1. Contactez le support
2. La rétrogradation prend effet au prochain cycle
3. Vos données restent sauvegardées

**Annulation :**
1. Paramètres > Abonnement > Annuler
2. Accès maintenu jusqu'à la fin de la période
3. Possibilité de réactiver à tout moment

💡 **Note** : Aucune pénalité pour les changements de plan.`,
          tags: ['changement', 'upgrade', 'annulation'],
          helpful: 23,
          notHelpful: 0,
          views: 89
        }
      ]
    },
    'troubleshooting': {
      title: 'Dépannage',
      icon: '🔧',
      articles: [
        {
          id: 'connection-issues',
          title: 'Problèmes de connexion aux plateformes',
          content: `Solutions aux problèmes de connexion :

**Erreur d'authentification :**
- Vérifiez vos identifiants
- Réautorisez l'application
- Vérifiez les permissions

**Données non synchronisées :**
- Forcez la synchronisation
- Vérifiez la connexion internet
- Contactez le support si le problème persiste

**Accès refusé :**
- Vérifiez vos droits administrateur
- Révoquez et reconnectez l'accès
- Vérifiez les restrictions de compte

**Synchronisation lente :**
- Normal pour les gros volumes
- Vérifiez les limites API
- Planifiez les synchronisations

🆘 **Support** : Si le problème persiste, contactez notre équipe avec les détails de l'erreur.`,
          tags: ['connexion', 'synchronisation', 'erreurs'],
          helpful: 56,
          notHelpful: 8,
          views: 234
        }
      ]
    }
  };

  useEffect(() => {
    loadKnowledgeBase();
  }, []);

  const loadKnowledgeBase = () => {
    // Convert FAQ data to articles format
    const allArticles = [];
    const categoryList = [];
    
    Object.entries(faqData).forEach(([categoryId, category]) => {
      categoryList.push({
        id: categoryId,
        name: category.title,
        icon: category.icon,
        count: category.articles.length
      });
      
      category.articles.forEach(article => {
        allArticles.push({
          ...article,
          category: categoryId,
          categoryName: category.title,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date in last 30 days
        });
      });
    });
    
    setArticles(allArticles);
    setCategories(categoryList);
    
    // Set popular and recent articles
    setPopularArticles(allArticles.sort((a, b) => b.views - a.views).slice(0, 5));
    setRecentArticles(allArticles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5));
  };

  const searchArticles = async (query) => {
    if (!query.trim()) {
      loadKnowledgeBase();
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const filtered = articles.filter(article => 
        article.title.toLowerCase().includes(query.toLowerCase()) ||
        article.content.toLowerCase().includes(query.toLowerCase()) ||
        article.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );
      
      setArticles(filtered);
    } catch (error) {
      setError('Erreur lors de la recherche');
    } finally {
      setIsLoading(false);
    }
  };

  const rateArticle = async (articleId, helpful) => {
    try {
      // Simulate API call
      const response = await fetch(`/api/support/kb/articles/${articleId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({ helpful })
      });
      
      if (response.ok) {
        // Update local state
        setArticles(prev => prev.map(article => {
          if (article.id === articleId) {
            return {
              ...article,
              helpful: helpful ? article.helpful + 1 : article.helpful,
              notHelpful: !helpful ? article.notHelpful + 1 : article.notHelpful
            };
          }
          return article;
        }));
      }
    } catch (error) {
      console.error('Error rating article:', error);
    }
  };

  const filteredArticles = selectedCategory === 'all' 
    ? articles 
    : articles.filter(article => article.category === selectedCategory);

  const renderArticleCard = (article) => (
    <Card key={article.id} sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              {article.title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Chip 
                label={article.categoryName} 
                size="small" 
                sx={{ mr: 1 }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                <ViewIcon sx={{ fontSize: 16, mr: 0.5 }} />
                <Typography variant="caption">{article.views}</Typography>
                <TimeIcon sx={{ fontSize: 16, ml: 1, mr: 0.5 }} />
                <Typography variant="caption">
                  {formatDistanceToNow(new Date(article.createdAt), { 
                    addSuffix: true, 
                    locale: fr 
                  })}
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {article.content.substring(0, 150)}...
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {article.tags.map(tag => (
                <Chip key={tag} label={tag} size="small" variant="outlined" />
              ))}
            </Box>
          </Box>
        </Box>
      </CardContent>
      <CardActions>
        <Button 
          size="small" 
          onClick={() => setSelectedArticle(article)}
          startIcon={<ArticleIcon />}
        >
          Lire l'article
        </Button>
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
          <IconButton 
            size="small" 
            onClick={() => rateArticle(article.id, true)}
            color="success"
          >
            <ThumbUpIcon fontSize="small" />
          </IconButton>
          <Typography variant="caption" sx={{ mx: 0.5 }}>
            {article.helpful}
          </Typography>
          <IconButton 
            size="small" 
            onClick={() => rateArticle(article.id, false)}
            color="error"
          >
            <ThumbDownIcon fontSize="small" />
          </IconButton>
          <Typography variant="caption" sx={{ ml: 0.5 }}>
            {article.notHelpful}
          </Typography>
        </Box>
      </CardActions>
    </Card>
  );

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          📚 Base de Connaissances
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Trouvez rapidement les réponses à vos questions
        </Typography>
      </Box>

      {/* Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Rechercher dans la base de connaissances..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            searchArticles(e.target.value);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Sidebar */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Catégories
            </Typography>
            <List>
              <ListItemButton
                selected={selectedCategory === 'all'}
                onClick={() => setSelectedCategory('all')}
              >
                <ListItemText 
                  primary="Toutes les catégories" 
                  secondary={`${articles.length} articles`}
                />
              </ListItemButton>
              {categories.map(category => (
                <ListItemButton
                  key={category.id}
                  selected={selectedCategory === category.id}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <ListItemText 
                    primary={`${category.icon} ${category.name}`}
                    secondary={`${category.count} articles`}
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Main content */}
        <Grid item xs={12} md={9}>
          {!searchQuery && (
            <Box sx={{ mb: 3 }}>
              <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                <Tab label="Articles populaires" />
                <Tab label="Articles récents" />
              </Tabs>
              
              {tabValue === 0 && (
                <Box sx={{ mt: 2 }}>
                  {popularArticles.map(renderArticleCard)}
                </Box>
              )}
              
              {tabValue === 1 && (
                <Box sx={{ mt: 2 }}>
                  {recentArticles.map(renderArticleCard)}
                </Box>
              )}
            </Box>
          )}

          {searchQuery && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Résultats de recherche ({filteredArticles.length})
              </Typography>
              {isLoading ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : filteredArticles.length === 0 ? (
                <Alert severity="info">
                  Aucun article trouvé pour "<strong>{searchQuery}</strong>"
                </Alert>
              ) : (
                filteredArticles.map(renderArticleCard)
              )}
            </Box>
          )}
        </Grid>
      </Grid>

      {/* Article Dialog */}
      <Dialog 
        open={!!selectedArticle} 
        onClose={() => setSelectedArticle(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedArticle && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6">
                  {selectedArticle.title}
                </Typography>
                <Chip label={selectedArticle.categoryName} />
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {selectedArticle.views} vues • 
                  {formatDistanceToNow(new Date(selectedArticle.createdAt), { 
                    addSuffix: true, 
                    locale: fr 
                  })}
                </Typography>
              </Box>
              
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line', mb: 3 }}>
                {selectedArticle.content}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2">
                  Cet article vous a-t-il été utile ?
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Button
                    startIcon={<ThumbUpIcon />}
                    onClick={() => rateArticle(selectedArticle.id, true)}
                    color="success"
                  >
                    Oui ({selectedArticle.helpful})
                  </Button>
                  <Button
                    startIcon={<ThumbDownIcon />}
                    onClick={() => rateArticle(selectedArticle.id, false)}
                    color="error"
                  >
                    Non ({selectedArticle.notHelpful})
                  </Button>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedArticle(null)}>
                Fermer
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default KnowledgeBase;