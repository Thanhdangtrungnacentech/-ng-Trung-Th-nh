import React from 'react';
import { Cpu, ShieldCheck, Database, Layout, Sparkles, BookOpen, X, ArrowRight } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface ArchitectureViewProps {
  onClose?: () => void;
}

export const ArchitectureView: React.FC<ArchitectureViewProps> = ({ onClose }) => {
  return (
    <div className="bg-[#09101f] border border-[#2ee6c8]/40 rounded-xl p-4 sm:p-5 shadow-2xl font-mono text-slate-200 flex flex-col gap-4">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-[#2ee6c8]" />
          <div>
            <h2 className="text-sm sm:text-base font-bold tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#2ee6c8] to-[#a06bff]">
              KIẾN TRÚC 4 TẦNG &amp; NGUYÊN LÝ TỐI ƯU HÓA HỌC MÁY
            </h2>
            <p className="text-[11px] text-slate-400">
              Biomimetic Robotics · Phần cứng STM32F4 · Trí tuệ biên Edge AI · Chuẩn Cobot ISO/TS 15066
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 4 Layers Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-[#2ee6c8] uppercase tracking-wider flex items-center justify-between">
          <span>1. KIẾN TRÚC HỆ THỐNG 4 TẦNG</span>
          <span className="text-[10px] text-slate-400 font-normal">Real-time Closed Loop</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Layer 1 */}
          <div className="bg-[#050812] border border-[#2ee6c8]/30 rounded-xl p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-[#2ee6c8] mb-1.5">
                <span className="flex items-center gap-1.5"><Cpu className="w-4 h-4" /> LAYER 1: EMBEDDED HARDWARE</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#2ee6c8]/20 text-[#2ee6c8] border border-[#2ee6c8]/30">1000Hz Loop</span>
              </div>
              <p className="text-[11.5px] text-slate-300 leading-relaxed mb-2">
                <strong className="text-white">Vi điều khiển STM32F401RE (168MHz ARM Cortex-M4):</strong> Vận hành vòng lặp điều khiển thời gian thực
                8 kênh xung PWM cho các servo/dây gân nhân tạo Dyneema (chịu lực 500N), đọc tín hiệu từ ma trận cảm biến áp suất FSR và góc quay Hall Encoder.
              </p>
            </div>
            <div className="text-[10.5px] text-slate-400 bg-black/40 p-2 rounded border border-white/5">
              • Chu kỳ điều khiển: 1.0ms hardware loop<br />
              • Cơ chế truyền động: Underactuated tendon-driven mechanism
            </div>
          </div>

          {/* Layer 2 */}
          <div className="bg-[#050812] border border-[#38bdf8]/30 rounded-xl p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-[#38bdf8] mb-1.5">
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> LAYER 2: EDGE AI &amp; TINYML</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30">&lt;5ms Latency</span>
              </div>
              <p className="text-[11.5px] text-slate-300 leading-relaxed mb-2">
                <strong className="text-white">Xử lý biên TinyML trực tiếp:</strong> Tiền xử lý tín hiệu sEMG 8 kênh (Butterworth bandpass 20-450Hz, Notch 50Hz,
                trích xuất MAV/RMS/WL) và thực thi mô hình XGBoost INT8 Quantized sinh mã C tĩnh (`model_weights.h`) với phản xạ haptic chống trượt ở tần số 40Hz.
              </p>
            </div>
            <div className="text-[10.5px] text-slate-400 bg-black/40 p-2 rounded border border-white/5">
              • Bộ nhớ Flash: 1.2 KB, RAM: 64 Bytes<br />
              • Độ trễ suy luận: 4.82ms &lt; 10ms thời gian thực
            </div>
          </div>

          {/* Layer 3 */}
          <div className="bg-[#050812] border border-[#a06bff]/30 rounded-xl p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-[#a06bff] mb-1.5">
                <span className="flex items-center gap-1.5"><Database className="w-4 h-4" /> LAYER 3: CLOUD DATA LAKE</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#a06bff]/20 text-[#a06bff] border border-[#a06bff]/30">GroupKFold</span>
              </div>
              <p className="text-[11.5px] text-slate-300 leading-relaxed mb-2">
                <strong className="text-white">Pipeline Học Máy &amp; Kho Dữ Liệu:</strong> Lưu trữ 300 mẫu đa phương thức (Grasp, EMG, Tabular),
                tự động tối ưu siêu tham số Bayesian Optimization và kiểm thử chéo theo đối tượng độc lập (GroupKFold S01-S10) ngăn ngừa rò rỉ dữ liệu.
              </p>
            </div>
            <div className="text-[10.5px] text-slate-400 bg-black/40 p-2 rounded border border-white/5">
              • Kết quả: F1-score = 0.9655 | ROC-AUC = 0.8571<br />
              • Môi trường: Google Colab Tesla T4 GPU
            </div>
          </div>

          {/* Layer 4 */}
          <div className="bg-[#050812] border border-amber-400/30 rounded-xl p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-amber-400 mb-1.5">
                <span className="flex items-center gap-1.5"><Layout className="w-4 h-4" /> LAYER 4: DIGITAL TWIN 3D</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">ISO/TS 15066</span>
              </div>
              <p className="text-[11.5px] text-slate-300 leading-relaxed mb-2">
                <strong className="text-white">Bản Sao Kỹ Thuật Số &amp; An Toàn Cobot:</strong> Mô phỏng chuỗi động học bàn tay robot với lớp da Hologram,
                các kịch bản tương tác người - robot an toàn (Bắt tay tự thích ứng lực, truyền vật thể, dao động ký rung Haptic HUD) và ngắt bảo vệ khi vượt 35N.
              </p>
            </div>
            <div className="text-[10.5px] text-slate-400 bg-black/40 p-2 rounded border border-white/5">
              • Giao diện WebGL: Three.js 60FPS<br />
              • Phản hồi xúc giác: Pacinian corpuscle vibrotactile (40-250Hz)
            </div>
          </div>
        </div>
      </div>

      {/* Regularization and Generalization Principle */}
      <div className="bg-gradient-to-r from-[#0c192e] to-[#120d26] border border-white/10 rounded-xl p-4 text-xs leading-relaxed space-y-2">
        <h3 className="font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5 text-xs">
          <BookOpen className="w-4 h-4 text-amber-400" /> 2. NGUYÊN LÝ TỐI ƯU HÓA HỌC MÁY: KIỂM SOÁT OVERFITTING &amp; BẢO TOÀN KHẢ NĂNG TỔNG QUÁT HÓA
        </h3>
        <p className="text-[11.5px] text-slate-300">
          <strong className="text-[#2ee6c8]">Nguyên lý Giới hạn Sai số Tổng quát:</strong> Trong học máy cho thiết bị cơ sinh học y tế,
          độ chính xác đạt 100% trên tập huấn luyện là dấu hiệu của <strong className="text-rose-400">hiện tượng quá khớp (Overfitting)</strong>.
          Mô hình học vẹt các nhiễu đo lường ngẫu nhiên, dẫn đến giảm sút khi áp dụng trên đối tượng người dùng mới.
        </p>
        <p className="text-[11.5px] text-slate-300">
          <strong className="text-[#a06bff]">Kỹ thuật Điều hòa (Regularization):</strong> Bằng cách kết hợp hàm phạt L1/L2 (reg_alpha=0.15, reg_lambda=1.2),
          giới hạn độ sâu phân nhánh cây (`max_depth=3`), ngưỡng chia nhánh `gamma=0.25`, và chia tập kiểm định theo cá nhân độc lập
          (`GroupKFold S01-S10`), mô hình được ràng buộc chặt chẽ vào các quan hệ vật lý bản chất: quy luật cân bằng giữa áp suất tiếp xúc,
          lực pháp tuyến và góc co duỗi của từng đốt ngón tay sinh học.
        </p>
      </div>

      {onClose && (
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#2ee6c8] text-black font-bold text-xs rounded-lg hover:bg-[#25c7ad] transition-all"
          >
            Đã Hiểu &amp; Tiếp Tục Trải Nghiệm
          </button>
        </div>
      )}
    </div>
  );
};

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <ArchitectureView onClose={onClose} />
      </div>
    </div>
  );
};
