import React, { useState } from 'react';
import { GraspSample, EMGSample, TabularSample } from '../types';
import {
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Play,
  Cpu,
  Activity,
  Zap,
  RotateCcw,
  Download,
  Sliders,
  AlertTriangle,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  runNonlinearSimulation,
  SimulationScenario,
  exportDatasetToJson,
  exportGraspsToCsv
} from '../data/nonlinearSimulator';

interface DatasetInspectorProps {
  onSelectGraspSample: (sample: GraspSample) => void;
  currentSampleId?: string;
  graspSamples: GraspSample[];
  emgSamples: EMGSample[];
  tabularSamples: TabularSample[];
  onAddSamples: (newGrasps: GraspSample[], newEmgs: EMGSample[], newTabulars: TabularSample[]) => void;
  onResetSamples: () => void;
  onLogMessage?: (msg: string, type?: 'info' | 'warn' | 'success' | 'magic') => void;
}

export const DatasetInspector: React.FC<DatasetInspectorProps> = ({
  onSelectGraspSample,
  currentSampleId,
  graspSamples,
  emgSamples,
  tabularSamples,
  onAddSamples,
  onResetSamples,
  onLogMessage
}) => {
  const [activeTab, setActiveTab] = useState<'grasp' | 'emg' | 'tabular'>('grasp');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [filterSuccess, setFilterSuccess] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<'all' | 'real' | 'synthetic'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Simulation controls state
  const [simCount, setSimCount] = useState<number>(50);
  const [simScenario, setSimScenario] = useState<SimulationScenario>('monte_carlo');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simProgress, setSimProgress] = useState<number>(0);
  const [simSummary, setSimSummary] = useState<{
    totalGenerated: number;
    successCount: number;
    failureCount: number;
    successRatePct: number;
    avgForceN: number;
    avgSafetyRatio: number;
    executionTimeMs: number;
  } | null>(null);

  // Filter grasp samples
  const filteredGrasps = graspSamples.filter(s => {
    if (filterSource === 'real' && s.isSynthetic) return false;
    if (filterSource === 'synthetic' && !s.isSynthetic) return false;
    if (selectedSubject !== 'all' && s.subject_id !== selectedSubject) return false;
    if (filterSuccess === 'success' && !s.success) return false;
    if (filterSuccess === 'failed' && s.success) return false;
    if (searchTerm && !s.id.toLowerCase().includes(searchTerm.toLowerCase()) && !s.gesture.includes(searchTerm)) {
      return false;
    }
    return true;
  });

  // Filter EMG samples
  const filteredEmgs = emgSamples.filter(s => {
    if (filterSource === 'real' && s.isSynthetic) return false;
    if (filterSource === 'synthetic' && !s.isSynthetic) return false;
    if (selectedSubject !== 'all' && s.subject_id !== selectedSubject) return false;
    if (searchTerm && !s.id.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Filter Tabular samples
  const filteredTabs = tabularSamples.filter(s => {
    if (filterSource === 'real' && s.isSynthetic) return false;
    if (filterSource === 'synthetic' && !s.isSynthetic) return false;
    if (selectedSubject !== 'all' && s.subject_id !== selectedSubject) return false;
    if (searchTerm && !s.id.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Count statistics
  const totalGrasps = graspSamples.length;
  const syntheticGraspCount = graspSamples.filter(s => s.isSynthetic).length;
  const realGraspCount = totalGrasps - syntheticGraspCount;

  // Run Nonlinear Simulation
  const handleRunSimulation = () => {
    setIsSimulating(true);
    setSimProgress(15);

    const timer1 = setTimeout(() => {
      setSimProgress(55);
    }, 200);

    const timer2 = setTimeout(() => {
      setSimProgress(90);
    }, 450);

    const timer3 = setTimeout(() => {
      const result = runNonlinearSimulation(
        {
          count: simCount,
          scenario: simScenario,
          baseSubjectIdx: 11
        },
        graspSamples.length
      );

      setSimProgress(100);
      setIsSimulating(false);
      setSimSummary(result.summary);

      onAddSamples(result.graspSamples, result.emgSamples, result.tabularSamples);

      if (onLogMessage) {
        onLogMessage(
          `Mô phỏng phi tuyến RK4 hoàn tất: sinh +${result.summary.totalGenerated} mẫu (${result.summary.successCount} thành công, ${result.summary.failureCount} thất bại, Sf_tb=${result.summary.avgSafetyRatio}) trong ${result.summary.executionTimeMs}ms`,
          'success'
        );
      }
    }, 650);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  };

  // Export JSON
  const handleExportJson = () => {
    const jsonStr = exportDatasetToJson(graspSamples, emgSamples, tabularSamples);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DATASET_EXPANDED_${graspSamples.length}_SAMPLES.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (onLogMessage) {
      onLogMessage(`Đã xuất ${graspSamples.length} mẫu ra file JSON tải về máy.`, 'info');
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const csvStr = exportGraspsToCsv(graspSamples);
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DATASET_GRASP_${graspSamples.length}_ROWS.csv`;
    a.click();
    URL.revokeObjectURL(url);
    if (onLogMessage) {
      onLogMessage(`Đã xuất bảng Grasp (${graspSamples.length} dòng) ra file CSV.`, 'info');
    }
  };

  return (
    <div className="bg-[#09101f] border border-[#2ee6c8]/25 rounded-xl p-4 shadow-xl flex flex-col gap-3 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-[#2ee6c8]" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#2ee6c8]">
            DATASET KHOA HỌC · {totalGrasps + emgSamples.length + tabularSamples.length} MẪU
          </h3>
          <span className="text-[10px] bg-[#050812] px-2 py-0.5 rounded text-slate-300 border border-white/10 flex items-center gap-1.5">
            <span className="text-slate-400">Thực nghiệm:</span> <strong className="text-slate-200">300</strong>
            {syntheticGraspCount > 0 && (
              <>
                <span className="text-slate-500">|</span>
                <span className="text-[#38bdf8]">Phi tuyến:</span>{' '}
                <strong className="text-[#2ee6c8]">+{syntheticGraspCount * 3}</strong>
              </>
            )}
          </span>
        </div>

        {/* Modal tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-[#050812] p-1 rounded-lg border border-white/10 text-xs">
            <button
              onClick={() => setActiveTab('grasp')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                activeTab === 'grasp' ? 'bg-[#2ee6c8] text-black font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Play className="w-3 h-3" /> Grasp ({graspSamples.length})
            </button>
            <button
              onClick={() => setActiveTab('emg')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                activeTab === 'emg' ? 'bg-[#2ee6c8] text-black font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3 h-3" /> sEMG ({emgSamples.length})
            </button>
            <button
              onClick={() => setActiveTab('tabular')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                activeTab === 'tabular' ? 'bg-[#2ee6c8] text-black font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3 h-3" /> Tabular ({tabularSamples.length})
            </button>
          </div>

          {/* Export & Reset Actions */}
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={handleExportCsv}
              className="px-2 py-1 rounded bg-[#0b1424] hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 flex items-center gap-1"
              title="Xuất bảng dữ liệu ra file CSV"
            >
              <Download className="w-3 h-3 text-[#38bdf8]" /> CSV
            </button>
            <button
              onClick={handleExportJson}
              className="px-2 py-1 rounded bg-[#0b1424] hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 flex items-center gap-1"
              title="Xuất toàn bộ 3 sheet ra file JSON"
            >
              <Download className="w-3 h-3 text-[#2ee6c8]" /> JSON
            </button>
            {syntheticGraspCount > 0 && (
              <button
                onClick={onResetSamples}
                className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 flex items-center gap-1"
                title="Khôi phục về 300 mẫu thực nghiệm ban đầu"
              >
                <RotateCcw className="w-3 h-3" /> Reset (300)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* NONLINEAR BIOMECHANICAL SIMULATION GENERATOR PANEL */}
      <div className="bg-gradient-to-r from-[#071326] via-[#091830] to-[#0d1226] border border-[#38bdf8]/40 rounded-xl p-3 shadow-lg flex flex-col gap-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#38bdf8]/20 flex items-center justify-center border border-[#38bdf8]/40">
              <Zap className="w-3.5 h-3.5 text-[#38bdf8] animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                XƯỞNG MÔ PHỎNG ĐỘNG LỰC HỌC PHI TUYẾN (NONLINEAR SIMULATION ENGINE)
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30 uppercase">
                  Runge-Kutta 4th (dt=1ms)
                </span>
              </h4>
              <p className="text-[10px] text-slate-400">
                Mô hình gân cơ Hill-type phi tuyến · Cơ học tiếp xúc đàn nhớt Hertz · Kiểm định nón ma sát Coulomb
              </p>
            </div>
          </div>

          {/* Quick Simulation Trigger */}
          <button
            disabled={isSimulating}
            onClick={handleRunSimulation}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 text-xs transition-all shadow-md ${
              isSimulating
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#38bdf8] to-[#2ee6c8] text-black shadow-[#38bdf8]/30 hover:opacity-95 hover:scale-[1.02]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-black fill-black" />
            {isSimulating ? `Đang Giải ODE RK4 (${simProgress}%)...` : `Chạy Mô Phỏng Phi Tuyến (+${simCount} Mẫu)`}
          </button>
        </div>

        {/* Sim Config Parameters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs bg-[#050b18] p-2 rounded-lg border border-white/10 items-center">
          {/* 1. Sample Count Preset */}
          <div className="sm:col-span-4 flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 shrink-0">Số lượng sinh:</span>
            <div className="flex gap-1 flex-1">
              {[25, 50, 100, 200].map(c => (
                <button
                  key={c}
                  onClick={() => setSimCount(c)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors flex-1 ${
                    simCount === c
                      ? 'bg-[#38bdf8] text-black'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  +{c}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Scenario selector */}
          <div className="sm:col-span-8 flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 shrink-0">Kịch bản vi phân:</span>
            <select
              value={simScenario}
              onChange={e => setSimScenario(e.target.value as SimulationScenario)}
              className="bg-[#09101f] text-slate-200 border border-white/10 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-[#38bdf8] flex-1 cursor-pointer"
            >
              <option value="monte_carlo">
                1. Monte-Carlo Domain Randomization (Ngẫu nhiên hóa tham số S11-S30, ma sát &amp; tải trọng)
              </option>
              <option value="edge_cases">
                2. Điều Kiện Tới Hạn / Edge-Cases (Bề mặt trơn trượt μ=0.16, tải nặng, va chạm rung xóc)
              </option>
              <option value="tendon_hysteresis">
                3. Đàn Hồi &amp; Độ Trễ Gân Cơ Hill (Nonlinear Tendon Slack &amp; Viscoelastic Hysteresis)
              </option>
              <option value="fatigue">
                4. Mỏi Cơ Sinh Học &amp; Suy Giảm Lực (Biomechanical Fatigue &amp; Force Degradation)
              </option>
            </select>
          </div>
        </div>

        {/* Progress Bar when running */}
        {isSimulating && (
          <div className="space-y-1 bg-[#050b18] p-2 rounded border border-[#38bdf8]/30">
            <div className="flex items-center justify-between text-[10px] text-[#38bdf8]">
              <span>Đang tính vi phân RK4 180 bước lặp (dt=1.0ms) cho {simCount} mẫu...</span>
              <span>{simProgress}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#38bdf8] to-[#2ee6c8] h-full transition-all duration-200"
                style={{ width: `${simProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Last Sim Execution Summary Card */}
        {simSummary && !isSimulating && (
          <div className="bg-[#050b18]/80 border border-emerald-500/30 rounded p-2 flex items-center justify-between flex-wrap gap-2 text-[10px]">
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Vừa nạp thành công: +{simSummary.totalGenerated} mẫu Grasp, sEMG &amp; Tabular
              </span>
              <span className="text-slate-300">
                Thành công:{' '}
                <strong className="text-emerald-300">
                  {simSummary.successCount} ({simSummary.successRatePct}%)
                </strong>
              </span>
              <span className="text-slate-300">
                Thất bại (trượt/quá tải):{' '}
                <strong className="text-rose-300">{simSummary.failureCount}</strong>
              </span>
            </div>
            <div className="flex items-center gap-3 text-slate-400">
              <span>Lực TB: <strong className="text-white">{simSummary.avgForceN}N</strong></span>
              <span>Hệ số an toàn Coulomb TB: <strong className="text-[#38bdf8]">{simSummary.avgSafetyRatio}</strong></span>
              <span>Thời gian giải: <strong className="text-amber-300">{simSummary.executionTimeMs}ms</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="flex items-center gap-1 bg-[#050812] px-2.5 py-1.5 rounded border border-white/10 flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã mẫu (vd: SYN_GRASP_0105)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-transparent text-slate-200 text-xs focus:outline-none w-full placeholder:text-slate-600"
          />
        </div>

        {/* Source Filter: All / Real / Synthetic */}
        <div className="flex items-center gap-1 bg-[#050812] px-2 py-1 rounded border border-white/10">
          <span className="text-slate-400 text-[11px]">Nguồn:</span>
          <select
            value={filterSource}
            onChange={e => setFilterSource(e.target.value as 'all' | 'real' | 'synthetic')}
            className="bg-transparent text-[#2ee6c8] focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-[#09101f]">
              Tất cả nguồn ({graspSamples.length})
            </option>
            <option value="real" className="bg-[#09101f]">
              Chỉ Thực Nghiệm (300)
            </option>
            <option value="synthetic" className="bg-[#09101f]">
              Chỉ Mô Phỏng Phi Tuyến (+{syntheticGraspCount})
            </option>
          </select>
        </div>

        {/* Subject Filter */}
        <div className="flex items-center gap-1 bg-[#050812] px-2 py-1 rounded border border-white/10">
          <span className="text-slate-400 text-[11px]">Đối tượng:</span>
          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            className="bg-transparent text-[#2ee6c8] focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-[#09101f]">
              Tất cả (S01 - S30)
            </option>
            {Array.from(new Set(graspSamples.map(s => s.subject_id))).sort().map(sub => (
              <option key={sub} value={sub} className="bg-[#09101f]">
                {sub} {parseInt(sub.replace('S', ''), 10) > 10 ? '(Mô phỏng)' : '(Thực nghiệm)'}
              </option>
            ))}
          </select>
        </div>

        {/* Success Filter */}
        {activeTab === 'grasp' && (
          <div className="flex items-center gap-1 bg-[#050812] px-2 py-1 rounded border border-white/10">
            <span className="text-slate-400 text-[11px]">Kết quả:</span>
            <select
              value={filterSuccess}
              onChange={e => setFilterSuccess(e.target.value)}
              className="bg-transparent text-[#2ee6c8] focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#09101f]">Tất cả kết quả</option>
              <option value="success" className="bg-[#09101f]">Chỉ Thành Công</option>
              <option value="failed" className="bg-[#09101f]">Chỉ Thất Bại (Trượt/Quá tải)</option>
            </select>
          </div>
        )}
      </div>

      {/* Grasp Table Content */}
      {activeTab === 'grasp' && (
        <div className="overflow-x-auto max-h-[340px] rounded-lg border border-white/10 bg-[#040712] scrollbar-thin scrollbar-thumb-slate-700">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="bg-[#081224] text-slate-300 sticky top-0 border-b border-white/10 z-10">
              <tr>
                <th className="p-2.5">Sample ID</th>
                <th className="p-2.5">Subject</th>
                <th className="p-2.5">Thao Tác</th>
                <th className="p-2.5 text-right">Lực (N)</th>
                <th className="p-2.5 text-right">Áp Suất (kPa)</th>
                <th className="p-2.5 text-right">Góc Cái</th>
                <th className="p-2.5 text-right">Góc Trỏ</th>
                <th className="p-2.5 text-right">Góc Giữa</th>
                <th className="p-2.5 text-center">Nón Ma Sát (Sf)</th>
                <th className="p-2.5 text-center">Kết Quả</th>
                <th className="p-2.5 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredGrasps.map(sample => {
                const isSelected = currentSampleId === sample.id;
                return (
                  <tr
                    key={sample.id}
                    onClick={() => onSelectGraspSample(sample)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#2ee6c8]/15 text-white font-semibold'
                        : 'hover:bg-white/5 text-slate-300'
                    }`}
                  >
                    <td className="p-2.5 font-bold flex items-center gap-1.5">
                      <span className={sample.isSynthetic ? 'text-[#38bdf8]' : 'text-[#2ee6c8]'}>
                        {sample.id}
                      </span>
                      {sample.isSynthetic && (
                        <span className="px-1 py-0.2 rounded text-[8.5px] bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30 font-bold tracking-tight">
                          ⚡ SYN
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-slate-400">{sample.subject_id}</td>
                    <td className="p-2.5 text-slate-200 capitalize">
                      {sample.gesture.replace('_', ' ')}
                    </td>
                    <td className="p-2.5 text-right tabular-nums font-mono">{sample.force_N.toFixed(1)}</td>
                    <td className="p-2.5 text-right tabular-nums font-mono">{sample.pressure_kPa.toFixed(1)}</td>
                    <td className="p-2.5 text-right tabular-nums font-mono">{sample.thumb_angle_deg.toFixed(0)}°</td>
                    <td className="p-2.5 text-right tabular-nums font-mono">{sample.index_angle_deg.toFixed(0)}°</td>
                    <td className="p-2.5 text-right tabular-nums font-mono">{sample.middle_angle_deg.toFixed(0)}°</td>
                    <td className="p-2.5 text-center font-mono text-[10px]">
                      {sample.simulationParams ? (
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold ${
                            sample.simulationParams.coulomb_safety_ratio >= 1.0
                              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
                          }`}
                          title={`μ=${sample.simulationParams.friction_coef}, Lún Hertz=${sample.simulationParams.hertz_depth_mm}mm, Lực gân=${sample.simulationParams.tendon_tension_N}N`}
                        >
                          Sf={sample.simulationParams.coulomb_safety_ratio.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">Thực nghiệm</span>
                      )}
                    </td>
                    <td className="p-2.5 text-center">
                      {sample.success ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> Thành công
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 text-[10px] bg-rose-950/40 px-2 py-0.5 rounded border border-rose-500/30">
                          <XCircle className="w-3 h-3" /> Thất bại
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onSelectGraspSample(sample);
                        }}
                        className="px-2 py-0.5 bg-[#2ee6c8]/20 hover:bg-[#2ee6c8] hover:text-black text-[#2ee6c8] rounded border border-[#2ee6c8]/40 text-[10px] transition-all whitespace-nowrap"
                      >
                        Nạp vào 3D
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* EMG Samples Tab */}
      {activeTab === 'emg' && (
        <div className="overflow-x-auto max-h-[340px] rounded-lg border border-white/10 bg-[#040712]">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-[#081224] text-slate-300 sticky top-0 border-b border-white/10 z-10">
              <tr>
                <th className="p-2.5">Sample ID</th>
                <th className="p-2.5">Subject</th>
                <th className="p-2.5">Động tác kích hoạt cơ</th>
                <th className="p-2.5 text-right">MAV (Biên độ)</th>
                <th className="p-2.5 text-right">RMS (Công suất)</th>
                <th className="p-2.5 text-right">Zero Crossings</th>
                <th className="p-2.5 text-right">Waveform Length</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredEmgs.map(s => (
                <tr key={s.id} className="hover:bg-white/5 text-slate-300">
                  <td className="p-2.5 font-bold flex items-center gap-1.5">
                    <span className={s.isSynthetic ? 'text-[#38bdf8]' : 'text-[#a06bff]'}>{s.id}</span>
                    {s.isSynthetic && (
                      <span className="px-1 py-0.2 rounded text-[8.5px] bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30 font-bold">
                        ⚡ SYN
                      </span>
                    )}
                  </td>
                  <td className="p-2.5 text-slate-400">{s.subject_id}</td>
                  <td className="p-2.5">{s.active_gesture}</td>
                  <td className="p-2.5 text-right tabular-nums">{s.mav.toFixed(3)} mV</td>
                  <td className="p-2.5 text-right tabular-nums">{s.rms.toFixed(3)} mV</td>
                  <td className="p-2.5 text-right tabular-nums">{s.zero_crossings} /s</td>
                  <td className="p-2.5 text-right tabular-nums">{s.waveform_length.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabular Samples Tab */}
      {activeTab === 'tabular' && (
        <div className="overflow-x-auto max-h-[340px] rounded-lg border border-white/10 bg-[#040712]">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-[#081224] text-slate-300 sticky top-0 border-b border-white/10 z-10">
              <tr>
                <th className="p-2.5">Sample ID</th>
                <th className="p-2.5">Subject</th>
                <th className="p-2.5 text-right">Tần số lấy mẫu</th>
                <th className="p-2.5 text-right">Độ trễ truyền nhận</th>
                <th className="p-2.5 text-right">Nhiệt độ chip STM32</th>
                <th className="p-2.5 text-right">Dòng điện Servo TB</th>
                <th className="p-2.5 text-center">Trạng thái hệ thống</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTabs.map(s => (
                <tr key={s.id} className="hover:bg-white/5 text-slate-300">
                  <td className="p-2.5 font-bold flex items-center gap-1.5">
                    <span className={s.isSynthetic ? 'text-[#38bdf8]' : 'text-amber-400'}>{s.id}</span>
                    {s.isSynthetic && (
                      <span className="px-1 py-0.2 rounded text-[8.5px] bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30 font-bold">
                        ⚡ SYN
                      </span>
                    )}
                  </td>
                  <td className="p-2.5 text-slate-400">{s.subject_id}</td>
                  <td className="p-2.5 text-right tabular-nums">{s.sampling_rate_hz} Hz</td>
                  <td className="p-2.5 text-right tabular-nums">{s.latency_ms.toFixed(1)} ms</td>
                  <td className="p-2.5 text-right tabular-nums">{s.temperature_c.toFixed(1)} °C</td>
                  <td className="p-2.5 text-right tabular-nums">
                    {Math.round(s.motor_current_ma.reduce((a, b) => a + b, 0) / s.motor_current_ma.length)} mA
                  </td>
                  <td className="p-2.5 text-center">
                    <span
                      className={`px-2 py-0.5 text-[10px] rounded border ${
                        s.status === 'STABLE'
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                          : s.status === 'WARNING'
                          ? 'bg-rose-950/40 text-rose-400 border-rose-500/30'
                          : 'bg-amber-950/40 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Notes */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 flex-wrap gap-1">
        <span className="flex items-center gap-1">
          <Layers className="w-3 h-3 text-[#2ee6c8]" />
          Hiển thị {filteredGrasps.length} / {graspSamples.length} hàng (Đồng bộ đa phương thức với Mô hình 3D &amp; Cảm biến)
        </span>
        <span>
          Động lực học phi tuyến: <strong className="text-[#38bdf8]">Hertz Elasticity &amp; Coulomb Friction Cone ISO 10218</strong>
        </span>
      </div>
    </div>
  );
};
