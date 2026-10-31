import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Challenge, ChallengeSubmission } from './types';
import { DEFAULT_USER, StorageService } from './services/storageService';
import { Navbar } from './components/Navbar';
import { BottomNav, NavTabId } from './components/BottomNav';
import { FloatingChatbot } from './components/FloatingChatbot';
import { OfflineIndicator } from './components/OfflineIndicator';
import { OnboardingModal } from './components/OnboardingModal';
import { VerifyProofModal } from './components/VerifyProofModal';
import { LaunchScreen } from './components/LaunchScreen';
import { AuthService } from './services/authService';
import { SharedDataService } from './services/sharedDataService';
import { SocialSyncService } from './services/socialSyncService';

// Pages
import { HomePage } from './pages/HomePage';
import { DevotionsPage } from './pages/DevotionsPage';
import { ChallengesPage } from './pages/ChallengesPage';
import { WasteScannerPage } from './pages/WasteScannerPage';
import { GardenPage } from './pages/GardenPage';
import { ImpactPage } from './pages/ImpactPage';
import { CommunityPage } from './pages/CommunityPage';
import { MapPage } from './pages/MapPage';
import { ReportsPage } from './pages/ReportsPage';
import { EventsPage } from './pages/EventsPage';
import { LiturgyPage } from './pages/LiturgyPage';
import { LeaderDashboardPage } from './pages/LeaderDashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ThreadsPage } from './pages/ThreadsPage';

type AppPortal = 'user' | 'leader' | 'admin';
type SharedSyncState = 'connecting' | 'synced' | 'error' | 'offline';

function SharedSyncNotice({ state, message }: { state: SharedSyncState; message: string | null }) {
  if (state === 'synced') return null;
  const text = message || (state === 'connecting'
    ? 'Menghubungkan database bersama...'
    : 'Data belum tersinkron ke perangkat lain.');
  return (
    <div
      role={state === 'error' ? 'alert' : 'status'}
      className={`border-b px-4 py-2 text-center text-xs font-semibold ${
        state === 'error'
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-amber-200 bg-amber-50 text-amber-900'
      }`}
    >
      {text}
    </div>
  );
}

function getPortalFromPath(): AppPortal {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  if (pathname === '/admin') return 'admin';
  if (pathname === '/pemimpin') return 'leader';
  return 'user';
}

export default function App() {
  const [user, setUser] = useState<User>(DEFAULT_USER);
  const [portal, setPortal] = useState<AppPortal>(getPortalFromPath);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [sharedSyncState, setSharedSyncState] = useState<SharedSyncState>('synced');
  const [sharedSyncMessage, setSharedSyncMessage] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [verifyChallenge, setVerifyChallenge] = useState<Challenge | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    const handleSyncStatus = (event: Event) => {
      const detail = (event as CustomEvent<{ state: SharedSyncState; message?: string }>).detail;
      setSharedSyncState(detail.state);
      setSharedSyncMessage(detail.message || null);
    };
    window.addEventListener('mh-shared-sync-status', handleSyncStatus);
    return () => window.removeEventListener('mh-shared-sync-status', handleSyncStatus);
  }, []);

  useEffect(() => {
    const handleActiveSync = () => {
      const currentUser = StorageService.getUser();
      if (currentUser && currentUser.id !== 'guest-preview') {
        setUser(currentUser);
      }
    };
    window.addEventListener('focus', handleActiveSync);
    document.addEventListener('visibilitychange', handleActiveSync);
    return () => {
      window.removeEventListener('focus', handleActiveSync);
      document.removeEventListener('visibilitychange', handleActiveSync);
    };
  }, []);

  useEffect(() => {
    const handleBadgeUnlocks = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: string }>).detail;
      if (detail?.userId === user.id) setUser(StorageService.getUser());
    };
    window.addEventListener('mh-badges-unlocked', handleBadgeUnlocks);
    return () => window.removeEventListener('mh-badges-unlocked', handleBadgeUnlocks);
  }, [user.id]);

  useEffect(() => {
    const syncBrandInfo = () => {
      const brand = StorageService.getBrandSettings();
      if (brand.name) {
        document.title = `${brand.name} - ${brand.tagline || 'Ekoteologi Kristen Danau Toba'}`;
      }
      if (brand.logoUrl) {
        const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
        if (link) {
          link.href = brand.logoUrl;
        }
      }
    };
    syncBrandInfo();
    window.addEventListener('mh-brand-updated', syncBrandInfo);
    window.addEventListener('storage', syncBrandInfo);
    return () => {
      window.removeEventListener('mh-brand-updated', syncBrandInfo);
      window.removeEventListener('storage', syncBrandInfo);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const restoreAuthentication = async () => {
      try {
        const confirmedUser = await AuthService.completeEmailConfirmation();
        const authUser = confirmedUser || await AuthService.getCurrentUser();
        if (cancelled) return;

        if (authUser) {
          const restoredUser = AuthService.getUserProfile(authUser);
          const expectedPortal: AppPortal = restoredUser.role === 'admin'
            ? 'admin'
            : restoredUser.role === 'pemimpin'
            ? 'leader'
            : 'user';
          if (portal === 'user' && expectedPortal !== 'user') {
            const nextPath = expectedPortal === 'admin' ? '/admin' : '/pemimpin';
            window.history.replaceState(null, '', `${nextPath}${window.location.search}`);
            setPortal(expectedPortal);
          } else if (portal !== expectedPortal) {
            AuthService.signOut();
            if (!cancelled) {
              setAuthError(
                portal === 'admin'
                  ? 'Akun ini tidak memiliki akses administrator.'
                  : portal === 'leader'
                  ? 'Akun ini tidak memiliki akses portal pemimpin.'
                  : 'Gunakan portal khusus untuk akun pengelola.',
              );
            }
            return;
          }
          const syncedUser = StorageService.syncUserStreak(restoredUser);
          StorageService.saveUser(syncedUser);
          StorageService.setOnboarded(true);
          setUser(syncedUser);
          setIsOnboarded(true);
          void AuthService.getAccessToken()
            .then((token) => SharedDataService.connect(restoredUser, token))
            .catch((error: unknown) => {
              const message = error instanceof Error ? error.message : 'Sesi database bersama tidak dapat diperbarui.';
              window.dispatchEvent(new CustomEvent('mh-shared-sync-status', {
                detail: { state: 'error', message },
              }));
            });
        }
        else if (!cancelled) {
          setUser(DEFAULT_USER);
          setIsOnboarded(false);
          setSharedSyncState('synced');
        }
      } catch (error) {
        if (!cancelled) {
          setAuthError(error instanceof Error ? error.message : 'Sesi tidak dapat diverifikasi. Silakan masuk kembali.');
        }
      } finally {
        if (!cancelled) setIsAuthLoading(false);
      }
    };

    void restoreAuthentication();
    return () => {
      cancelled = true;
    };
  }, [portal]);

  useEffect(() => {
    // Sync font size preference
    if (user.preferences.fontSize === 'besar') {
      document.documentElement.classList.add('text-lg');
    } else {
      document.documentElement.classList.remove('text-lg');
    }
  }, [user.preferences.fontSize]);

  const handleUpdateUser = (updated: User) => {
    const membershipChanged = updated.communityId !== user.communityId;
    setUser(updated);
    if (membershipChanged) {
      void AuthService.getAccessToken()
        .then((token) => SharedDataService.connect(updated, token))
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : 'Sesi database bersama tidak dapat diperbarui.';
          window.dispatchEvent(new CustomEvent('mh-shared-sync-status', {
            detail: { state: 'error', message },
          }));
        });
    }
  };

  const handleOpenVerify = (chal: Challenge) => {
    if (!isOnboarded) {
      openAuthentication('register');
      return;
    }
    setVerifyChallenge(chal);
  };

  const openAuthentication = (mode: 'register' | 'login') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleSubmissionSuccess = (sub: ChallengeSubmission) => {
    if (sub.verdict === 'valid') {
      setSuccessToast(`🎉 Puji Tuhan! +${sub.awardedPoints} Poin Hijau berhasil didapat!`);
    } else if (sub.verdict === 'perlu_tinjauan') {
      setSuccessToast(`🤝 Bukti telah masuk antrean konfirmasi bersama jemaat.`);
    }
    setTimeout(() => setSuccessToast(null), 4000);
    setUser(StorageService.getUser());
    void SocialSyncService.syncSubmission(sub);
  };

  const renderActiveView = () => {
    let content: React.ReactNode;
    switch (currentTab) {
      case 'home':
        content = (
          <HomePage
            user={user}
            onNavigateTab={setCurrentTab}
            onOpenVerifyModal={handleOpenVerify}
            onRequireAuth={() => openAuthentication('register')}
          />
        );
        break;
      case 'devotions':
        content = (
          <DevotionsPage
            user={user}
            onSelectChallenge={(challengeId) => {
              setCurrentTab('challenges');
              if (challengeId) {
                const chal = StorageService.getChallenges().find((c) => c.id === challengeId);
                if (chal) handleOpenVerify(chal);
              }
            }}
          />
        );
        break;
      case 'challenges':
        content = (
          <ChallengesPage
            user={user}
            onOpenVerifyModal={handleOpenVerify}
          />
        );
        break;
      case 'waste-scan':
        content = (
          <WasteScannerPage
            isGuest={!isOnboarded}
            onRequireAuth={() => openAuthentication('register')}
            onOpenMap={() => setCurrentTab('map')}
          />
        );
        break;
      case 'garden':
        content = (
          <GardenPage
            user={user}
            onNavigateTab={setCurrentTab}
            onRequireAuth={() => openAuthentication('register')}
          />
        );
        break;
      case 'impact':
        content = (
          <ImpactPage
            user={user}
            onOpenChallenge={(challengeId) => {
              setCurrentTab('challenges');
              if (challengeId) {
                const chal = StorageService.getChallenges().find((c) => c.id === challengeId);
                if (chal) handleOpenVerify(chal);
              }
            }}
          />
        );
        break;
      case 'community':
        content = (
          <CommunityPage
            user={user}
            isGuest={!isOnboarded}
            onRequireAuth={() => openAuthentication('register')}
            onNavigateTab={setCurrentTab}
          />
        );
        break;
      case 'map':
        content = (
          <MapPage
            user={user}
            isGuest={!isOnboarded}
            onRequireAuth={() => openAuthentication('register')}
          />
        );
        break;
      case 'reports':
        content = (
          <ReportsPage
            user={user}
            isGuest={!isOnboarded}
            onRequireAuth={() => openAuthentication('register')}
          />
        );
        break;
      case 'events':
        content = (
          <EventsPage
            isGuest={!isOnboarded}
            onRequireAuth={() => openAuthentication('register')}
          />
        );
        break;
      case 'liturgy':
        content = <LiturgyPage user={user} />;
        break;
      case 'threads':
        content = (
          <ThreadsPage
            user={user}
            isGuest={!isOnboarded}
            onRequireAuth={() => openAuthentication('register')}
          />
        );
        break;
      case 'profile':
        content = (
          <ProfilePage
            user={user}
            onUpdateUser={handleUpdateUser}
            onLogout={() => {
              handleLogout();
            }}
          />
        );
        break;
      default:
        content = (
          <HomePage
            user={user}
            onNavigateTab={setCurrentTab}
            onOpenVerifyModal={handleOpenVerify}
            onRequireAuth={() => openAuthentication('register')}
          />
        );
        break;
    }

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="w-full"
        >
          {content}
        </motion.div>
      </AnimatePresence>
    );
  };

  // Convert current tab string to bottom nav id if valid
  const bottomNavTab = ['home', 'threads', 'challenges', 'garden', 'community', 'profile'].includes(currentTab)
    ? (currentTab as NavTabId)
    : 'home';

  const handleLogout = () => {
    AuthService.signOut();
    SharedDataService.disconnect();
    setSharedSyncState('offline');
    setSharedSyncMessage('Masuk kembali untuk menyambungkan database bersama.');
    StorageService.setOnboarded(false);
    setUser(DEFAULT_USER);
    setIsOnboarded(false);
    setCurrentTab('home');
    setIsAuthModalOpen(false);
  };

  if (isAuthLoading && portal !== 'user') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#FAF6EC] text-sm font-semibold text-[#2E6B34]">
        Memeriksa sesi akun...
      </div>
    );
  }

  if (!isOnboarded && portal !== 'user') {
    return (
      <div className="min-h-dvh bg-[#FAF6EC]">
        <OnboardingModal
          portal={portal}
          initialError={authError}
          onComplete={(newUser) => {
            setUser(newUser);
            setAuthError(null);
            StorageService.setOnboarded(true);
            setIsOnboarded(true);
            void AuthService.getAccessToken()
              .then((token) => SharedDataService.connect(newUser, token))
              .catch((error: unknown) => {
                const message = error instanceof Error ? error.message : 'Sesi database bersama tidak dapat diperbarui.';
                window.dispatchEvent(new CustomEvent('mh-shared-sync-status', {
                  detail: { state: 'error', message },
                }));
              });
          }}
        />
      </div>
    );
  }

  if (portal === 'admin' && user.role === 'admin') {
    return (
      <>
        {isOnboarded && <SharedSyncNotice state={sharedSyncState} message={sharedSyncMessage} />}
        <AdminDashboardPage user={user} onLogout={handleLogout} />
      </>
    );
  }

  if (portal === 'leader' && user.role === 'pemimpin') {
    return (
      <div className="min-h-dvh bg-[#FAF6EC]">
        {isOnboarded && <SharedSyncNotice state={sharedSyncState} message={sharedSyncMessage} />}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#2E6B34]/15 bg-[#FAF6EC]/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#1F2A1F]">{user.communityName}</p>
            <p className="text-xs text-[#7A5230]">Portal Pemimpin Organisasi</p>
          </div>
          <button onClick={handleLogout} className="min-h-11 rounded-xl border border-gray-200 px-3 text-xs font-bold text-gray-600 hover:bg-white">
            Keluar
          </button>
        </header>
        <main className="app-main-content mx-auto max-w-[1120px]">
          <LeaderDashboardPage user={user} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6EC] text-[#1F2A1F] flex flex-col font-sans">
      <div className="app-container flex flex-col">
        {/* Offline Connectivity Notification */}
        <OfflineIndicator />
        {isOnboarded && <SharedSyncNotice state={sharedSyncState} message={sharedSyncMessage} />}

        {/* Global Toast */}
        {successToast && (
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#2E6B34] text-white px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold animate-in fade-in flex items-center gap-2">
            <span>{successToast}</span>
          </div>
        )}

        {/* Top Navbar */}
        <Navbar
          user={user}
          isGuest={!isOnboarded}
          onNavigateTab={setCurrentTab}
          onOpenAuth={openAuthentication}
        />

        {/* Sub-navigation bar when in auxiliary views */}
        {!['home', 'threads', 'challenges', 'garden', 'community', 'profile'].includes(currentTab) && (
          <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between border-b border-gray-200 bg-white/60 px-4 py-2 text-xs">
            <button
              onClick={() => setCurrentTab('home')}
              className="text-[#2E6B34] font-bold hover:underline flex items-center gap-1"
            >
              &larr; Kembali ke Beranda
            </button>
            <span className="font-semibold text-gray-500 capitalize">
              {currentTab === 'waste-scan'
                ? 'Pemindai Sampah'
                : currentTab === 'devotions'
                ? 'Renungan Ciptaan'
                : currentTab === 'impact'
                ? 'Dampak & Jejak Hijau'
                : currentTab === 'reports'
                ? 'Lapor Lingkungan'
                : currentTab === 'events'
                ? 'Event Hijau'
                : currentTab === 'liturgy'
                ? 'Doa & Liturgi'
                : 'Peta Aksi Hijau'}
            </span>
          </div>
        )}

        {/* Main View Area */}
        <main className="flex-1 overflow-x-hidden">
          <div className="app-main-content">
            {renderActiveView()}
          </div>
        </main>

        {/* Floating Chatbot "Sahabat Ciptaan" */}
        <FloatingChatbot
          user={user}
          onOpenChallenge={() => setCurrentTab('challenges')}
          onOpenDevotions={() => setCurrentTab('devotions')}
        />

        {/* 5-Tab Bottom Navigation Bar */}
        <BottomNav
          currentTab={bottomNavTab}
          user={user}
          isGuest={!isOnboarded || user.id === 'guest-preview'}
          onChangeTab={(tab) => {
            setCurrentTab(tab);
            if (tab === 'profile' && !isOnboarded) {
              openAuthentication('login');
              return;
            }
          }}
        />

        {/* AI Proof Verification Modal */}
        {verifyChallenge && (
          <VerifyProofModal
            challenge={verifyChallenge}
            user={user}
            onClose={() => setVerifyChallenge(null)}
            onSuccess={handleSubmissionSuccess}
          />
        )}

        {isAuthModalOpen && (
          <OnboardingModal
            portal="user"
            initialMode={authMode}
            initialError={authError}
            onClose={() => {
              setIsAuthModalOpen(false);
              setAuthError(null);
            }}
            onComplete={(newUser) => {
              const syncedUser = StorageService.syncUserStreak(newUser);
              setUser(syncedUser);
              setIsOnboarded(true);
              setIsAuthModalOpen(false);
              setAuthError(null);
              void AuthService.getAccessToken()
                .then((token) => SharedDataService.connect(newUser, token))
                .catch((error: unknown) => {
                  const message = error instanceof Error ? error.message : 'Sesi database bersama tidak dapat diperbarui.';
                  window.dispatchEvent(new CustomEvent('mh-shared-sync-status', {
                    detail: { state: 'error', message },
                  }));
                });
            }}
          />
        )}

        {/* Customizable Launch / Splash Screen */}
        <LaunchScreen />

      </div>
    </div>
  );
}

