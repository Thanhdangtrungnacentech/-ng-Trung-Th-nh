import React, { useEffect, useRef, useState } from 'react';
import { Activity, Radio, Zap, Volume2, Maximize2, Waves, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { EMGSample } from '../types';

interface EMGOscilloscopeProps {
  activeCurl: number; // 0 to 1, reflects finger activation
  activeGesture?: string;
  samplingRate?: number;
}

const CHANNEL_COLORS = [
  '#2ee6c8', // Ch1: Flexor carpi radialis (Teal)
  '#38bdf8', // Ch2: Flexor digitorum superficialis (Sky)
  '#818cf8', // Ch3: Palmaris longus (Indigo)
  '#a06bff', // Ch4: Flexor carpi ulnaris (Purple)
  '#ec4899', // Ch5: Extensor digitorum (Pink)
  '#f43f5e', // Ch6: Extensor carpi radialis (Rose)
  '#fb923c', // Ch7: Pronator teres (Orange)
  '#facc15'  // Ch8: Brachioradialis (Gold)
];

const MUSCLE_NAMES = [
  'FCR (Gập cổ tay quay)',
  'FDS (Gập ngón nông)',
  'PL (Gan tay dài)',
  'FCU (Gập cổ tay trụ)',
  'ED (Duỗi các ngón)',
  'ECR (Duỗi cổ tay)',
  'PT (Sấp cẳng tay)',
  'BR (Cánh tay quay)'
];

export const EMGOscilloscope: React.FC<EMGOscilloscopeProps> = ({
  activeCurl,
  activeGesture = 'Power Grasp',
  samplingRate = 100
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedChannel, setSelectedChannel] = useState<number | 'all'>('all');
  const [gain, setGain] = useState<number>(1.2);
  const [isLive, setIsLive] = useState<boolean>(true);
  const [displayMode, setDisplayMode] = useState<'time' | 'fft'>('time');

  // Computed live bio-features (Time-Domain)
  const [features, setFeatures] = useState({
    mav: 0.18,
    rms: 0.24,
    zc: 24,
    wl: 42.5
  });

  // Frequency-Domain FFT metrics
  const [fftMetrics, setFftMetrics] = useState({
    mdf: 112.5,
    mnf: 124.8,
    peakFreq: 105.0,
    isFatigued: false
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const pointsCount = 420;
    const channelBuffers: number[][] = Array.from({ length: 8 }, () => new Array(pointsCount).fill(0));
    let t = 0;

    const render = () => {
      if (!isLive) {
        animId = requestAnimationFrame(render);
        return;
      }

      t += 0.08;
      const width = canvas.width;
      const height = canvas.height;

      // Dark oscilloscope sweep screen
      ctx.fillStyle = '#050914';
      ctx.fillRect(0, 0, width, height);

      // Subtle grid
      ctx.strokeStyle = 'rgba(46, 230, 200, 0.08)';
      ctx.lineWidth = 1;
      const stepX = width / 12;
      const stepY = height / 8;

      ctx.beginPath();
      for (let x = 0; x < width; x += stepX) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += stepY) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      const activation = Math.max(0.12, activeCurl);
      const isFatigued = activeCurl > 0.78;

      if (displayMode === 'time') {
        // --- 1. TIME-DOMAIN WAVEFORMS ---
        let sumAbs = 0;
        let sumSq = 0;
        let zeroCrossings = 0;

        for (let ch = 0; ch < 8; ch++) {
          const muscleOffset = ch * 0.78;
          const burstFreq = 2.4 + ch * 1.1;
          const motorUnitSpike =
            (Math.sin(t * burstFreq + muscleOffset) * 0.6 +
              Math.cos(t * (burstFreq * 1.6) - muscleOffset) * 0.35 +
              (Math.random() - 0.5) * 0.45) *
            activation *
            gain;

          channelBuffers[ch].shift();
          channelBuffers[ch].push(motorUnitSpike);

          const lastVal = channelBuffers[ch][pointsCount - 1];
          const prevVal = channelBuffers[ch][pointsCount - 2];
          sumAbs += Math.abs(lastVal);
          sumSq += lastVal * lastVal;
          if ((lastVal > 0 && prevVal < 0) || (lastVal < 0 && prevVal > 0)) {
            zeroCrossings++;
          }
        }

        const channelsToDraw = selectedChannel === 'all' ? [0, 1, 2, 3, 4, 5, 6, 7] : [selectedChannel];

        channelsToDraw.forEach(ch => {
          const color = CHANNEL_COLORS[ch];
          ctx.strokeStyle = color;
          ctx.lineWidth = selectedChannel === 'all' ? 1.4 : 2.4;

          const yBase = selectedChannel === 'all' ? (ch + 0.5) * (height / 8) : height / 2;

          ctx.beginPath();
          for (let i = 0; i < pointsCount; i++) {
            const x = (i / (pointsCount - 1)) * width;
            const amp = channelBuffers[ch][i];
            const y = yBase - amp * (selectedChannel === 'all' ? height / 18 : height / 3.2);

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          ctx.fillStyle = color;
          ctx.font = '10px monospace';
          ctx.fillText(`CH${ch + 1} · ${MUSCLE_NAMES[ch]}`, 10, yBase - 6);
        });

        if (Math.floor(t * 10) % 6 === 0) {
          const mav = Number((sumAbs / 8).toFixed(3));
          const rms = Number(Math.sqrt(sumSq / 8).toFixed(3));
          setFeatures({
            mav,
            rms,
            zc: 16 + Math.floor(zeroCrossings * 2.8),
            wl: Number((mav * 92 + Math.random() * 5).toFixed(1))
          });
        }
      } else {
        // --- 2. FREQUENCY-DOMAIN FFT (0 - 500 Hz) ---
        const maxFreq = 500;
        const padX = 50;
        const padY = 35;
        const plotW = width - padX * 2;
        const plotH = height - padY * 2;

        // Bandpass Region (20 Hz - 450 Hz) Highlight
        const x20 = padX + (20 / maxFreq) * plotW;
        const x450 = padX + (450 / maxFreq) * plotW;
        ctx.fillStyle = 'rgba(46, 230, 200, 0.04)';
        ctx.fillRect(x20, padY, x450 - x20, plotH);

        // 50 Hz AC Power-line Notch Filter Dip Marker
        const x50 = padX + (50 / maxFreq) * plotW;
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x50, padY);
        ctx.lineTo(x50, height - padY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#f43f5e';
        ctx.font = '9px monospace';
        ctx.fillText('50Hz Notch', x50 - 24, padY - 8);

        // Compute Spectrum Profile (Normal vs Muscle Fatigue compression)
        const peak = isFatigued ? 62 + Math.sin(t) * 2.5 : 108 + Math.sin(t) * 4;
        const bandwidth = isFatigued ? 26 : 42;
        const mdf = isFatigued ? 60 + Math.cos(t) * 2 : 112 + Math.cos(t) * 3;
        const mnf = isFatigued ? 72 + Math.sin(t) * 2 : 125 + Math.sin(t) * 3;

        const numBins = 100;
        const spectrum: { freq: number; psd: number }[] = [];

        for (let b = 0; b <= numBins; b++) {
          const f = (b / numBins) * maxFreq;
          const hpAtten = f < 20 ? Math.pow(f / 20, 2) : 1;
          const lpAtten = f > 450 ? Math.max(0, 1 - (f - 450) / 50) : 1;
          const notchAtten = Math.abs(f - 50) < 4 ? 0.08 : 1;

          const bell = Math.exp(-Math.pow(f - peak, 2) / (2 * Math.pow(bandwidth, 2)));
          const noise = (Math.sin(b * 0.8 + t * 4) * 0.04 + Math.random() * 0.03);
          const psd = Math.max(0, (bell + noise) * hpAtten * lpAtten * notchAtten * activation * gain * 1.3);

          spectrum.push({ freq: f, psd });
        }

        // Fill area under curve
        const grad = ctx.createLinearGradient(0, padY, 0, height - padY);
        grad.addColorStop(0, isFatigued ? 'rgba(244, 63, 94, 0.45)' : 'rgba(46, 230, 200, 0.45)');
        grad.addColorStop(1, 'rgba(16, 24, 40, 0.0)');

        ctx.beginPath();
        ctx.moveTo(padX, height - padY);
        spectrum.forEach(pt => {
          const x = padX + (pt.freq / maxFreq) * plotW;
          const y = height - padY - pt.psd * (plotH * 0.85);
          ctx.lineTo(x, y);
        });
        ctx.lineTo(padX + plotW, height - padY);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Stroke curve line
        ctx.strokeStyle = isFatigued ? '#f43f5e' : '#2ee6c8';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        spectrum.forEach((pt, i) => {
          const x = padX + (pt.freq / maxFreq) * plotW;
          const y = height - padY - pt.psd * (plotH * 0.85);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // MDF Vertical Marker
        const xMDF = padX + (mdf / maxFreq) * plotW;
        ctx.strokeStyle = '#a06bff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(xMDF, padY);
        ctx.lineTo(xMDF, height - padY);
        ctx.stroke();
        ctx.fillStyle = '#a06bff';
        ctx.font = '10px monospace';
        ctx.fillText(`MDF: ${mdf.toFixed(1)}Hz`, xMDF + 5, padY + 16);

        // Frequency Axis Labels
        ctx.fillStyle = '#64748b';
        ctx.font = '10px monospace';
        for (let f = 0; f <= 500; f += 100) {
          const x = padX + (f / maxFreq) * plotW;
          ctx.fillText(`${f}Hz`, x - 12, height - padY + 18);
        }

        if (Math.floor(t * 10) % 6 === 0) {
          setFftMetrics({
            mdf: Number(mdf.toFixed(1)),
            mnf: Number(mnf.toFixed(1)),
            peakFreq: Number(peak.toFixed(1)),
            isFatigued
          });
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [activeCurl, selectedChannel, gain, isLive, displayMode]);

  return (
    <div className="bg-[#09101f] border border-[#2ee6c8]/20 rounded-xl p-4 shadow-xl flex flex-col gap-3">
      {/* Oscilloscope Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#2ee6c8] animate-pulse" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#2ee6c8]">
            LAYER 2 · sEMG BIO-SIGNAL &amp; FFT SPECTRAL ANALYZER
          </h3>

          {displayMode === 'time' ? (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {activeCurl > 0.6 ? 'CO-CONTRACTION' : activeCurl > 0.2 ? 'MODERATE FLEX' : 'BASELINE REST'}
            </span>
          ) : (
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                fftMetrics.isFatigued
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {fftMetrics.isFatigued ? (
                <>
                  <AlertTriangle className="w-3 h-3" /> CẢNH BÁO MỎI CƠ (MDF GIẢM)
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3" /> CƠ BÌNH THƯỜNG (HEALTHY)
                </>
              )}
            </span>
          )}
        </div>

        {/* Mode Switcher & Controls */}
        <div className="flex items-center gap-2 text-xs font-mono">
          {/* Mode Switcher */}
          <div className="flex items-center bg-[#050811] p-0.5 rounded border border-white/10 text-[11px]">
            <button
              onClick={() => setDisplayMode('time')}
              className={`px-2 py-1 rounded transition-colors ${
                displayMode === 'time' ? 'bg-[#2ee6c8] text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Dạng Sóng (Time)
            </button>
            <button
              onClick={() => setDisplayMode('fft')}
              className={`px-2 py-1 rounded transition-colors ${
                displayMode === 'fft' ? 'bg-[#2ee6c8] text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Phổ Tần Số (FFT)
            </button>
          </div>

          {displayMode === 'time' && (
            <div className="flex items-center gap-1 bg-[#050811] px-2 py-1 rounded border border-white/10">
              <span className="text-slate-400 text-[11px]">Kênh:</span>
              <select
                value={selectedChannel}
                onChange={e => setSelectedChannel(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="bg-transparent text-[#2ee6c8] focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#09101f]">Tất cả 8 kênh</option>
                {MUSCLE_NAMES.map((name, i) => (
                  <option key={i} value={i} className="bg-[#09101f]">
                    CH{i + 1}: {name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1 bg-[#050811] px-2 py-1 rounded border border-white/10">
            <span className="text-slate-400 text-[11px]">Độ nhạy:</span>
            <button
              onClick={() => setGain(g => Math.max(0.6, g - 0.3))}
              className="px-1.5 hover:text-[#2ee6c8]"
            >
              -
            </button>
            <span className="text-[#a06bff] tabular-nums">{gain.toFixed(1)}x</span>
            <button
              onClick={() => setGain(g => Math.min(3.0, g + 0.3))}
              className="px-1.5 hover:text-[#2ee6c8]"
            >
              +
            </button>
          </div>

          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-2 py-1 rounded border text-[11px] font-semibold transition-all ${
              isLive
                ? 'bg-[#2ee6c8]/20 border-[#2ee6c8] text-[#2ee6c8]'
                : 'bg-amber-500/20 border-amber-500 text-amber-300'
            }`}
          >
            {isLive ? '● STREAM' : '❚❚ FREEZE'}
          </button>
        </div>
      </div>

      {/* Canvas Display */}
      <div className="relative w-full h-52 bg-[#040712] rounded-lg overflow-hidden border border-[#2ee6c8]/20">
        <canvas
          ref={canvasRef}
          width={840}
          height={320}
          className="w-full h-full block"
        />
        {/* Scope Corner Watermark */}
        <div className="absolute bottom-2 right-2 text-[9px] font-mono text-slate-500 bg-[#050914]/80 px-1.5 py-0.5 rounded border border-white/5">
          {displayMode === 'time'
            ? 'ADC 12-bit · Butterworth Bandpass 20-450Hz · Notch 50Hz'
            : 'Fast Fourier Transform (FFT 512-pt) · Power Spectral Density (0-500Hz)'}
        </div>
      </div>

      {/* Feature HUD Cards (Time-Domain vs FFT Frequency-Domain) */}
      {displayMode === 'time' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
          <div className="bg-[#050914] border border-white/10 rounded-md p-2">
            <span className="text-[10px] text-slate-400 block">MAV (Biên độ TB)</span>
            <span className="text-base font-bold text-[#2ee6c8] tabular-nums">
              {features.mav.toFixed(3)} <span className="text-[10px] text-slate-500">mV</span>
            </span>
          </div>
          <div className="bg-[#050914] border border-white/10 rounded-md p-2">
            <span className="text-[10px] text-slate-400 block">RMS (Công suất xung)</span>
            <span className="text-base font-bold text-[#38bdf8] tabular-nums">
              {features.rms.toFixed(3)} <span className="text-[10px] text-slate-500">mV</span>
            </span>
          </div>
          <div className="bg-[#050914] border border-white/10 rounded-md p-2">
            <span className="text-[10px] text-slate-400 block">Zero Crossings (ZC)</span>
            <span className="text-base font-bold text-[#a06bff] tabular-nums">
              {features.zc} <span className="text-[10px] text-slate-500">/s</span>
            </span>
          </div>
          <div className="bg-[#050914] border border-white/10 rounded-md p-2">
            <span className="text-[10px] text-slate-400 block">Waveform Length (WL)</span>
            <span className="text-base font-bold text-amber-400 tabular-nums">
              {features.wl.toFixed(1)} <span className="text-[10px] text-slate-500">a.u</span>
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
          <div className="bg-[#050914] border border-[#a06bff]/30 rounded-md p-2">
            <span className="text-[10px] text-slate-400 block">MDF (Tần Số Trung Vị)</span>
            <span className="text-base font-bold text-[#a06bff] tabular-nums">
              {fftMetrics.mdf} <span className="text-[10px] text-slate-500">Hz</span>
            </span>
          </div>
          <div className="bg-[#050914] border border-[#2ee6c8]/30 rounded-md p-2">
            <span className="text-[10px] text-slate-400 block">MNF (Tần Số Trung Bình)</span>
            <span className="text-base font-bold text-[#2ee6c8] tabular-nums">
              {fftMetrics.mnf} <span className="text-[10px] text-slate-500">Hz</span>
            </span>
          </div>
          <div className="bg-[#050914] border border-[#38bdf8]/30 rounded-md p-2">
            <span className="text-[10px] text-slate-400 block">Tần Số Đỉnh (Peak Hz)</span>
            <span className="text-base font-bold text-[#38bdf8] tabular-nums">
              {fftMetrics.peakFreq} <span className="text-[10px] text-slate-500">Hz</span>
            </span>
          </div>
          <div
            className={`border rounded-md p-2 ${
              fftMetrics.isFatigued
                ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
            }`}
          >
            <span className="text-[10px] block opacity-80">Trạng Thái Cơ</span>
            <span className="text-base font-bold">
              {fftMetrics.isFatigued ? 'MỎI CƠ (FATIGUE)' : 'BÌNH THƯỜNG'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
