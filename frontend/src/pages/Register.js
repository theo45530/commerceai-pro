import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Chrome, Facebook, Linkedin, AlertCircle, CheckCircle, Rocket } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AnimatedBackground from '../components/AnimatedBackground';
import AgentAvatar3D from '../components/AgentAvatar3D';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const { register, error: authError } = useAuth();
  const navigate = useNavigate();

  // Validation du formulaire
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // Validation du nom
    if (name && name.trim().length < 2) {
      setNameError('Le nom doit contenir au moins 2 caractères');
    } else {
      setNameError('');
    }
    
    // Validation de l'email
    if (email && !emailRegex.test(email)) {
      setEmailError('Veuillez entrer un email valide');
    } else {
      setEmailError('');
    }
    
    // Validation du mot de passe
    if (password && password.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères');
    } else {
      setPasswordError('');
    }
    
    // Validation de la confirmation du mot de passe
    if (confirmPassword && password !== confirmPassword) {
      setConfirmPasswordError('Les mots de passe ne correspondent pas');
    } else {
      setConfirmPasswordError('');
    }
    
    const isValid = 
      name.trim().length >= 2 &&
      emailRegex.test(email) &&
      password.length >= 6 &&
      password === confirmPassword;
    setIsFormValid(isValid);
  }, [name, email, password, confirmPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Validation
    if (!name || !email || !password || !confirmPassword) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    
    if (name.trim().length < 2) {
      setError('Le nom doit contenir au moins 2 caractères');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    if (!isFormValid) {
      setError('Veuillez vérifier vos informations');
      return;
    }
    
    setLoading(true);
    try {
      const success = await register(name, email, password);
      if (success) {
        setSuccess('Inscription réussie ! Redirection...');
        setTimeout(() => {
          navigate('/onboarding');
        }, 1000);
      } else {
        setError(authError || 'Échec de l\'inscription');
      }
    } catch (err) {
      setError('Une erreur inattendue s\'est produite');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialRegister = (provider) => {
    setError('');
    setSuccess(`Inscription via ${provider} en cours...`);
    // Logique d'inscription sociale à implémenter
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
                Rejoignez CommerceAI Pro
              </h1>
              <p className="text-white/60">
                Créez votre compte et transformez votre e-commerce
              </p>
            </motion.div>

            {/* Options d'inscription sociale */}
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
                  onClick={() => handleSocialRegister('Google')}
                  className="btn-glass p-3 rounded-xl flex items-center justify-center group"
                >
                  <Chrome className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSocialRegister('Facebook')}
                  className="btn-glass p-3 rounded-xl flex items-center justify-center group"
                >
                  <Facebook className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSocialRegister('LinkedIn')}
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

            {/* Formulaire d'inscription */}
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
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400"
                  >
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{success}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Champ Nom */}
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-white/80">
                  Nom complet *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    className={`input-glass w-full pl-12 pr-4 py-3 rounded-xl transition-all duration-200 ${
                      nameError ? 'border-red-500/50 focus:border-red-500' : 'focus:border-primary-500'
                    }`}
                    placeholder="Votre nom complet"
                  />
                  {nameError && (
                    <p className="mt-1 text-sm text-red-400">{nameError}</p>
                  )}
                </div>
              </div>

              {/* Champ Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-white/80">
                  Adresse email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className={`input-glass w-full pl-12 pr-4 py-3 rounded-xl transition-all duration-200 ${
                      emailError ? 'border-red-500/50 focus:border-red-500' : 'focus:border-primary-500'
                    }`}
                    placeholder="votre@email.com"
                  />
                  {emailError && (
                    <p className="mt-1 text-sm text-red-400">{emailError}</p>
                  )}
                </div>
              </div>

              {/* Champ Mot de passe */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-white/80">
                  Mot de passe *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className={`input-glass w-full pl-12 pr-12 py-3 rounded-xl transition-all duration-200 ${
                      passwordError ? 'border-red-500/50 focus:border-red-500' : 'focus:border-primary-500'
                    }`}
                    placeholder="Votre mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  {passwordError && (
                    <p className="mt-1 text-sm text-red-400">{passwordError}</p>
                  )}
                </div>
              </div>

              {/* Champ Confirmation mot de passe */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/80">
                  Confirmer le mot de passe *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className={`input-glass w-full pl-12 pr-12 py-3 rounded-xl transition-all duration-200 ${
                      confirmPasswordError ? 'border-red-500/50 focus:border-red-500' : 'focus:border-primary-500'
                    }`}
                    placeholder="Confirmez votre mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  {confirmPasswordError && (
                    <p className="mt-1 text-sm text-red-400">{confirmPasswordError}</p>
                  )}
                </div>
              </div>

              {/* Bouton d'inscription */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-primary w-full py-4 text-lg font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Création en cours...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Rocket className="w-5 h-5" />
                    <span>Créer mon compte</span>
                  </div>
                )}
              </motion.button>
            </motion.form>

            {/* Liens de navigation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="mt-8 text-center space-y-4"
            >
              <p className="text-white/60">
                Vous avez déjà un compte ?
              </p>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <RouterLink
                  to="/login"
                  className="inline-flex items-center gap-2 text-accent-400 hover:text-accent-300 font-medium transition-colors duration-200"
                >
                  Se connecter
                </RouterLink>
              </motion.div>
            </motion.div>

            {/* Copyright */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="mt-8 pt-6 border-t border-white/10 text-center"
            >
              <p className="text-white/40 text-sm">
                © 2024 CommerceAI Pro. Tous droits réservés.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}