import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

// Development logging helper
const isDev = process.env.NODE_ENV === 'development';
const devLog = (...args) => isDev && console.log(...args);

const OnboardingContext = createContext();

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

export const OnboardingProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [brandInfo, setBrandInfo] = useState({
    brandName: '',
    websiteUrl: '',
    businessType: '',
    foundedYear: '',
    description: '',
    targetAudience: '',
    mainProducts: '',
    monthlyRevenue: '',
    currentChallenges: []
  });
  const [platformConnections, setPlatformConnections] = useState({
    meta: { connected: false, status: 'disconnected', data: null },
    google: { connected: false, status: 'disconnected', data: null },
    instagram: { connected: false, status: 'disconnected', data: null },
    tiktok: { connected: false, status: 'disconnected', data: null },
    whatsapp: { connected: false, status: 'disconnected', data: null },
    shopify: { connected: false, status: 'disconnected', data: null },
    linkedin: { connected: false, status: 'disconnected', data: null },
    twitter: { connected: false, status: 'disconnected', data: null }
  });
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(true); // Forcer à true pour accéder au dashboard

  // Étapes de l'onboarding
  const ONBOARDING_STEPS = {
    WELCOME: 0,
    BRAND_SETUP: 1,
    PLATFORM_CONNECTIONS: 2,
    DASHBOARD_INTRO: 3,
    COMPLETE: 4
  };

  // Vérifier si l'utilisateur a déjà terminé l'onboarding
  useEffect(() => {
    devLog('🔍 OnboardingContext: Checking user onboarding status', { currentUser });
    if (currentUser && currentUser.id) {
      const savedOnboardingStatus = localStorage.getItem(`onboarding_${currentUser.id}`);
      devLog('💾 Saved onboarding status:', savedOnboardingStatus);
      if (savedOnboardingStatus) {
        try {
          const status = JSON.parse(savedOnboardingStatus);
          devLog('📋 Parsed onboarding status:', status);
          setIsOnboardingComplete(status.complete || false);
          setOnboardingStep(status.step || 0);
          if (status.brandInfo) setBrandInfo(status.brandInfo);
          if (status.platformConnections) setPlatformConnections(status.platformConnections);
        } catch (error) {
          devLog('❌ Error parsing saved onboarding status:', error);
          setIsOnboardingComplete(false);
          setOnboardingStep(0);
        }
      } else {
        devLog('❌ No saved onboarding status found, user needs onboarding');
        setIsOnboardingComplete(false);
        setOnboardingStep(0);
      }
    } else if (currentUser === null) {
      // Pas d'utilisateur connecté, permettre l'affichage de l'onboarding
      devLog('👤 OnboardingContext: No user, allowing onboarding display');
      setIsOnboardingComplete(false);
      setOnboardingStep(0);
    }
    // Si currentUser est undefined (en cours de chargement), définir un état par défaut
    else if (currentUser === undefined) {
      devLog('⏳ OnboardingContext: User loading, setting default state');
      setIsOnboardingComplete(false);
      setOnboardingStep(0);
    }
  }, [currentUser]);

  // Sauvegarder le progrès de l'onboarding
  const saveOnboardingProgress = useCallback(() => {
    if (currentUser && currentUser.id) {
      const status = {
        complete: isOnboardingComplete,
        step: onboardingStep,
        brandInfo,
        platformConnections,
        lastUpdated: new Date().toISOString()
      };
      devLog('💾 Saving onboarding progress for user', currentUser.id, ':', status);
      localStorage.setItem(`onboarding_${currentUser.id}`, JSON.stringify(status));
    } else {
      devLog('⚠️ Cannot save onboarding progress: currentUser not available', { currentUser });
    }
  }, [currentUser, isOnboardingComplete, onboardingStep, brandInfo, platformConnections]);

  // Sauvegarder automatiquement quand l'état change
  useEffect(() => {
    if (currentUser) {
      saveOnboardingProgress();
    }
  }, [currentUser, saveOnboardingProgress]);

  // Passer à l'étape suivante
  const nextStep = () => {
    const newStep = Math.min(onboardingStep + 1, ONBOARDING_STEPS.COMPLETE);
    devLog('🚀 OnboardingContext: nextStep called, moving from', onboardingStep, 'to', newStep);
    setOnboardingStep(newStep);
    
    if (newStep === ONBOARDING_STEPS.COMPLETE) {
      setIsOnboardingComplete(true);
    }
  };

  // Revenir à l'étape précédente
  const previousStep = () => {
    const newStep = Math.max(onboardingStep - 1, 0);
    setOnboardingStep(newStep);
  };

  // Aller à une étape spécifique
  const goToStep = (step) => {
    if (step >= 0 && step <= ONBOARDING_STEPS.COMPLETE) {
      setOnboardingStep(step);
    }
  };

  // Mettre à jour l'étape d'onboarding
  const updateOnboardingStep = (stepName, completed = false) => {
    devLog('🔄 updateOnboardingStep called:', stepName, completed);
    
    if (stepName === 'brand-setup' && completed) {
      devLog('🔄 Setting step to PLATFORM_CONNECTIONS:', ONBOARDING_STEPS.PLATFORM_CONNECTIONS);
      setOnboardingStep(ONBOARDING_STEPS.PLATFORM_CONNECTIONS);
    } else if (stepName === 'platform-connections' && completed) {
      setOnboardingStep(ONBOARDING_STEPS.COMPLETE);
      setIsOnboardingComplete(true);
    }
  };

  // Mettre à jour les informations de la marque
  const updateBrandInfo = (newInfo) => {
    setBrandInfo(prev => ({ ...prev, ...newInfo }));
  };

  // Mettre à jour le statut de connexion d'une plateforme
  const updatePlatformConnection = (platform, connectionData) => {
    setPlatformConnections(prev => ({
      ...prev,
      [platform]: {
        connected: true,
        status: 'connected',
        data: connectionData,
        connectedAt: new Date().toISOString()
      }
    }));
  };

  // Mettre à jour toutes les connexions de plateformes
  const updatePlatformConnections = (newConnections) => {
    setPlatformConnections(newConnections);
  };

  // Déconnecter une plateforme
  const disconnectPlatform = (platform) => {
    setPlatformConnections(prev => ({
      ...prev,
      [platform]: {
        connected: false,
        status: 'disconnected',
        data: null
      }
    }));
  };

  // Vérifier si toutes les plateformes essentielles sont connectées
  const areEssentialPlatformsConnected = () => {
    const essentialPlatforms = ['meta', 'google', 'shopify'];
    return essentialPlatforms.every(platform => 
      platformConnections[platform]?.connected
    );
  };

  // Obtenir le pourcentage de progression
  const getProgressPercentage = () => {
    return Math.round((onboardingStep / ONBOARDING_STEPS.COMPLETE) * 100);
  };

  // Réinitialiser l'onboarding
  const resetOnboarding = () => {
    setOnboardingStep(0);
    setBrandInfo({
      brandName: '',
      websiteUrl: '',
      businessType: '',
      foundedYear: '',
      description: '',
      targetAudience: '',
      mainProducts: '',
      monthlyRevenue: '',
      currentChallenges: []
    });
    setPlatformConnections({
      meta: { connected: false, status: 'disconnected', data: null },
      google: { connected: false, status: 'disconnected', data: null },
      instagram: { connected: false, status: 'disconnected', data: null },
      tiktok: { connected: false, status: 'disconnected', data: null },
      whatsapp: { connected: false, status: 'disconnected', data: null },
      shopify: { connected: false, status: 'disconnected', data: null },
      linkedin: { connected: false, status: 'disconnected', data: null },
      twitter: { connected: false, status: 'disconnected', data: null }
    });
    setIsOnboardingComplete(false);
    
    if (currentUser) {
      localStorage.removeItem(`onboarding_${currentUser.id}`);
    }
  };

  // Finaliser l'onboarding
  const completeOnboarding = async () => {
    try {
      setIsOnboardingComplete(true);
      setOnboardingStep(ONBOARDING_STEPS.COMPLETE);
      
      // Sauvegarder localement
      saveOnboardingProgress();
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la finalisation:', error);
      return false;
    }
  };

  // Vérifier si c'est la première connexion de l'utilisateur
  const isFirstLogin = () => {
    if (!currentUser) return false;
    const savedOnboardingStatus = localStorage.getItem(`onboarding_${currentUser.id}`);
    return !savedOnboardingStatus || !JSON.parse(savedOnboardingStatus).complete;
  };

  const value = {
    // État
    onboardingStep,
    brandInfo,
    platformConnections,
    isOnboardingComplete,
    ONBOARDING_STEPS,
    
    // Actions
    nextStep,
    previousStep,
    goToStep,
    updateOnboardingStep,
    updateBrandInfo,
    updatePlatformConnection,
    updatePlatformConnections,
    disconnectPlatform,
    resetOnboarding,
    completeOnboarding,
    
    // Utilitaires
    areEssentialPlatformsConnected,
    getProgressPercentage,
    saveOnboardingProgress,
    isFirstLogin
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export default OnboardingContext;