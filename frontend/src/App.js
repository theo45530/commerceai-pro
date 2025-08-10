import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OnboardingProvider, useOnboarding } from './contexts/OnboardingContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import BrandSetup from './pages/BrandSetup';
import PlatformConnections from './pages/PlatformConnections';
import OnboardingComplete from './pages/OnboardingComplete';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardIntro from './pages/DashboardIntro';
import Landing from './pages/Landing';
import AgentCustomerService from './pages/agents/CustomerService';
import AgentAdvertising from './pages/agents/AdvertisingDark';
import AgentEmail from './pages/agents/EmailDark';
import AgentAnalysis from './pages/agents/AnalysisDark';
import AgentPageGenerator from './pages/agents/PageGeneratorDark';
import AgentContentCreator from './pages/agents/ContentCreatorDark';
import AgentsShowcase from './pages/AgentsShowcase';
import Settings from './pages/SettingsDark';
import NotFound from './pages/NotFound';
import ClearStorage from './pages/ClearStorage';
import NavigationTest from './pages/NavigationTest';
import TestDashboard from './pages/TestDashboard';
import UnifiedDashboard from './components/UnifiedDashboard';
import OnboardingFlow from './components/OnboardingFlow';
import SimplifiedPlatformConnector from './components/SimplifiedPlatformConnector';
import AIAgentManager from './components/AIAgentManager';
import EkkoLanding from './components/EkkoLanding';
import EkkoMainDashboard from './components/EkkoMainDashboard';
import SupportCenter from './components/SupportCenter';
import theme from './theme/theme';

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const { isOnboardingComplete } = useOnboarding();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        Chargement...
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (isOnboardingComplete === false) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <>
      {children}
      <SupportCenter user={currentUser} />
    </>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <OnboardingProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/landing" element={<Landing />} />
              <Route path="/ekko" element={<EkkoLanding />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/clear-storage" element={<ClearStorage />} />
              <Route path="/test-dashboard" element={<TestDashboard />} />
              
              {/* Onboarding routes - Semi-protected (require auth but not completed onboarding) */}
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/brand-setup" element={<BrandSetup />} />
              <Route path="/platform-connections" element={<PlatformConnections />} />
              <Route path="/onboarding-complete" element={<OnboardingComplete />} />
              <Route path="/dashboard-intro" element={<DashboardIntro />} />
              
              {/* Protected routes - Require auth and completed onboarding */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/agents" element={
                <ProtectedRoute>
                  <AgentsShowcase />
                </ProtectedRoute>
              } />
              <Route path="/agents/customer-service" element={
                <ProtectedRoute>
                  <AgentCustomerService />
                </ProtectedRoute>
              } />
              <Route path="/agents/advertising" element={
                <ProtectedRoute>
                  <AgentAdvertising />
                </ProtectedRoute>
              } />
              <Route path="/agents/email" element={
                <ProtectedRoute>
                  <AgentEmail />
                </ProtectedRoute>
              } />
              <Route path="/agents/analysis" element={
                <ProtectedRoute>
                  <AgentAnalysis />
                </ProtectedRoute>
              } />
              <Route path="/agents/page-generator" element={
                <ProtectedRoute>
                  <AgentPageGenerator />
                </ProtectedRoute>
              } />
              <Route path="/agents/content-creator" element={
                <ProtectedRoute>
                  <AgentContentCreator />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              
              {/* Development/Testing routes */}
              <Route path="/ekko-main-dashboard" element={<EkkoMainDashboard />} />
              <Route path="/onboarding-flow" element={<OnboardingFlow onComplete={(data) => process.env.NODE_ENV === 'development' && console.log('Onboarding completed:', data)} />} />
              <Route path="/platform-connector" element={<SimplifiedPlatformConnector />} />
              <Route path="/ai-agents" element={<AIAgentManager />} />
              <Route path="/navigation-test" element={<NavigationTest />} />
              <Route path="/unified-dashboard" element={<UnifiedDashboard />} />
              
              {/* 404 route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
        </OnboardingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;