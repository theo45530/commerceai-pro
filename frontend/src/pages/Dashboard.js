import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bot,
  Megaphone,
  Mail,
  BarChart3,
  Globe,
  PenTool,
  Settings,
  Bell,
  User,
  ArrowRight,
  Activity,
  Users,
  DollarSign,
  ShoppingCart
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AnimatedBackground from '../components/AnimatedBackground';
import AgentAvatar3D from '../components/AgentAvatar3D';

// Configuration des agents
const agentConfigs = {
  'customer-service': {
    name: 'Agent SAV',
    description: 'Support client intelligent 24/7',
    icon: Bot,
    color: 'from-blue-500 to-purple-600',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20'
  },
  'advertising': {
    name: 'Agent Publicité',
    description: 'Campagnes publicitaires optimisées',
    icon: Megaphone,
    color: 'from-pink-500 to-red-500',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/20'
  },
  'email': {
    name: 'Agent Email',
    description: 'Marketing par email personnalisé',
    icon: Mail,
    color: 'from-cyan-500 to-blue-500',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20'
  },
  'analysis': {
    name: 'Agent Analyse',
    description: 'Analytics et insights avancés',
    icon: BarChart3,
    color: 'from-green-500 to-teal-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20'
  },
  'page-generator': {
    name: 'Générateur de Pages',
    description: 'Pages web optimisées automatiquement',
    icon: Globe,
    color: 'from-orange-500 to-yellow-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20'
  },
  'content-creator': {
    name: 'Créateur de Contenu',
    description: 'Contenu engageant et optimisé SEO',
    icon: PenTool,
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20'
  }
};

// Statistiques du dashboard
const dashboardStats = [
  {
    title: 'Revenus',
    value: '€24,580',
    change: '+12.5%',
    icon: DollarSign,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10'
  },
  {
    title: 'Commandes',
    value: '1,247',
    change: '+8.2%',
    icon: ShoppingCart,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10'
  },
  {
    title: 'Visiteurs',
    value: '12,847',
    change: '+15.3%',
    icon: Users,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10'
  },
  {
    title: 'Conversion',
    value: '3.2%',
    change: '+0.8%',
    icon: Activity,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10'
  }
];

// Configuration des cartes d'agents
const agentCards = [
  {
    id: 'customer-service',
    title: 'Service Client IA',
    description: 'Support client intelligent 24/7 avec IA conversationnelle',
    path: '/agents/customer-service',
    stats: { requests: '2.4k', satisfaction: '98%' }
  },
  {
    id: 'advertising',
    title: 'Publicité Intelligente',
    description: 'Optimisation automatique des campagnes publicitaires',
    path: '/agents/advertising',
    stats: { campaigns: '156', roi: '+340%' }
  },
  {
    id: 'email',
    title: 'Email Marketing',
    description: 'Campagnes email personnalisées et automatisées',
    path: '/agents/email',
    stats: { emails: '12.8k', openRate: '67%' }
  },
  {
    id: 'analysis',
    title: 'Analyse Prédictive',
    description: 'Insights avancés et prédictions de tendances',
    path: '/agents/analysis',
    stats: { reports: '89', accuracy: '94%' }
  },
  {
    id: 'page-generator',
    title: 'Générateur de Pages',
    description: 'Création automatique de pages optimisées',
    path: '/agents/page-generator',
    stats: { pages: '234', conversion: '+45%' }
  },
  {
    id: 'content-creator',
    title: 'Créateur de Contenu',
    description: 'Génération de contenu engageant et optimisé',
    path: '/agents/content-creator',
    stats: { articles: '567', engagement: '+78%' }
  }
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleAgentClick = (agent) => {
    navigate(agent.path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      <AnimatedBackground />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 mb-4"
        >
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                Bienvenue, {user?.displayName || user?.email || 'Utilisateur'}
              </h1>
              <p className="text-white/70 text-lg">
                Tableau de bord IA - Gérez vos agents intelligents
              </p>
            </div>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/settings?tab=2')}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 text-white/80 hover:text-purple-400 transition-all duration-200"
              >
                <Bell className="w-5 h-5" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/settings')}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 text-white/80 hover:text-purple-400 transition-all duration-200"
              >
                <Settings className="w-5 h-5" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/settings?tab=0')}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 text-white/80 hover:text-purple-400 transition-all duration-200"
              >
                <User className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
          {dashboardStats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`${stat.bgColor} backdrop-blur-lg rounded-2xl border border-white/20 p-6 hover:border-white/30 transition-all duration-300`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white/70 text-sm mb-2">{stat.title}</p>
                    <p className="text-white text-2xl font-bold mb-2">{stat.value}</p>
                    <span className={`${stat.color} text-sm font-semibold px-2 py-1 bg-white/10 rounded-lg`}>
                      {stat.change}
                    </span>
                  </div>
                  <div className={`${stat.color} p-3 bg-white/10 rounded-xl`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Agents Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-4"
        >
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Vos Agents IA
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agentCards.map((agent, index) => {
            const config = agentConfigs[agent.id];
            const IconComponent = config?.icon;
            
            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleAgentClick(agent)}
                className={`${config?.bgColor} backdrop-blur-lg rounded-2xl border ${config?.borderColor} p-6 cursor-pointer hover:border-white/30 transition-all duration-300 group`}
              >
                {/* Agent Avatar */}
                <div className="flex justify-center mb-4">
                  <div className={`p-4 bg-gradient-to-r ${config?.color} rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300`}>
                    <AgentAvatar3D 
                      agentType={agent.id}
                      size={60}
                      className="text-white"
                    />
                  </div>
                </div>
                
                {/* Agent Info */}
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {agent.title}
                  </h3>
                  <p className="text-white/70 text-sm leading-relaxed">
                    {agent.description}
                  </p>
                </div>

                {/* Agent Stats */}
                <div className="flex justify-around mb-6">
                  {Object.entries(agent.stats).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <div className="text-white font-bold text-lg">
                        {value}
                      </div>
                      <div className="text-white/60 text-xs capitalize">
                        {key}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Action Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`w-full bg-gradient-to-r ${config?.color} text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2`}
                >
                  Ouvrir l'Agent
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </motion.div>
            );
          })}
        </div>
        
        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="mt-8 pt-6 border-t border-white/10 text-center"
        >
          <p className="text-white/50 text-sm">
            © 2024 CommerceAI Pro - Plateforme IA pour l'e-commerce
          </p>
        </motion.div>
      </div>
    </div>
  );
};
 
 export default Dashboard;