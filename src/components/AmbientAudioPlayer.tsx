import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Waves, Sparkles, Sliders } from 'lucide-react';

interface AmbientAudioPlayerProps {
  tintColor?: string;
}

export const AmbientAudioPlayer: React.FC<AmbientAudioPlayerProps> = ({ tintColor = '#2E6B34' }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(() => {
    return localStorage.getItem('mh_ambient_playing') === 'true';
  });
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('mh_ambient_volume');
    return saved !== null ? parseFloat(saved) : 0.45;
  });
  const [showControls, setShowControls] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const birdTimerRef = useRef<number | null>(null);
  const isPlayingRef = useRef<boolean>(isPlaying);

  isPlayingRef.current = isPlaying;

  // Initialize Web Audio graph for serene Lake Toba wave sounds
  const startAudio = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volume, ctx.currentTime);
      masterGain.connect(ctx.destination);
      masterGainRef.current = masterGain;

      // 1. Water waves generator (Pink/Brown noise passed through modulated lowpass filter)
      const bufferSize = ctx.sampleRate * 4;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // Compensate volume
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const waveFilter = ctx.createBiquadFilter();
      waveFilter.type = 'lowpass';
      waveFilter.frequency.setValueAtTime(320, ctx.currentTime);

      // Low Frequency Oscillator for gentle rhythmic water swelling
      const waveLfo = ctx.createOscillator();
      waveLfo.type = 'sine';
      waveLfo.frequency.setValueAtTime(0.18, ctx.currentTime); // ~5.5 second wave period

      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(260, ctx.currentTime);

      waveLfo.connect(lfoGain);
      lfoGain.connect(waveFilter.frequency);

      const waveGain = ctx.createGain();
      waveGain.gain.setValueAtTime(0.35, ctx.currentTime);

      noiseSource.connect(waveFilter);
      waveFilter.connect(waveGain);
      waveGain.connect(masterGain);

      noiseSource.start();
      waveLfo.start();

      // 2. Mountain breeze generator (soft high bandpass)
      const breezeFilter = ctx.createBiquadFilter();
      breezeFilter.type = 'bandpass';
      breezeFilter.frequency.setValueAtTime(450, ctx.currentTime);
      breezeFilter.Q.setValueAtTime(1.8, ctx.currentTime);

      const breezeGain = ctx.createGain();
      breezeGain.gain.setValueAtTime(0.08, ctx.currentTime);

      noiseSource.connect(breezeFilter);
      breezeFilter.connect(breezeGain);
      breezeGain.connect(masterGain);

      // 3. Periodic natural bird chirping around Danau Toba
      const scheduleBirdChirp = () => {
        if (!isPlayingRef.current || !audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          return;
        }

        const birdCtx = audioCtxRef.current;
        const now = birdCtx.currentTime;

        const osc = birdCtx.createOscillator();
        const bGain = birdCtx.createGain();
        osc.type = 'sine';

        // Frequency sweep mimicking serene wild birds
        const baseFreq = 2600 + Math.random() * 1200;
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq + 600, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(baseFreq - 300, now + 0.18);

        bGain.gain.setValueAtTime(0, now);
        bGain.gain.linearRampToValueAtTime(0.06, now + 0.04);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(bGain);
        bGain.connect(masterGain);

        osc.start(now);
        osc.stop(now + 0.25);

        // Schedule next chirp after 3.5 to 8 seconds
        const nextDelay = 3500 + Math.random() * 5000;
        birdTimerRef.current = window.setTimeout(scheduleBirdChirp, nextDelay);
      };

      // Start initial bird chirp schedule
      birdTimerRef.current = window.setTimeout(scheduleBirdChirp, 2000);
    } catch (err) {
      console.warn('AudioContext autoplay or init restriction:', err);
    }
  };

  const stopAudio = () => {
    if (birdTimerRef.current !== null) {
      clearTimeout(birdTimerRef.current);
      birdTimerRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        void audioCtxRef.current.close();
      } catch {
        // ignore
      }
      audioCtxRef.current = null;
    }
  };

  const togglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    localStorage.setItem('mh_ambient_playing', String(nextState));

    if (nextState) {
      startAudio();
    } else {
      stopAudio();
    }
  };

  const handleVolumeChange = (newVal: number) => {
    setVolume(newVal);
    localStorage.setItem('mh_ambient_volume', String(newVal));
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setValueAtTime(newVal, audioCtxRef.current.currentTime);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      startAudio();
    }
    return () => {
      stopAudio();
    };
  }, []);

  return (
    <aside aria-label="Pemutar Suara Alam Danau Toba" className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end">
      {/* Expanded Controls Popover */}
      {showControls && (
        <div className="mb-2 w-64 rounded-2xl border border-emerald-500/30 bg-[#FAF6EC]/95 dark:bg-[#111C13]/95 p-3.5 shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2 text-[#1F2A1F] dark:text-[#E6EFE6]">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200/80 dark:border-white/10">
            <div className="flex items-center gap-1.5">
              <Waves className="w-4 h-4 text-[#2E6B34] dark:text-emerald-400" />
              <span className="text-xs font-bold font-poppins">Suara Alam Toba</span>
            </div>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isPlaying ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}>
              {isPlaying ? 'Memutar' : 'Jeda'}
            </span>
          </div>

          <p className="text-[11px] text-gray-600 dark:text-gray-400 my-2 leading-relaxed">
            Deburan air tenang Danau Toba &amp; kicauan burung perbukitan Silindung.
          </p>

          {/* Volume Slider */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[10px] font-semibold text-gray-500 dark:text-gray-400">
              <span>Volume</span>
              <span>{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#2E6B34] dark:accent-emerald-400"
            />
          </div>

          {/* Play / Stop Action Button */}
          <button
            type="button"
            onClick={togglePlay}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#2E6B34] hover:bg-[#235328] dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-98"
          >
            {isPlaying ? (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>Hentikan Suara Alam</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>Nyalakan Suara Alam</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Floating Toggle Button */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setShowControls(!showControls)}
          className={`group flex items-center gap-2 py-2 px-3 sm:px-3.5 rounded-full border shadow-lg backdrop-blur-md transition-all duration-300 cursor-pointer ${
            isPlaying
              ? 'bg-[#2E6B34] border-emerald-400 text-white shadow-emerald-950/30'
              : 'bg-white/90 dark:bg-[#142217]/90 border-gray-300 dark:border-white/15 text-gray-700 dark:text-gray-200 hover:border-[#2E6B34]'
          }`}
          title={isPlaying ? 'Suara Alam Danau Toba aktif (Klik untuk pengaturan)' : 'Nyalakan Suara Alam Danau Toba'}
        >
          {isPlaying ? (
            <div className="flex items-center gap-1.5">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-200"></span>
              </span>
              <Volume2 className="w-4 h-4 animate-pulse" />
              <span className="text-[11px] font-bold hidden sm:inline">Alam Toba</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <VolumeX className="w-4 h-4 opacity-70 group-hover:opacity-100" />
              <span className="text-[11px] font-bold opacity-80 group-hover:opacity-100 hidden sm:inline">Alam Toba</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};
