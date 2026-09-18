import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { SplashScreen } from './components/common/SplashScreen';
import { AuthPage } from './components/auth/AuthPage';
import { HomePage } from './components/home/HomePage';
import { AnnouncementBanner } from './components/layout/AnnouncementBanner';
import { GovernmentHeader } from './components/layout/GovernmentHeader';
import { Breadcrumb } from './components/layout/Breadcrumb';
import { Sidebar } from './components/layout/Sidebar';
import { GovernmentFooter } from './components/layout/GovernmentFooter';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { CreateBookingFlow } from './components/booking/CreateBookingFlow';
import { QueueTrackerView } from './components/tracking/QueueTrackerView';
import { CentresView } from './components/centres/CentresView';
import { ProcurementPaymentView } from './components/procurement/ProcurementPaymentView';
import { HistoryView } from './components/history/HistoryView';
import { NotificationsView } from './components/notifications/NotificationsView';
import { ProfileView } from './components/account/ProfileView';
import { HelpSupportModal } from './components/modals/HelpSupportModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { AuthModal } from './components/account/AuthModal';
import { OperatorPortal } from './components/operator/OperatorPortal';
import { TermsConditionsModal } from './components/modals/TermsConditionsModal';
import { PrivacyPolicyModal } from './components/modals/PrivacyPolicyModal';
import { CookiePolicyModal } from './components/modals/CookiePolicyModal';
import { CookieConsentBanner } from './components/common/CookieConsentBanner';
import { SmsInterfaceModal } from './components/sms/SmsInterfaceModal';
import api from './services/api';

const MainAppContent: React.FC = () => {
  const { activeView, setActiveView, isLoggedIn, authStatus, userRole } = useApp();
  const [showSplash, setShowSplash] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Initial startup: show user's seedling logo for ~1400 milliseconds or while auth initializes
  if (showSplash || authStatus === 'initializing') {
    return <SplashScreen onFinish={() => setShowSplash(false)} durationMs={1400} />;
  }

  let content: React.ReactNode;

  // 1. Home Page Landing Route
  if (activeView === 'home') {
    content = <HomePage onNavigateToAuth={() => setActiveView('auth')} />;
  } else if (!isLoggedIn || authStatus !== 'authenticated' || activeView === 'auth') {
    // 2. Strict protected route enforcement: unauthenticated users get AuthPage
    content = <AuthPage onSuccess={() => setActiveView('dashboard')} />;
  } else if (userRole === 'operator') {
    // Centre Operator Web App: Dedicated operator interface based on user's role
    content = <OperatorPortal />;
  } else {
    // Farmer Portal Main View
    content = (
      <div className="min-h-screen flex flex-col font-['Inter'] antialiased bg-[#F5F8F6] text-[#17231F]">
        {/* Official Government Announcement Strip */}
        <AnnouncementBanner />

        {/* Main Government Header (Spans full width across top) */}
        <GovernmentHeader onOpenSidebar={() => setIsSidebarOpen(true)} />

        {/* Main 2-Column Body Layout: Sidebar on Left + Content Viewport on Right */}
        <div className="flex-1 flex min-w-0 w-full relative">
          {/* Government Dark Green Sidebar (280px on desktop, drawer on mobile) */}
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />

          {/* Content Column (Proper spacing between sidebar and content) */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#F5F8F6]">
            {/* Breadcrumb Strip immediately below header */}
            <Breadcrumb />

            {/* Main Viewport Container */}
            <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6 pb-28 lg:pb-12 max-w-[1440px]">
              {activeView === 'dashboard' && <DashboardView />}
              {activeView === 'tracking' && <QueueTrackerView />}
              {activeView === 'booking' && <CreateBookingFlow />}
              {activeView === 'centres' && <CentresView />}
              {activeView === 'procurement' && <ProcurementPaymentView />}
              {activeView === 'history' && <HistoryView />}
              {activeView === 'notifications' && <NotificationsView />}
              {activeView === 'profile' && <ProfileView />}
            </main>

            {/* Official Government Footer */}
            <div className="mb-16 lg:mb-0">
              <GovernmentFooter />
            </div>
          </div>
        </div>

        {/* Mobile Bottom Navigation Dock */}
        <MobileBottomNav onOpenMore={() => setIsSidebarOpen(true)} />
      </div>
    );
  }

  return (
    <>
      {content}

      {/* Global Modals & Legal Dialogs */}
      <HelpSupportModal />
      <SettingsModal />
      <TermsConditionsModal />
      <PrivacyPolicyModal />
      <CookiePolicyModal />
      <CookieConsentBanner />
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <SmsInterfaceModal />
    </>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}

export default App;
