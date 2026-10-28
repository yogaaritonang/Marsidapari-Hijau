import React, { useState } from 'react';
import { Image, Send, User as UserIcon } from 'lucide-react';
import { User } from '../types';

interface ThreadsPageProps {
  user: User;
  isGuest: boolean;
  onRequireAuth: () => void;
}

export const ThreadsPage: React.FC<ThreadsPageProps> = ({ user, isGuest, onRequireAuth }) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [caption, setCaption] = useState('');
  const [image, setImage] = useState<string>('');

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (isGuest) {
      onRequireAuth();
      return;
    }
    if (!caption.trim() && !image) return;
    const post = {
      id: 'th-' + Date.now(),
      userId: user.id,
      userName: user.name,
      caption: caption.trim(),
      image,
      createdAt: new Date().toISOString(),
      likes: 0,
    };
    setPosts([post, ...posts]);
    setCaption('');
    setImage('');
  };

  return (
    <div className="mx-auto max-w-[680px] px-4 py-5">
      <header className="mb-4">
        <h1 className="text-xl font-bold font-poppins">Threads</h1>
        <p className="text-xs text-gray-600">Bagikan foto, ide, atau keluhan kamu.</p>
      </header>

      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder={isGuest ? 'Masuk untuk membuat postingan...' : 'Tulis caption, ide, atau keluhan...'}
          rows={3}
          className="w-full resize-none rounded-xl border border-gray-200 p-2 text-sm outline-none focus:border-[#2E6B34]"
          disabled={isGuest}
        />
        {image && (
          <div className="mt-2 overflow-hidden rounded-xl border border-gray-200">
            <img src={image} alt="preview" className="max-h-[320px] w-full object-cover" />
          </div>
        )}
        <div className="mt-2 flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs font-semibold text-[#2E6B34] cursor-pointer">
            <Image className="h-4 w-4" />
            <span>Tambah Foto</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleImage} disabled={isGuest} />
          </label>
          <button onClick={submit} disabled={isGuest} className="inline-flex items-center gap-2 rounded-xl bg-[#2E6B34] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            <Send className="h-3.5 w-3.5" />
            Posting
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {posts.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
            Belum ada postingan.
          </div>
        )}
        {posts.map((post: any) => (
          <article key={post.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 p-3">
              <div className="h-9 w-9 rounded-full bg-[#EAF3E6] flex items-center justify-center">
                <UserIcon className="h-4 w-4 text-[#2E6B34]" />
              </div>
              <div>
                <p className="text-sm font-bold">{post.userName}</p>
                <p className="text-[10px] text-gray-500">{new Date(post.createdAt).toLocaleString()}</p>
              </div>
            </div>
            {post.image && <img src={post.image} alt="" className="w-full object-cover max-h-[420px]" />}
            {post.caption && <div className="p-3 text-sm whitespace-pre-line">{post.caption}</div>}
          </article>
        ))}
      </div>
    </div>
  );
};
