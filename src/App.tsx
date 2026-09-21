import React, { useState, useCallback, useMemo } from 'react';
import { Hand3DCanvas } from './components/Hand3DCanvas';
import { ColabNotebook } from './components/ColabNotebook';
import { EMGOscilloscope } from './components/EMGOscilloscope';
import { EvaluationDashboard } from './components/EvaluationDashboard';
import { DatasetInspector } from './components/DatasetInspector';
import { ArchitectureModal } from './components/ArchitectureModal';
import { Layer2EdgeAI } from './components/Layer2EdgeAI';
import { JointAngles, ModelMetrics, GraspSample, EMGSample, TabularSample, RenderMode } from './types';
import { BENCHMARK_MODELS, predictGraspSuccess, sampleToJointAngles, getAllGraspSamples, getAllEMGSamples, getAllTabularSamples } from './data/dataset';
import {
  Cpu,
  Activity,
  Terminal,
  Layers,
  Sparkles,
  BookOpen,
  Code2,
  Sliders,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Zap,
  RotateCcw,
  ShieldCheck
} from 'lucide-react';

export default function App() {
  // 3D Hand State
  const [jointAngles, setJointAngles] = useState<JointAngles>({
    thumb: 0.18,
    index: 0.15,
    middle: 0.14,
    ring: 0.16,
    pinky: 0.2,
    wrist_pitch: 0,
    wrist_yaw: 0
  });
  const [forceN, setForceN] = useState<number>(18.5);
  const [pressureKPa, setPressureKPa] = useState<number>(125.0);
  const [renderMode, setRenderMode] = useState<RenderMode>('cyberpunk');

  // ML Pipeline & Diagnostics State
  const [activeStage, setActiveStage] = useState<string>('setup');
  const [selectedModelKey, setSelectedModelKey] = useState<string>('xgboost_regularized');
  const [metrics, setMetrics] = useState<ModelMetrics>(BENCHMARK_MODELS.xgboost_regularized);
  const [activeTab, setActiveTab] = useState<'layer2' | 'notebook' | 'eval' | 'dataset'>('layer2');
  const [selectedSampleId, setSelectedSampleId] = useState<string>('GRASP_0000');
  const [showArchModal, setShowArchModal] = useState<boolean>(false);

  // Multi-modal Dataset State (Real + Nonlinear Synthetic Simulations)
  const [graspSamples, setGraspSamples] = useState<GraspSample[]>(() => getAllGraspSamples());
  const [emgSamples, setEmgSamples] = useState<EMGSample[]>(() => getAllEMGSamples());
  const [tabularSamples, setTabularSamples] = useState<TabularSample[]>(() => getAllTabularSamples());

  // Terminal Logs
  const [logs, setLogs] = useState<Array<{ id: number; time: string; msg: string; type: string }>>([
    { id: 1, time: '00:00:01', msg: 'Khởi động nhân đồ họa 3D Three.js & Kinematics Forward Engine', type: 'info' },
    { id: 2, time: '00:00:02', msg: 'Kết nối mô-đun vi điều khiển STM32F4 (168MHz · PWM 8CH) sẵn sàng', type: 'success' },
    { id: 3, time: '00:00:03', msg: 'Xưởng mô phỏng động lực học phi tuyến RK4 (Hertz/Hill/Coulomb) sẵn sàng', type: 'magic' }
  ]);

  const addLog = useCallback((msg: string, type: 'info' | 'warn' | 'success' | 'magic' = 'info') => {
    const time = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    setLogs(prev => [...prev.slice(-30), { id: Date.now() + Math.random(), time, msg, type }]);
  }, []);

  const handleAddSyntheticSamples = useCallback(
    (newGrasps: GraspSample[], newEmgs: EMGSample[], newTabs: TabularSample[]) => {
      setGraspSamples(prev => [...prev, ...newGrasps]);
      setEmgSamples(prev => [...prev, ...newEmgs]);
      setTabularSamples(prev => [...prev, ...newTabs]);
      addLog(
        `Đã nạp thành công +${newGrasps.length} mẫu phi tuyến vào Dataset. Tổng hiện tại: ${graspSamples.length + newGrasps.length} Grasp · ${emgSamples.length + newEmgs.length} sEMG · ${tabularSamples.length + newTabs.length} Tabular`,
        'success'
      );
    },
    [addLog, graspSamples.length, emgSamples.length, tabularSamples.length]
  );

  const handleResetSamples = useCallback(() => {
    setGraspSamples(getAllGraspSamples());
    setEmgSamples(getAllEMGSamples());
    setTabularSamples(getAllTabularSamples());
    addLog('Đã khôi phục dataset về 300 mẫu thực nghiệm ban đầu (loại bỏ dữ liệu mô phỏng)', 'warn');
  }, [addLog]);

  // Real-time XGBoost Forward-Pass Prediction
  const livePrediction = useMemo(() => {
    return predictGraspSuccess(jointAngles, forceN, pressureKPa);
  }, [jointAngles, forceN, pressureKPa]);

  // Average curl for bio-signal sync
  const avgCurl = useMemo(() => {
    return (jointAngles.thumb + jointAngles.index + jointAngles.middle + jointAngles.ring + jointAngles.pinky) / 5;
  }, [jointAngles]);

  // Hand pose presets
  const applyPreset = (presetName: string) => {
    switch (presetName) {
      case 'rest':
        setJointAngles({ thumb: 0.1, index: 0.08, middle: 0.08, ring: 0.1, pinky: 0.12, wrist_pitch: 0 });
        setForceN(0.5);
        setPressureKPa(12.0);
        addLog('Áp dụng tư thế: Nghỉ tự nhiên (Resting State)', 'info');
        break;
      case 'power_grasp':
        setJointAngles({ thumb: 0.88, index: 0.92, middle: 0.95, ring: 0.88, pinky: 0.84, wrist_pitch: -6 });
        setForceN(32.5);
        setPressureKPa(210.0);
        addLog('Áp dụng tư thế: Gắp lực toàn phần (Power Grasp - 32.5N)', 'success');
        break;
      case 'tripod_pinch':
        setJointAngles({ thumb: 0.82, index: 0.85, middle: 0.75, ring: 0.22, pinky: 0.18, wrist_pitch: 4 });
        setForceN(18.2);
        setPressureKPa(140.0);
        addLog('Áp dụng tư thế: Kẹp 3 ngón chính xác (Tripod Pinch)', 'info');
        break;
      case 'lateral_key':
        setJointAngles({ thumb: 0.72, index: 0.78, middle: 0.35, ring: 0.28, pinky: 0.24, wrist_pitch: 2 });
        setForceN(16.0);
        setPressureKPa(115.0);
        addLog('Áp dụng tư thế: Kẹp cạnh bên (Lateral Key Pinch)', 'info');
        break;
      case 'cylindrical':
        setJointAngles({ thumb: 0.78, index: 0.82, middle: 0.85, ring: 0.80, pinky: 0.76, wrist_pitch: -4 });
        setForceN(28.0);
        setPressureKPa(175.0);
        addLog('Áp dụng tư thế: Nắm hình trụ (Cylindrical Grasp)', 'info');
        break;
      case 'point':
        setJointAngles({ thumb: 0.65, index: 0.02, middle: 0.95, ring: 0.95, pinky: 0.95, wrist_pitch: 8 });
        setForceN(4.2);
        setPressureKPa(28.0);
        addLog('Áp dụng tư thế: Chỉ định tọa độ (Point)', 'info');
        break;
      case 'fist':
        setJointAngles({ thumb: 0.98, index: 1.0, middle: 1.0, ring: 1.0, pinky: 0.98, wrist_pitch: -8 });
        setForceN(41.0);
        setPressureKPa(245.0);
        addLog('Áp dụng tư thế: Nắm đấm tối đa (Max Clench Fist - 41.0N)', 'warn');
        break;
      default:
        break;
    }
  };

  // Callback when user picks a sample from DatasetInspector
  const handleSelectSample = (sample: GraspSample) => {
    setSelectedSampleId(sample.id);
    const angles = sampleToJointAngles(sample);
    setJointAngles(angles);
    setForceN(sample.force_N);
    setPressureKPa(sample.pressure_kPa);
    addLog(
      `Nạp mẫu ${sample.id} (${sample.subject_id} · ${sample.gesture}) -> Lực: ${sample.force_N}N, Áp suất: ${sample.pressure_kPa}kPa [${sample.success ? 'Thành Công' : 'Thất Bại'}]`,
      sample.success ? 'success' : 'warn'
    );
  };

  return (
    <div className="min-h-screen bg-[#04060c] text-slate-200 flex flex-col font-mono selection:bg-[#2ee6c8]/30 selection:text-[#2ee6c8]">
      {/* Top Telemetry Header */}
      <header className="border-b border-[#2ee6c8]/20 bg-[#070c18]/90 backdrop-blur-md sticky top-0 z-30 px-4 py-2.5">
        <div className="max-w-[1720px] mx-auto flex items-center justify-between flex-wrap gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#2ee6c8] to-[#a06bff] p-0.5 flex items-center justify-center shadow-lg shadow-[#2ee6c8]/20">
              <div className="w-full h-full bg-[#070c18] rounded-[7px] flex items-center justify-center">
                <Cpu className="w-5 h-5 text-[#2ee6c8]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="brand-font text-base sm:text-lg font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#2ee6c8] via-[#38bdf8] to-[#a06bff]">
                  BÀN TAY ROBOT SINH HỌC 3D · BIOMIMETIC DIGITAL TWIN
                </h1>
                <span className="text-[10px] font-mono border border-[#2ee6c8]/40 bg-[#2ee6c8]/10 text-[#2ee6c8] px-2 py-0.5 rounded-full uppercase tracking-widest hidden sm:inline-block">
                  Biomechanics &amp; ML
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans tracking-wide">
                Mô phỏng 3D tương tác khớp ngón &amp; Vỏ da Hologram · Thao tác vật thể · Pipeline ML Đa phương thức
              </p>
            </div>
          </div>

          {/* Quick Info Badges */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0b1424] border border-white/10 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px]">STM32 168MHz</span>
            </div>
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0b1424] border border-white/10 text-slate-300">
              <Zap className="w-3 h-3 text-[#2ee6c8]" />
              <span className="text-[11px]">Jetson 472 GFLOPS</span>
            </div>

            {/* Render Mode Switcher */}
            <div className="flex items-center gap-1 bg-[#0b1424] p-1 rounded-lg border border-white/10 text-[11px]">
              <button
                onClick={() => setRenderMode('cyberpunk')}
                className={`px-2 py-0.5 rounded transition-all ${
                  renderMode === 'cyberpunk'
                    ? 'bg-[#2ee6c8] text-black font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Cyberpunk
              </button>
              <button
                onClick={() => setRenderMode('pbr')}
                className={`px-2 py-0.5 rounded transition-all ${
                  renderMode === 'pbr'
                    ? 'bg-[#2ee6c8] text-black font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Titan PBR
              </button>
              <button
                onClick={() => setRenderMode('sensor_heatmap')}
                className={`px-2 py-0.5 rounded transition-all ${
                  renderMode === 'sensor_heatmap'
                    ? 'bg-[#2ee6c8] text-black font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Heatmap
              </button>
              <button
                onClick={() => setRenderMode('wireframe')}
                className={`px-2 py-0.5 rounded transition-all ${
                  renderMode === 'wireframe'
                    ? 'bg-[#2ee6c8] text-black font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Wireframe
              </button>
            </div>

            {/* Architecture Modal Trigger */}
            <button
              onClick={() => setShowArchModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#a06bff]/20 to-[#2ee6c8]/20 border border-[#a06bff]/40 hover:border-[#a06bff] text-slate-200 hover:text-white transition-all text-xs font-semibold shadow-sm"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#a06bff]" />
              <span className="hidden sm:inline">Kiến Trúc 4 Tầng &amp; Tối Ưu Hóa ML</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main App Workspace */}
      <main className="max-w-[1720px] mx-auto p-3 sm:p-4 lg:p-5 flex-1 flex flex-col gap-4 w-full">
        {/* Upper Split Grid: 3D Hand View (Left) vs Controls/Colab/Eval (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left Column: 3D Hand Canvas & Presets (6 cols - Wide Scientific Stage) */}
          <div className="lg:col-span-6 flex flex-col gap-3 min-h-[600px]">
            {/* 3D Canvas Centerpiece */}
            <div className="flex-1 w-full min-h-[490px]">
              <Hand3DCanvas
                jointAngles={jointAngles}
                forceN={forceN}
                pressureKPa={pressureKPa}
                renderMode={renderMode}
                onJointsChange={setJointAngles}
                onForceChange={setForceN}
              />
            </div>

            {/* Gesture Presets Quick Bar */}
            <div className="bg-[#09101f] border border-[#2ee6c8]/20 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#2ee6c8] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" /> TƯ THẾ ĐỘNG HỌC MẪU (PRESETS)
                </span>
                <span className="text-[11px] text-slate-400">Xoay 3D bằng chuột để quan sát</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 text-xs">
                <button
                  onClick={() => applyPreset('rest')}
                  className="px-2 py-1.5 rounded bg-[#050812] hover:bg-[#122035] border border-white/10 hover:border-[#2ee6c8]/40 transition-colors text-slate-300 hover:text-white text-center"
                >
                  Nghỉ (Rest)
                </button>
                <button
                  onClick={() => applyPreset('power_grasp')}
                  className="px-2 py-1.5 rounded bg-[#050812] hover:bg-[#122035] border border-[#2ee6c8]/30 text-[#2ee6c8] font-semibold transition-colors text-center"
                >
                  Nắm Đồ Vật
                </button>
                <button
                  onClick={() => applyPreset('tripod_pinch')}
                  className="px-2 py-1.5 rounded bg-[#050812] hover:bg-[#122035] border border-[#38bdf8]/30 text-[#38bdf8] font-semibold transition-colors text-center"
                >
                  Kẹp 3 Ngón
                </button>
                <button
                  onClick={() => applyPreset('lateral_key')}
                  className="px-2 py-1.5 rounded bg-[#050812] hover:bg-[#122035] border border-[#a06bff]/30 text-[#a06bff] font-semibold transition-colors text-center"
                >
                  Cầm Chìa Khóa
                </button>
                <button
                  onClick={() => applyPreset('cylindrical')}
                  className="px-2 py-1.5 rounded bg-[#050812] hover:bg-[#122035] border border-white/10 hover:border-[#2ee6c8]/40 transition-colors text-slate-300 hover:text-white text-center"
                >
                  Ống Trụ
                </button>
                <button
                  onClick={() => applyPreset('point')}
                  className="px-2 py-1.5 rounded bg-[#050812] hover:bg-[#122035] border border-white/10 hover:border-[#2ee6c8]/40 transition-colors text-slate-300 hover:text-white text-center"
                >
                  Chỉ Tay
                </button>
                <button
                  onClick={() => applyPreset('fist')}
                  className="px-2 py-1.5 rounded bg-[#050812] hover:bg-[#122035] border border-rose-500/30 text-rose-300 font-semibold transition-colors text-center"
                >
                  Nắm Đấm Max
                </button>
                <button
                  onClick={() => {
                    const r = () => Math.random() * 0.9;
                    setJointAngles({ thumb: r(), index: r(), middle: r(), ring: r(), pinky: r() });
                    setForceN(Number((5 + Math.random() * 35).toFixed(1)));
                    setPressureKPa(Number((30 + Math.random() * 180).toFixed(1)));
                    addLog('Sinh góc khớp ngẫu nhiên (Randomized Joint Pose)', 'magic');
                  }}
                  className="px-2 py-1.5 rounded bg-gradient-to-r from-[#2ee6c8]/10 to-[#a06bff]/10 border border-white/10 text-amber-300 text-center hover:border-amber-400 transition-colors"
                >
                  Ngẫu Nhiên
                </button>
              </div>

              {/* Quick Jump to Nonlinear Simulation Generator */}
              <button
                onClick={() => setActiveTab('dataset')}
                className="mt-1 py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-[#38bdf8]/15 via-[#2ee6c8]/15 to-[#a06bff]/15 border border-[#38bdf8]/40 hover:border-[#38bdf8] text-[#38bdf8] hover:text-white font-bold flex items-center justify-between text-xs transition-all shadow-sm"
                title="Mở tab Dataset để chạy mô phỏng phi tuyến RK4 tạo thêm dữ liệu"
              >
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  ⚡ Chạy Mô Phỏng Phi Tuyến Sinh Data
                </span>
                <span className="text-[10px] bg-[#050812] px-2 py-0.5 rounded border border-white/10 text-slate-300">
                  {graspSamples.length} Mẫu
                  {graspSamples.some(s => s.isSynthetic) && (
                    <span className="text-emerald-400 font-bold ml-1">
                      (+{graspSamples.filter(s => s.isSynthetic).length})
                    </span>
                  )}
                </span>
              </button>

              {/* Real-time XGBoost forward-pass stability verdict */}
              <div
                className={`mt-1 p-2.5 rounded-lg border flex items-center justify-between text-xs transition-colors ${
                  livePrediction.success
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {livePrediction.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold">
                      {livePrediction.success ? 'ĐỘ BÁM VỮNG CHẮC (STABLE)' : 'NGUY CƠ TRƯỢT RƠI (UNSTABLE)'}
                    </span>
                    <span className="text-[10px] text-slate-300 block">
                      {livePrediction.explanation}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <span className="text-lg font-bold tabular-nums">
                    {(livePrediction.probability * 100).toFixed(1)}%
                  </span>
                  <span className="text-[9px] block text-slate-400">XGBoost Prob</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Navigation & Workspace (6 cols) */}
          <div className="lg:col-span-6 flex flex-col gap-3 min-h-[600px]">
            {/* Top Workspace Tab Nav */}
            <div className="bg-[#09101f] border border-[#38bdf8]/30 rounded-xl p-1.5 flex items-center justify-between flex-wrap gap-2">
              <div className="flex gap-1 text-xs overflow-x-auto">
                <button
                  onClick={() => setActiveTab('layer2')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                    activeTab === 'layer2'
                      ? 'bg-[#38bdf8] text-black shadow-md shadow-[#38bdf8]/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> ⚡ Layer 2: Edge AI (STM32/Nhúng)
                </button>
                <button
                  onClick={() => setActiveTab('notebook')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                    activeTab === 'notebook'
                      ? 'bg-[#2ee6c8] text-black shadow-md shadow-[#2ee6c8]/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" /> Colab ML Notebook (13 Cell)
                </button>
                <button
                  onClick={() => setActiveTab('eval')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                    activeTab === 'eval'
                      ? 'bg-[#2ee6c8] text-black shadow-md shadow-[#2ee6c8]/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" /> Đánh Giá &amp; Tối Ưu Hóa
                </button>
                <button
                  onClick={() => setActiveTab('dataset')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                    activeTab === 'dataset'
                      ? 'bg-[#2ee6c8] text-black shadow-md shadow-[#2ee6c8]/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Dataset ({graspSamples.length + emgSamples.length + tabularSamples.length} Mẫu
                  {graspSamples.some(s => s.isSynthetic) && (
                    <span className="ml-1 text-[10px] px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      +{graspSamples.filter(s => s.isSynthetic).length * 3} Phi Tuyến
                    </span>
                  )}
                  )
                </button>
              </div>

              <div className="text-[11px] text-slate-400 hidden sm:block pr-2">
                Đang chạy: <span className="text-[#38bdf8] font-bold">{activeTab === 'layer2' ? 'STM32F4 / FreeRTOS 100Hz' : selectedModelKey}</span>
              </div>
            </div>

            {/* Tab Workspace Panels */}
            <div className="flex-1 flex flex-col">
              {activeTab === 'layer2' && (
                <Layer2EdgeAI
                  jointAngles={jointAngles}
                  forceN={forceN}
                  pressureKPa={pressureKPa}
                  onApplyPreset={applyPreset}
                  onJointsChange={setJointAngles}
                />
              )}

              {activeTab === 'notebook' && (
                <ColabNotebook
                  onStageChange={setActiveStage}
                  onPoseChange={(pose, f, p) => {
                    setJointAngles(pose);
                    setForceN(f);
                    setPressureKPa(p);
                  }}
                  onMetricsUpdate={(newM, key) => {
                    setMetrics(newM);
                    setSelectedModelKey(key);
                  }}
                  onLogMessage={addLog}
                  currentActiveStage={activeStage}
                />
              )}

              {activeTab === 'eval' && (
                <EvaluationDashboard
                  metrics={metrics}
                  selectedModelKey={selectedModelKey}
                  onSelectModel={key => {
                    setSelectedModelKey(key);
                    if (BENCHMARK_MODELS[key]) {
                      setMetrics(BENCHMARK_MODELS[key]);
                      addLog(`Chuyển sang xem hiệu năng mô hình: ${BENCHMARK_MODELS[key].name}`, 'info');
                    }
                  }}
                  forceN={forceN}
                  pressureKPa={pressureKPa}
                  thumbAngleDeg={jointAngles.thumb * 90}
                />
              )}

              {activeTab === 'dataset' && (
                <DatasetInspector
                  onSelectGraspSample={handleSelectSample}
                  currentSampleId={selectedSampleId}
                  graspSamples={graspSamples}
                  emgSamples={emgSamples}
                  tabularSamples={tabularSamples}
                  onAddSamples={handleAddSyntheticSamples}
                  onResetSamples={handleResetSamples}
                  onLogMessage={addLog}
                />
              )}
            </div>
          </div>
        </div>

        {/* Lower Row: Real-time sEMG Oscilloscope & Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* sEMG Signal Stream (8 columns) */}
          <div className="lg:col-span-8">
            <EMGOscilloscope
              activeCurl={avgCurl}
              activeGesture={livePrediction.success ? 'Firm Grasp' : 'Unstable Flex'}
            />
          </div>

          {/* Terminal Logs & System Telemetry (4 columns) */}
          <div className="lg:col-span-4 bg-[#09101f] border border-[#2ee6c8]/20 rounded-xl p-3.5 flex flex-col shadow-xl">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-xs">
              <span className="font-bold text-[#2ee6c8] flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" /> NHẬT KÝ HỆ THỐNG &amp; TELEMETRY
              </span>
              <button
                onClick={() => setLogs([])}
                className="text-[10px] text-slate-500 hover:text-slate-300"
              >
                Xóa log
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[220px] space-y-1.5 text-[11px] font-mono scrollbar-thin scrollbar-thumb-slate-700 pr-1">
              {logs.map(log => (
                <div key={log.id} className="flex items-start gap-2 leading-tight">
                  <span className="text-slate-500 shrink-0 text-[10px]">{log.time}</span>
                  <span
                    className={
                      log.type === 'success'
                        ? 'text-emerald-400'
                        : log.type === 'warn'
                        ? 'text-amber-400'
                        : log.type === 'magic'
                        ? 'text-[#a06bff]'
                        : 'text-slate-300'
                    }
                  >
                    {log.msg}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 mt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-500">
              <span>Độ trễ Edge AI: &lt; 1.8ms</span>
              <span>Độ phân giải ADC: 12-bit</span>
              <span>Cân bằng tải: Ổn định</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#060a14] py-4 px-4 text-center text-xs text-slate-400 font-mono">
        <div className="max-w-4xl mx-auto space-y-1">
          <p className="text-slate-300">
            <strong className="text-[#2ee6c8]">"Đạo cao một thước, Ma cao một trượng"</strong> — Lấy sai số làm pháp khí, lấy thực nghiệm làm căn cơ, lấy khả năng khái quát hóa làm cảnh giới tối thượng.
          </p>
          <p className="text-[11px] text-slate-500">
            Dự án Human-AI Bàn Tay Robot Y Tế &amp; Phục Hồi Chức Năng · STM32F4 · Jetson Nano · XGBoost Regularization · Three.js WebGL
          </p>
        </div>
      </footer>

      {/* 4-Layer Architecture Modal */}
      <ArchitectureModal isOpen={showArchModal} onClose={() => setShowArchModal(false)} />
    </div>
  );
}
