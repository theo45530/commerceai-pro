# Guide de Configuration OAuth pour CommerceAI Pro

Ce guide vous explique comment configurer les vraies connexions OAuth pour toutes les plateformes supportées.

## Configuration Générale

1. Copiez le fichier `.env.example` vers `.env`:
   ```bash
   cp .env.example .env
   ```

2. Remplissez vos vraies clés API dans le fichier `.env`

## Configuration par Plateforme

### 1. Meta/Facebook Ads

**Étapes:**
1. Allez sur [Facebook Developers](https://developers.facebook.com/)
2. Créez une nouvelle application
3. Ajoutez le produit "Facebook Login"
4. Configurez les URI de redirection:
   - `http://localhost:4000/api/auth/oauth/callback/meta`
5. Notez votre App ID et App Secret

**Variables .env:**
```
META_CLIENT_ID=votre_app_id_meta
META_CLIENT_SECRET=votre_app_secret_meta
```

### 2. Instagram

**Étapes:**
1. Utilisez la même app Facebook que ci-dessus
2. Ajoutez le produit "Instagram Basic Display"
3. Configurez les URI de redirection:
   - `http://localhost:4000/api/auth/oauth/callback/instagram`

**Variables .env:**
```
INSTAGRAM_CLIENT_ID=votre_client_id_instagram
INSTAGRAM_CLIENT_SECRET=votre_client_secret_instagram
```

### 3. Shopify

**Étapes:**
1. Allez sur [Shopify Partners](https://partners.shopify.com/)
2. Créez une nouvelle application
3. Configurez l'URL de redirection:
   - `http://localhost:4000/api/auth/oauth/callback/shopify`
4. Notez votre API Key et Secret Key

**Variables .env:**
```
SHOPIFY_CLIENT_ID=votre_api_key_shopify
SHOPIFY_CLIENT_SECRET=votre_secret_key_shopify
SHOPIFY_SHOP_DOMAIN=votre-boutique.myshopify.com
```

### 4. TikTok Ads

**Étapes:**
1. Allez sur [TikTok for Business](https://ads.tiktok.com/marketing_api/)
2. Créez une nouvelle application
3. Configurez l'URL de redirection:
   - `http://localhost:4000/api/auth/oauth/callback/tiktok_ads`

**Variables .env:**
```
TIKTOK_ADS_CLIENT_ID=votre_app_id_tiktok_ads
TIKTOK_ADS_CLIENT_SECRET=votre_secret_tiktok_ads
```

### 5. TikTok

**Étapes:**
1. Allez sur [TikTok Developers](https://developers.tiktok.com/)
2. Créez une nouvelle application
3. Configurez l'URL de redirection:
   - `http://localhost:4000/api/auth/oauth/callback/tiktok`

**Variables .env:**
```
TIKTOK_CLIENT_ID=votre_client_key_tiktok
TIKTOK_CLIENT_SECRET=votre_client_secret_tiktok
```

### 6. Gmail/Google

**Étapes:**
1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un existant
3. Activez l'API Gmail
4. Créez des identifiants OAuth 2.0
5. Configurez l'URI de redirection:
   - `http://localhost:4000/api/auth/oauth/callback/gmail`

**Variables .env:**
```
GOOGLE_CLIENT_ID=votre_client_id_google
GOOGLE_CLIENT_SECRET=votre_client_secret_google
```

### 7. WhatsApp Business

**Étapes:**
1. Utilisez la même app Facebook que pour Meta
2. Ajoutez le produit "WhatsApp Business API"
3. Configurez l'URL de redirection:
   - `http://localhost:4000/api/auth/oauth/callback/whatsapp`

**Variables .env:**
```
WHATSAPP_CLIENT_ID=votre_app_id_whatsapp
WHATSAPP_CLIENT_SECRET=votre_app_secret_whatsapp
```

## Test des Connexions

1. Redémarrez le serveur après avoir configuré les variables d'environnement:
   ```bash
   cd api-gateway
   npm start
   ```

2. Allez sur `http://localhost:3001/settings`

3. Cliquez sur "Connecter" pour chaque plateforme

4. Vous serez redirigé vers la vraie page d'autorisation de chaque plateforme

5. Après autorisation, vous serez redirigé vers l'application avec le compte connecté

## Dépannage

- **Erreur "Unsupported platform"**: Vérifiez que la plateforme est bien supportée
- **Erreur de redirection**: Vérifiez que les URLs de redirection sont correctement configurées
- **Erreur de token**: Vérifiez vos clés API et secrets
- **Erreur de domaine**: Pour Shopify, vérifiez que `SHOPIFY_SHOP_DOMAIN` est correct

## Sécurité

- Ne jamais commiter le fichier `.env` dans votre repository
- Utilisez des environnements séparés pour le développement et la production
- Régénérez vos clés API si elles sont compromises
- Utilisez HTTPS en production

## Support

Si vous rencontrez des problèmes, vérifiez:
1. Les logs du serveur dans le terminal
2. La console du navigateur pour les erreurs frontend
3. Que toutes les variables d'environnement sont correctement définies