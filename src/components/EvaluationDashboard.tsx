import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ModelMetrics, OptimizationRound } from '../types';
import { FEATURE_IMPORTANCES, BENCHMARK_MODELS, OPTIMIZATION_ROUNDS, computeOptimizationDiff } from '../data/dataset';
import {
  BarChart3,
  GitFork,
  AlertOctagon,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Layers,
  Zap,
  Award,
  AlertTriangle,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface EvaluationDashboardProps {
  metrics: ModelMetrics;
  selectedModelKey: string;
  onSelectModel: (key: string) => void;
  forceN: number;
  pressureKPa: number;
  thumbAngleDeg: number;
}

export const EvaluationDashboard: React.FC<EvaluationDashboardProps> = ({
  metrics,
  selectedModelKey,
  onSelectModel,
  forceN,
  pressureKPa,
  thumbAngleDeg
}) => {
  const curveCanvasRef = useRef<HTMLCanvasElement>(null);
  const paretoCanvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState<'metrics' | 'optimization' | 'features' | 'tree'>('optimization');
  const [selectedRoundIdx, setSelectedRoundIdx] = useState<number>(5); // default Pareto Optimum (Round 5)
  const [compareFromIdx, setCompareFromIdx] = useState<number>(0);
  const [compareToIdx, setCompareToIdx] = useState<number>(5);
  const [hardwareMetricType, setHardwareMetricType] = useState<'latency' | 'power' | 'flash'>('latency');

  // Draw Train vs Validation Learning Curve
  useEffect(() => {
    const canvas = curveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = { left: 45, right: 20, top: 20, bottom: 25 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    ctx.fillStyle = '#040712';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = 'rgba(46, 230, 200, 0.08)';
    ctx.lineWidth = 1;
    for (let p = 0.5; p <= 1.0; p += 0.1) {
      const y = padding.top + chartH - ((p - 0.5) / 0.5) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.fillText(`${(p * 100).toFixed(0)}%`, 10, y + 3);
    }

    // Determine dataset curve according to selected model
    let trainData = [0.86, 0.89, 0.91, 0.93, 0.94, 0.9428];
    let valData = [0.85, 0.88, 0.90, 0.92, 0.93, 0.9333];

    if (selectedModelKey.includes('overfit') || selectedModelKey.includes('unreg')) {
      trainData = [0.88, 0.94, 0.98, 0.995, 1.0, 1.0];
      valData = [0.80, 0.85, 0.88, 0.87, 0.85, 0.8333];
    } else if (selectedModelKey.includes('logistic')) {
      trainData = [0.80, 0.83, 0.85, 0.86, 0.88, 0.885];
      valData = [0.75, 0.79, 0.82, 0.84, 0.86, 0.8667];
    } else if (selectedModelKey.includes('mlp')) {
      trainData = [0.85, 0.91, 0.95, 0.97, 0.985, 0.9857];
      valData = [0.82, 0.86, 0.88, 0.89, 0.895, 0.9000];
    }

    const getX = (index: number, total: number) => padding.left + (index / (total - 1)) * chartW;
    const getY = (val: number) => padding.top + chartH - ((val - 0.5) / 0.5) * chartH;

    // Draw Train Curve (Cyan)
    ctx.strokeStyle = '#2ee6c8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    trainData.forEach((val, i) => {
      const x = getX(i, trainData.length);
      const y = getY(val);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill under train curve
    ctx.lineTo(getX(trainData.length - 1, trainData.length), padding.top + chartH);
    ctx.lineTo(getX(0, trainData.length), padding.top + chartH);
    ctx.fillStyle = 'rgba(46, 230, 200, 0.08)';
    ctx.fill();

    // Draw Validation Curve (Purple)
    ctx.strokeStyle = '#a06bff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    valData.forEach((val, i) => {
      const x = getX(i, valData.length);
      const y = getY(val);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Points
    trainData.forEach((val, i) => {
      ctx.fillStyle = '#2ee6c8';
      ctx.beginPath();
      ctx.arc(getX(i, trainData.length), getY(val), 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    valData.forEach((val, i) => {
      ctx.fillStyle = '#a06bff';
      ctx.beginPath();
      ctx.arc(getX(i, valData.length), getY(val), 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Legend
    ctx.fillStyle = '#2ee6c8';
    ctx.fillRect(width - 210, 10, 10, 10);
    ctx.fillText('Train Accuracy', width - 195, 18);

    ctx.fillStyle = '#a06bff';
    ctx.fillRect(width - 110, 10, 10, 10);
    ctx.fillText('Validation Acc', width - 95, 18);
  }, [metrics, selectedModelKey]);

  // Draw Progressive Optimization Pareto Frontier & Regression Cliff Chart
  useEffect(() => {
    if (activeTab !== 'optimization') return;
    const canvas = paretoCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = { left: 55, right: 65, top: 35, bottom: 45 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, width, height);

    const rounds = OPTIMIZATION_ROUNDS;
    const n = rounds.length;

    // Background zones:
    // Green Zone: R0 to R5 (Optimization gain)
    const xR0 = padding.left;
    const xR5 = padding.left + (5 / (n - 1)) * chartW;
    const xR6 = padding.left + chartW;

    const gradGain = ctx.createLinearGradient(xR0, 0, xR5, 0);
    gradGain.addColorStop(0, 'rgba(46, 230, 200, 0.03)');
    gradGain.addColorStop(1, 'rgba(46, 230, 200, 0.12)');
    ctx.fillStyle = gradGain;
    ctx.fillRect(xR0, padding.top, xR5 - xR0, chartH);

    // Red Zone: R5 to R6 (Regression Cliff)
    const gradReg = ctx.createLinearGradient(xR5, 0, xR6, 0);
    gradReg.addColorStop(0, 'rgba(244, 63, 94, 0.08)');
    gradReg.addColorStop(1, 'rgba(244, 63, 94, 0.22)');
    ctx.fillStyle = gradReg;
    ctx.fillRect(xR5, padding.top, xR6 - xR5, chartH);

    // Grid lines for Left Axis (Test Accuracy: 80% to 100%)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    for (let p = 80; p <= 100; p += 5) {
      const y = padding.top + chartH - ((p - 80) / 20) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#2ee6c8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${p}%`, padding.left - 8, y + 3);
    }

    // Right Axis Label (Hardware Cost)
    let maxHw = 30;
    let hwUnit = 'ms';
    if (hardwareMetricType === 'power') {
      maxHw = 130;
      hwUnit = 'mA';
    } else if (hardwareMetricType === 'flash') {
      maxHw = 360;
      hwUnit = 'KB';
    }

    for (let i = 0; i <= 4; i++) {
      const val = (maxHw / 4) * i;
      const y = padding.top + chartH - (i / 4) * chartH;
      ctx.fillStyle = '#f43f5e';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${val.toFixed(0)}${hwUnit}`, width - padding.right + 8, y + 3);
    }

    const getX = (idx: number) => padding.left + (idx / (n - 1)) * chartW;
    const getYAcc = (acc: number) => padding.top + chartH - ((acc * 100 - 80) / 20) * chartH;
    const getYHw = (val: number) => padding.top + chartH - (Math.min(maxHw, val) / maxHw) * chartH;

    // Draw Asymptote vertical dashed line at Round 5
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(xR5, padding.top - 8);
    ctx.lineTo(xR5, padding.top + chartH);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 9.5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ ĐỈNH BÃO HÒA PARETO (R5)', xR5, padding.top - 12);

    // Draw Hardware Overhead Curve (Red/Rose line)
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    rounds.forEach((r, i) => {
      const val = hardwareMetricType === 'power' ? r.powerMa : hardwareMetricType === 'flash' ? r.flashSizeKb : r.latencyMs;
      const x = getX(i);
      const y = getYHw(val);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw Accuracy Curve (Cyan line)
    ctx.strokeStyle = '#2ee6c8';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    rounds.forEach((r, i) => {
      const x = getX(i);
      const y = getYAcc(r.testAccuracy);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw ROC-AUC Curve (Purple dashed line)
    ctx.strokeStyle = '#a06bff';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    rounds.forEach((r, i) => {
      const x = getX(i);
      const y = getYAcc(r.rocAuc);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Points
    rounds.forEach((r, i) => {
      const x = getX(i);
      const yAcc = getYAcc(r.testAccuracy);
      const hwVal = hardwareMetricType === 'power' ? r.powerMa : hardwareMetricType === 'flash' ? r.flashSizeKb : r.latencyMs;
      const yHw = getYHw(hwVal);

      // Hardware point
      ctx.fillStyle = i === 6 ? '#ff0033' : '#f43f5e';
      ctx.beginPath();
      ctx.arc(x, yHw, i === 6 ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();

      // Accuracy point
      ctx.fillStyle = i === 5 ? '#2ee6c8' : i === 6 ? '#f43f5e' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(x, yAcc, i === 5 ? 7 : 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#030712';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label below X axis
      ctx.fillStyle = i === selectedRoundIdx ? '#2ee6c8' : '#94a3b8';
      ctx.font = i === selectedRoundIdx ? 'bold 10px monospace' : '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`R${r.round}`, x, padding.top + chartH + 16);
      ctx.fillStyle = i === 5 ? '#fbbf24' : i === 6 ? '#f43f5e' : '#64748b';
      ctx.font = '8.5px monospace';
      ctx.fillText(i === 5 ? 'Plateau' : i === 6 ? 'Kéo lùi' : `${(r.testAccuracy * 100).toFixed(1)}%`, x, padding.top + chartH + 28);
    });

    // Legends on top
    ctx.textAlign = 'left';
    ctx.fillStyle = '#2ee6c8';
    ctx.fillRect(padding.left, 10, 10, 10);
    ctx.fillText('Test Accuracy (%)', padding.left + 14, 18);

    ctx.fillStyle = '#a06bff';
    ctx.fillRect(padding.left + 160, 10, 10, 10);
    ctx.fillText('ROC-AUC', padding.left + 174, 18);

    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(padding.left + 260, 10, 10, 10);
    const hwLabel = hardwareMetricType === 'power' ? 'Dòng điện MCU (mA)' : hardwareMetricType === 'flash' ? 'Flash ROM (KB)' : 'Độ trễ suy luận MCU (ms)';
    ctx.fillText(hwLabel, padding.left + 274, 18);
  }, [activeTab, selectedRoundIdx, hardwareMetricType]);

  const activeDiffs = useMemo(() => {
    const fromR = OPTIMIZATION_ROUNDS[compareFromIdx] || OPTIMIZATION_ROUNDS[0];
    const toR = OPTIMIZATION_ROUNDS[compareToIdx] || OPTIMIZATION_ROUNDS[5];
    return computeOptimizationDiff(fromR, toR);
  }, [compareFromIdx, compareToIdx]);

  const selectedRound = OPTIMIZATION_ROUNDS[selectedRoundIdx] || OPTIMIZATION_ROUNDS[5];

  // XGBoost Decision Tree Route Simulation
  const treeNodes = [
    {
      id: 'root',
      rule: 'pressure_kPa <= 68.5',
      decision: pressureKPa <= 68.5 ? 'Trái (Lực yếu)' : 'Phải (Áp lực đủ)',
      passed: pressureKPa > 68.5
    },
    {
      id: 'node_left',
      rule: 'force_N <= 11.2',
      decision: forceN <= 11.2 ? 'Trượt rơi (Thất Bại)' : 'Cân nhắc góc ngón',
      passed: forceN > 11.2
    },
    {
      id: 'node_right',
      rule: 'thumb_angle_deg >= 38.0',
      decision: thumbAngleDeg >= 38.0 ? 'Đối ứng vững (Thành Công)' : 'Khuyết ngón cái',
      passed: thumbAngleDeg >= 38.0
    }
  ];

  return (
    <div className="bg-[#09101f] border border-[#2ee6c8]/25 rounded-xl p-4 shadow-xl flex flex-col gap-4">
      {/* Header & Model Selector */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2ee6c8]" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#2ee6c8]">
              LAYER 3 · EVALUATION &amp; GENERALIZATION AUDIT (ĐỘ KIẾP)
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
            So sánh hiệu năng các mô hình và kiểm tra khoảng cách "Tấu hỏa nhập ma"
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#050812] p-1 rounded-lg border border-white/10 text-xs font-mono flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('optimization')}
            className={`px-3 py-1 rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'optimization'
                ? 'bg-gradient-to-r from-[#2ee6c8] to-[#38bdf8] text-black font-bold shadow-md shadow-[#2ee6c8]/30'
                : 'text-[#38bdf8] hover:text-white hover:bg-white/5'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Hành Trình Tối Ưu &amp; Kéo Lùi (Mới)
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'metrics' ? 'bg-[#2ee6c8] text-black font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Chỉ Số &amp; Ma Trận
          </button>
          <button
            onClick={() => setActiveTab('features')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'features' ? 'bg-[#2ee6c8] text-black font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Feature Importance
          </button>
          <button
            onClick={() => setActiveTab('tree')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'tree' ? 'bg-[#2ee6c8] text-black font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            XGBoost Tree Router
          </button>
        </div>
      </div>

      {/* Model Benchmark Preset Buttons (Only in metrics tab or as quick jump) */}
      {activeTab === 'metrics' && (
        <div className="flex flex-wrap gap-1.5 text-xs font-mono">
          {Object.entries(BENCHMARK_MODELS).map(([key, model]) => {
            const isSelected = selectedModelKey === key;
            return (
              <button
                key={key}
                onClick={() => onSelectModel(key)}
                className={`px-2.5 py-1 rounded border transition-all ${
                  isSelected
                    ? 'bg-[#2ee6c8]/20 border-[#2ee6c8] text-[#2ee6c8] font-bold shadow-md shadow-[#2ee6c8]/10'
                    : 'bg-[#050811] border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'
                }`}
              >
                {model.name}
              </button>
            );
          })}
        </div>
      )}

      {/* ACTIVE TAB: OPTIMIZATION TRAJECTORY & REGRESSION AUDIT */}
      {activeTab === 'optimization' && (
        <div className="space-y-4 font-mono">
          {/* 1. Global KPI Banner: Maximum Gains vs Over-Optimization Penalty */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Left Card: Positive Improvement Gains */}
            <div className="bg-gradient-to-br from-emerald-950/40 to-[#050812] border border-emerald-500/40 rounded-xl p-3.5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                    TỔNG HỢP PHẦN TRĂM CẢI TIẾN TỐI ĐA (TỚI VÒNG 5)
                  </h4>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  🏆 Đỉnh Bão Hòa Pareto
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center mt-2.5">
                <div className="bg-[#030610]/80 p-2 rounded-lg border border-emerald-500/20">
                  <span className="text-[10px] text-slate-400 block">Độ Chính Xác</span>
                  <span className="text-lg font-bold text-emerald-400 block">+11.54%</span>
                  <span className="text-[9px] text-slate-400 block">86.7% → 96.7%</span>
                </div>
                <div className="bg-[#030610]/80 p-2 rounded-lg border border-emerald-500/20">
                  <span className="text-[10px] text-slate-400 block">ROC-AUC</span>
                  <span className="text-lg font-bold text-emerald-400 block">+95.60%</span>
                  <span className="text-[9px] text-slate-400 block">0.50 → 0.978</span>
                </div>
                <div className="bg-[#030610]/80 p-2 rounded-lg border border-emerald-500/20">
                  <span className="text-[10px] text-slate-400 block">Lỗi Rơi Vật (FN)</span>
                  <span className="text-lg font-bold text-emerald-400 block">-100%</span>
                  <span className="text-[9px] text-slate-400 block">4 ca → 0 ca</span>
                </div>
                <div className="bg-[#030610]/80 p-2 rounded-lg border border-emerald-500/20">
                  <span className="text-[10px] text-slate-400 block">Độ Trễ Nhúng</span>
                  <span className="text-lg font-bold text-emerald-400 block">1.6 ms</span>
                  <span className="text-[9px] text-slate-400 block">Chu kỳ 100Hz STM32</span>
                </div>
              </div>

              <p className="text-[10.5px] text-emerald-200/90 mt-2.5 leading-relaxed">
                ✓ <span className="font-semibold">Kết luận tối ưu:</span> Hệ thống đạt cảnh giới bão hòa tại Vòng 5: Lực tiếp xúc FSR kết hợp tín hiệu sEMG 8 kênh và lượng tử hóa INT8 giúp tăng 11.54% độ chính xác, triệt tiêu 100% ca rơi vật, duy trì phản xạ siêu tốc 1.6ms trên STM32F4.
              </p>
            </div>

            {/* Right Card: Negative Regressions & Trade-offs */}
            <div className="bg-gradient-to-br from-rose-950/40 to-[#050812] border border-rose-500/40 rounded-xl p-3.5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-rose-500/20 text-rose-300 flex items-center justify-center font-bold">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                    ĐÁNH GIÁ PHẦN TRĂM KÉO LÙI &amp; ĐÁNH ĐỔI (TRADE-OFFS)
                  </h4>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  ⛔ Cảnh Báo Quá Ngưỡng
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center mt-2.5">
                <div className="bg-[#030610]/80 p-2 rounded-lg border border-rose-500/20">
                  <span className="text-[10px] text-slate-400 block">Kéo Lùi Accuracy</span>
                  <span className="text-lg font-bold text-rose-400 block">-3.45%</span>
                  <span className="text-[9px] text-slate-400 block">Tại Vòng 6 ép quá</span>
                </div>
                <div className="bg-[#030610]/80 p-2 rounded-lg border border-rose-500/20">
                  <span className="text-[10px] text-slate-400 block">Kéo Lùi Độ Trễ</span>
                  <span className="text-lg font-bold text-rose-400 block">+1681%</span>
                  <span className="text-[9px] text-slate-400 block">1.6ms → 28.5ms</span>
                </div>
                <div className="bg-[#030610]/80 p-2 rounded-lg border border-rose-500/20">
                  <span className="text-[10px] text-slate-400 block">Flash ROM Phình</span>
                  <span className="text-lg font-bold text-rose-400 block">+3853%</span>
                  <span className="text-[9px] text-slate-400 block">8.6KB → 340KB</span>
                </div>
                <div className="bg-[#030610]/80 p-2 rounded-lg border border-rose-500/20">
                  <span className="text-[10px] text-slate-400 block">Sụt Pin / Dòng MCU</span>
                  <span className="text-lg font-bold text-rose-400 block">+247%</span>
                  <span className="text-[9px] text-slate-400 block">34mA → 118mA</span>
                </div>
              </div>

              <p className="text-[10.5px] text-rose-200/90 mt-2.5 leading-relaxed">
                ⚠ <span className="font-semibold">Quy luật đánh đổi Pareto:</span> Khi cố tình vượt ngưỡng bão hòa (Vòng 6: nhồi 16 tầng Deep Transformer &amp; 1024 cây Stacking), hệ thống bị kéo lùi toàn diện: độ trễ nổ tung phá vỡ thời gian thực 40Hz, sụt pin nhanh gấp 3.5 lần, và độ chính xác tụt -3.45% do quá khớp với nhiễu sEMG!
              </p>
            </div>
          </div>

          {/* 2. Interactive Timeline Stepper (Rounds 0 -> 6) */}
          <div className="bg-[#050812] border border-white/10 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#2ee6c8]" />
                TIẾN TRÌNH 7 VÒNG KIỂM THỬ TỐI ƯU HÓA TUẦN TỰ (CHỌN ĐỂ SOI CHI TIẾT)
              </span>
              <span className="text-[11px] text-slate-400">
                Đang xem: <span className="text-[#38bdf8] font-bold">{selectedRound.name}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
              {OPTIMIZATION_ROUNDS.map((r, idx) => {
                const isSelected = selectedRoundIdx === idx;
                const isPlateau = idx === 5;
                const isRegression = idx === 2 || idx === 6;

                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRoundIdx(idx)}
                    className={`p-2 rounded-lg border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#2ee6c8] bg-[#2ee6c8]/15 shadow-lg shadow-[#2ee6c8]/10'
                        : isPlateau
                        ? 'border-amber-500/40 bg-amber-950/20 hover:border-amber-400'
                        : isRegression
                        ? 'border-rose-500/30 bg-rose-950/15 hover:border-rose-400'
                        : 'border-white/10 bg-[#09101f] hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold uppercase ${
                          isPlateau ? 'text-amber-400' : isRegression ? 'text-rose-400' : 'text-slate-400'
                        }`}>
                          R{r.round}
                        </span>
                        {isPlateau && (
                          <span className="text-[8px] bg-amber-500 text-black font-extrabold px-1 py-0.2 rounded">
                            BEST
                          </span>
                        )}
                        {isRegression && (
                          <span className="text-[8px] bg-rose-500/30 text-rose-300 border border-rose-500/40 px-1 py-0.2 rounded">
                            KÉO LÙI
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-white block mt-0.5 truncate">
                        {(r.testAccuracy * 100).toFixed(1)}% Acc
                      </span>
                    </div>

                    <div className="mt-1 text-[9px] text-slate-400 flex items-center justify-between border-t border-white/5 pt-1">
                      <span>{r.latencyMs}ms</span>
                      <span className={`${r.falseNegatives === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        FN:{r.falseNegatives}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Detailed Card of the Selected Round */}
          <div className="bg-[#050812] border border-white/10 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">{selectedRound.name}</h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    selectedRound.status === 'plateau'
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                      : selectedRound.status === 'regressed'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : selectedRound.status === 'improved'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-700/40 text-slate-300'
                  }`}>
                    {selectedRound.statusBadge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  <span className="text-[#38bdf8] font-semibold">Thuật toán &amp; Kỹ thuật:</span> {selectedRound.method}
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5">{selectedRound.description}</p>
              </div>

              {/* Fast presets to compare */}
              <div className="flex gap-1.5 text-xs">
                <button
                  onClick={() => {
                    setCompareFromIdx(0);
                    setCompareToIdx(selectedRound.round);
                  }}
                  className="px-2.5 py-1 rounded bg-[#0b1424] hover:bg-[#122038] border border-white/10 text-slate-300 hover:text-white transition-all text-[11px]"
                >
                  So sánh với Baseline R0
                </button>
                <button
                  onClick={() => {
                    setCompareFromIdx(5);
                    setCompareToIdx(selectedRound.round);
                  }}
                  className="px-2.5 py-1 rounded bg-[#0b1424] hover:bg-[#122038] border border-amber-500/30 text-amber-300 hover:text-white transition-all text-[11px]"
                >
                  So sánh với Đỉnh Pareto R5
                </button>
              </div>
            </div>

            {/* Two-Column Audit: Key Improvements vs Regressions / Overheads */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-[#030610] p-3 rounded-lg border border-emerald-500/20 space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase text-[11px]">
                  <CheckCircle2 className="w-4 h-4" />
                  CÁC HẠNG MỤC CẢI TIẾN THÀNH CÔNG:
                </div>
                <ul className="space-y-1 text-slate-300 text-[11px]">
                  {selectedRound.keyImprovements.map((imp, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 mt-0.5">✓</span>
                      <span>{imp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-[#030610] p-3 rounded-lg border border-rose-500/20 space-y-1.5">
                <div className="flex items-center gap-1.5 text-rose-400 font-bold uppercase text-[11px]">
                  <AlertTriangle className="w-4 h-4" />
                  CÁC HẠNG MỤC BỊ KÉO LÙI / ĐÁNH ĐỔI PHẦN CỨNG:
                </div>
                <ul className="space-y-1 text-slate-300 text-[11px]">
                  {selectedRound.keyRegressions.map((reg, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-rose-400 mt-0.5">⚠</span>
                      <span>{reg}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* 4. Dual-Axis Canvas: Pareto Frontier & Regression Cliff Chart */}
          <div className="bg-[#050812] border border-white/10 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-xs font-bold text-slate-200 block">
                  ĐƯỜNG CONG TỐI ƯU HÓA PARETO &amp; VÁCH ĐÁ KÉO LÙI (REGRESSION CLIFF)
                </span>
                <span className="text-[10px] text-slate-400">
                  Đối chiếu giữa Độ chính xác (Trục Trái) vs Chi phí phần cứng nhúng (Trục Phải)
                </span>
              </div>

              {/* Hardware Metric Switcher */}
              <div className="flex items-center gap-1 bg-[#09101f] p-1 rounded-lg border border-white/10 text-[11px]">
                <span className="text-slate-400 px-1 text-[10px]">Trục Phải:</span>
                <button
                  onClick={() => setHardwareMetricType('latency')}
                  className={`px-2 py-0.5 rounded transition-all ${
                    hardwareMetricType === 'latency'
                      ? 'bg-rose-500 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Độ Trễ (ms)
                </button>
                <button
                  onClick={() => setHardwareMetricType('power')}
                  className={`px-2 py-0.5 rounded transition-all ${
                    hardwareMetricType === 'power'
                      ? 'bg-rose-500 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Dòng Điện (mA)
                </button>
                <button
                  onClick={() => setHardwareMetricType('flash')}
                  className={`px-2 py-0.5 rounded transition-all ${
                    hardwareMetricType === 'flash'
                      ? 'bg-rose-500 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Bộ Nhớ Flash (KB)
                </button>
              </div>
            </div>

            <div className="relative min-h-[220px] w-full rounded bg-[#030712] overflow-hidden">
              <canvas
                ref={paretoCanvasRef}
                width={700}
                height={220}
                className="w-full h-full block rounded"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10.5px] text-slate-400 pt-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2ee6c8]" />
                <span>
                  <strong className="text-emerald-300">Vùng Xanh (R0 → R5):</strong> Tối ưu hóa hiệu quả, độ chính xác tăng đều đặn tới ngưỡng bão hòa 96.67%.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>
                  <strong className="text-rose-300">Vùng Đỏ (R5 → R6):</strong> Vực thẳm kéo lùi (Regression Cliff) — độ trễ tăng vọt 1681% và phá vỡ cấu trúc nhúng.
                </span>
              </div>
            </div>
          </div>

          {/* 5. Differential Comparator (So Sánh Vi Sai A/B Cải Tiến vs Kéo Lùi) */}
          <div className="bg-[#050812] border border-white/10 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#38bdf8]" />
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  BỘ ĐO VI SAI TƯƠNG TÁC (TÍNH % CẢI TIẾN VS % KÉO LÙI GIỮA 2 MỐC)
                </h4>
              </div>

              {/* Selectors */}
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-[11px]">Từ:</span>
                  <select
                    value={compareFromIdx}
                    onChange={e => setCompareFromIdx(Number(e.target.value))}
                    className="bg-[#09101f] border border-white/20 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-[#2ee6c8]"
                  >
                    {OPTIMIZATION_ROUNDS.map((r, i) => (
                      <option key={r.id} value={i}>
                        R{r.round}: {r.name.split(':')[1]?.trim() || r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-[11px]">Đến:</span>
                  <select
                    value={compareToIdx}
                    onChange={e => setCompareToIdx(Number(e.target.value))}
                    className="bg-[#09101f] border border-white/20 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-[#2ee6c8]"
                  >
                    {OPTIMIZATION_ROUNDS.map((r, i) => (
                      <option key={r.id} value={i}>
                        R{r.round}: {r.name.split(':')[1]?.trim() || r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick Presets */}
                <button
                  onClick={() => {
                    setCompareFromIdx(0);
                    setCompareToIdx(5);
                  }}
                  className="px-2 py-1 rounded bg-[#2ee6c8]/20 border border-[#2ee6c8]/40 text-[#2ee6c8] font-bold text-[11px] hover:bg-[#2ee6c8]/30 transition-all"
                >
                  ⚡ Preset: Toàn Bộ Cải Tiến (R0 → R5)
                </button>
                <button
                  onClick={() => {
                    setCompareFromIdx(5);
                    setCompareToIdx(6);
                  }}
                  className="px-2 py-1 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-[11px] hover:bg-rose-500/30 transition-all"
                >
                  ⚠️ Preset: Đo Mức Kéo Lùi (R5 → R6)
                </button>
              </div>
            </div>

            {/* Differential Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {activeDiffs.map(diff => {
                const isPositive = diff.isPositiveForUser;
                return (
                  <div
                    key={diff.metricKey}
                    className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                      isPositive
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                        : 'bg-rose-950/25 border-rose-500/35 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-semibold text-slate-300">
                        {diff.metricLabel}
                      </span>
                      {isPositive ? (
                        <div className="flex items-center gap-0.5 text-emerald-400 font-bold text-xs">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>CẢI TIẾN</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-0.5 text-rose-400 font-bold text-xs">
                          <ArrowDownRight className="w-3.5 h-3.5" />
                          <span>KÉO LÙI</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-baseline justify-between mt-2">
                      <div className="text-xs text-slate-400">
                        <span>{diff.fromVal}{diff.unit}</span>
                        <span className="mx-1">→</span>
                        <span className="font-bold text-white">{diff.toVal}{diff.unit}</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-base font-extrabold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {diff.percentageDiff > 0 ? `+${diff.percentageDiff}%` : `${diff.percentageDiff}%`}
                        </span>
                        <span className="text-[9px] text-slate-400 block">
                          Δ {diff.absoluteDiff > 0 ? `+${diff.absoluteDiff}` : diff.absoluteDiff}{diff.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 6. Comprehensive Benchmark Matrix Table */}
          <div className="bg-[#050812] border border-white/10 rounded-xl p-3.5 space-y-2 overflow-x-auto">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-[#2ee6c8]" />
                BẢNG KẾT QUẢ CHẠY KIỂM THỬ TỔNG HỢP QUA TẤT CẢ CÁC VÒNG TỐI ƯU
              </span>
              <span className="text-[10px] text-slate-400">
                Được kiểm chứng qua 10 Đối Tượng (S01 - S10) &amp; Mô Phỏng Phi Tuyến RK4
              </span>
            </div>

            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-white/15 text-slate-400 text-[10px] uppercase">
                  <th className="py-2 px-2">Vòng</th>
                  <th className="py-2 px-2">Phương Pháp</th>
                  <th className="py-2 px-2 text-right">Test Acc</th>
                  <th className="py-2 px-2 text-right">ROC-AUC</th>
                  <th className="py-2 px-2 text-right">Train-Test Gap</th>
                  <th className="py-2 px-2 text-center">FN (Rơi vật)</th>
                  <th className="py-2 px-2 text-right">Độ Trễ MCU</th>
                  <th className="py-2 px-2 text-right">Flash ROM</th>
                  <th className="py-2 px-2 text-right">Dòng MCU</th>
                  <th className="py-2 px-2 text-center">Đánh Giá</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {OPTIMIZATION_ROUNDS.map((r, i) => {
                  const isSelected = selectedRoundIdx === i;
                  const isBest = i === 5;
                  const isOver = i === 6;

                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedRoundIdx(i)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#2ee6c8]/10'
                          : isBest
                          ? 'bg-amber-950/20 hover:bg-amber-950/30'
                          : isOver
                          ? 'bg-rose-950/20 hover:bg-rose-950/30'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <td className="py-2 px-2 font-bold text-white">R{r.round}</td>
                      <td className="py-2 px-2">
                        <span className="font-semibold text-slate-200 block truncate max-w-[180px]">
                          {r.name.split(':')[1]?.trim() || r.name}
                        </span>
                        <span className="text-[9px] text-slate-400 block truncate max-w-[180px]">
                          {r.method}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-emerald-400">
                        {(r.testAccuracy * 100).toFixed(2)}%
                      </td>
                      <td className="py-2 px-2 text-right text-purple-300">
                        {r.rocAuc.toFixed(4)}
                      </td>
                      <td className={`py-2 px-2 text-right ${r.generalizationGap > 0.05 ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                        {(r.generalizationGap * 100).toFixed(2)}%
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          r.falseNegatives === 0
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {r.falseNegatives} ca
                        </span>
                      </td>
                      <td className={`py-2 px-2 text-right ${r.latencyMs > 10 ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                        {r.latencyMs} ms
                      </td>
                      <td className="py-2 px-2 text-right text-slate-300">
                        {r.flashSizeKb} KB
                      </td>
                      <td className="py-2 px-2 text-right text-slate-300">
                        {r.powerMa} mA
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          isBest
                            ? 'bg-amber-400 text-black'
                            : isOver
                            ? 'bg-rose-600 text-white'
                            : r.status === 'improved'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          {r.statusBadge}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'metrics' && (
        <div className="space-y-4 font-mono">
          {/* Main 6 Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <div className="bg-[#050812] border border-white/10 rounded-lg p-2.5">
              <span className="text-[10px] text-slate-400 block uppercase">Accuracy (Độ chính xác)</span>
              <span className="text-xl font-bold text-[#2ee6c8] tabular-nums">
                {(metrics.accuracy * 100).toFixed(2)}%
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Tỷ lệ đoán đúng</span>
            </div>

            <div className="bg-[#050812] border border-white/10 rounded-lg p-2.5">
              <span className="text-[10px] text-slate-400 block uppercase">Precision (Độ chuẩn)</span>
              <span className="text-xl font-bold text-[#38bdf8] tabular-nums">
                {(metrics.precision * 100).toFixed(2)}%
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">TP / (TP + FP)</span>
            </div>

            <div className="bg-[#050812] border border-white/10 rounded-lg p-2.5">
              <span className="text-[10px] text-slate-400 block uppercase">Recall (Độ nhạy)</span>
              <span className="text-xl font-bold text-emerald-400 tabular-nums">
                {(metrics.recall * 100).toFixed(2)}%
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">TP / (TP + FN)</span>
            </div>

            <div className="bg-[#050812] border border-white/10 rounded-lg p-2.5">
              <span className="text-[10px] text-slate-400 block uppercase">F1-Score</span>
              <span className="text-xl font-bold text-[#a06bff] tabular-nums">
                {(metrics.f1 * 100).toFixed(2)}%
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Cân bằng P &amp; R</span>
            </div>

            <div className="bg-[#050812] border border-white/10 rounded-lg p-2.5">
              <span className="text-[10px] text-slate-400 block uppercase">ROC-AUC</span>
              <span className="text-xl font-bold text-amber-400 tabular-nums">
                {metrics.roc_auc.toFixed(4)}
              </span>
              <span className="text-[9px] text-slate-500 block mt-0.5">Diện tích đường cong</span>
            </div>

            <div className={`border rounded-lg p-2.5 ${
              metrics.gap > 0.08
                ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                : metrics.gap > 0.03
                ? 'bg-amber-950/20 border-amber-500/40 text-amber-300'
                : 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
            }`}>
              <span className="text-[10px] block uppercase opacity-80">Train - Test Gap</span>
              <span className="text-xl font-bold tabular-nums">
                {(metrics.gap * 100).toFixed(2)}%
              </span>
              <span className="text-[9px] block mt-0.5 opacity-80">
                {metrics.gap > 0.08 ? 'Quá Khớp Trầm Trọng (Overfitting)' : 'Bảo Toàn Tổng Quát Hóa ✓'}
              </span>
            </div>
          </div>

          {/* Confusion Matrix & Curve Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Confusion Matrix (4 columns) */}
            <div className="lg:col-span-5 bg-[#050812] border border-white/10 rounded-lg p-3">
              <span className="text-xs text-slate-300 font-bold block mb-2">
                MA TRẬN NHẦM LẪN (CONFUSION MATRIX)
              </span>
              <div className="grid grid-cols-3 gap-1 text-center text-xs">
                <div className="p-2 text-slate-500 text-[10px]">Thực tế \ Dự đoán</div>
                <div className="p-2 bg-[#091222] text-[#a06bff] font-semibold text-[11px] rounded-t">
                  Dự đoán Thất Bại
                </div>
                <div className="p-2 bg-[#091222] text-[#2ee6c8] font-semibold text-[11px] rounded-t">
                  Dự đoán Thành Công
                </div>

                <div className="p-2 bg-[#091222] text-slate-400 font-semibold text-[11px] flex items-center justify-center">
                  Thực tế Thất Bại
                </div>
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-emerald-400">{metrics.confusion_matrix.tn}</span>
                  <span className="text-[9px] text-slate-400">TN (True Neg)</span>
                </div>
                <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-rose-400">{metrics.confusion_matrix.fp}</span>
                  <span className="text-[9px] text-slate-400">FP (False Pos)</span>
                </div>

                <div className="p-2 bg-[#091222] text-slate-400 font-semibold text-[11px] flex items-center justify-center">
                  Thực tế Thành Công
                </div>
                <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-rose-400">{metrics.confusion_matrix.fn}</span>
                  <span className="text-[9px] text-slate-400">FN (False Neg)</span>
                </div>
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-emerald-400">{metrics.confusion_matrix.tp}</span>
                  <span className="text-[9px] text-slate-400">TP (True Pos)</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 italic">
                * Không bỏ sót thao tác hỏng (FN = 0) giúp bệnh nhân không bị đánh rơi đồ vật nguy hiểm.
              </p>
            </div>

            {/* Learning Curve (7 columns) */}
            <div className="lg:col-span-7 bg-[#050812] border border-white/10 rounded-lg p-3 flex flex-col">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-300 font-bold">
                  ĐƯỜNG CONG TẬP HUẤN: TRAIN VS VALIDATION
                </span>
                <span className="text-[10px] text-slate-400">
                  {selectedModelKey.includes('overfit')
                    ? '⚠ Phân kỳ lớn (Overfitting)'
                    : '✓ Hội tụ chặt chẽ (Generalization)'}
                </span>
              </div>
              <div className="relative flex-1 min-h-[160px]">
                <canvas
                  ref={curveCanvasRef}
                  width={640}
                  height={220}
                  className="w-full h-full block rounded"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'features' && (
        <div className="space-y-3 font-mono">
          <div className="text-xs text-slate-300 mb-2">
            Trọng số quan trọng của các đặc trưng cảm biến thu được từ thuật toán XGBoost:
          </div>
          <div className="space-y-2">
            {FEATURE_IMPORTANCES.map((item, idx) => {
              const pct = (item.importance * 100).toFixed(1);
              return (
                <div key={item.feature} className="bg-[#050812] border border-white/5 p-2.5 rounded-lg">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-200 font-medium">
                      #{idx + 1} {item.label}
                    </span>
                    <span className="text-[#2ee6c8] font-bold tabular-nums">
                      {pct}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#2ee6c8] to-[#38bdf8] rounded-full transition-all duration-700"
                      style={{ width: `${item.importance * 360}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">{item.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'tree' && (
        <div className="space-y-3 font-mono bg-[#050812] p-4 rounded-lg border border-white/10">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200 mb-2">
            <GitFork className="w-4 h-4 text-[#2ee6c8]" />
            MÔ PHỎNG PHÂN NHÁNH CÂY QUYẾT ĐỊNH XGBOOST TRÊN TẬP DỮ LIỆU HIỆN TẠI
          </div>

          <div className="space-y-3 text-xs">
            {treeNodes.map((node, i) => (
              <div
                key={node.id}
                className={`p-3 rounded-lg border ${
                  node.passed
                    ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200'
                    : 'border-amber-500/40 bg-amber-950/20 text-amber-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>Điều kiện kiểm tra #{i + 1}: {node.rule}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-black/40">
                    {node.passed ? 'ĐẠT ĐIỀU KIỆN' : 'KHÔNG ĐẠT'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 mt-1">
                  Đường rẽ: <span className="font-semibold text-white">{node.decision}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-[#081224] rounded border border-[#2ee6c8]/20 text-xs text-slate-300">
            <span className="font-bold text-[#2ee6c8]">Nguyên lý Edge AI:</span> Cây quyết định depth=3 được xuất sang
            định dạng ONNX siêu nhẹ (chỉ ~15KB), chạy suy luận 100Hz trực tiếp trên vi điều khiển STM32F4 hoặc NVIDIA Jetson
            Nano với độ trễ dưới 2ms!
          </div>
        </div>
      )}
    </div>
  );
};
