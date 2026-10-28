import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, Bot, ArrowRight } from 'lucide-react';
import { User, ChatMessage } from '../types';
import { AIService } from '../services/aiService';
import { StorageService } from '../services/storageService';

interface FloatingChatbotProps {
  user: User;
  onOpenChallenge?: (challengeId?: string) => void;
  onOpenDevotions?: () => void;
}

const QUICK_PROMPTS = [
  'Apa kaitan Danau Toba dengan Mazmur 24:1?',
  'Tantangan apa yang paling cocok untukku hari ini?',
  'Bagaimana cara marsiadapari bibit pohon di Tarutung?',
  'Beri aku doa syukur atas keindahan alam Silindung',
];

export const FloatingChatbot: React.FC<FloatingChatbotProps> = ({ user, onOpenChallenge }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'model',
      text: `Horas, ${user.name}! Saya Sahabat Ciptaan, asisten ekoteologimu. Bersama civitas ${user.communityName}, mari kita rawat alam Danau Toba dan bumi Silindung ciptaan Tuhan. Ada yang ingin kamu tanyakan atau renungkan hari ini?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Format history
    const history = messages.slice(-6).map((m) => ({
      role: m.sender,
      parts: m.text,
    }));

    try {
      const result = await AIService.sendChatMessage(query, history, {
        userName: user.name,
        community: user.communityName,
        points: user.points,
        completedCount: StorageService.getSubmissions().filter(
          (submission) => submission.userId === user.id && submission.verdict === 'valid',
        ).length,
      });

      // Check if text has action recommendation
      let cleanText = result.reply;
      let actionTag: string | undefined = undefined;

      const tagMatch = result.reply.match(/\[REKOMENDASI:\s*([^\]]+)\]/i);
      if (tagMatch) {
        actionTag = tagMatch[1].trim();
        cleanText = result.reply.replace(/\[REKOMENDASI:\s*[^\]]+\]/gi, '').trim();
      }

      const botMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'model',
        text: cleanText,
        actionTag,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'model',
        text: error instanceof Error ? error.message : 'Chatbot tidak dapat menjawab saat ini. Silakan coba lagi.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 z-40 touch-target flex items-center gap-2 pl-3.5 pr-4 py-2.5 rounded-full bg-gradient-to-r from-[#2E6B34] to-[#1F4B23] text-white shadow-xl shadow-[#2E6B34]/30 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all group"
          title="Buka Chat Sahabat Ciptaan"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-[#A8D5A2] group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full" />
          </div>
          <span className="text-xs font-bold font-poppins tracking-wide">
            Sahabat Ciptaan
          </span>
        </button>
      )}

      {/* Chat Drawer / Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md h-[90vh] sm:h-[620px] rounded-t-3xl sm:rounded-3xl bg-[#FAF6EC] border border-[#2E6B34]/25 flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-[#2E6B34] to-[#1B4320] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#A8D5A2]/20 flex items-center justify-center text-[#A8D5A2] border border-[#A8D5A2]/40">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-poppins leading-tight flex items-center gap-1.5">
                    Sahabat Ciptaan
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  </h3>
                  <p className="text-[11px] text-[#A8D5A2] leading-none mt-0.5">
                    Asisten Ekoteologi Kristen Danau Toba
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="touch-target p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Context Pill */}
            <div className="px-4 py-1.5 bg-[#A8D5A2]/25 text-[11px] text-[#2E6B34] font-medium flex items-center justify-between border-b border-[#2E6B34]/10">
              <span>👤 {user.name} ({user.communityName.split('(')[0].trim()})</span>
              <span>⭐ {user.points} Poin Hijau</span>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {messages.map((m) => {
                const isUser = m.sender === 'user';
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-xs ${
                        isUser
                          ? 'bg-[#2E6B34] text-white rounded-tr-xs'
                          : 'bg-white border border-[#2E6B34]/15 text-[#1F2A1F] rounded-tl-xs'
                      }`}
                    >
                      <p className="whitespace-pre-line">{m.text}</p>

                      {/* Interactive Action Button inside Bot Message */}
                      {m.actionTag && (
                        <div className="mt-2.5 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => {
                              setIsOpen(false);
                              if (onOpenChallenge) onOpenChallenge();
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#A8D5A2]/30 hover:bg-[#A8D5A2]/50 text-[#2E6B34] text-xs font-bold transition active:scale-95"
                          >
                            <span>Ambil Tantangan: {m.actionTag}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-600 mt-1 px-1">
                      {m.timestamp}
                    </span>
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-[#2E6B34] bg-white/70 px-3 py-2 rounded-xl border border-[#2E6B34]/10 w-fit">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#2E6B34] animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-[#2E6B34] animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 rounded-full bg-[#2E6B34] animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span>Sahabat Ciptaan sedang merenungkan...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts Carousel */}
            {messages.length <= 3 && !loading && (
              <div className="px-3 py-2 border-t border-gray-200 bg-[#FAF6EC]/80 overflow-x-auto flex gap-2 no-scrollbar">
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(prompt)}
                    className="shrink-0 text-left text-xs bg-white border border-[#2E6B34]/20 text-[#2E6B34] hover:bg-[#A8D5A2]/20 px-3 py-1.5 rounded-full transition shadow-xs active:scale-95"
                  >
                    💬 {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3 bg-white border-t border-gray-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Tanyakan teologi ciptaan atau aksi..."
                  disabled={loading}
                  className="flex-1 text-sm bg-gray-50 border border-gray-300 focus:border-[#2E6B34] rounded-xl px-3.5 py-2.5 focus:outline-hidden text-[#1F2A1F]"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="touch-target w-10 h-10 rounded-xl bg-[#2E6B34] text-white flex items-center justify-center hover:bg-[#235328] disabled:opacity-40 transition active:scale-95"
                  title="Kirim Pesan"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <p className="text-[10px] text-gray-600 text-center mt-1.5">
                Sahabat Ciptaan adalah asisten ekoteologi. Tetap utamakan firman Alkitab dan hikmat persekutuan.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
