import React, { useEffect, useRef, useState } from 'react';
import { ModelMetrics } from '../types';
import { FEATURE_IMPORTANCES, BENCHMARK_MODELS } from '../data/dataset';
import { BarChart3, GitFork, AlertOctagon, CheckCircle2, TrendingUp, Layers } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'metrics' | 'tree' | 'features'>('metrics');

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
        <div className="flex bg-[#050812] p-1 rounded-lg border border-white/10 text-xs font-mono">
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

      {/* Model Benchmark Preset Buttons */}
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
