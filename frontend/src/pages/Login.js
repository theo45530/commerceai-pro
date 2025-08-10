import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, Chrome, Facebook, Linkedin, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AnimatedBackground from '../components/AnimatedBackground';
import AgentAvatar3D from '../components/AgentAvatar3D';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);
  const { login, currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Validation du formulaire
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setIsFormValid(emailRegex.test(email) && password.length >= 6);
  }, [email, password]);

  // Redirect if user is already logged in
  useEffect(() => {
    if (!authLoading && currentUser) {
      const savedOnboardingStatus = localStorage.getItem(`onboarding_${currentUser.id}`);
      if (savedOnboardingStatus) {
        const status = JSON.parse(savedOnboardingStatus);
        if (status.complete) {
          navigate('/', { replace: true });
        } else {
          navigate('/onboarding', { replace: true });
        }
      } else {
        navigate('/onboarding', { replace: true });
      }
    }
  }, [currentUser, authLoading, navigate]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-900 via-secondary-900 to-accent-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70">Vérification de l'authentification...</p>
        </motion.div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setError('');
    setSuccess('');
    
    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    
    if (!isFormValid) {
      setError('Veuillez vérifier vos informations');
      return;
    }
    
    setLoading(true);
    try {
      const success = await login(email, password);
      
      if (success) {
        setSuccess('Connexion réussie ! Redirection...');
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1000);
      } else {
        setError('Email ou mot de passe incorrect');
      }
    } catch (error) {
      setError('Une erreur est survenue lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleTestLogin = async () => {
    setEmail('test@example.com');
    setPassword('password123');
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const success = await login('test@example.com', 'password123');
      
      if (success) {
        setSuccess('Connexion de test réussie !');
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1000);
      } else {
        setError('Échec de la connexion de test');
      }
    } catch (error) {
      setError('Erreur lors de la connexion de test');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    setError('');
    setSuccess(`Connexion via ${provider} en cours...`);
    // Logique de connexion sociale à implémenter
  };

  return (
    <div className="min-h-screen bg-gradient-animated relative overflow-hidden">
      <AnimatedBackground />
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <div className="glass-card p-8 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl hover:shadow-primary-500/20 transition-all duration-300">
            {/* En-tête avec avatar 3D */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-center mb-8"
            >
              <div className="mb-6">
                <AgentAvatar3D 
                  type="assistant" 
                  size="lg" 
                  className="mx-auto mb-4" 
                  animate={true}
                />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Connexion
              </h1>
              <p className="text-white/60">
                Connectez-vous à votre compte CommerceAI Pro
              </p>
            </motion.div>

            {/* Options de connexion sociale */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="mb-6"
            >
              <div className="grid grid-cols-3 gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSocialLogin('Google')}
                  className="btn-glass p-3 rounded-xl flex items-center justify-center group"
                >
                  <Chrome className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSocialLogin('Facebook')}
                  className="btn-glass p-3 rounded-xl flex items-center justify-center group"
                >
                  <Facebook className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSocialLogin('LinkedIn')}
                  className="btn-glass p-3 rounded-xl flex items-center justify-center group"
                >
                  <Linkedin className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
                </motion.button>
              </div>
              
              <div className="flex items-center my-6">
                <div className="flex-1 h-px bg-white/20"></div>
                <span className="px-4 text-white/50 text-sm">ou</span>
                <div className="flex-1 h-px bg-white/20"></div>
              </div>
            </motion.div>

            {/* Formulaire de connexion */}
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {/* Messages d'erreur et de succès */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-sm"
                  >
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <span className="text-red-200 text-sm">{error}</span>
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl backdrop-blur-sm"
                  >
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-green-200 text-sm">{success}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Champ Email */}
              <div className="space-y-2">
                <label className="text-white/70 text-sm font-medium">Adresse email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className={`input-modern pl-12 ${
                      email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) 
                        ? 'border-red-500/50 focus:border-red-500' 
                        : email 
                        ? 'border-green-500/50 focus:border-green-500'
                        : ''
                    }`}
                    placeholder="votre@email.com"
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              {/* Champ Mot de passe */}
              <div className="space-y-2">
                <label className="text-white/70 text-sm font-medium">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className={`input-modern pl-12 pr-12 ${
                      password && password.length < 6
                        ? 'border-red-500/50 focus:border-red-500'
                        : password.length >= 6
                        ? 'border-green-500/50 focus:border-green-500'
                        : ''
                    }`}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {password && password.length < 6 && (
                  <p className="text-red-400 text-xs">Le mot de passe doit contenir au moins 6 caractères</p>
                )}
              </div>

              {/* Bouton de connexion principal */}
              <motion.button
                type="submit"
                disabled={loading || !isFormValid}
                whileHover={!loading && isFormValid ? { scale: 1.02 } : {}}
                whileTap={!loading && isFormValid ? { scale: 0.98 } : {}}
                className={`btn-primary w-full py-4 text-lg font-semibold ${
                  !isFormValid || loading 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:shadow-primary-500/30'
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Connexion...</span>
                  </div>
                ) : (
                  'Se connecter'
                )}
              </motion.button>

              {/* Bouton de test */}
              <motion.button
                type="button"
                onClick={handleTestLogin}
                disabled={loading}
                whileHover={!loading ? { scale: 1.02 } : {}}
                whileTap={!loading ? { scale: 0.98 } : {}}
                className="btn-glass w-full py-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Test...</span>
                  </div>
                ) : (
                  'Connexion de test'
                )}
              </motion.button>
            </motion.form>

            {/* Liens de navigation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="mt-8 space-y-4 text-center"
            >
              <div>
                <p className="text-white/60 text-sm mb-2">
                  Vous n'avez pas encore de compte ?
                </p>
                <RouterLink
                  to="/register"
                  className="text-primary-400 hover:text-primary-300 font-semibold transition-colors duration-200 hover:underline"
                >
                  Créer un compte
                </RouterLink>
              </div>
              
              <div>
                <a
                  href="#"
                  className="text-white/50 hover:text-white/70 text-sm transition-colors duration-200 hover:underline"
                >
                  Mot de passe oublié ?
                </a>
              </div>
            </motion.div>
          </div>
        </motion.div>
        
        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-center mt-8"
        >
          <p className="text-white/40 text-sm">
            © 2024 CommerceAI Pro. Tous droits réservés.
          </p>
        </motion.div>
      </div>
    </div>
  );
}