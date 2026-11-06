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
import { CheckCircle2, Mail } from 'lucide-react';
import { AuthService } from './services/authService';
import { SharedDataService } from './services/sharedDataService';
import { SocialSyncService } from './services/socialSyncService';
import { PushNotificationService } from './services/pushNotificationService';

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
import { AmbientAudioPlayer } from './components/AmbientAudioPlayer';
import { WelcomeTourModal } from './components/WelcomeTourModal';
import confetti from 'canvas-confetti';

type AppPortal = 'user' | 'leader' | 'admin';

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
  const [isBrandLoading, setIsBrandLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [currentTab, setCurrentTab] = useState<string>(() => {
    const requestedTab = new URLSearchParams(window.location.search).get('tab');
    const availableTabs = [
      'home',
      'devotions',
      'challenges',
      'waste-scan',
      'garden',
      'impact',
      'community',
      'map',
      'reports',
      'events',
      'liturgy',
      'threads',
      'profile',
    ];
    return requestedTab && availableTabs.includes(requestedTab) ? requestedTab : 'home';
  });

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('tab') === currentTab) return;
    url.searchParams.set('tab', currentTab);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }, [currentTab]);
  const [verifyChallenge, setVerifyChallenge] = useState<Challenge | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [emailConfirmationNotice, setEmailConfirmationNotice] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);
  const [isTourOpen, setIsTourOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const refreshBrand = async () => {
      try {
        await SharedDataService.refreshPublicBrand();
      } catch (error) {
        console.warn('[App] Gagal memuat pengaturan tampilan publik:', error);
      } finally {
        if (active) setIsBrandLoading(false);
      }
    };

    void refreshBrand();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshBrand();
    }, 60_000);
    window.addEventListener('focus', refreshBrand);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshBrand);
    };
  }, []);

  useEffect(() => {
    // Check if user is opening for first time
    const hasSeenTour = localStorage.getItem('mh_welcome_tour_seen');
    if (!hasSeenTour) {
      const timer = setTimeout(() => {
        setIsTourOpen(true);
        localStorage.setItem('mh_welcome_tour_seen', 'true');
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleOpenTour = () => setIsTourOpen(true);
    window.addEventListener('mh-open-tour', handleOpenTour);
    return () => window.removeEventListener('mh-open-tour', handleOpenTour);
  }, []);

  useEffect(() => {
    const handleActiveSync = () => {
      const currentUser = StorageService.getUser();
      if (currentUser && currentUser.id !== 'guest-preview') {
        setUser(currentUser);
      }
    };
    window.addEventListener('focus', handleActiveSync);
    window.addEventListener('visibilitychange', handleActiveSync);
    window.addEventListener('mh-user-updated', handleActiveSync);
    return () => {
      window.removeEventListener('focus', handleActiveSync);
      window.removeEventListener('visibilitychange', handleActiveSync);
      window.removeEventListener('mh-user-updated', handleActiveSync);
    };
  }, []);

  // Sync Dark Mode theme class to <html> and <body>
  useEffect(() => {
    const isDark = Boolean(user.preferences?.darkMode);
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [user.preferences?.darkMode]);

  useEffect(() => {
    const handleBadgeUnlocks = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: string }>).detail;
      if (detail?.userId === user.id) {
        setUser(StorageService.getUser());
        try {
          confetti({
            particleCount: 110,
            spread: 85,
            origin: { y: 0.5 },
            colors: ['#2E6B34', '#A8D5A2', '#F59E0B', '#FBBF24', '#10B981'],
          });
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('mh-badges-unlocked', handleBadgeUnlocks);
    return () => window.removeEventListener('mh-badges-unlocked', handleBadgeUnlocks);
  }, [user.id]);

  // Request Service Worker notification permission upon first user interaction
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        const handleFirstInteraction = () => {
          PushNotificationService.requestPermission().catch(() => {});
        };
        window.addEventListener('click', handleFirstInteraction, { once: true });
        window.addEventListener('touchend', handleFirstInteraction, { once: true });
        return () => {
          window.removeEventListener('click', handleFirstInteraction);
          window.removeEventListener('touchend', handleFirstInteraction);
        };
      }
    }
  }, []);

  useEffect(() => {
    const syncBrandInfo = () => {
      const brand = StorageService.getBrandSettings();
      const appName = brand.name || 'Marsiadapari Hijau';
      const tagline = brand.tagline || 'Ekoteologi Kristen Danau Toba';
      document.title = `${appName} - ${tagline}`;

      const rawLogo = brand.logoUrl && brand.logoUrl.trim() ? brand.logoUrl.trim() : '/api/app-icon';
      const cacheBuster = Date.now();
      // Use rawLogo directly if it is a data URI, otherwise append cache buster timestamp
      const iconHref = rawLogo.startsWith('data:')
        ? rawLogo
        : `${rawLogo}${rawLogo.includes('?') ? '&' : '?'}t=${cacheBuster}`;

      // Helper to dynamically find or create <link> elements
      const updateOrCreateLink = (
        rel: string,
        href: string,
        type?: string,
        sizes?: string
      ) => {
        let existing = document.querySelector(`link[rel='${rel}']`) as HTMLLinkElement | null;
        if (!existing) {
          existing = document.createElement('link');
          existing.rel = rel;
          document.head.appendChild(existing);
        }
        existing.href = href;
        if (type) existing.type = type;
        if (sizes) existing.setAttribute('sizes', sizes);
      };

      // 1. Update/create Apple Touch Icon for iOS Safari and Mobile Home Screen
      updateOrCreateLink('apple-touch-icon', iconHref, 'image/png', '180x180');
      updateOrCreateLink('apple-touch-icon-precomposed', iconHref, 'image/png', '180x180');

      // 2. Update/create favicon & high-res icons for Android Chrome & Desktop tabs
      updateOrCreateLink('icon', iconHref, 'image/png', '192x192');
      updateOrCreateLink('shortcut icon', iconHref);

      // Also ensure all existing icon tags in the DOM receive the updated href
      document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']").forEach((link) => {
        link.href = iconHref;
      });

      // Helper to dynamically find or create <meta> elements
      const updateOrCreateMeta = (attrName: 'name' | 'property', attrValue: string, contentValue: string) => {
        let meta = document.querySelector(`meta[${attrName}='${attrValue}']`);
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute(attrName, attrValue);
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', contentValue);
      };

      // 3. Update mobile app titles & theme colors
      updateOrCreateMeta('name', 'apple-mobile-web-app-title', appName);
      updateOrCreateMeta('name', 'application-name', appName);
      if (brand.primaryColor) {
        updateOrCreateMeta('name', 'theme-color', brand.primaryColor);
      }
      updateOrCreateMeta('property', 'og:image', iconHref);
      updateOrCreateMeta('name', 'twitter:image', iconHref);

      // 4. Update manifest link with cache buster so mobile browsers re-fetch the dynamic manifest
      let manifestLink = document.querySelector("link[rel='manifest']") as HTMLLinkElement | null;
      if (!manifestLink) {
        manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        document.head.appendChild(manifestLink);
      }
      manifestLink.href = `/manifest.webmanifest?t=${cacheBuster}`;
    };

    syncBrandInfo();

    const handleSharedData = (e: Event) => {
      const detail = (e as CustomEvent<{ collection?: string }>).detail;
      if (detail && detail.collection === 'brand') {
        syncBrandInfo();
      }
    };

    window.addEventListener('mh-brand-updated', syncBrandInfo);
    window.addEventListener('mh-shared-data-change', handleSharedData);
    window.addEventListener('mh-data-updated', handleSharedData);
    window.addEventListener('storage', syncBrandInfo);

    return () => {
      window.removeEventListener('mh-brand-updated', syncBrandInfo);
      window.removeEventListener('mh-shared-data-change', handleSharedData);
      window.removeEventListener('mh-data-updated', handleSharedData);
      window.removeEventListener('storage', syncBrandInfo);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const restoreAuthentication = async () => {
      try {
        const confirmedUser = await AuthService.completeEmailConfirmation();
        const notice = AuthService.consumeConfirmationNotice();
        if (notice && !cancelled) {
          setEmailConfirmationNotice({
            type: notice.status === 'confirmed' ? 'success' : notice.status === 'already_verified' ? 'info' : 'error',
            message: notice.message,
          });
          if (!confirmedUser) {
            setIsAuthModalOpen(true);
            setAuthMode('login');
          }
        }

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
              console.warn('[App] Gagal memuat data akun:', error);
            });
        }
        else if (!cancelled) {
          const localUser = StorageService.getUser();
          if (localUser && localUser.id && !StorageService.isGuestUserId(localUser.id)) {
            setUser(localUser);
            setIsOnboarded(true);
          } else {
            StorageService.clearGuestSession();
            setUser(DEFAULT_USER);
            setIsOnboarded(false);
          }
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
    if (!isOnboarded || StorageService.isGuestUserId(user.id)) return;
    let active = true;
    const syncAccountData = async () => {
      const currentUser = StorageService.getUser();
      await SocialSyncService.syncMember(currentUser);
      const submissionsSynced = await SocialSyncService.pullSocialData(currentUser);
      if (active && submissionsSynced) {
        const latestUser = StorageService.getUser();
        const reconciledUser = StorageService.reconcileUserPoints(latestUser);
        if (reconciledUser.points !== latestUser.points) {
          setUser(reconciledUser);
          void AuthService.updateProfileMetadata({ points: reconciledUser.points })
            .catch((error: unknown) => console.warn('[App] Gagal menyimpan poin hasil rekonsiliasi:', error));
        }
      }
    };
    const handlePageVisible = () => {
      if (document.visibilityState === 'visible') void syncAccountData();
    };
    void syncAccountData();
    const memberCountRefresh = window.setInterval(() => {
      void SocialSyncService.refreshCommunityMemberCounts()
        .catch((error: unknown) => console.warn('[App] Gagal memperbarui jumlah anggota:', error));
    }, 60_000);
    window.addEventListener('focus', handlePageVisible);
    document.addEventListener('visibilitychange', handlePageVisible);
    return () => {
      active = false;
      window.clearInterval(memberCountRefresh);
      window.removeEventListener('focus', handlePageVisible);
      document.removeEventListener('visibilitychange', handlePageVisible);
    };
  }, [isOnboarded, user.id, user.communityId]);

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
          console.warn('[App] Gagal memperbarui data akun:', error);
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
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={currentTab}
          initial={{ opacity: 0, y: 14, scale: 0.995, filter: 'blur(3px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -10, scale: 0.995, filter: 'blur(2px)' }}
          transition={{
            duration: 0.28,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="w-full will-change-transform"
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
    StorageService.clearGuestSession();
    AuthService.signOut();
    SharedDataService.disconnect();
    StorageService.setOnboarded(false);
    setUser(DEFAULT_USER);
    setIsOnboarded(false);
    setCurrentTab('home');
    setIsAuthModalOpen(false);
  };

  if (isAuthLoading || isBrandLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#FAF6EC] dark:bg-[#0F2A15] text-sm font-semibold text-[#2E6B34] dark:text-emerald-400">
        Memuat aplikasi...
      </div>
    );
  }

  if (!isOnboarded && portal !== 'user') {
    return (
      <div className="min-h-dvh bg-[#FAF6EC] dark:bg-[#0F2A15]">
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
                console.warn('[App] Gagal memuat data akun:', error);
              });
          }}
        />
      </div>
    );
  }

  if (portal === 'admin' && user.role === 'admin') {
    return <AdminDashboardPage user={user} onLogout={handleLogout} />;
  }

  if (portal === 'leader' && user.role === 'pemimpin') {
    return (
      <div className="min-h-dvh bg-[#FAF6EC] dark:bg-[#0F2A15]">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#2E6B34]/15 dark:border-[#2E6B34]/30 bg-[#FAF6EC]/95 dark:bg-[#0F2A15]/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#1F2A1F] dark:text-white">{user.communityName}</p>
            <p className="text-xs text-[#7A5230] dark:text-emerald-400">Portal Pemimpin Organisasi</p>
          </div>
          <button onClick={handleLogout} className="min-h-11 rounded-xl border border-gray-200 dark:border-white/10 px-3 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-[#142518]">
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
    <div className="min-h-screen bg-[#FAF6EC] dark:bg-[#0F2A15] text-[#1F2A1F] dark:text-white flex flex-col font-sans">
      <div className="app-container flex flex-col">
        {/* Offline Connectivity Notification */}
        <OfflineIndicator />

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
          onGuestLogin={(guestUser) => {
            setUser(guestUser);
            setIsOnboarded(true);
            setSuccessToast('✨ Masuk sebagai Tamu Panitia Penilai! Seluruh fitur terbuka.');
            setTimeout(() => setSuccessToast(null), 3500);
          }}
        />

        {/* Email Confirmation Notice Banner */}
        {emailConfirmationNotice && (
          <div className="mx-auto my-3 flex w-full max-w-[1120px] items-center justify-between gap-3 rounded-2xl border border-[#2E6B34]/30 bg-white/90 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3 min-w-0">
              {emailConfirmationNotice.type === 'success' ? (
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#2E6B34]">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
              ) : (
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <Mail className="h-5 w-5" />
                </span>
              )}
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-[#1F2A1F]">
                  {emailConfirmationNotice.type === 'success' ? 'Konfirmasi Email Berhasil' : 'Pemberitahuan Akun'}
                </p>
                <p className="text-xs text-gray-600 truncate sm:whitespace-normal">
                  {emailConfirmationNotice.message}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEmailConfirmationNotice(null)}
              className="flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Sub-navigation bar when in auxiliary views */}
        {!['home', 'threads', 'challenges', 'garden', 'community', 'profile'].includes(currentTab) && (
          <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between border-b border-gray-200 dark:border-[#2E6B34]/30 bg-white/60 dark:bg-[#142518]/90 px-4 py-2 text-xs">
            <button
              onClick={() => setCurrentTab('home')}
              className="text-[#2E6B34] dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
            >
              &larr; Kembali ke Beranda
            </button>
            <span className="font-semibold text-gray-500 dark:text-gray-300 capitalize">
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
                  console.warn('[App] Gagal memuat data akun:', error);
                });
            }}
          />
        )}

        {/* Customizable Launch / Splash Screen */}
        <LaunchScreen />

        {/* Ambient Lake Toba Nature Soundscape Player */}
        <AmbientAudioPlayer tintColor={StorageService.getBrandSettings().primaryColor} />

        {/* Welcome Onboarding Tour Modal with Batak Mascot Si Toba */}
        <WelcomeTourModal
          isOpen={isTourOpen}
          onClose={() => setIsTourOpen(false)}
          userName={user.name}
        />

      </div>
    </div>
  );
}
