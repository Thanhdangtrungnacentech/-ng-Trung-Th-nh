import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GraspObjectType, JointAngles } from '../types';
import {
  Zap,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  Sliders,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Fingerprint
} from 'lucide-react';

interface HapticFeedbackOverlayProps {
  forceN: number;
  pressureKPa: number;
  isGrasping: boolean;
  graspObject: GraspObjectType;
  jointAngles: JointAngles;
  visible?: boolean;
  onToggleVisible?: () => void;
  onApplyForce?: (force: number) => void;
}

interface ContactPointData {
  id: string;
  name: string;
  vietName: string;
  x: number; // percentage in hand diagram
  y: number;
  forceShare: number; // proportion of total force
  active: boolean;
  frequencyHz: number;
  slipRisk: 'safe' | 'warning' | 'critical';
}

export const HapticFeedbackOverlay: React.FC<HapticFeedbackOverlayProps> = ({
  forceN,
  pressureKPa,
  isGrasping,
  graspObject,
  jointAngles,
  visible = true,
  onToggleVisible,
  onApplyForce
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [hapticGain, setHapticGain] = useState<number>(1.0);
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [activeReflexVibration, setActiveReflexVibration] = useState<string | null>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Calculate per-finger contact forces based on grasp object kinematics and active joint angles
  const contactPoints = useMemo<ContactPointData[]>(() => {
    const isContactActive = isGrasping && forceN > 1.0;

    if (graspObject === 'key') {
      // Precision lateral key pinch: thumb & index bear 100% of contact
      return [
        {
          id: 'thumb',
          name: 'Thumb',
          vietName: 'Ngón Cái',
          x: 22,
          y: 50,
          forceShare: 0.52,
          active: isContactActive,
          frequencyHz: isContactActive ? 120 + forceN * 3 : 0,
          slipRisk: forceN > 35 ? 'warning' : 'safe'
        },
        {
          id: 'index',
          name: 'Index',
          vietName: 'Ngón Trỏ',
          x: 38,
          y: 20,
          forceShare: 0.48,
          active: isContactActive,
          frequencyHz: isContactActive ? 115 + forceN * 3 : 0,
          slipRisk: forceN > 35 ? 'warning' : 'safe'
        },
        {
          id: 'middle',
          name: 'Middle',
          vietName: 'Ngón Giữa',
          x: 52,
          y: 15,
          forceShare: 0.0,
          active: false,
          frequencyHz: 0,
          slipRisk: 'safe'
        },
        {
          id: 'ring',
          name: 'Ring',
          vietName: 'Áp Út',
          x: 67,
          y: 22,
          forceShare: 0.0,
          active: false,
          frequencyHz: 0,
          slipRisk: 'safe'
        },
        {
          id: 'pinky',
          name: 'Pinky',
          vietName: 'Ngón Út',
          x: 82,
          y: 35,
          forceShare: 0.0,
          active: false,
          frequencyHz: 0,
          slipRisk: 'safe'
        },
        {
          id: 'palm',
          name: 'Palm Pad',
          vietName: 'Lòng Bàn Tay',
          x: 52,
          y: 65,
          forceShare: 0.0,
          active: false,
          frequencyHz: 0,
          slipRisk: 'safe'
        }
      ];
    }

    if (graspObject === 'sphere') {
      // Spherical 5-finger envelop
      return [
        {
          id: 'thumb',
          name: 'Thumb',
          vietName: 'Ngón Cái',
          x: 22,
          y: 50,
          forceShare: 0.28,
          active: isContactActive,
          frequencyHz: isContactActive ? 90 + forceN * 4 : 0,
          slipRisk: forceN > 38 ? 'warning' : 'safe'
        },
        {
          id: 'index',
          name: 'Index',
          vietName: 'Ngón Trỏ',
          x: 38,
          y: 20,
          forceShare: 0.22,
          active: isContactActive,
          frequencyHz: isContactActive ? 85 + forceN * 4 : 0,
          slipRisk: forceN > 38 ? 'warning' : 'safe'
        },
        {
          id: 'middle',
          name: 'Middle',
          vietName: 'Ngón Giữa',
          x: 52,
          y: 15,
          forceShare: 0.24,
          active: isContactActive,
          frequencyHz: isContactActive ? 95 + forceN * 4 : 0,
          slipRisk: forceN > 38 ? 'warning' : 'safe'
        },
        {
          id: 'ring',
          name: 'Ring',
          vietName: 'Áp Út',
          x: 67,
          y: 22,
          forceShare: 0.16,
          active: isContactActive,
          frequencyHz: isContactActive ? 75 + forceN * 4 : 0,
          slipRisk: forceN > 38 ? 'warning' : 'safe'
        },
        {
          id: 'pinky',
          name: 'Pinky',
          vietName: 'Ngón Út',
          x: 82,
          y: 35,
          forceShare: 0.10,
          active: isContactActive,
          frequencyHz: isContactActive ? 65 + forceN * 4 : 0,
          slipRisk: forceN > 38 ? 'warning' : 'safe'
        },
        {
          id: 'palm',
          name: 'Palm Pad',
          vietName: 'Lòng Bàn Tay',
          x: 52,
          y: 65,
          forceShare: 0.12,
          active: isContactActive,
          frequencyHz: isContactActive ? 50 + forceN * 2 : 0,
          slipRisk: 'safe'
        }
      ];
    }

    // Default: Cylindrical / Box power grasp
    return [
      {
        id: 'thumb',
        name: 'Thumb',
        vietName: 'Ngón Cái',
        x: 22,
        y: 50,
        forceShare: 0.30,
        active: isContactActive,
        frequencyHz: isContactActive ? 110 + forceN * 3.5 : 0,
        slipRisk: forceN > 38 ? 'warning' : 'safe'
      },
      {
        id: 'index',
        name: 'Index',
        vietName: 'Ngón Trỏ',
        x: 38,
        y: 20,
        forceShare: 0.25,
        active: isContactActive,
        frequencyHz: isContactActive ? 105 + forceN * 3.5 : 0,
        slipRisk: forceN > 38 ? 'warning' : 'safe'
      },
      {
        id: 'middle',
        name: 'Middle',
        vietName: 'Ngón Giữa',
        x: 52,
        y: 15,
        forceShare: 0.23,
        active: isContactActive,
        frequencyHz: isContactActive ? 115 + forceN * 3.5 : 0,
        slipRisk: forceN > 38 ? 'warning' : 'safe'
      },
      {
        id: 'ring',
        name: 'Ring',
        vietName: 'Áp Út',
        x: 67,
        y: 22,
        forceShare: 0.14,
        active: isContactActive,
        frequencyHz: isContactActive ? 80 + forceN * 3.5 : 0,
        slipRisk: forceN > 38 ? 'warning' : 'safe'
      },
      {
        id: 'pinky',
        name: 'Pinky',
        vietName: 'Ngón Út',
        x: 82,
        y: 35,
        forceShare: 0.08,
        active: isContactActive,
        frequencyHz: isContactActive ? 70 + forceN * 3.5 : 0,
        slipRisk: forceN > 38 ? 'warning' : 'safe'
      },
      {
        id: 'palm',
        name: 'Palm Pad',
        vietName: 'Lòng Bàn Tay',
        x: 52,
        y: 65,
        forceShare: 0.15,
        active: isContactActive,
        frequencyHz: isContactActive ? 45 + forceN * 2 : 0,
        slipRisk: 'safe'
      }
    ];
  }, [graspObject, isGrasping, forceN]);

  // Real-time Vibrotactile Canvas Animation (Simulates Pacinian & Meissner mechanoreceptors response)
  useEffect(() => {
    const canvas = waveCanvasRef.current;
    if (!canvas || !visible || isCollapsed) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const render = () => {
      animId = requestAnimationFrame(render);
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = '#060a14';
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = '#0f1f38';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < w; x += 20) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y < h; y += 12) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      const isContactActive = isGrasping && forceN > 1.0;
      const effectiveForce = isContactActive ? forceN * hapticGain : 0.4;
      const centerY = h / 2;

      // Draw baseline center
      ctx.strokeStyle = '#1e3a5f';
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(w, centerY);
      ctx.stroke();

      // Multi-frequency tactile waveform (250Hz Pacinian + 40Hz Meissner)
      ctx.beginPath();
      ctx.lineWidth = 1.8;

      if (isContactActive) {
        if (forceN > 32) {
          ctx.strokeStyle = '#f59e0b'; // Amber high force
        } else {
          ctx.strokeStyle = '#2ee6c8'; // Cyan haptic pulse
        }
      } else {
        ctx.strokeStyle = '#475569';
      }

      for (let x = 0; x < w; x++) {
        const freqPacinian = (effectiveForce / 25) * 0.18 + 0.05;
        const freqMeissner = 0.03;
        const amp = isContactActive ? Math.min(centerY - 4, (effectiveForce / 35) * 16 + 3) : 1.2;

        const y =
          centerY +
          Math.sin(x * freqPacinian + t * 4) * amp * 0.7 +
          Math.cos(x * freqMeissner + t * 1.5) * amp * 0.3;

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Fill glow under wave
      if (isContactActive) {
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fillStyle = forceN > 32 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(46, 230, 200, 0.12)';
        ctx.fill();
      }

      t += 0.06;
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [visible, isCollapsed, isGrasping, forceN, hapticGain]);

  if (!visible) return null;

  const activePointsCount = contactPoints.filter(p => p.active).length;
  const isOptimalGrip = forceN >= 12.0 && forceN <= 32.0;

  const triggerTestPulse = (fingerName: string, targetForce: number) => {
    setActiveReflexVibration(fingerName);
    if (onApplyForce) {
      onApplyForce(targetForce);
    }
    setTimeout(() => {
      setActiveReflexVibration(null);
    }, 600);
  };

  return (
    <div
      className={`absolute bottom-16 left-3 z-30 transition-all duration-300 pointer-events-auto ${
        isCollapsed ? 'w-auto' : 'w-[340px] sm:w-[380px]'
      }`}
    >
      <div className="bg-[#050a17]/95 border border-[#2ee6c8]/40 rounded-xl shadow-2xl backdrop-blur-xl overflow-hidden text-slate-200 font-mono flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-[#0a162d] to-[#050d1e] border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {isGrasping && forceN > 1.0 ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2ee6c8] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#2ee6c8]" />
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-500" />
              )}
            </span>
            <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#2ee6c8]" />
              CHỈ BÁO XÚC GIÁC (HAPTIC HUD)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Status Pill */}
            <span
              className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                isGrasping && forceN > 1.0
                  ? isOptimalGrip
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-white/5 text-slate-400 border-white/10'
              }`}
            >
              {isGrasping && forceN > 1.0 ? (isOptimalGrip ? 'ỔN ĐỊNH' : 'CẢNH BÁO LỰC') : 'CHỜ TIẾP XÚC'}
            </span>

            {/* Collapse Toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title={isCollapsed ? 'Mở rộng bảng xúc giác' : 'Thu gọn'}
            >
              {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Expandable Body */}
        {!isCollapsed && (
          <div className="p-3 flex flex-col gap-2.5 max-h-[460px] overflow-y-auto">
            {/* Interactive Anatomical Hand Tactile Grid */}
            <div className="relative bg-[#02050e] border border-white/10 rounded-lg p-2 flex flex-col items-center justify-center min-h-[160px]">
              {/* Hand Outline Canvas / SVG Backdrop */}
              <svg viewBox="0 0 200 160" className="w-full h-[140px] opacity-25 pointer-events-none">
                {/* Stylized palm contour */}
                <path
                  d="M 50,150 L 50,105 Q 40,85 55,65 Q 65,45 80,45 Q 95,45 105,65 Q 115,45 130,45 Q 145,45 155,65 Q 165,55 175,70 Q 185,90 170,120 L 160,150 Z"
                  fill="none"
                  stroke="#2ee6c8"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                {/* Thumb flare */}
                <path
                  d="M 50,105 Q 25,100 25,80 Q 25,60 45,70"
                  fill="none"
                  stroke="#2ee6c8"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              </svg>

              {/* Pulsing Tactile Sensor Nodes Overlay */}
              <div className="absolute inset-0 p-3 pointer-events-none">
                {contactPoints.map(point => {
                  const pointForce = point.active ? forceN * point.forceShare : 0;
                  const pointPressure = point.active ? pressureKPa * (point.forceShare / 0.25) : 0;
                  const isHovered = selectedSensor === point.id;
                  const isVibrating = activeReflexVibration === point.id;

                  // Node color calculation
                  let nodeColor = '#475569';
                  let ringColor = 'rgba(71, 85, 105, 0.4)';
                  if (point.active) {
                    if (pointForce > 12) {
                      nodeColor = '#f59e0b';
                      ringColor = 'rgba(245, 158, 11, 0.6)';
                    } else if (pointForce > 4) {
                      nodeColor = '#10b981';
                      ringColor = 'rgba(16, 185, 129, 0.6)';
                    } else {
                      nodeColor = '#2ee6c8';
                      ringColor = 'rgba(46, 230, 200, 0.6)';
                    }
                  }

                  return (
                    <div
                      key={point.id}
                      style={{ left: `${point.x}%`, top: `${point.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group"
                      onClick={() => setSelectedSensor(selectedSensor === point.id ? null : point.id)}
                    >
                      {/* Animated Concentric Pulse Ripple (Haptic Shockwave) */}
                      {point.active && (
                        <div
                          className="absolute -inset-2.5 rounded-full animate-ping pointer-events-none"
                          style={{
                            backgroundColor: ringColor,
                            animationDuration: `${Math.max(0.6, 2.0 - (pointForce / 20))}s`
                          }}
                        />
                      )}

                      {/* Second Outer Pulse */}
                      {point.active && pointForce > 6 && (
                        <div
                          className="absolute -inset-4 rounded-full border border-[#2ee6c8]/40 animate-pulse pointer-events-none"
                          style={{ borderColor: nodeColor }}
                        />
                      )}

                      {/* Center Sensor Pad Node */}
                      <div
                        className={`relative w-4 h-4 rounded-full flex items-center justify-center transition-all shadow-lg ${
                          isVibrating ? 'scale-150 animate-bounce' : 'group-hover:scale-125'
                        }`}
                        style={{
                          backgroundColor: nodeColor,
                          boxShadow: point.active ? `0 0 10px ${nodeColor}` : 'none'
                        }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-black/70" />
                      </div>

                      {/* Tooltip on Hover / Click */}
                      <div
                        className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 px-2 py-1 bg-[#020713] border border-[#2ee6c8]/50 rounded text-[9px] whitespace-nowrap shadow-xl z-20 pointer-events-none transition-opacity ${
                          isHovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <div className="font-bold text-white flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: nodeColor }} />
                          {point.vietName} ({point.name})
                        </div>
                        <div className="text-[#2ee6c8] font-bold">
                          Fn: {pointForce.toFixed(2)} N · {pointPressure.toFixed(1)} kPa
                        </div>
                        <div className="text-[8px] text-slate-400">
                          {point.active ? `Tần số rung: ${point.frequencyHz.toFixed(0)} Hz` : 'Chưa tiếp xúc'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Hand Overview Mini Legend */}
              <div className="absolute top-1.5 right-2 text-[9px] text-slate-400 flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#2ee6c8]" /> &lt;4N
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#10b981]" /> 4-12N
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#f59e0b]" /> &gt;12N
                </span>
              </div>

              <div className="absolute bottom-1.5 left-2 text-[9px] text-slate-400">
                Điểm tiếp xúc kích hoạt: <span className="text-[#2ee6c8] font-bold">{activePointsCount}/6</span>
              </div>
            </div>

            {/* Real-time Oscilloscope (Vibrotactile Feedback Waveform) */}
            <div className="bg-[#030610] p-2 rounded-lg border border-white/10 flex flex-col gap-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-[#2ee6c8]" />
                  Đáp Ứng Vi Rung Xúc Giác (40Hz - 250Hz Pacinian):
                </span>
                <span className="text-[#2ee6c8] font-bold tabular-nums">
                  {isGrasping && forceN > 1.0 ? `${(80 + forceN * 3.5).toFixed(0)} Hz` : '0 Hz'}
                </span>
              </div>
              <canvas
                ref={waveCanvasRef}
                width={340}
                height={48}
                className="w-full h-12 rounded border border-white/5 bg-[#030610]"
              />
            </div>

            {/* Contact Force & Pressure Breakdown Tiles */}
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="bg-[#081224] p-1.5 rounded border border-[#2ee6c8]/20">
                <span className="text-[8.5px] text-slate-400 uppercase block">Lực Tổng Fn</span>
                <span className="text-xs font-bold text-[#2ee6c8] tabular-nums">
                  {forceN.toFixed(1)} N
                </span>
              </div>
              <div className="bg-[#081224] p-1.5 rounded border border-[#a06bff]/20">
                <span className="text-[8.5px] text-slate-400 uppercase block">Áp Suất P</span>
                <span className="text-xs font-bold text-[#a06bff] tabular-nums">
                  {pressureKPa.toFixed(0)} kPa
                </span>
              </div>
              <div className="bg-[#081224] p-1.5 rounded border border-emerald-500/20">
                <span className="text-[8.5px] text-slate-400 uppercase block">Hệ Số An Toàn</span>
                <span className="text-xs font-bold text-emerald-400 tabular-nums">
                  {forceN > 2.0 ? (forceN < 35 ? '1.42 (Tốt)' : '0.88 (Quá tải)') : '--'}
                </span>
              </div>
            </div>

            {/* Quick Haptic Test Stimulation Triggers */}
            <div className="bg-[#040816] p-2 rounded-lg border border-white/10 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-300 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" /> Thử Xung Rung Phản Hồi (Haptic Test):
                </span>
                <span className="text-[9px] text-slate-400">Độ Nhạy: {hapticGain.toFixed(1)}x</span>
              </div>

              <div className="grid grid-cols-3 gap-1 text-[9.5px]">
                <button
                  onClick={() => triggerTestPulse('index', 6.5)}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-[#2ee6c8]/20 text-slate-300 hover:text-[#2ee6c8] border border-white/10 transition-colors"
                  title="Mô phỏng rung nhẹ tiếp xúc 6.5N"
                >
                  ☝ Chạm Ngón Trỏ
                </button>
                <button
                  onClick={() => triggerTestPulse('thumb', 18.5)}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-[#10b981]/20 text-slate-300 hover:text-emerald-300 border border-white/10 transition-colors"
                  title="Mô phỏng lực kẹp ổn định 18.5N"
                >
                  👍 Nắm Chắc 18.5N
                </button>
                <button
                  onClick={() => triggerTestPulse('middle', 36.0)}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-white/10 transition-colors"
                  title="Mô phỏng cảnh báo rung vi trượt 36N"
                >
                  ⚠ Cảnh Báo Trượt
                </button>
              </div>

              {/* Haptic Gain Sensitivity Slider */}
              <div className="flex items-center gap-2 pt-1 border-t border-white/5 text-[9px] text-slate-400">
                <span>Cường độ:</span>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={hapticGain}
                  onChange={e => setHapticGain(parseFloat(e.target.value))}
                  className="flex-1 accent-[#2ee6c8] bg-slate-800 h-1 rounded cursor-pointer"
                />
                <span className="text-[#2ee6c8] font-bold tabular-nums min-w-[28px] text-right">
                  {hapticGain.toFixed(1)}x
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
