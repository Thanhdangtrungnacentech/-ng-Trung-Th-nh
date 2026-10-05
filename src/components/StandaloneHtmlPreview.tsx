import React, { useState, useRef } from 'react';
import {
  RotateCw,
  ExternalLink,
  Download,
  Maximize2,
  Minimize2,
  Monitor,
  Tablet,
  Smartphone,
  Sparkles,
  CheckCircle2,
  Code2,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface StandaloneHtmlPreviewProps {
  onClose?: () => void;
}

export const StandaloneHtmlPreview: React.FC<StandaloneHtmlPreviewProps> = ({ onClose }) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [viewportMode, setViewportMode] = useState<'fluid' | 'desktop' | 'tablet' | 'mobile'>('fluid');
  const [isReloading, setIsReloading] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [lastReloadTime, setLastReloadTime] = useState<string>(() => new Date().toLocaleTimeString('vi-VN'));

  const handleReload = () => {
    setIsReloading(true);
    if (iframeRef.current) {
      // Reload iframe by updating src
      const currentSrc = iframeRef.current.src.split('?')[0];
      iframeRef.current.src = `${currentSrc}?t=${Date.now()}`;
    }
    setLastReloadTime(new Date().toLocaleTimeString('vi-VN'));
    setTimeout(() => {
      setIsReloading(false);
    }, 450);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/standalone-demo.html';
    link.download = 'Biomimetic_Hand_Standalone_Simulation.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Viewport width styling
  const getContainerWidth = () => {
    switch (viewportMode) {
      case 'desktop':
        return 'max-w-[1280px]';
      case 'tablet':
        return 'max-w-[768px]';
      case 'mobile':
        return 'max-w-[420px]';
      case 'fluid':
      default:
        return 'w-full';
    }
  };

  return (
    <div
      className={`flex flex-col bg-[#050813] border border-[#2ee6c8]/40 rounded-xl overflow-hidden shadow-2xl transition-all duration-300 ${
        isFullscreen ? 'fixed inset-2 z-50 rounded-xl' : 'w-full h-full min-h-[620px]'
      }`}
    >
      {/* Top Header / Control Toolbar */}
      <div className="bg-[#091122] border-b border-white/10 px-3 py-2 flex items-center justify-between flex-wrap gap-2">
        {/* Title & Status */}
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#2ee6c8] animate-ping" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white tracking-wide font-mono">
              XEM TRƯỚC GÓI HTML UI/UX TỰ CHỨA (STANDALONE DEMO)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2ee6c8]/20 border border-[#2ee6c8]/50 text-[#2ee6c8] font-mono">
              /standalone-demo.html · Zero-Server
            </span>
          </div>
        </div>

        {/* Viewport & Action Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Viewport size switcher */}
          <div className="flex items-center bg-[#050813] p-0.5 rounded-lg border border-white/10 text-xs">
            <button
              onClick={() => setViewportMode('fluid')}
              title="Khổ co giãn 100% (Fluid Full Width)"
              className={`p-1.5 rounded flex items-center gap-1 text-[11px] transition-colors ${
                viewportMode === 'fluid' ? 'bg-[#2ee6c8] text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              100%
            </button>
            <button
              onClick={() => setViewportMode('desktop')}
              title="Khổ Desktop (1280px)"
              className={`p-1.5 rounded flex items-center gap-1 text-[11px] transition-colors ${
                viewportMode === 'desktop' ? 'bg-[#2ee6c8] text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewportMode('tablet')}
              title="Khổ Tablet (768px)"
              className={`p-1.5 rounded flex items-center gap-1 text-[11px] transition-colors ${
                viewportMode === 'tablet' ? 'bg-[#2ee6c8] text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewportMode('mobile')}
              title="Khổ Mobile (420px)"
              className={`p-1.5 rounded flex items-center gap-1 text-[11px] transition-colors ${
                viewportMode === 'mobile' ? 'bg-[#2ee6c8] text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Reload Button */}
          <button
            onClick={handleReload}
            disabled={isReloading}
            title="Chạy lại / Tải lại preview HTML ngay lập tức"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white text-xs font-mono transition-all active:scale-95"
          >
            <RotateCw className={`w-3.5 h-3.5 text-[#2ee6c8] ${isReloading ? 'animate-spin' : ''}`} />
            <span>Chạy Lại (Reload)</span>
          </button>

          {/* Download HTML */}
          <button
            onClick={handleDownload}
            title="Tải trực tiếp file standalone-demo.html về máy tính"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white text-xs font-mono transition-all"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Tải File .HTML</span>
          </button>

          {/* Open in new tab */}
          <a
            href="/standalone-demo.html"
            target="_blank"
            rel="noopener noreferrer"
            title="Mở file HTML ở tab mới riêng biệt"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-[#2ee6c8]/20 to-[#38bdf8]/20 border border-[#2ee6c8]/40 hover:border-[#2ee6c8] text-white text-xs font-mono transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span className="hidden md:inline">Tab Mới</span>
          </a>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Thu nhỏ preview' : 'Phóng to toàn màn hình'}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs border border-rose-500/30 font-mono"
            >
              ✕ Đóng
            </button>
          )}
        </div>
      </div>

      {/* Sub-bar Info Banner */}
      <div className="bg-[#030610] px-3 py-1.5 border-b border-white/5 flex items-center justify-between text-[10.5px] text-slate-400 font-mono flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3 h-3" /> Three.js r128 + OrbitControls + Haptic HUD Oscilloscope
          </span>
          <span className="hidden md:inline text-slate-500">|</span>
          <span className="hidden md:inline">Tải lần cuối lúc: <strong className="text-slate-200">{lastReloadTime}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-slate-300">
            Độ phân giải hiển thị: {viewportMode.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Embedded Iframe Sandbox Container */}
      <div className="flex-1 bg-[#02040a] p-2 flex items-center justify-center overflow-auto">
        <div
          className={`${getContainerWidth()} h-full min-h-[560px] w-full transition-all duration-200 rounded-lg overflow-hidden border border-white/10 shadow-xl relative`}
        >
          <iframe
            ref={iframeRef}
            src="/standalone-demo.html"
            title="Biomimetic Robotic Hand 3D Standalone Simulation"
            className="w-full h-full min-h-[560px] border-0 bg-[#070c18]"
            sandbox="allow-scripts allow-same-origin allow-downloads allow-forms allow-popups"
          />
        </div>
      </div>
    </div>
  );
};
