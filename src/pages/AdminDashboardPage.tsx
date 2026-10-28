import React, { useState } from 'react';
import {
  Building2,
  CalendarDays,
  ClipboardList,
  Image,
  Leaf,
  LogOut,
  MapPin,
  Plus,
  Save,
  Settings,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { Challenge, Community, EnvironmentalReport, GreenEvent, User } from '../types';
import { StorageService } from '../services/storageService';
import { MapLocationReviewPanel } from '../components/MapLocationReviewPanel';

type AdminSection = 'overview' | 'brand' | 'ai' | 'users' | 'organizations' | 'challenges' | 'events' | 'reports' | 'locations' | 'content';

interface AdminDashboardPageProps {
  user: User;
  onLogout: () => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ user, onLogout }) => {
  const [section, setSection] = useState<AdminSection>('overview');
  const [brand, setBrand] = useState(StorageService.getBrandSettings());
  const [communities, setCommunities] = useState(StorageService.getCommunities());
  const [challenges, setChallenges] = useState(StorageService.getChallenges());
  const [events, setEvents] = useState(StorageService.getEvents());
  const [reports, setReports] = useState(StorageService.getReports());
  const [organizationName, setOrganizationName] = useState('');
  const [organizationCategory, setOrganizationCategory] = useState<Community['category']>('Komunitas Warga');
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeDescription, setChallengeDescription] = useState('');
  const [notice, setNotice] = useState('');

  const notify = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(''), 2800);
  };

  const saveBrand = () => {
    StorageService.saveBrandSettings(brand);
    notify('Pengaturan aplikasi tersimpan.');
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

  const navItems: Array<{ id: AdminSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'overview', label: 'Ringkasan', icon: ClipboardList },
    { id: 'brand', label: 'Identitas & Tampilan', icon: Image },
    { id: 'ai', label: 'Pengaturan AI', icon: Sparkles },
    { id: 'users', label: 'Pengguna', icon: Users },
    { id: 'organizations', label: 'Organisasi', icon: Building2 },
    { id: 'challenges', label: 'Tantangan', icon: Leaf },
    { id: 'events', label: 'Kegiatan', icon: CalendarDays },
    { id: 'reports', label: 'Laporan', icon: ClipboardList },
    { id: 'locations', label: 'Titik Peta', icon: MapPin },
    { id: 'content', label: 'Konten Aplikasi', icon: Settings },
  ];

  return (
    <div className="min-h-dvh bg-[#F3F6F1] text-[#1F2A1F]">
      <header className="sticky top-0 z-30 border-b border-[#2E6B34]/15 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#2E6B34] text-white">
              {brand.logoUrl ? (
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
          <button onClick={onLogout} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-gray-200 px-3 text-xs font-bold text-gray-600 hover:bg-gray-50">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
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
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {[
                  { label: 'Organisasi', value: communities.length, icon: Building2 },
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
                      const reader = new FileReader();
                      reader.onload = () => {
                        const result = typeof reader.result === 'string' ? reader.result : '';
                        setBrand({ ...brand, logoUrl: result });
                      };
                      reader.readAsDataURL(file);
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
                <div className="flex items-center gap-3 rounded-xl bg-[#F3F6F1] p-4">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-[#2E6B34] text-white">
                    {brand.logoUrl ? <img src={brand.logoUrl} alt="Pratinjau logo" className="h-full w-full object-contain" /> : <Leaf className="h-7 w-7" />}
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


          {section === 'ai' && (
            <section className="space-y-5">
              <div className="max-w-3xl space-y-5 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
                <div>
                  <h2 className="font-bold">Pengaturan AI</h2>
                  <p className="mt-1 text-xs leading-5 text-gray-500">Atur API key Gemini, model, deskripsi aplikasi untuk konteks AI, dan instruksi sistem chatbot "Sahabat Ciptaan".</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1.5 text-xs font-bold sm:col-span-2">
                    Gemini API Key (lokal)
                    <input type="password" value={brand.geminiApiKey || ''} onChange={(event) => setBrand({ ...brand, geminiApiKey: event.target.value })} placeholder="AIza..." className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]" />
                  </label>
                  <label className="block space-y-1.5 text-xs font-bold">
                    Model Gemini
                    <input value={brand.geminiModel || 'gemini-2.5-flash'} onChange={(event) => setBrand({ ...brand, geminiModel: event.target.value })} className="min-h-11 w-full rounded-xl border border-gray-300 px-3 text-sm font-normal outline-none focus:border-[#2E6B34]" />
                  </label>
                  <div className="flex items-center gap-3 sm:pt-6">
                    <label className="flex items-center gap-2 text-xs font-bold">
                      <input type="checkbox" checked={brand.showChatbot !== false} onChange={(e)=>setBrand({...brand, showChatbot: e.target.checked})} />
                      Tampilkan chatbot
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold">
                      <input type="checkbox" checked={brand.allowGuestChat !== false} onChange={(e)=>setBrand({...brand, allowGuestChat: e.target.checked})} />
                      Izinkan tamu
                    </label>
                  </div>
                  <label className="block space-y-1.5 text-xs font-bold sm:col-span-2">
                    Deskripsi aplikasi untuk konteks AI
                    <textarea value={brand.description || ''} onChange={(event) => setBrand({ ...brand, description: event.target.value })} rows={2} className="w-full rounded-xl border border-gray-300 p-3 text-sm font-normal outline-none focus:border-[#2E6B34]" />
                  </label>
                  <label className="block space-y-1.5 text-xs font-bold sm:col-span-2">
                    Instruksi sistem AI (prompt kustom untuk Sahabat Ciptaan)
                    <textarea value={brand.aiSystemPrompt || ''} onChange={(event) => setBrand({ ...brand, aiSystemPrompt: event.target.value })} rows={6} placeholder="Tambahkan pengetahuan, aturan, atau persona khusus..." className="w-full rounded-xl border border-gray-300 p-3 text-sm font-normal outline-none focus:border-[#2E6B34]" />
                  </label>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                  Catatan: Untuk produksi tetap pakai GEMINI_API_KEY di environment server.
                </div>
                <button onClick={saveBrand} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2E6B34] px-4 text-sm font-bold text-white hover:bg-[#235328]">
                  <Save className="h-4 w-4" /> Simpan pengaturan AI
                </button>
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
        </main>
      </div>
    </div>
  );
};
