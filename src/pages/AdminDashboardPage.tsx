import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertCircle,
  BookOpen,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Cpu,
  Edit3,
  FileText,
  Image,
  Key,
  Leaf,
  LogOut,
  MapPin,
  MessageSquare,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Sparkles,
  Terminal,
  Trash2,
  Users,
  Wand2,
  Zap,
  Eye,
  Compass,
} from 'lucide-react';
import { Challenge, Community, EnvironmentalReport, GreenEvent, User, ThreadPost, Devotion, EcotheologyArticle } from '../types';
import { StorageService } from '../services/storageService';
import { MapLocationReviewPanel } from '../components/MapLocationReviewPanel';
import { AIService, AiReadinessCheck } from '../services/aiService';
import { SocialSyncService } from '../services/socialSyncService';
import { compressImage } from '../services/imageCompression';

type AdminSection = 'overview' | 'brand' | 'ecotheology' | 'ai' | 'threads' | 'users' | 'organizations' | 'challenges' | 'events' | 'reports' | 'locations' | 'content';

interface AdminDashboardPageProps {
  user: User;
  onLogout: () => void;
}

interface AiTestDiagnosticResult {
  ok: boolean;
  status: 'connected' | 'failed';
  timestamp: string;
  diagnostics: {
    apiKeySource: 'admin_settings' | 'environment_variable' | 'none';
    apiKeyMasked: string;
    modelRequested: string;
    modelResolved: string | null;
    latencyMs: number;
    hasSystemPrompt: boolean;
    systemPromptLength: number;
    systemPromptPreview: string;
    hasAppDescription: boolean;
    appDescriptionLength: number;
  };
  testOutput?: {
    prompt: string;
    response: string;
    instructionApplied: boolean;
  };
  audit?: Array<{
    model: string;
    status: 'ok' | 'error';
    code?: number;
    error?: string;
    latencyMs?: number;
  }>;
  notice?: string;
  error?: {
    code: number;
    message: string;
    suggestion: string;
  };
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ user, onLogout }) => {
  const [section, setSection] = useState<AdminSection>('overview');
  const [brand, setBrand] = useState(StorageService.getBrandSettings());
  const [communities, setCommunities] = useState(StorageService.getCommunities());
  const [challenges, setChallenges] = useState(StorageService.getChallenges());
  const [events, setEvents] = useState(StorageService.getEvents());
  const [reports, setReports] = useState(StorageService.getReports());
  const [threads, setThreads] = useState<ThreadPost[]>(() => StorageService.getThreads());
  const [threadFilter, setThreadFilter] = useState<'all' | 'ide' | 'keluhan'>('all');
  const [organizationName, setOrganizationName] = useState('');
  const [organizationCategory, setOrganizationCategory] = useState<Community['category']>('Komunitas Warga');
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeDescription, setChallengeDescription] = useState('');
  const [notice, setNotice] = useState('');

  // Daily Devotions Management State
  const [devotions, setDevotions] = useState<Devotion[]>(() => StorageService.getDevotions());
  const [editingDevotionId, setEditingDevotionId] = useState<string | null>(null);
  const [devotionTitle, setDevotionTitle] = useState('');
  const [devotionScripture, setDevotionScripture] = useState('');
  const [devotionVerseText, setDevotionVerseText] = useState('');
  const [devotionContent, setDevotionContent] = useState('');
  const [devotionCallToAction, setDevotionCallToAction] = useState('');
  const [devotionBatakWisdom, setDevotionBatakWisdom] = useState('');
  const [devotionDate, setDevotionDate] = useState(() => StorageService.getTodayDateString());
  const [devotionReadingTime, setDevotionReadingTime] = useState(1);

  // Devotion Generator State
  const [aiDevotionTopic, setAiDevotionTopic] = useState('');
  const [generatingDevotion, setGeneratingDevotion] = useState(false);
  const [aiDevotionError, setAiDevotionError] = useState<string | null>(null);
  const [aiDevotionSuccess, setAiDevotionSuccess] = useState<string | null>(null);

  // Ecotheology Articles Management State
  const [ecotheologyList, setEcotheologyList] = useState<EcotheologyArticle[]>(() =>
    StorageService.getEcotheologyArticles()
  );
  const [editingEcoId, setEditingEcoId] = useState<string | null>(null);
  const [ecoTitle, setEcoTitle] = useState('');
  const [ecoCategory, setEcoCategory] = useState<EcotheologyArticle['category']>('mandatum_creationis');
  const [ecoSummary, setEcoSummary] = useState('');
  const [ecoContent, setEcoContent] = useState('');
  const [ecoScriptureRef, setEcoScriptureRef] = useState('');
  const [ecoScriptureText, setEcoScriptureText] = useState('');
  const [ecoBatakWisdom, setEcoBatakWisdom] = useState('');
  const [ecoAuthor, setEcoAuthor] = useState('Pusat Studi Ekoteologi IAKN Tarutung');
  const [ecoActionCall, setEcoActionCall] = useState('');
  const [ecoTopicPrompt, setEcoTopicPrompt] = useState('');
  const [generatingEco, setGeneratingEco] = useState(false);
  const [ecoAssistantSuccess, setEcoAssistantSuccess] = useState<string | null>(null);
  const [ecoAssistantError, setEcoAssistantError] = useState<string | null>(null);

  // Intelligent Service Connection Diagnostics & Readiness state
  const [testingAi, setTestingAi] = useState(false);
  const [testResult, setTestResult] = useState<AiTestDiagnosticResult | null>(null);
  const [testCustomPrompt, setTestCustomPrompt] = useState('Perkenalkan dirimu dalam 1 kalimat dan sebutkan namamu sesuai instruksi sistem.');
  const [aiReadiness, setAiReadiness] = useState<AiReadinessCheck>({
    ready: true,
    status: 'checking',
    message: 'Memeriksa Layanan...',
    lastChecked: '',
  });

  // Direct manual test trigger state
  const [directTriggerRunning, setDirectTriggerRunning] = useState(false);
  const [directTriggerResult, setDirectTriggerResult] = useState<{
    status: number;
    ok: boolean;
    durationMs: number;
    rawText: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const verifyAi = async () => {
      setAiReadiness((prev) => ({ ...prev, status: 'checking', message: 'Memeriksa Layanan...' }));
      const res = await AIService.checkAiHealth(brand);
      if (!cancelled) {
        setAiReadiness({
          ...res,
          message: res.status === 'ready' ? 'Layanan Cerdas Aktif' : res.status === 'checking' ? 'Memeriksa Layanan...' : 'Layanan Cerdas Terputus',
        });
      }
    };
    verifyAi();
    return () => {
      cancelled = true;
    };
  }, [brand.geminiApiKey, brand.geminiModel, brand.aiSystemPrompt, brand.description]);

  const notify = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(''), 2800);
  };

  const handleManualTestTrigger = async () => {
    setDirectTriggerRunning(true);
    setDirectTriggerResult(null);
    const start = performance.now();
    try {
      const res = await fetch('/api/test-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: brand.geminiApiKey?.trim() || undefined,
          model: brand.geminiModel?.trim() || undefined,
          systemPrompt: brand.aiSystemPrompt?.trim() || undefined,
          testPrompt: 'PING TEST: Berikan respon 1 kalimat konfirmasi bahwa sistem cerdas siap beroperasi.',
        }),
      });
      const durationMs = Math.round(performance.now() - start);
      const text = await res.text();
      setDirectTriggerResult({
        status: res.status,
        ok: res.ok,
        durationMs,
        rawText: text,
      });
      notify(res.ok ? '⚡ Uji Pemicu Langsung selesai (HTTP 200).' : `⚠️ Uji Pemicu Langsung HTTP ${res.status}.`);
    } catch (e) {
      const durationMs = Math.round(performance.now() - start);
      setDirectTriggerResult({
        status: 0,
        ok: false,
        durationMs,
        rawText: `Error jaringan / fetch gagal: ${e instanceof Error ? e.message : 'Unknown error'}`,
      });
      notify('❌ Uji pemicu langsung gagal menghubungi server.');
    } finally {
      setDirectTriggerRunning(false);
    }
  };

  const handleTestAi = async () => {
    setTestingAi(true);
    setTestResult(null);
    try {
      const response = await fetch('/api/test-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: brand.geminiApiKey?.trim() || undefined,
          model: brand.geminiModel?.trim() || undefined,
          systemPrompt: brand.aiSystemPrompt?.trim() || undefined,
          appDescription: brand.description?.trim() || undefined,
          testPrompt: testCustomPrompt?.trim() || undefined,
        }),
      });
      const data = await response.json();
      setTestResult(data);
      setAiReadiness({
        ready: Boolean(data.ok),
        status: data.ok ? 'ready' : 'error',
        message: data.ok ? 'Layanan Cerdas Aktif' : 'Layanan Cerdas Terputus',
        model: data.diagnostics?.modelResolved || data.diagnostics?.modelRequested,
        latencyMs: data.diagnostics?.latencyMs,
        errorDetails: data.error?.message,
        lastChecked: new Date().toLocaleTimeString(),
      });
      if (data.ok) {
        notify('✅ Uji koneksi layanan berhasil!');
      } else {
        notify('⚠️ Uji koneksi layanan mengembalikan kendala.');
      }
    } catch (err) {
      setTestResult({
        ok: false,
        status: 'failed',
        timestamp: new Date().toISOString(),
        diagnostics: {
          apiKeySource: brand.geminiApiKey?.trim() ? 'admin_settings' : 'none',
          apiKeyMasked: brand.geminiApiKey ? '***' : '(Tidak Ada)',
          modelRequested: brand.geminiModel || 'gemini-3.5-flash',
          modelResolved: null,
          latencyMs: 0,
          hasSystemPrompt: Boolean(brand.aiSystemPrompt?.trim()),
          systemPromptLength: brand.aiSystemPrompt?.trim().length || 0,
          systemPromptPreview: brand.aiSystemPrompt?.trim().slice(0, 100) || '',
          hasAppDescription: Boolean(brand.description?.trim()),
          appDescriptionLength: brand.description?.trim().length || 0,
        },
        error: {
          code: 500,
          message: err instanceof Error ? err.message : 'Gagal menghubungi server.',
          suggestion: 'Pastikan server dev atau backend aktif.',
        },
      });
      setAiReadiness({
        ready: false,
        status: 'error',
        message: 'Layanan Cerdas Terputus',
        errorDetails: err instanceof Error ? err.message : 'Gagal menghubungi server.',
        lastChecked: new Date().toLocaleTimeString(),
      });
      notify('❌ Gagal menghubungi endpoint server.');
    } finally {
      setTestingAi(false);
    }
  };

  const deleteThread = (id: string) => {
    StorageService.deleteThread(id);
    setThreads(StorageService.getThreads());
    notify('Postingan berhasil dihapus.');
  };

  const updateThreadStatus = (id: string, status: 'aktif' | 'ditindaklanjuti' | 'selesai') => {
    StorageService.updateThreadStatus(id, status);
    setThreads(StorageService.getThreads());
    notify(`Status postingan diperbarui menjadi: ${status}.`);
  };

  const saveBrand = async () => {
    StorageService.saveBrandSettings(brand);
    await SocialSyncService.syncBrand(brand);
    notify('Pengaturan aplikasi & logo tersimpan dan disinkronkan ke seluruh pengguna.');
    void AIService.checkAiHealth(brand).then((res) => {
      setAiReadiness({
        ...res,
        message: res.status === 'ready' ? 'Layanan Cerdas Aktif' : res.status === 'checking' ? 'Memeriksa Layanan...' : 'Layanan Cerdas Terputus',
      });
    });
  };

  // Ecotheology handlers
  const resetEcoForm = () => {
    setEditingEcoId(null);
    setEcoTitle('');
    setEcoCategory('mandatum_creationis');
    setEcoSummary('');
    setEcoContent('');
    setEcoScriptureRef('');
    setEcoScriptureText('');
    setEcoBatakWisdom('');
    setEcoAuthor('Pusat Studi Ekoteologi IAKN Tarutung');
    setEcoActionCall('');
    setEcoAssistantSuccess(null);
    setEcoAssistantError(null);
  };

  const handleEditEco = (article: EcotheologyArticle) => {
    setEditingEcoId(article.id);
    setEcoTitle(article.title);
    setEcoCategory(article.category);
    setEcoSummary(article.summary);
    setEcoContent(article.content);
    setEcoScriptureRef(article.scriptureRef);
    setEcoScriptureText(article.scriptureText);
    setEcoBatakWisdom(article.batakWisdom);
    setEcoAuthor(article.author);
    setEcoActionCall(article.actionCall || '');
    setEcoAssistantSuccess(null);
    setEcoAssistantError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteEco = async (id: string) => {
    if (window.confirm('Yakin ingin menghapus artikel ekoteologi ini?')) {
      StorageService.deleteEcotheologyArticle(id);
      const updated = StorageService.getEcotheologyArticles();
      setEcotheologyList(updated);
      await SocialSyncService.syncEcotheologyArticles(updated);
      if (editingEcoId === id) resetEcoForm();
      notify('Artikel ekoteologi berhasil dihapus.');
    }
  };

  const handleSaveEco = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ecoTitle.trim() || !ecoContent.trim()) {
      setEcoAssistantError('Judul dan isi artikel ekoteologi wajib diisi.');
      return;
    }

    const item: EcotheologyArticle = {
      id: editingEcoId || `eco-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: ecoTitle.trim(),
      category: ecoCategory,
      summary: ecoSummary.trim() || ecoContent.trim().slice(0, 140) + '...',
      content: ecoContent.trim(),
      scriptureRef: ecoScriptureRef.trim(),
      scriptureText: ecoScriptureText.trim(),
      batakWisdom: ecoBatakWisdom.trim() || 'Marsiadapari mamparbuehon denggan: Gotong royong merawat ciptaan membuahkan berkat.',
      author: ecoAuthor.trim() || 'Civitas IAKN Tarutung',
      publishedAt: new Date().toISOString().split('T')[0],
      actionCall: ecoActionCall.trim(),
      isFeatured: true,
    };

    StorageService.saveEcotheologyArticle(item);
    const updated = StorageService.getEcotheologyArticles();
    setEcotheologyList(updated);
    await SocialSyncService.syncEcotheologyArticles(updated);
    notify(editingEcoId ? 'Artikel ekoteologi berhasil diperbarui.' : 'Artikel ekoteologi baru berhasil diterbitkan!');
    resetEcoForm();
  };

  const handleGenerateEcoContent = async () => {
    if (!ecoTopicPrompt.trim()) {
      setEcoAssistantError('Tuliskan topik atau tema alam yang ingin disusun naskahnya.');
      return;
    }

    setGeneratingEco(true);
    setEcoAssistantError(null);
    setEcoAssistantSuccess(null);

    try {
      const res = await AIService.generateReflection(
        ecoTopicPrompt.trim(),
        'Civitas Akademika IAKN Tarutung',
        'Komunitas Marsiadapari Hijau'
      );
      const d = res.data;
      setEcoTitle(d.title || `Refleksi Ekoteologi: ${ecoTopicPrompt.trim()}`);
      setEcoScriptureRef(d.scripture || 'Kejadian 2:15');
      setEcoScriptureText(d.verse_text || 'Tuhan Allah mengambil manusia itu dan menempatkannya dalam taman Eden untuk mengusahakan dan memelihara taman itu.');
      setEcoContent(d.body || '');
      setEcoSummary(d.body ? d.body.slice(0, 160) + '...' : '');
      setEcoBatakWisdom(d.batak_wisdom || 'Marsiadapari mamparbuehon denggan: Kerja bersama merawat alam melahirkan buah kedamaian.');
      setEcoActionCall(d.call_to_action || 'Lakukan gotong royong pembersihan lingkungan pekan ini.');
      setEcoAssistantSuccess('✨ Naskah ekoteologi & ayat Alkitab berhasil disusun secara cerdas! Silakan periksa atau sesuaikan draf di bawah, lalu klik Terbitkan.');
    } catch (err) {
      setEcoAssistantError(err instanceof Error ? err.message : 'Gagal menyusun naskah ekoteologi otomatis.');
    } finally {
      setGeneratingEco(false);
    }
  };

  const addOrganization = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = organizationName.trim();
    if (name.length < 2) return;
    const newCommunity: Community = {
      id: `org-${crypto.randomUUID()}`,
      name,
      category: organizationCategory,
      location: 'Tapanuli Utara',
      memberCount: 0,
      totalPoints: 0,
      treesPlanted: 0,
      treeTarget: 200,
      actionCount: 0,
      actionTarget: 500,
      description: 'Organisasi yang dikelola di Marsiadapari Hijau.',
    };
    const updated = [...communities, newCommunity];
    StorageService.saveCommunities(updated);
    setCommunities(updated);
    setOrganizationName('');
    notify('Organisasi ditambahkan.');
  };

  const deleteOrganization = (id: string) => {
    const updated = communities.filter((community) => community.id !== id);
    StorageService.saveCommunities(updated);
    setCommunities(updated);
    notify('Organisasi dihapus dari penyimpanan perangkat ini.');
  };

  const addChallenge = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = challengeTitle.trim();
    const description = challengeDescription.trim();
    if (title.length < 3 || !description) return;
    const newChallenge: Challenge = {
      id: `challenge-${crypto.randomUUID()}`,
      title,
      category: 'harian',
      difficulty: 'Mudah',
      points: 10,
      iconName: 'Leaf',
      description,
      instruction: description,
      estimatedImpact: {},
    };
    const updated = [newChallenge, ...challenges];
    StorageService.saveChallenges(updated);
    setChallenges(updated);
    setChallengeTitle('');
    setChallengeDescription('');
    notify('Tantangan ditambahkan.');
  };

  const deleteChallenge = (id: string) => {
    const updated = challenges.filter((challenge) => challenge.id !== id);
    StorageService.saveChallenges(updated);
    setChallenges(updated);
    notify('Tantangan dihapus.');
  };

  const deleteEvent = (id: string) => {
    const updated = events.filter((item) => item.id !== id);
    StorageService.saveEvents(updated);
    setEvents(updated);
    notify('Kegiatan dihapus.');
  };

  const updateReportStatus = (report: EnvironmentalReport, status: EnvironmentalReport['status']) => {
    const updated = reports.map((item) => item.id === report.id ? { ...item, status } : item);
    StorageService.saveReports(updated);
    setReports(updated);
    notify('Status laporan diperbarui.');
  };

  const resetDevotionForm = () => {
    setEditingDevotionId(null);
    setDevotionTitle('');
    setDevotionScripture('');
    setDevotionVerseText('');
    setDevotionContent('');
    setDevotionCallToAction('');
    setDevotionBatakWisdom('');
    setDevotionDate(StorageService.getTodayDateString());
    setDevotionReadingTime(1);
    setAiDevotionError(null);
    setAiDevotionSuccess(null);
  };

  const handleEditDevotion = (dev: Devotion) => {
    setEditingDevotionId(dev.id);
    setDevotionTitle(dev.title);
    setDevotionScripture(dev.scripture);
    setDevotionVerseText(dev.verseText);
    setDevotionContent(dev.content);
    setDevotionCallToAction(dev.callToAction);
    setDevotionBatakWisdom(dev.batakWisdom);
    setDevotionDate(dev.date || StorageService.getTodayDateString());
    setDevotionReadingTime(dev.readingTime || 1);
    setAiDevotionError(null);
    setAiDevotionSuccess(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteDevotion = (id: string) => {
    if (window.confirm('Yakin ingin menghapus renungan ini?')) {
      StorageService.deleteDevotion(id);
      setDevotions(StorageService.getDevotions());
      if (editingDevotionId === id) resetDevotionForm();
      notify('Renungan berhasil dihapus.');
    }
  };

  const handleSaveDevotion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!devotionTitle.trim() || !devotionScripture.trim() || !devotionContent.trim()) {
      setAiDevotionError('Judul, ayat Alkitab, dan isi renungan wajib diisi.');
      return;
    }

    const item: Devotion = {
      id: editingDevotionId || `devotion-${Date.now()}`,
      title: devotionTitle.trim(),
      scripture: devotionScripture.trim(),
      verseText: devotionVerseText.trim(),
      content: devotionContent.trim(),
      callToAction: devotionCallToAction.trim(),
      batakWisdom: devotionBatakWisdom.trim() || 'Marsiadapari mamparbuehon denggan: Gotong royong merawat ciptaan melahirkan sukacita.',
      readingTime: Number(devotionReadingTime) || 1,
      date: devotionDate || StorageService.getTodayDateString(),
      isCustom: true,
    };

    StorageService.saveDevotion(item);
    setDevotions(StorageService.getDevotions());
    notify(editingDevotionId ? 'Renungan berhasil diperbarui.' : 'Renungan harian berhasil disimpan!');
    resetDevotionForm();
  };

  const handleGenerateDevotionWithAi = async () => {
    if (!aiDevotionTopic.trim()) {
      setAiDevotionError('Tuliskan topik atau tema renungan yang ingin disusun.');
      return;
    }

    setGeneratingDevotion(true);
    setAiDevotionError(null);
    setAiDevotionSuccess(null);

    try {
      const result = await AIService.generateReflection(
        aiDevotionTopic.trim(),
        'Jemaat Marsiadapari',
        'IAKN Tarutung & HKBP Danau Toba'
      );

      if (result.data) {
        setDevotionTitle(result.data.title || '');
        setDevotionScripture(result.data.scripture || '');
        setDevotionVerseText(result.data.verse_text || '');
        setDevotionContent(result.data.body || '');
        setDevotionCallToAction(result.data.call_to_action || '');
        setDevotionBatakWisdom(result.data.batak_wisdom || '');
        setDevotionReadingTime(result.data.reading_time_minutes || 1);
        setAiDevotionSuccess('✨ Renungan ekoteologi berhasil disusun secara cerdas! Periksa atau sesuaikan draf di bawah, lalu klik Simpan.');
      }
    } catch (err) {
      setAiDevotionError(err instanceof Error ? err.message : 'Gagal menghasilkan renungan otomatis.');
    } finally {
      setGeneratingDevotion(false);
    }
  };

  const navItems: Array<{ id: AdminSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'overview', label: 'Ringkasan', icon: ClipboardList },
    { id: 'brand', label: 'Identitas & Layar Pembuka', icon: Image },
    { id: 'ecotheology', label: 'Ekoteologi & Alam', icon: Leaf },
    { id: 'content', label: 'Renungan Harian', icon: BookOpen },
    { id: 'ai', label: 'Layanan Cerdas & Otomasi', icon: Cpu },
    { id: 'threads', label: 'Threads & Keluhan', icon: MessageSquare },
    { id: 'users', label: 'Pengguna', icon: Users },
    { id: 'organizations', label: 'Organisasi', icon: Building2 },
    { id: 'challenges', label: 'Tantangan', icon: Leaf },
    { id: 'events', label: 'Kegiatan', icon: CalendarDays },
    { id: 'reports', label: 'Laporan', icon: ClipboardList },
    { id: 'locations', label: 'Titik Peta', icon: MapPin },
  ];

  return (
    <div className="min-h-dvh bg-[#F3F6F1] text-[#1F2A1F]">
      <header className="sticky top-0 z-30 border-b border-[#2E6B34]/15 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#2E6B34] text-white">
              {brand.logoUrl && brand.logoUrl.trim() ? (
                <img src={brand.logoUrl} alt="" className="h-full w-full object-contain" />
              ) : (
                <Leaf className="h-5 w-5 text-[#B9E0A9]" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{brand.name || 'Marsiadapari Hijau'}</p>
              <p className="text-xs text-gray-500">Panel administrator · {user.contact}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Live Service Status Indicator Badge */}
            <button
              type="button"
              onClick={() => setSection('ai')}
              title={
                aiReadiness.status === 'ready'
                  ? `Layanan Aktif (${aiReadiness.latencyMs ? aiReadiness.latencyMs + 'ms' : 'normal'}). Klik untuk buka Konfigurasi Layanan.`
                  : aiReadiness.status === 'checking'
                  ? 'Sedang memeriksa status operasional layanan...'
                  : `Kendala Layanan: ${aiReadiness.errorDetails || aiReadiness.message}. Klik untuk melihat diagnosa & solusi.`
              }
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer ${
                aiReadiness.status === 'ready'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400'
                  : aiReadiness.status === 'checking'
                  ? 'border-gray-200 bg-gray-50 text-gray-600'
                  : 'border-red-300 bg-red-50 text-red-800 hover:bg-red-100 hover:border-red-400'
              }`}
            >
              {aiReadiness.status === 'ready' ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                  </span>
                  <span>Layanan Aktif</span>
                </>
              ) : aiReadiness.status === 'checking' ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin text-gray-500" />
                  <span className="hidden sm:inline">Memeriksa Layanan...</span>
                  <span className="sm:hidden">Memeriksa...</span>
                </>
              ) : (
                <>
                  <span className="flex h-2.5 w-2.5 rounded-full bg-red-600"></span>
                  <span>Layanan Terputus</span>
                </>
              )}
            </button>

            <button onClick={onLogout} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-gray-200 px-3 text-xs font-bold text-gray-600 hover:bg-gray-50">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-5 px-3 py-4 sm:px-6 sm:py-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-8 lg:px-8">
        <nav aria-label="Menu admin" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-bold transition lg:w-full ${
                section === id ? 'bg-[#2E6B34] text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-[#EAF3E6] hover:text-[#2E6B34]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
          <div className="hidden rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900 lg:block">
            Pastikan status sinkronisasi di bagian atas halaman menunjukkan bahwa database bersama sudah tersambung.
          </div>
        </nav>

        <main className="min-w-0 space-y-5 pb-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7A5230]">Administrasi aplikasi</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              {navItems.find((item) => item.id === section)?.label}
            </h1>
          </div>

          {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

          {section === 'overview' && (
            <>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
                {[
                  { label: 'Organisasi', value: communities.length, icon: Building2 },
                  { label: 'Threads / Aspirasi', value: threads.length, icon: MessageSquare },
                  { label: 'Tantangan', value: challenges.length, icon: Leaf },
                  { label: 'Kegiatan', value: events.length, icon: CalendarDays },
                  { label: 'Laporan', value: reports.length, icon: ClipboardList },
                ].map(({ label, value, icon: Icon }) => (
                  <article key={label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <Icon className="h-5 w-5 text-[#2E6B34]" />
                    <p className="mt-3 text-2xl font-extrabold">{value}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                  </article>
                ))}
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                Panel ini terpisah dari tampilan pengguna biasa. Perubahan bersama akan terlihat setelah status sinkronisasi menunjukkan database terhubung.
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button onClick={() => setSection('organizations')} className="rounded-2xl border border-gray-200 bg-white p-4 text-left hover:border-[#2E6B34]">
                  <Building2 className="h-5 w-5 text-[#2E6B34]" />
                  <span className="mt-2 block font-bold">Kelola organisasi</span>
                  <span className="text-xs text-gray-500">Tambah dan hapus organisasi</span>
                </button>
                <button onClick={() => setSection('brand')} className="rounded-2xl border border-gray-200 bg-white p-4 text-left hover:border-[#2E6B34]">
                  <Image className="h-5 w-5 text-[#2E6B34]" />
                  <span className="mt-2 block font-bold">Ubah identitas aplikasi</span>
                  <span className="text-xs text-gray-500">Nama dan gambar logo</span>
                </button>
              </div>
            </>
          )}

          {section === 'brand' && (
            <section className="space-y-5">
              <div className="max-w-3xl space-y-5 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
                <div>
                  <h2 className="font-bold">Identitas & Tampilan Aplikasi</h2>
                  <p className="mt-1 text-xs leading-5 text-gray-500">Atur nama, logo, tagline, warna, kontak, dan tautan sosial. Logo bisa pakai URL gambar (png/jpg/jpeg/webp/svg) atau data:image/....</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1.5 text-xs font-bold sm:col-span-2">
                    Nama aplikasi
                    <input value={brand.name || ''} onChange={(event) => setBrand({ ...brand, name: event.target.value })} maxLength={60} className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]" />
                  </label>
                  <label className="block space-y-1.5 text-xs font-bold sm:col-span-2">
                    Tagline
                    <input value={brand.tagline || ''} onChange={(event) => setBrand({ ...brand, tagline: event.target.value })} className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]" />
                  </label>
                  <label className="block space-y-1.5 text-xs font-bold sm:col-span-2">
                    Deskripsi aplikasi
                    <textarea value={brand.description || ''} onChange={(event) => setBrand({ ...brand, description: event.target.value })} rows={2} className="w-full rounded-xl border border-gray-300 p-3 text-sm font-normal outline-none focus:border-[#2E6B34]" />
                  </label>
                  <label className="block space-y-1.5 text-xs font-bold sm:col-span-2">
                    Upload logo (PNG/JPG/JPEG/WebP/GIF) atau pakai URL/data URL
                    <input type="file" accept="image/*" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const compressed = await compressImage(file, 256, 256, 0.85);
                        setBrand({ ...brand, logoUrl: compressed.dataUrl });
                        notify('Gambar logo dikompresi & disiapkan.');
                      } catch {
                        const reader = new FileReader();
                        reader.onload = () => {
                          const result = typeof reader.result === 'string' ? reader.result : '';
                          setBrand({ ...brand, logoUrl: result });
                        };
                        reader.readAsDataURL(file);
                      }
                    }} className="min-h-11 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm font-normal" />
                  </label>
                  <label className="block space-y-1.5 text-xs font-bold sm:col-span-2">
                    URL gambar logo atau data:image/...
                    <input value={brand.logoUrl || ''} onChange={(event) => setBrand({ ...brand, logoUrl: event.target.value })} placeholder="https://contoh.id/logo.png atau data:image/png;base64,..." className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]" />
                  </label>
                  <label className="block space-y-1.5 text-xs font-bold">
                    Warna utama
                    <input type="color" value={brand.primaryColor || '#2E6B34'} onChange={(event) => setBrand({ ...brand, primaryColor: event.target.value })} className="h-11 w-full rounded-xl border border-gray-300 px-2" />
                  </label>
                  <label className="block space-y-1.5 text-xs font-bold">
                    Warna sekunder
                    <input type="color" value={brand.secondaryColor || '#A8D5A2'} onChange={(event) => setBrand({ ...brand, secondaryColor: event.target.value })} className="h-11 w-full rounded-xl border border-gray-300 px-2" />
                  </label>
                  <label className="block space-y-1.5 text-xs font-bold">
                    Email kontak
                    <input value={brand.contactEmail || ''} onChange={(event) => setBrand({ ...brand, contactEmail: event.target.value })} className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]" />
                  </label>
                  <label className="block space-y-1.5 text-xs font-bold">
                    No. Telepon
                    <input value={brand.contactPhone || ''} onChange={(event) => setBrand({ ...brand, contactPhone: event.target.value })} className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]" />
                  </label>
                  <label className="block space-y-1.5 text-xs font-bold sm:col-span-2">
                    Alamat
                    <input value={brand.address || ''} onChange={(event) => setBrand({ ...brand, address: event.target.value })} className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]" />
                  </label>
                  <label className="block space-y-1.5 text-xs font-bold">
                    Facebook URL
                    <input value={brand.facebookUrl || ''} onChange={(event) => setBrand({ ...brand, facebookUrl: event.target.value })} className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]" />
                  </label>
                  <label className="block space-y-1.5 text-xs font-bold">
                    Instagram URL
                    <input value={brand.instagramUrl || ''} onChange={(event) => setBrand({ ...brand, instagramUrl: event.target.value })} className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]" />
                  </label>
                  <label className="block space-y-1.5 text-xs font-bold">
                    YouTube URL
                    <input value={brand.youtubeUrl || ''} onChange={(event) => setBrand({ ...brand, youtubeUrl: event.target.value })} className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]" />
                  </label>
                  <label className="block space-y-1.5 text-xs font-bold">
                    Website URL
                    <input value={brand.websiteUrl || ''} onChange={(event) => setBrand({ ...brand, websiteUrl: event.target.value })} className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]" />
                  </label>
                  <label className="block space-y-1.5 text-xs font-bold sm:col-span-2">
                    Teks footer
                    <input value={brand.footerText || ''} onChange={(event) => setBrand({ ...brand, footerText: event.target.value })} className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]" />
                  </label>
                </div>

                {/* Launch Screen Settings Sub-panel */}
                <div className="mt-6 border-t border-gray-200 pt-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Eye className="h-4 w-4 text-[#2E6B34]" />
                        Pengaturan Layar Pembuka (Launch Screen)
                      </h3>
                      <p className="text-xs text-gray-500">
                        Tampilan splash saat pengguna membuka aplikasi pertama kali.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('mh-preview-launch-screen', { detail: brand.launchScreen }));
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#2E6B34] bg-[#EAF3E6] px-3 py-1.5 text-xs font-bold text-[#2E6B34] hover:bg-[#2E6B34] hover:text-white transition cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" /> Pratinjau Layar Pembuka
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center gap-2 text-xs font-bold sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={brand.launchScreen?.enabled !== false}
                        onChange={(e) => setBrand({
                          ...brand,
                          launchScreen: {
                            ...(brand.launchScreen || {}),
                            enabled: e.target.checked,
                            title: brand.launchScreen?.title || brand.name || 'Marsiadapari Hijau',
                            subtitle: brand.launchScreen?.subtitle || 'Gerakan Ekoteologi & Aksi Iklim Bona Pasogit',
                            verseText: brand.launchScreen?.verseText || 'Tuhan Allah mengambil manusia itu dan menempatkannya dalam taman Eden untuk mengusahakan dan memelihara taman itu.',
                            verseRef: brand.launchScreen?.verseRef || 'Kejadian 2:15',
                            durationSeconds: brand.launchScreen?.durationSeconds || 3,
                          }
                        })}
                        className="h-4 w-4 rounded text-[#2E6B34] focus:ring-[#2E6B34]"
                      />
                      Aktifkan Layar Pembuka saat Aplikasi Dimuat
                    </label>

                    <label className="block space-y-1.5 text-xs font-bold sm:col-span-2">
                      Judul Layar Pembuka
                      <input
                        type="text"
                        value={brand.launchScreen?.title ?? (brand.name || 'Marsiadapari Hijau')}
                        onChange={(e) => setBrand({
                          ...brand,
                          launchScreen: {
                            ...(brand.launchScreen || {}),
                            enabled: brand.launchScreen?.enabled !== false,
                            title: e.target.value,
                            subtitle: brand.launchScreen?.subtitle || '',
                            verseText: brand.launchScreen?.verseText || '',
                            verseRef: brand.launchScreen?.verseRef || '',
                            durationSeconds: brand.launchScreen?.durationSeconds || 3,
                          }
                        })}
                        className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]"
                      />
                    </label>

                    <label className="block space-y-1.5 text-xs font-bold sm:col-span-2">
                      Subjudul / Tagline Pembuka
                      <input
                        type="text"
                        value={brand.launchScreen?.subtitle ?? (brand.tagline || 'Gerakan Ekoteologi & Aksi Iklim Bona Pasogit')}
                        onChange={(e) => setBrand({
                          ...brand,
                          launchScreen: {
                            ...(brand.launchScreen || {}),
                            enabled: brand.launchScreen?.enabled !== false,
                            title: brand.launchScreen?.title || brand.name || '',
                            subtitle: e.target.value,
                            verseText: brand.launchScreen?.verseText || '',
                            verseRef: brand.launchScreen?.verseRef || '',
                            durationSeconds: brand.launchScreen?.durationSeconds || 3,
                          }
                        })}
                        className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]"
                      />
                    </label>

                    <label className="block space-y-1.5 text-xs font-bold sm:col-span-2">
                      Ayat Alkitab Pijakan (Mandatum Creationis)
                      <textarea
                        rows={2}
                        value={brand.launchScreen?.verseText ?? 'Tuhan Allah mengambil manusia itu dan menempatkannya dalam taman Eden untuk mengusahakan dan memelihara taman itu.'}
                        onChange={(e) => setBrand({
                          ...brand,
                          launchScreen: {
                            ...(brand.launchScreen || {}),
                            enabled: brand.launchScreen?.enabled !== false,
                            title: brand.launchScreen?.title || brand.name || '',
                            subtitle: brand.launchScreen?.subtitle || '',
                            verseText: e.target.value,
                            verseRef: brand.launchScreen?.verseRef || '',
                            durationSeconds: brand.launchScreen?.durationSeconds || 3,
                          }
                        })}
                        className="w-full rounded-xl border border-gray-300 p-3 text-sm font-normal outline-none focus:border-[#2E6B34]"
                      />
                    </label>

                    <label className="block space-y-1.5 text-xs font-bold">
                      Referensi Ayat
                      <input
                        type="text"
                        value={brand.launchScreen?.verseRef ?? 'Kejadian 2:15'}
                        onChange={(e) => setBrand({
                          ...brand,
                          launchScreen: {
                            ...(brand.launchScreen || {}),
                            enabled: brand.launchScreen?.enabled !== false,
                            title: brand.launchScreen?.title || brand.name || '',
                            subtitle: brand.launchScreen?.subtitle || '',
                            verseText: brand.launchScreen?.verseText || '',
                            verseRef: e.target.value,
                            durationSeconds: brand.launchScreen?.durationSeconds || 3,
                          }
                        })}
                        placeholder="Contoh: Kejadian 2:15"
                        className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]"
                      />
                    </label>

                    <label className="block space-y-1.5 text-xs font-bold">
                      Durasi Tayang (Detik: 2 - 8)
                      <input
                        type="number"
                        min={2}
                        max={8}
                        value={brand.launchScreen?.durationSeconds ?? 3}
                        onChange={(e) => setBrand({
                          ...brand,
                          launchScreen: {
                            ...(brand.launchScreen || {}),
                            enabled: brand.launchScreen?.enabled !== false,
                            title: brand.launchScreen?.title || brand.name || '',
                            subtitle: brand.launchScreen?.subtitle || '',
                            verseText: brand.launchScreen?.verseText || '',
                            verseRef: brand.launchScreen?.verseRef || '',
                            durationSeconds: Math.max(2, Math.min(8, Number(e.target.value))),
                          }
                        })}
                        className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-[#F3F6F1] p-4">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-[#2E6B34] text-white">
                    {brand.logoUrl && brand.logoUrl.trim() ? <img src={brand.logoUrl} alt="Pratinjau logo" className="h-full w-full object-contain" /> : <Leaf className="h-7 w-7" />}
                  </div>
                  <div>
                    <span className="font-bold block">{brand.name || 'Marsiadapari Hijau'}</span>
                    <span className="text-xs text-gray-600">{brand.tagline || ''}</span>
                  </div>
                </div>
                <button onClick={saveBrand} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2E6B34] px-4 text-sm font-bold text-white hover:bg-[#235328]">
                  <Save className="h-4 w-4" /> Simpan semua pengaturan identitas
                </button>
              </div>
            </section>
          )}


          {section === 'ecotheology' && (
            <section className="space-y-5">
              {/* Header Card */}
              <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2E6B34]">
                      <BookOpen className="h-4 w-4" />
                      Pusat Ekoteologi &amp; Keberlanjutan Alam
                    </div>
                    <h2 className="mt-1 text-xl sm:text-2xl font-bold text-gray-900">
                      Kelola Khazanah Ekoteologi Batak Toba
                    </h2>
                    <p className="mt-1 text-xs text-gray-600 leading-relaxed max-w-3xl">
                      Kelola artikel, renungan teologi penciptaan (Mandatum Creationis Kejadian 2:15, kearifan lokal Marsiadapari, kelestarian Danau Toba). Konten ini tersinkronisasi dan tampil di Beranda jemaat, mahasiswa, &amp; seluruh pengguna.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetEcoForm}
                    className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-[#2E6B34] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#235328] transition"
                  >
                    <Plus className="h-4 w-4" /> Tulis Artikel Baru
                  </button>
                </div>
              </div>

              {/* Smart Writer Assistant Card */}
              <div className="rounded-2xl border-2 border-[#2E6B34]/30 bg-gradient-to-br from-white via-emerald-50/40 to-amber-50/40 p-4 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2E6B34]">
                  <Wand2 className="h-4 w-4" />
                  Penyusun Naskah Ekoteologi Otomatis
                </div>
                <h3 className="mt-1 text-base font-extrabold text-gray-900">
                  Rancang Refleksi &amp; Bahan Ajar Ekoteologi Berbasis Firman
                </h3>
                <p className="mt-1 text-xs text-gray-600 leading-relaxed max-w-2xl">
                  Gunakan asisten cerdas untuk memilihkan ayat Alkitab, memadukan teologi penciptaan dan falsafah Marsiadapari, serta merumuskan ajakan aksi nyata bagi kelestarian alam Danau Toba.
                </p>

                {/* Quick Topic Chips */}
                <div className="mt-3.5">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Pilih Topik Cepat:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Mandatum Creationis & Menjaga Hutan Toba',
                      'Marsiadapari Mengatasi Sampah Plastik Danau Toba',
                      'Mata Air Rura Silindung & Mazmur 104',
                      'Teologi Tanah Pusaka Batak & Keadilan Iklim',
                      'Pemberdayaan Pemuda Gereja Menanam Pohon',
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setEcoTopicPrompt(chip)}
                        className="rounded-lg border border-[#2E6B34]/25 bg-white/90 px-2.5 py-1 text-xs font-medium text-[#2E6B34] hover:bg-[#2E6B34] hover:text-white transition active:scale-95 shadow-2xs"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-2.5 sm:grid-cols-[1fr_auto]">
                  <input
                    type="text"
                    value={ecoTopicPrompt}
                    onChange={(e) => setEcoTopicPrompt(e.target.value)}
                    placeholder="Contoh: Merawat Mata Air Rura Silindung dan Kebersihan Danau Toba..."
                    className="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3.5 text-sm outline-none focus:border-[#2E6B34] focus:ring-2 focus:ring-[#2E6B34]/20"
                  />
                  <button
                    type="button"
                    disabled={generatingEco}
                    onClick={handleGenerateEcoContent}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2E6B34] px-5 text-xs font-bold text-white shadow-sm hover:bg-[#245429] disabled:opacity-60 transition active:scale-95 cursor-pointer"
                  >
                    {generatingEco ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Menyusun Naskah...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-amber-300" />
                        <span>🌾 Susun Refleksi Otomatis</span>
                      </>
                    )}
                  </button>
                </div>

                {ecoAssistantError && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{ecoAssistantError}</span>
                  </div>
                )}

                {ecoAssistantSuccess && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{ecoAssistantSuccess}</span>
                  </div>
                )}
              </div>

              {/* Form Tambah / Edit Artikel Ekoteologi */}
              <form onSubmit={handleSaveEco} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-[#2E6B34]" />
                    {editingEcoId ? 'Edit Naskah Ekoteologi' : 'Tulis / Sesuaikan Artikel Ekoteologi'}
                  </h3>
                  {editingEcoId && (
                    <button
                      type="button"
                      onClick={resetEcoForm}
                      className="text-xs font-semibold text-gray-500 hover:text-gray-800 underline"
                    >
                      Batal Edit (Buat Baru)
                    </button>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1.5 text-xs font-bold text-gray-700 sm:col-span-2">
                    Judul Artikel Ekoteologi
                    <input
                      type="text"
                      required
                      value={ecoTitle}
                      onChange={(e) => setEcoTitle(e.target.value)}
                      placeholder="Contoh: Mandatum Creationis: Mandat Merawat dan Menjaga Bona Pasogit"
                      className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]"
                    />
                  </label>

                  <label className="space-y-1.5 text-xs font-bold text-gray-700">
                    Kategori Bahasan
                    <select
                      value={ecoCategory}
                      onChange={(e) => setEcoCategory(e.target.value as any)}
                      className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]"
                    >
                      <option value="mandatum_creationis">Mandatum Creationis (Kej 2:15)</option>
                      <option value="marsiadapari_alam">Marsiadapari &amp; Gotong Royong Ciptaan</option>
                      <option value="danau_toba_lestari">Kelestarian Danau Toba &amp; Ekosistem</option>
                      <option value="teologi_tanah">Teologi Tanah Pusaka &amp; Hutan</option>
                      <option value="refleksi_pemuda">Aksi Pemuda &amp; Mahasiswa Kampus</option>
                    </select>
                  </label>

                  <label className="space-y-1.5 text-xs font-bold text-gray-700">
                    Penulis / Pengajar
                    <input
                      type="text"
                      value={ecoAuthor}
                      onChange={(e) => setEcoAuthor(e.target.value)}
                      placeholder="Contoh: Pusat Studi Ekoteologi IAKN Tarutung"
                      className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]"
                    />
                  </label>

                  <label className="space-y-1.5 text-xs font-bold text-gray-700">
                    Ayat Alkitab Pijakan
                    <input
                      type="text"
                      value={ecoScriptureRef}
                      onChange={(e) => setEcoScriptureRef(e.target.value)}
                      placeholder="Contoh: Kejadian 2:15 atau Mazmur 104:10"
                      className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]"
                    />
                  </label>

                  <label className="space-y-1.5 text-xs font-bold text-gray-700">
                    Kearifan Lokal / Falsafah Batak
                    <input
                      type="text"
                      value={ecoBatakWisdom}
                      onChange={(e) => setEcoBatakWisdom(e.target.value)}
                      placeholder="Contoh: Marsiadapari mamparbuehon denggan"
                      className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]"
                    />
                  </label>

                  <label className="block space-y-1.5 text-xs font-bold text-gray-700 sm:col-span-2">
                    Kutipan Bunyi Ayat Alkitab
                    <textarea
                      rows={2}
                      value={ecoScriptureText}
                      onChange={(e) => setEcoScriptureText(e.target.value)}
                      placeholder="Tuliskan bunyi firman yang mendasari refleksi..."
                      className="w-full rounded-xl border border-gray-300 p-3 text-sm font-normal outline-none focus:border-[#2E6B34]"
                    />
                  </label>

                  <label className="block space-y-1.5 text-xs font-bold text-gray-700 sm:col-span-2">
                    Ringkasan Singkat (Muncul di Beranda)
                    <textarea
                      rows={2}
                      value={ecoSummary}
                      onChange={(e) => setEcoSummary(e.target.value)}
                      placeholder="Ringkasan 1-2 kalimat untuk kartu di Beranda..."
                      className="w-full rounded-xl border border-gray-300 p-3 text-sm font-normal outline-none focus:border-[#2E6B34]"
                    />
                  </label>

                  <label className="block space-y-1.5 text-xs font-bold text-gray-700 sm:col-span-2">
                    Isi Lengkap Renungan / Bahan Ajar Ekoteologi
                    <textarea
                      required
                      rows={6}
                      value={ecoContent}
                      onChange={(e) => setEcoContent(e.target.value)}
                      placeholder="Tuliskan ulasan teologi penciptaan dan relevansinya bagi kehidupan sehari-hari..."
                      className="w-full rounded-xl border border-gray-300 p-3 text-sm font-normal outline-none focus:border-[#2E6B34]"
                    />
                  </label>

                  <label className="block space-y-1.5 text-xs font-bold text-gray-700 sm:col-span-2">
                    Ajakan Aksi Nyata (Call to Action)
                    <input
                      type="text"
                      value={ecoActionCall}
                      onChange={(e) => setEcoActionCall(e.target.value)}
                      placeholder="Contoh: Kurangi botol plastik sekali pakai dan lakukan gotong royong di tepian Danau Toba."
                      className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                  {editingEcoId && (
                    <button
                      type="button"
                      onClick={resetEcoForm}
                      className="min-h-11 rounded-xl border border-gray-300 px-4 text-xs font-bold text-gray-600 hover:bg-gray-50"
                    >
                      Batal
                    </button>
                  )}
                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2E6B34] px-6 text-xs font-bold text-white shadow-sm hover:bg-[#245429] transition active:scale-95 cursor-pointer"
                  >
                    <Save className="h-4 w-4" />
                    <span>{editingEcoId ? 'Perbarui Artikel' : 'Simpan & Publikasikan ke Beranda'}</span>
                  </button>
                </div>
              </form>

              {/* Daftar Artikel Ekoteologi Terbit */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-gray-900">Daftar Artikel &amp; Renungan Ekoteologi</h3>
                  <span className="text-xs text-gray-500">Total: {ecotheologyList.length} artikel</span>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2">
                  {ecotheologyList.map((art) => (
                    <article
                      key={art.id}
                      className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-4 transition shadow-xs hover:border-[#2E6B34]/40"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-[#2E6B34] border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold">
                            <Leaf className="h-3 w-3" />
                            {art.category.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium">
                            {art.publishedAt}
                          </span>
                        </div>

                        <h4 className="font-bold text-sm text-gray-900 leading-snug">
                          {art.title}
                        </h4>

                        {art.scriptureRef && (
                          <p className="mt-1 text-xs font-bold text-[#2E6B34]">
                            📖 {art.scriptureRef}
                          </p>
                        )}

                        <p className="mt-1.5 text-xs text-gray-600 line-clamp-3 leading-relaxed">
                          {art.summary || art.content}
                        </p>

                        {art.batakWisdom && (
                          <p className="mt-2 text-[11px] font-medium text-amber-900 bg-amber-50/70 rounded-lg p-2 border border-amber-200/50 italic">
                            🌾 {art.batakWisdom}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                        <span className="text-[11px] text-gray-500 truncate max-w-[170px]">
                          {art.author}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditEco(art)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#2E6B34] hover:bg-emerald-50 transition"
                            title="Edit Artikel"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEco(art.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 transition"
                            title="Hapus Artikel"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )}

          {section === 'ai' && (
            <section className="space-y-5">
              <div className="max-w-3xl space-y-5 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
                <div>
                  <h2 className="font-bold">Konfigurasi Layanan Cerdas &amp; Otomasi</h2>
                  <p className="mt-1 text-xs leading-5 text-gray-500">Atur kunci akses API, model bahasa, deskripsi aplikasi untuk konteks sistem cerdas, dan instruksi asisten Sahabat Ciptaan.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1.5 text-xs font-bold sm:col-span-2">
                    Kunci Akses API (Lokal)
                    <input type="password" value={brand.geminiApiKey || ''} onChange={(event) => setBrand({ ...brand, geminiApiKey: event.target.value })} placeholder="Kunci API..." className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]" />
                  </label>
                  <label className="block space-y-1.5 text-xs font-bold">
                    Model Layanan Cerdas
                    <input value={brand.geminiModel || 'gemini-3.5-flash'} onChange={(event) => setBrand({ ...brand, geminiModel: event.target.value })} className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]" />
                  </label>
                  <div className="flex items-center gap-3 sm:pt-6">
                    <label className="flex items-center gap-2 text-xs font-bold">
                      <input type="checkbox" checked={brand.showChatbot !== false} onChange={(e)=>setBrand({...brand, showChatbot: e.target.checked})} />
                      Tampilkan konsultasi
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold">
                      <input type="checkbox" checked={brand.allowGuestChat !== false} onChange={(e)=>setBrand({...brand, allowGuestChat: e.target.checked})} />
                      Izinkan tamu
                    </label>
                  </div>
                  <label className="block space-y-1.5 text-xs font-bold sm:col-span-2">
                    Deskripsi aplikasi untuk konteks layanan cerdas
                    <textarea value={brand.description || ''} onChange={(event) => setBrand({ ...brand, description: event.target.value })} rows={2} className="w-full rounded-xl border border-gray-300 p-3 text-sm font-normal outline-none focus:border-[#2E6B34]" />
                  </label>
                  <label className="block space-y-1.5 text-xs font-bold sm:col-span-2">
                    Instruksi sistem cerdas (panduan khusus Sahabat Ciptaan)
                    <textarea value={brand.aiSystemPrompt || ''} onChange={(event) => setBrand({ ...brand, aiSystemPrompt: event.target.value })} rows={6} placeholder="Tambahkan pengetahuan, aturan, atau persona khusus..." className="w-full rounded-xl border border-gray-300 p-3 text-sm font-normal outline-none focus:border-[#2E6B34]" />
                  </label>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                  Catatan: Di lingkungan Vercel production, API key dapat disetel melalui tab Settings &gt; Environment Variables (<code className="font-mono font-bold">GEMINI_API_KEY</code>). Di lingkungan lokal/preview, Anda dapat memasukkannya langsung pada kolom input di atas.
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button onClick={saveBrand} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2E6B34] px-4 text-sm font-bold text-white hover:bg-[#235328] transition shadow-xs active:scale-95">
                    <Save className="h-4 w-4" /> Simpan konfigurasi layanan
                  </button>

                  <button
                    type="button"
                    onClick={handleTestAi}
                    disabled={testingAi}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-600 bg-emerald-50 px-4 text-sm font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {testingAi ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-emerald-700" />
                        Sedang Menguji Koneksi Layanan...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 text-emerald-700" />
                        Uji Koneksi Layanan Cerdas
                      </>
                    )}
                  </button>

                  {/* Manual Test Trigger Button */}
                  <button
                    type="button"
                    onClick={handleManualTestTrigger}
                    disabled={directTriggerRunning}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-bold text-slate-100 hover:bg-slate-800 transition shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
                    title="Kirim kueri langsung tanpa UI kompleks untuk isolasi konektivitas"
                  >
                    {directTriggerRunning ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-amber-400" />
                        Menguji Pemicu Langsung...
                      </>
                    ) : (
                      <>
                        <Terminal className="h-4 w-4 text-amber-400" />
                        Direct Test Trigger
                      </>
                    )}
                  </button>
                </div>

                {/* Direct Manual Test Trigger Output Terminal */}
                {directTriggerResult && (
                  <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs font-mono text-emerald-400 shadow-md">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                      <span className="flex items-center gap-2 font-bold text-slate-200">
                        <Terminal className="h-4 w-4 text-amber-400" />
                        Diagnostik Konektivitas Sistem
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          directTriggerResult.ok
                            ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
                            : 'bg-red-900/60 text-red-300 border border-red-700'
                        }`}>
                          HTTP {directTriggerResult.status} ({directTriggerResult.durationMs}ms)
                        </span>
                        <button
                          type="button"
                          onClick={() => setDirectTriggerResult(null)}
                          className="text-slate-400 hover:text-white text-[11px] cursor-pointer"
                        >
                          ✕ Tutup
                        </button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-[11px] text-slate-400 mb-1">
                        &gt; Query: "PING TEST: Berikan respon 1 kalimat konfirmasi bahwa sistem cerdas siap beroperasi."
                      </p>
                      <pre className="overflow-x-auto rounded-lg bg-black/60 p-3 text-[11px] text-slate-200 leading-relaxed font-mono whitespace-pre-wrap max-h-60">
                        {directTriggerResult.rawText}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Live Diagnostic Results Panel */}
                {testResult && (
                  <div className={`mt-5 rounded-2xl border p-4 sm:p-5 transition-all ${
                    testResult.ok
                      ? 'border-emerald-300 bg-emerald-50/70'
                      : 'border-red-300 bg-red-50/70'
                  }`}>
                    {/* Header: Status, Badge, Latency, Timestamp */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 border-gray-200/70">
                      <div className="flex items-center gap-2.5">
                        {testResult.ok ? (
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white shadow-xs">
                            <AlertCircle className="h-5 w-5" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-extrabold text-gray-900">
                              {testResult.ok ? 'Koneksi Layanan Berhasil Terhubung' : 'Koneksi Layanan Mengalami Kendala'}
                            </h3>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              testResult.ok ? 'bg-emerald-200 text-emerald-900' : 'bg-red-200 text-red-900'
                            }`}>
                              {testResult.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500">
                            Diuji pada {new Date(testResult.timestamp).toLocaleTimeString()} · Latency: <span className="font-bold text-gray-800">{testResult.diagnostics.latencyMs} ms</span>
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={handleTestAi}
                        disabled={testingAi}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs cursor-pointer"
                        title="Uji ulang sekarang"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${testingAi ? 'animate-spin' : ''}`} />
                        Uji Ulang
                      </button>
                    </div>

                    {/* Diagnostics Metrics Grid */}
                    <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-4">
                      {/* Metric 1: API Key Source */}
                      <div className="rounded-xl border border-gray-200/80 bg-white/90 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                          <Key className="h-3.5 w-3.5 text-amber-600" />
                          Sumber API Key
                        </div>
                        <p className="mt-1 text-xs font-bold text-gray-900">
                          {testResult.diagnostics.apiKeySource === 'admin_settings'
                            ? '🔑 Input Admin (Lokal)'
                            : testResult.diagnostics.apiKeySource === 'environment_variable'
                            ? '🌐 Vercel Env (Server)'
                            : '❌ Tidak Ditemukan'}
                        </p>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5 truncate">
                          {testResult.diagnostics.apiKeyMasked}
                        </p>
                      </div>

                      {/* Metric 2: Model Resolved */}
                      <div className="rounded-xl border border-gray-200/80 bg-white/90 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                          <Cpu className="h-3.5 w-3.5 text-indigo-600" />
                          Model Aktif
                        </div>
                        <p className="mt-1 text-xs font-bold text-gray-900 truncate">
                          {testResult.diagnostics.modelResolved || testResult.diagnostics.modelRequested}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          Diminta: {testResult.diagnostics.modelRequested}
                        </p>
                      </div>

                      {/* Metric 3: System Instruction Status */}
                      <div className="rounded-xl border border-gray-200/80 bg-white/90 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                          <FileText className="h-3.5 w-3.5 text-emerald-600" />
                          Instruksi Sistem
                        </div>
                        <p className="mt-1 text-xs font-bold text-gray-900">
                          {testResult.diagnostics.hasSystemPrompt
                            ? `Aktif (${testResult.diagnostics.systemPromptLength} kar)`
                            : 'Default Aplikasi'}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {testResult.diagnostics.hasAppDescription ? '+ Deskripsi Konteks' : 'Standar'}
                        </p>
                      </div>

                      {/* Metric 4: Latency & Speed */}
                      <div className="rounded-xl border border-gray-200/80 bg-white/90 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                          <Activity className="h-3.5 w-3.5 text-teal-600" />
                          Respons Waktu
                        </div>
                        <p className="mt-1 text-xs font-bold text-gray-900">
                          {testResult.diagnostics.latencyMs} ms
                        </p>
                        <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                          {testResult.diagnostics.latencyMs < 1500 ? 'Sangat Cepat' : 'Wajar'}
                        </p>
                      </div>
                    </div>

                    {/* Notice if fallback model was used */}
                    {testResult.notice && (
                      <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/80 p-2.5 text-xs text-blue-900 flex items-start gap-2">
                        <span className="font-bold text-blue-700">ℹ️ Catatan:</span>
                        <span>{testResult.notice}</span>
                      </div>
                    )}

                    {/* Error diagnosis box with actionable guidance */}
                    {testResult.error && (
                      <div className="mt-3 rounded-xl border border-red-300 bg-red-100/80 p-3 text-xs text-red-950 space-y-1.5">
                        <div className="flex items-center gap-2 font-bold text-red-800">
                          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                          <span>Penyebab Error (Kode HTTP {testResult.error.code}):</span>
                        </div>
                        <p className="font-mono text-[11px] bg-white/80 p-2 rounded-lg border border-red-200 text-red-900 overflow-x-auto">
                          {testResult.error.message}
                        </p>
                        <div className="mt-2 text-xs text-red-900 bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
                          <span className="font-bold text-amber-900">💡 Langkah Solusi yang Disarankan:</span>
                          <p className="mt-0.5 text-gray-800">{testResult.error.suggestion}</p>
                        </div>
                      </div>
                    )}

                    {/* Model Output Demonstration */}
                    {testResult.testOutput && (
                      <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                            <Terminal className="h-3.5 w-3.5 text-gray-500" />
                            Uji Coba Respons Nyata Model:
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            Instruksi Diterapkan
                          </span>
                        </div>

                        {/* Test prompt query editor */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={testCustomPrompt}
                            onChange={(e) => setTestCustomPrompt(e.target.value)}
                            placeholder="Ketik pertanyaan uji untuk sistem..."
                            className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:border-[#2E6B34]"
                          />
                          <button
                            type="button"
                            onClick={handleTestAi}
                            disabled={testingAi}
                            className="rounded-lg bg-[#2E6B34] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#235328] disabled:opacity-50 cursor-pointer"
                          >
                            Kirim Uji
                          </button>
                        </div>

                        <div className="rounded-lg bg-gray-50 border border-gray-200 p-2.5">
                          <span className="text-[11px] font-bold text-gray-500 block mb-1">
                            Jawaban Sahabat Ciptaan:
                          </span>
                          <p className="text-xs text-gray-900 leading-relaxed whitespace-pre-wrap font-medium">
                            {testResult.testOutput.response}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Audit Table of Tested Fallback Models */}
                    {testResult.audit && testResult.audit.length > 0 && (
                      <div className="mt-3 rounded-xl border border-gray-200/90 bg-white/90 p-3">
                        <span className="text-xs font-bold text-gray-700 block mb-2">
                          Audit Status Model Bahasa:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {testResult.audit.map((aud) => (
                            <div
                              key={aud.model}
                              className={`flex items-center justify-between p-2 rounded-lg border ${
                                aud.status === 'ok'
                                  ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900'
                                  : 'border-gray-200 bg-gray-50 text-gray-600'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <span className="font-mono font-bold text-[11px] block truncate">{aud.model}</span>
                                {aud.error && (
                                  <span className="text-[10px] text-red-600 truncate block">
                                    {aud.error}
                                  </span>
                                )}
                              </div>
                              <span className={`shrink-0 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                aud.status === 'ok'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {aud.status === 'ok' ? `OK (${aud.latencyMs}ms)` : `Error ${aud.code || ''}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {section === 'threads' && (
            <section className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-lg">Moderasi Threads & Keluhan Warga</h2>
                    <p className="mt-1 text-xs text-gray-500">
                      Pantau dan tindak lanjuti aspirasi, foto instan, ide, serta keluhan lingkungan hidup yang dikirimkan jemaat & mahasiswa.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 self-start sm:self-auto bg-gray-100 p-1 rounded-xl">
                    <button
                      onClick={() => setThreadFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${threadFilter === 'all' ? 'bg-[#2E6B34] text-white shadow-xs' : 'text-gray-600 hover:text-black'}`}
                    >
                      Semua ({threads.length})
                    </button>
                    <button
                      onClick={() => setThreadFilter('ide')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${threadFilter === 'ide' ? 'bg-[#2E6B34] text-white shadow-xs' : 'text-gray-600 hover:text-black'}`}
                    >
                      💡 Ide ({threads.filter((t) => t.category === 'ide').length})
                    </button>
                    <button
                      onClick={() => setThreadFilter('keluhan')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${threadFilter === 'keluhan' ? 'bg-[#2E6B34] text-white shadow-xs' : 'text-gray-600 hover:text-black'}`}
                    >
                      📢 Keluhan ({threads.filter((t) => t.category === 'keluhan').length})
                    </button>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {threads
                    .filter((t) => threadFilter === 'all' || t.category === threadFilter)
                    .map((post) => (
                      <article
                        key={post.id}
                        className="rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-[#2E6B34]/40"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAF3E6] font-bold text-[#2E6B34]">
                              {post.userName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-gray-900">{post.userName}</span>
                                {post.userRole && (
                                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-[#2E6B34]">
                                    {post.userRole}
                                  </span>
                                )}
                                <span className="text-xs text-gray-400">· {post.createdAt}</span>
                              </div>
                              <p className="text-xs text-gray-500">{post.communityName || 'Komunitas Danau Toba'}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                                post.category === 'keluhan'
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : post.category === 'ide'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {post.category === 'keluhan' ? '📢 Keluhan' : post.category === 'ide' ? '💡 Ide' : post.category}
                            </span>
                            <button
                              onClick={() => deleteThread(post.id)}
                              aria-label={`Hapus kiriman dari ${post.userName}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition"
                              title="Hapus kiriman ini"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <p className="mt-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{post.caption}</p>

                        {post.imageUrl && post.imageUrl.trim() ? (
                          <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 max-w-sm">
                            <img src={post.imageUrl} alt="Foto kiriman warga" className="h-48 w-full object-cover" />
                          </div>
                        ) : null}

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>❤️ {post.likes} Dukungan</span>
                            <span>💬 {post.replies?.length || 0} Tanggapan</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-600">Status Tindakan:</span>
                            <button
                              onClick={() => updateThreadStatus(post.id, 'aktif')}
                              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                                (post.status || 'aktif') === 'aktif'
                                  ? 'bg-gray-800 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              Aktif
                            </button>
                            <button
                              onClick={() => updateThreadStatus(post.id, 'ditindaklanjuti')}
                              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                                post.status === 'ditindaklanjuti'
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                              }`}
                            >
                              Ditindaklanjuti
                            </button>
                            <button
                              onClick={() => updateThreadStatus(post.id, 'selesai')}
                              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                                post.status === 'selesai'
                                  ? 'bg-[#2E6B34] text-white'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              Selesai
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}

                  {threads.filter((t) => threadFilter === 'all' || t.category === threadFilter).length === 0 && (
                    <p className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">
                      Tidak ada postingan dalam kategori ini.
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {section === 'users' && (
            <section className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
                <div>
                  <h2 className="font-bold">Kelola Pengguna</h2>
                  <p className="mt-1 text-xs leading-5 text-gray-500">Daftar pengguna. Untuk akun terdaftar penuh (Supabase Auth), kelola melalui panel Supabase Authentication.</p>
                </div>
                <div className="mt-4">
                  <article className="flex items-center justify-between rounded-xl border border-gray-100 p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[#EAF3E6] flex items-center justify-center"><Users className="h-4 w-4 text-[#2E6B34]" /></div>
                      <div>
                        <p className="text-sm font-bold">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.contact} - Role: {user.role} - Komunitas: {user.communityName}</p>
                      </div>
                    </div>
                  </article>
                </div>
                <div className="mt-4 rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900">
                  Untuk mengubah role menjadi admin/pemimpin, set app_metadata.role di Supabase Auth.
                </div>
              </div>
            </section>
          )}
          {section === 'organizations' && (
            <section className="space-y-4">
              <form onSubmit={addOrganization} className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-[1fr_200px_auto] sm:items-end">
                <label className="space-y-1.5 text-xs font-bold">
                  Nama organisasi
                  <input required minLength={2} value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]" />
                </label>
                <label className="space-y-1.5 text-xs font-bold">
                  Jenis
                  <select value={organizationCategory} onChange={(event) => setOrganizationCategory(event.target.value as Community['category'])} className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal">
                    <option>Kampus</option><option>Gereja</option><option>Pemuda</option><option>Komunitas Warga</option>
                  </select>
                </label>
                <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2E6B34] px-4 text-xs font-bold text-white"><Plus className="h-4 w-4" /> Tambah</button>
              </form>
              <div className="grid gap-3 md:grid-cols-2">
                {communities.map((community) => (
                  <article key={community.id} className="flex items-start justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex min-w-0 gap-3">
                      <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-[#2E6B34]" />
                      <div className="min-w-0">
                        <h3 className="break-words font-bold">{community.name}</h3>
                        <p className="text-xs text-gray-500">{community.category} · {community.location}</p>
                        <p className="mt-2 flex items-center gap-1 text-xs text-gray-600"><Users className="h-3.5 w-3.5" /> {community.memberCount} anggota</p>
                      </div>
                    </div>
                    <button onClick={() => deleteOrganization(community.id)} aria-label={`Hapus ${community.name}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                  </article>
                ))}
              </div>
            </section>
          )}

          {section === 'challenges' && (
            <section className="space-y-4">
              <form onSubmit={addChallenge} className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
                <h2 className="font-bold">Tambah tantangan aksi</h2>
                <input required minLength={3} value={challengeTitle} onChange={(event) => setChallengeTitle(event.target.value)} placeholder="Judul tantangan" className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm outline-none focus:border-[#2E6B34]" />
                <textarea required value={challengeDescription} onChange={(event) => setChallengeDescription(event.target.value)} placeholder="Deskripsi dan petunjuk aksi" rows={3} className="w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-[#2E6B34]" />
                <button className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2E6B34] px-4 text-xs font-bold text-white"><Plus className="h-4 w-4" /> Tambah tantangan</button>
              </form>
              <div className="grid gap-3 md:grid-cols-2">
                {challenges.map((challenge) => (
                  <article key={challenge.id} className="flex items-start justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="min-w-0"><h3 className="font-bold">{challenge.title}</h3><p className="mt-1 line-clamp-2 text-xs text-gray-500">{challenge.description}</p></div>
                    <button onClick={() => deleteChallenge(challenge.id)} aria-label={`Hapus ${challenge.title}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                  </article>
                ))}
              </div>
            </section>
          )}

          {section === 'events' && (
            <section className="grid gap-3 md:grid-cols-2">
              {events.map((event: GreenEvent) => (
                <article key={event.id} className="flex items-start justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="min-w-0"><h3 className="font-bold">{event.title}</h3><p className="mt-1 text-xs text-gray-500">{event.date} · {event.location}</p><p className="mt-2 text-xs text-gray-600">{event.organizer}</p></div>
                  <button onClick={() => deleteEvent(event.id)} aria-label={`Hapus ${event.title}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                </article>
              ))}
              {events.length === 0 && <p className="rounded-2xl bg-white p-5 text-sm text-gray-500">Belum ada kegiatan.</p>}
            </section>
          )}

          {section === 'reports' && (
            <section className="space-y-3">
              {reports.map((report) => (
                <article key={report.id} className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 md:grid-cols-[1fr_220px] md:items-center">
                  <div><h3 className="font-bold">{report.title}</h3><p className="mt-1 text-xs text-gray-500">{report.category} · {report.locationName}</p><p className="mt-2 text-sm text-gray-700">{report.formalDescription}</p></div>
                  <label className="space-y-1 text-xs font-bold">
                    Status laporan
                    <select value={report.status} onChange={(event) => updateReportStatus(report, event.target.value as EnvironmentalReport['status'])} className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal">
                      <option>Dilaporkan</option><option>Ditinjau Pemimpin</option><option>Gotong Royong Dijadwalkan</option><option>Selesai</option>
                    </select>
                  </label>
                </article>
              ))}
              {reports.length === 0 && <p className="rounded-2xl bg-white p-5 text-sm text-gray-500">Belum ada laporan.</p>}
            </section>
          )}

          {section === 'locations' && <MapLocationReviewPanel />}

          {section === 'content' && (
            <section className="space-y-6">
              {/* Header Box */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#1F2A1F] flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-[#2E6B34]" />
                      Kelola Renungan Ciptaan Harian
                    </h2>
                    <p className="mt-1 text-xs text-gray-600">
                      Kelola renungan ekoteologi Kristen harian untuk jemaat dan mahasiswa. Renungan akan berganti setiap hari di beranda, atau dijadwalkan sesuai tanggal.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      {devotions.length} Renungan Tersedia
                    </span>
                  </div>
                </div>
              </div>

              {/* Smart Devotion Generator Card */}
              <div className="relative overflow-hidden rounded-2xl border-2 border-[#2E6B34]/30 bg-gradient-to-br from-white via-emerald-50/40 to-amber-50/40 p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2E6B34]">
                  <Wand2 className="h-4 w-4 text-[#2E6B34]" />
                  Penyusun Renungan Cepat Cerdas
                </div>
                <h3 className="mt-1 text-base font-extrabold text-[#1F2A1F]">
                  Susun Renungan Ekoteologi Harian Otomatis
                </h3>
                <p className="mt-1 text-xs text-gray-600 leading-relaxed max-w-2xl">
                  Sistem cerdas akan otomatis memilihkan ayat Alkitab yang tepat, menyusun refleksi ekoteologi kontekstual Batak &amp; Danau Toba, falsafah kearifan lokal, serta ajakan aksi nyata.
                </p>

                {/* Quick Topic Chips */}
                <div className="mt-4">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Ide Topik Cepat:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Kejernihan Air Danau Toba & Mazmur 104',
                      'Merawat Pohon & Hutan Tele (Kej 2:15)',
                      'Gereja dan Kampus Bebas Sampah Plastik',
                      'Marsiadapari Mengatasi Longsor dan Banjir',
                      'Hemat Energi dan Syukur atas Udara Bersih',
                      'Teologi Kejadian 1: Menjaga Keseimbangan Ekosistem',
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setAiDevotionTopic(chip)}
                        className="rounded-lg border border-[#2E6B34]/25 bg-white/90 px-2.5 py-1 text-xs font-medium text-[#2E6B34] hover:bg-[#2E6B34] hover:text-white transition active:scale-95 shadow-2xs"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <input
                    type="text"
                    value={aiDevotionTopic}
                    onChange={(e) => setAiDevotionTopic(e.target.value)}
                    placeholder="Contoh: Merawat Kejernihan Danau Toba, Mengurangi Sampah Plastik..."
                    className="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3.5 text-sm outline-none focus:border-[#2E6B34] focus:ring-2 focus:ring-[#2E6B34]/20"
                  />
                  <button
                    type="button"
                    disabled={generatingDevotion}
                    onClick={handleGenerateDevotionWithAi}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2E6B34] px-5 text-xs font-bold text-white shadow-sm hover:bg-[#245429] disabled:opacity-60 transition active:scale-95 cursor-pointer"
                  >
                    {generatingDevotion ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Menyusun Renungan...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-amber-300" />
                        <span>Susun Otomatis</span>
                      </>
                    )}
                  </button>
                </div>

                {aiDevotionError && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{aiDevotionError}</span>
                  </div>
                )}

                {aiDevotionSuccess && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{aiDevotionSuccess}</span>
                  </div>
                )}
              </div>

              {/* Form Tambah / Edit Renungan */}
              <form onSubmit={handleSaveDevotion} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-bold text-[#1F2A1F] flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-[#2E6B34]" />
                    {editingDevotionId ? 'Edit Renungan Harian' : 'Tulis / Sesuaikan Renungan'}
                  </h3>
                  {editingDevotionId && (
                    <button
                      type="button"
                      onClick={resetDevotionForm}
                      className="text-xs font-semibold text-gray-500 hover:text-gray-800 underline"
                    >
                      Batal Edit (Buat Baru)
                    </button>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5 text-xs font-bold text-gray-700">
                    Tanggal Tayang Harian
                    <input
                      type="date"
                      required
                      value={devotionDate}
                      onChange={(e) => setDevotionDate(e.target.value)}
                      className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]"
                    />
                    <span className="block text-[10px] font-normal text-gray-500">
                      Renungan akan otomatis diprioritaskan tampil pada tanggal ini.
                    </span>
                  </label>

                  <label className="space-y-1.5 text-xs font-bold text-gray-700">
                    Waktu Baca (Menit)
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={devotionReadingTime}
                      onChange={(e) => setDevotionReadingTime(Number(e.target.value))}
                      className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]"
                    />
                  </label>
                </div>

                <label className="block space-y-1.5 text-xs font-bold text-gray-700">
                  Judul Renungan
                  <input
                    type="text"
                    required
                    value={devotionTitle}
                    onChange={(e) => setDevotionTitle(e.target.value)}
                    placeholder="Contoh: Mata Air Pengharapan di Rura Silindung"
                    className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="sm:col-span-1 space-y-1.5 text-xs font-bold text-gray-700">
                    Ayat Alkitab (Kitab Pasal:Ayat)
                    <input
                      type="text"
                      required
                      value={devotionScripture}
                      onChange={(e) => setDevotionScripture(e.target.value)}
                      placeholder="Contoh: Mazmur 104:10-13"
                      className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]"
                    />
                  </label>

                  <label className="sm:col-span-2 space-y-1.5 text-xs font-bold text-gray-700">
                    Kutipan Teks Ayat
                    <input
                      type="text"
                      required
                      value={devotionVerseText}
                      onChange={(e) => setDevotionVerseText(e.target.value)}
                      placeholder="Contoh: Engkau yang melepas mata-mata air ke dalam lembah-lembah..."
                      className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]"
                    />
                  </label>
                </div>

                <label className="block space-y-1.5 text-xs font-bold text-gray-700">
                  Isi Refleksi / Renungan (Ekoteologi)
                  <textarea
                    required
                    rows={4}
                    value={devotionContent}
                    onChange={(e) => setDevotionContent(e.target.value)}
                    placeholder="Tuliskan renungan ekoteologi singkat (100-200 kata)..."
                    className="w-full rounded-xl border border-gray-300 p-3 text-sm font-normal outline-none focus:border-[#2E6B34]"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5 text-xs font-bold text-gray-700">
                    Aksi Nyata Ciptaan Hari Ini (Call to Action)
                    <input
                      type="text"
                      required
                      value={devotionCallToAction}
                      onChange={(e) => setDevotionCallToAction(e.target.value)}
                      placeholder="Contoh: Siram pekarangan dan hemat air saat mandi hari ini."
                      className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]"
                    />
                  </label>

                  <label className="space-y-1.5 text-xs font-bold text-gray-700">
                    Kearifan Lokal / Pepatah Batak
                    <input
                      type="text"
                      value={devotionBatakWisdom}
                      onChange={(e) => setDevotionBatakWisdom(e.target.value)}
                      placeholder="Contoh: Marsiadapari mamparbuehon denggan"
                      className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                  {editingDevotionId && (
                    <button
                      type="button"
                      onClick={resetDevotionForm}
                      className="min-h-11 rounded-xl border border-gray-300 px-4 text-xs font-bold text-gray-600 hover:bg-gray-50"
                    >
                      Batal
                    </button>
                  )}
                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2E6B34] px-6 text-xs font-bold text-white shadow-sm hover:bg-[#245429] transition active:scale-95"
                  >
                    <Save className="h-4 w-4" />
                    <span>{editingDevotionId ? 'Perbarui Renungan' : 'Simpan Renungan'}</span>
                  </button>
                </div>
              </form>

              {/* Daftar Renungan Harian */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#1F2A1F]">Daftar Renungan Terjadwal &amp; Rotasi Harian</h3>
                  <span className="text-xs text-gray-500">Total: {devotions.length} renungan</span>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2">
                  {devotions.map((dev) => {
                    const todayDev = StorageService.getTodayDevotion();
                    const isCurrentlyActive = todayDev.id === dev.id;

                    return (
                      <article
                        key={dev.id}
                        className={`flex flex-col justify-between rounded-2xl border bg-white p-4 transition shadow-xs ${
                          isCurrentlyActive
                            ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isCurrentlyActive && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white px-2.5 py-0.5 text-[10px] font-extrabold shadow-2xs">
                                  🌟 Tayang Hari Ini
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 px-2 py-0.5 text-[10px] font-semibold">
                                <Calendar className="h-3 w-3" />
                                {dev.date || 'Rotasi Harian'}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-[#2E6B34]">
                              {dev.readingTime || 1} mnt baca
                            </span>
                          </div>

                          <h4 className="font-bold text-sm text-[#1F2A1F] leading-snug">
                            {dev.title}
                          </h4>
                          <p className="mt-1 text-xs font-semibold text-[#2E6B34]">
                            {dev.scripture}
                          </p>
                          <p className="mt-1 text-xs text-gray-600 line-clamp-3 leading-relaxed">
                            {dev.content}
                          </p>
                          {dev.callToAction && (
                            <p className="mt-2 text-[11px] font-medium text-amber-900 bg-amber-50/80 rounded-lg p-2 border border-amber-200/50">
                              🌱 Aksi: {dev.callToAction}
                            </p>
                          )}
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                          <span className="text-[11px] text-gray-500 truncate max-w-[180px] italic">
                            {dev.batakWisdom}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditDevotion(dev)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#2E6B34] hover:bg-emerald-50 transition"
                              title="Edit Renungan"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDevotion(dev.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 transition"
                              title="Hapus Renungan"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};
