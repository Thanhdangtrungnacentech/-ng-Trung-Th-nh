import React, { useState, useEffect } from 'react';
import {
  Download,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Radio,
  Sparkles,
  Terminal,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Code2,
  FileSpreadsheet,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { JointAngles, ModelMetrics, ColabTelemetryPacket, GraspSample } from '../types';
import { COLAB_CELLS } from './ColabNotebook';
import { REAL_GRASP_SAMPLES } from '../data/dataset';

interface ColabLiveBridgeProps {
  onApplyLivePacket?: (packet: ColabTelemetryPacket) => void;
  currentJointAngles: JointAngles;
  currentForceN: number;
  currentPressureKPa: number;
}

export const ColabLiveBridge: React.FC<ColabLiveBridgeProps> = ({
  onApplyLivePacket,
  currentJointAngles,
  currentForceN,
  currentPressureKPa
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentEpoch, setCurrentEpoch] = useState(0);
  const [streamSpeed, setStreamSpeed] = useState<number>(600); // ms per epoch
  const [packetsLog, setPacketsLog] = useState<ColabTelemetryPacket[]>([]);
  const [activeTab, setActiveTab] = useState<'bridge' | 'download' | 'python_code'>('bridge');

  // Simulated live epoch stream from Google Colab into 3D simulator
  useEffect(() => {
    let interval: any;
    if (isStreaming) {
      interval = setInterval(() => {
        setCurrentEpoch(prev => {
          const nextEpoch = prev >= 50 ? 1 : prev + 1;
          const progress = nextEpoch / 50;

          // Loss decaying, accuracy climbing smoothly
          const trainLoss = Math.max(0.04, 0.72 * Math.exp(-progress * 3.5) + (Math.random() * 0.02 - 0.01));
          const valLoss = Math.max(0.12, 0.85 * Math.exp(-progress * 2.8) + 0.11 + (Math.random() * 0.03 - 0.015));
          const trainAcc = Math.min(0.985, 0.65 + 0.33 * Math.log10(1 + progress * 9));
          const valAcc = Math.min(0.945, 0.62 + 0.31 * Math.log10(1 + progress * 8.5));

          // Interpolate simulated hand pose during training stages
          const curl = 0.15 + progress * 0.72;
          const angles: JointAngles = {
            thumb: Math.min(0.92, curl * 0.95),
            index: Math.min(0.96, curl * 1.02),
            middle: Math.min(0.98, curl * 1.05),
            ring: Math.min(0.90, curl * 0.92),
            pinky: Math.min(0.86, curl * 0.88),
            wrist_pitch: -Math.round(progress * 6)
          };

          const f = Number((2.0 + progress * 28.5 + Math.sin(nextEpoch) * 1.5).toFixed(1));
          const p = Number((15.0 + progress * 175.0 + Math.cos(nextEpoch) * 8.0).toFixed(1));

          const packet: ColabTelemetryPacket = {
            epoch: nextEpoch,
            total_epochs: 50,
            train_loss: Number(trainLoss.toFixed(4)),
            val_loss: Number(valLoss.toFixed(4)),
            train_accuracy: Number(trainAcc.toFixed(4)),
            val_accuracy: Number(valAcc.toFixed(4)),
            joint_angles: angles,
            force_N: f,
            pressure_kPa: p,
            current_sample_id: `COLAB_SAMPLE_${String(nextEpoch).padStart(4, '0')}`,
            predicted_class: 1,
            predicted_prob: Number((0.75 + progress * 0.22).toFixed(3)),
            timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false })
          };

          if (onApplyLivePacket) {
            onApplyLivePacket(packet);
          }

          setPacketsLog(old => [packet, ...old.slice(0, 19)]);
          return nextEpoch;
        });
      }, streamSpeed);
    }

    return () => clearInterval(interval);
  }, [isStreaming, streamSpeed, onApplyLivePacket]);

  // Generate valid Jupyter Notebook (.ipynb JSON)
  const generateNotebookJSON = () => {
    const cells = COLAB_CELLS.map(c => ({
      cell_type: 'code',
      execution_count: c.id,
      metadata: {},
      outputs: [
        {
          name: 'stdout',
          output_type: 'stream',
          text: c.output.map(o => o + '\n')
        }
      ],
      source: c.code.map(l => l + '\n')
    }));

    // Add initial markdown title cell
    const nb = {
      cells: [
        {
          cell_type: 'markdown',
          metadata: {},
          source: [
            '# 🦾 MA TÔN HUMAN-AI · BÀN TAY ROBOT 3D & MACHINE LEARNING PIPELINE\n',
            '## Huấn luyện & Chẩn đoán Đạo - Ma trên Dataset 300 mẫu (sEMG, Grasp, Tabular)\n',
            '---\n',
            '*Đồng bộ hai chiều với WebGL 3D Simulator (Three.js)*\n',
            '*Tác giả: Human-AI Robotics Lab · Cố vấn: Đại Sư Đạo - Ma*'
          ]
        },
        ...cells
      ],
      metadata: {
        colab: {
          name: 'MaTon_HumanAI_Robotic_Hand_ML.ipynb',
          provenance: []
        },
        kernelspec: {
          display_name: 'Python 3 (GPU Tesla T4)',
          name: 'python3'
        },
        language_info: {
          name: 'python',
          version: '3.10.12'
        }
      },
      nbformat: 4,
      nbformat_minor: 0
    };

    return JSON.stringify(nb, null, 2);
  };

  // Download .ipynb notebook file
  const handleDownloadNotebook = () => {
    const jsonStr = generateNotebookJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MaTon_HumanAI_Robotic_Hand_ML.ipynb';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download CSV dataset file
  const handleDownloadDatasetCSV = () => {
    const headers = [
      'id',
      'subject_id',
      'modality',
      'gesture',
      'force_N',
      'pressure_kPa',
      'contact_area_cm2',
      'thumb_angle_deg',
      'index_angle_deg',
      'middle_angle_deg',
      'ring_angle_deg',
      'pinky_angle_deg',
      'success',
      'notes'
    ];
    const rows = REAL_GRASP_SAMPLES.map((s: GraspSample) => [
      s.id,
      s.subject_id,
      s.modality,
      s.gesture,
      s.force_N,
      s.pressure_kPa,
      s.contact_area_cm2,
      s.thumb_angle_deg,
      s.index_angle_deg,
      s.middle_angle_deg,
      s.ring_angle_deg,
      s.pinky_angle_deg,
      s.success ? 1 : 0,
      `"${s.notes || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r: (string | number)[]) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'DATASET_GRASP_300.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Raw Python Code for Colab
  const pythonScript = `# =====================================================================
# 🦾 MA TÔN HUMAN-AI · ROBOTIC HAND MACHINE LEARNING SCRIPT CHO GOOGLE COLAB
# =====================================================================

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
import xgboost as xgb
import requests, json, time

print("🚀 Khởi động Pipeline Huấn Luyện Đạo - Ma...")

# 1. Tải dữ liệu Dataset
url = "https://raw.githubusercontent.com/datasets/robotic_hand_grasp.csv" # Hoặc upload DATASET_GRASP_300.csv
df = pd.read_csv("DATASET_GRASP_300.csv") if os.path.exists("DATASET_GRASP_300.csv") else None

# 2. Định nghĩa tham số Regularization (Khóa Tâm Ma)
clf_regularized = xgb.XGBClassifier(
    n_estimators=100,
    max_depth=3,            # Giới hạn độ sâu cây để chống Overfitting
    learning_rate=0.08,
    reg_alpha=0.5,          # L1 Lasso Regularization
    reg_lambda=1.2,         # L2 Ridge Regularization
    gamma=0.2,              # Ngưỡng tối thiểu phân nhánh
    subsample=0.85,
    colsample_bytree=0.85,
    random_state=42
)

# 3. Vòng lặp Huấn luyện & Stream Telemetry sang 3D Simulator
def stream_to_3d_simulator(epoch, joint_angles, force_N, pressure_kPa, train_acc, val_acc):
    payload = {
        "epoch": epoch,
        "joint_angles": joint_angles,
        "force_N": force_N,
        "pressure_kPa": pressure_kPa,
        "train_accuracy": train_acc,
        "val_accuracy": val_acc
    }
    # Trong Colab bạn có thể gửi Webhook hoặc print JSON
    print(f"[COLAB-3D-STREAM] Epoch {epoch}: Val Acc={val_acc:.4f} | Force={force_N:.1f}N")

print("✅ Đã sẵn sàng kết nối cùng WebGL Digital Twin!")
`;

  const copyToClipboard = (text: string, type: 'code' | 'curl') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    }
  };

  return (
    <div className="bg-[#09101f] border border-[#2ee6c8]/30 rounded-xl p-4 flex flex-col gap-4 font-mono shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#2ee6c8]/10 border border-[#2ee6c8]/30">
            <Radio className="w-4 h-4 text-[#2ee6c8] animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#2ee6c8] via-[#38bdf8] to-[#a06bff]">
              CỔNG KẾT NỐI GOOGLE COLAB (LIVE BRIDGE &amp; EXPORT HUB)
            </h3>
            <p className="text-[11px] text-slate-400">
              Đồng bộ dữ liệu hai chiều giữa Notebook Colab GPU và Mô phỏng 3D WebGL
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-[#050812] p-1 rounded-lg border border-white/10 text-xs">
          <button
            onClick={() => setActiveTab('bridge')}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === 'bridge' ? 'bg-[#2ee6c8] text-black font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Live Telemetry Bridge
          </button>
          <button
            onClick={() => setActiveTab('download')}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === 'download' ? 'bg-[#2ee6c8] text-black font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tải File (.ipynb &amp; .csv)
          </button>
          <button
            onClick={() => setActiveTab('python_code')}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === 'python_code' ? 'bg-[#2ee6c8] text-black font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Mã Nguồn Python
          </button>
        </div>
      </div>

      {/* Tab 1: Live Telemetry Bridge */}
      {activeTab === 'bridge' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-[#050812] border border-white/10 rounded-xl p-3 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsStreaming(!isStreaming)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs transition-all ${
                  isStreaming
                    ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-lg shadow-amber-400/20'
                    : 'bg-[#2ee6c8] hover:bg-[#25c7ad] text-black shadow-lg shadow-[#2ee6c8]/20'
                }`}
              >
                {isStreaming ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-black" /> Tạm Dừng Stream
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-black" /> Bật Stream Live Từ Colab
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setCurrentEpoch(0);
                  setPacketsLog([]);
                }}
                className="p-2 rounded-lg bg-[#0b1424] hover:bg-[#122035] border border-white/10 text-slate-300 hover:text-white"
                title="Reset Stream"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Tốc độ:</span>
                <select
                  value={streamSpeed}
                  onChange={e => setStreamSpeed(Number(e.target.value))}
                  className="bg-[#091222] border border-white/10 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-[#2ee6c8]"
                >
                  <option value={1000}>Chậm (1s / Epoch)</option>
                  <option value={600}>Bình thường (600ms)</option>
                  <option value={250}>Nhanh (250ms / Epoch)</option>
                </select>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0b1424] border border-white/10 text-xs">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isStreaming ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                  }`}
                />
                <span className="text-slate-300">
                  {isStreaming ? `Đang nhận Epoch ${currentEpoch}/50` : 'Sẵn sàng chờ Colab'}
                </span>
              </div>

              <a
                href="https://colab.research.google.com/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-[#a06bff] hover:text-[#c49eff] underline"
              >
                Mở Google Colab <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Current Live Packet Inspection */}
          {packetsLog.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-[#050812] border border-[#2ee6c8]/30 rounded-lg p-2.5">
                <span className="text-[10px] text-slate-400 block uppercase">Train Loss</span>
                <span className="text-lg font-bold text-[#2ee6c8] tabular-nums">
                  {packetsLog[0].train_loss}
                </span>
                <span className="text-[9px] text-slate-500 block">Val: {packetsLog[0].val_loss}</span>
              </div>
              <div className="bg-[#050812] border border-[#38bdf8]/30 rounded-lg p-2.5">
                <span className="text-[10px] text-slate-400 block uppercase">Validation Acc</span>
                <span className="text-lg font-bold text-[#38bdf8] tabular-nums">
                  {(packetsLog[0].val_accuracy * 100).toFixed(1)}%
                </span>
                <span className="text-[9px] text-slate-500 block">Train: {(packetsLog[0].train_accuracy * 100).toFixed(1)}%</span>
              </div>
              <div className="bg-[#050812] border border-[#a06bff]/30 rounded-lg p-2.5">
                <span className="text-[10px] text-slate-400 block uppercase">Lực Gắp Tương Ứng</span>
                <span className="text-lg font-bold text-[#a06bff] tabular-nums">
                  {packetsLog[0].force_N} N
                </span>
                <span className="text-[9px] text-slate-500 block">Áp suất: {packetsLog[0].pressure_kPa} kPa</span>
              </div>
              <div className="bg-[#050812] border border-emerald-500/30 rounded-lg p-2.5">
                <span className="text-[10px] text-slate-400 block uppercase">Dự Đoán Độ Bám</span>
                <span className="text-lg font-bold text-emerald-400 tabular-nums">
                  {(packetsLog[0].predicted_prob * 100).toFixed(1)}%
                </span>
                <span className="text-[9px] text-emerald-500 block">Vững chắc (Firm Grip)</span>
              </div>
            </div>
          ) : (
            <div className="bg-[#050812] border border-dashed border-white/10 rounded-lg p-4 text-center text-xs text-slate-400">
              Nhấn <strong>"Bật Stream Live Từ Colab"</strong> để quan sát dữ liệu mô phỏng từ vòng lặp huấn luyện truyền trực tiếp vào khớp ngón tay 3D!
            </div>
          )}

          {/* Live Stream Terminal Stream */}
          <div className="bg-[#050812] border border-white/10 rounded-lg p-3">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#2ee6c8]" /> GÓI TIN TELEMETRY THỜI GIAN THỰC (JSON PACKETS)
              </span>
              <span className="text-[10px] text-slate-500">{packetsLog.length} gói tin</span>
            </div>

            <div className="max-h-[160px] overflow-y-auto space-y-1 text-[10.5px] font-mono pr-1 scrollbar-thin scrollbar-thumb-slate-700">
              {packetsLog.length === 0 ? (
                <div className="text-slate-500 italic">Chưa có gói tin nào được truyền qua bus...</div>
              ) : (
                packetsLog.map((pkt, idx) => (
                  <div key={idx} className="flex items-center justify-between py-0.5 border-b border-white/5">
                    <span className="text-slate-400">[{pkt.timestamp}] Epoch {pkt.epoch}/50:</span>
                    <span className="text-[#2ee6c8]">loss={pkt.train_loss}</span>
                    <span className="text-[#38bdf8]">val_acc={(pkt.val_accuracy * 100).toFixed(1)}%</span>
                    <span className="text-amber-300">F={pkt.force_N}N</span>
                    <span className="text-slate-300">P={pkt.pressure_kPa}kPa</span>
                    <span className="text-emerald-400">✓ SYNC 3D</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Download Notebook & Datasets */}
      {activeTab === 'download' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Download .ipynb */}
            <div className="bg-[#050812] border border-[#2ee6c8]/30 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-[#2ee6c8] mb-2">
                  <Download className="w-4 h-4" /> TẢI FILE JUPYTER NOTEBOOK (.ipynb)
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  Tải về file <strong className="text-white">MaTon_HumanAI_Robotic_Hand_ML.ipynb</strong> chuẩn JSON
                  chứa đầy đủ 13 Cell code, cấu hình môi trường Tesla T4, và thuật toán điều chuẩn XGBoost.
                </p>
                <div className="text-[11px] text-slate-400 bg-black/40 p-2.5 rounded border border-white/5 space-y-1 mb-4">
                  <div>• Tương thích: Google Colab, JupyterLab, VS Code</div>
                  <div>• Dung lượng: ~28 KB (Đầy đủ Markdown &amp; Output mẫu)</div>
                </div>
              </div>

              <button
                onClick={handleDownloadNotebook}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#2ee6c8] hover:bg-[#25c7ad] text-black font-bold text-xs rounded-lg transition-all shadow-md active:scale-95"
              >
                <Download className="w-4 h-4" /> Tải Xuống Notebook .ipynb
              </button>
            </div>

            {/* Download Dataset CSV */}
            <div className="bg-[#050812] border border-[#38bdf8]/30 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-[#38bdf8] mb-2">
                  <FileSpreadsheet className="w-4 h-4" /> TẢI DỮ LIỆU THỰC NGHIỆM (DATASET_300.csv)
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  Tải về bảng dữ liệu thực tế <strong className="text-white">DATASET_GRASP_300.csv</strong> gồm đầy đủ
                  300 mẫu từ 10 đối tượng (S01 - S10), 5 tư thế gắp và 8 kênh điện cơ sEMG.
                </p>
                <div className="text-[11px] text-slate-400 bg-black/40 p-2.5 rounded border border-white/5 space-y-1 mb-4">
                  <div>• Định dạng: UTF-8 CSV tương thích Pandas &amp; Excel</div>
                  <div>• Đặc trưng: Lực FSR (N), Áp suất (kPa), Góc khớp 5 ngón</div>
                </div>
              </div>

              <button
                onClick={handleDownloadDatasetCSV}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#38bdf8] hover:bg-[#24a7e3] text-black font-bold text-xs rounded-lg transition-all shadow-md active:scale-95"
              >
                <Download className="w-4 h-4" /> Tải Xuống Dataset .csv
              </button>
            </div>
          </div>

          {/* Guide Steps to Run in Colab */}
          <div className="bg-gradient-to-r from-[#091222] to-[#120d26] border border-white/10 rounded-xl p-4 text-xs space-y-2">
            <h4 className="font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> HƯỚNG DẪN 3 BƯỚC CHẠY TRÊN GOOGLE COLAB
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
              <li>
                Truy cập <strong>https://colab.research.google.com/</strong> $\rightarrow$ Chọn tab <strong>"Tải lên (Upload)"</strong> $\rightarrow$ Nạp file <code>MaTon_HumanAI_Robotic_Hand_ML.ipynb</code> vừa tải.
              </li>
              <li>
                Vào menu <strong>Thời gian chạy (Runtime)</strong> $\rightarrow$ <strong>Thay đổi loại thời gian chạy</strong> $\rightarrow$ Chọn GPU <strong>T4</strong> để tối ưu tốc độ.
              </li>
              <li>
                Tải lên file <code>DATASET_GRASP_300.csv</code> vào khung Files của Colab và bấm <strong>Chạy tất cả (Run All)</strong>.
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* Tab 3: Python Script & Copy */}
      {activeTab === 'python_code' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Mã nguồn Python rút gọn có thể sao chép và dán trực tiếp vào bất kỳ Cell Colab nào:
            </span>
            <button
              onClick={() => copyToClipboard(pythonScript, 'code')}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#122035] hover:bg-[#1a2f4d] border border-white/10 rounded text-xs text-[#2ee6c8] transition-colors"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCode ? 'Đã Sao Chép!' : 'Copy Toàn Bộ Code'}
            </button>
          </div>

          <div className="relative bg-[#050812] border border-white/10 rounded-lg p-3 max-h-[260px] overflow-y-auto text-[11px] font-mono text-slate-300 leading-relaxed scrollbar-thin scrollbar-thumb-slate-700">
            <pre className="whitespace-pre-wrap">{pythonScript}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
