const SwaggerParser = require('@apidevtools/swagger-parser');
const path = require('path');

async function validateSwagger() {
  try {
    const swaggerPath = path.join(__dirname, 'swagger.yaml');
    console.log('🔍 Validation de la spécification OpenAPI...');
    
    const api = await SwaggerParser.validate(swaggerPath);
    
    console.log('✅ Spécification OpenAPI valide!');
    console.log(`📋 API: ${api.info.title} v${api.info.version}`);
    console.log(`📝 Description: ${api.info.description?.split('\n')[0] || 'Aucune description'}`);
    console.log(`🔗 Serveurs: ${api.servers?.length || 0} configuré(s)`);
    console.log(`📚 Endpoints: ${Object.keys(api.paths || {}).length} défini(s)`);
    console.log(`🏷️  Schémas: ${Object.keys(api.components?.schemas || {}).length} défini(s)`);
    
    // Afficher les endpoints
    if (api.paths) {
      console.log('\n📍 Endpoints disponibles:');
      Object.keys(api.paths).forEach(path => {
        const methods = Object.keys(api.paths[path]).filter(method => 
          ['get', 'post', 'put', 'delete', 'patch'].includes(method)
        );
        console.log(`  ${path} [${methods.join(', ').toUpperCase()}]`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur de validation de la spécification OpenAPI:');
    console.error(error.message);
    
    if (error.details) {
      console.error('\n📋 Détails de l\'erreur:');
      error.details.forEach((detail, index) => {
        console.error(`  ${index + 1}. ${detail.message}`);
        if (detail.path) {
          console.error(`     Chemin: ${detail.path}`);
        }
      });
    }
    
    process.exit(1);
  }
}

validateSwagger();