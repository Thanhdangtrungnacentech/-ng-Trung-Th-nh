import React from 'react';
import { Cpu, ShieldCheck, Database, Layout, Sparkles, BookOpen, X, ArrowRight } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#09101f] border border-[#2ee6c8]/40 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative font-mono text-slate-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
          <Sparkles className="w-6 h-6 text-[#2ee6c8]" />
          <div>
            <h2 className="text-lg font-bold tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#2ee6c8] to-[#a06bff]">
              KIẾN TRÚC 4 TẦNG &amp; NGUYÊN LÝ TỐI ƯU HÓA HỌC MÁY (BIOMIMETIC ROBOTICS)
            </h2>
            <p className="text-xs text-slate-400">
              Kiến trúc tích hợp phần cứng thời gian thực, trí tuệ biên Edge AI, điện toán đám mây và giao diện lâm sàng
            </p>
          </div>
        </div>

        {/* 4 Layers Grid */}
        <div className="space-y-4 mb-6">
          <h3 className="text-xs font-bold text-[#2ee6c8] uppercase tracking-wider">
            1. KIẾN TRÚC HỆ THỐNG 4 TẦNG: PHẦN CỨNG — SUY LUẬN BIÊN — ĐIỆN TOÁN MÂY — GIAO DIỆN LÂM SÀNG
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Layer 1 */}
            <div className="bg-[#050812] border border-[#2ee6c8]/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#2ee6c8] mb-1.5">
                <Cpu className="w-4 h-4" /> LAYER 1: EMBEDDED HARDWARE CONTROLLER
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-2">
                <strong className="text-white">Vi điều khiển STM32F4 (168MHz):</strong> Vận hành vòng lặp điều khiển thời gian thực
                8 kênh xung PWM cho các servo/dây gân nhân tạo, đọc tín hiệu từ cảm biến áp suất màng mỏng FSR, cảm biến lực Load Cell
                và cảm biến góc quay từ tính Hall/Encoder.
              </p>
              <div className="text-[11px] text-slate-400 bg-black/40 p-2 rounded border border-white/5">
                • Chu kỳ điều khiển: 1000Hz (1ms Hardware Control Loop)<br />
                • Cơ cấu chấp hành: Động cơ servo không chổi than &amp; dây gân nhân tạo Dyneema
              </div>
            </div>

            {/* Layer 2 */}
            <div className="bg-[#050812] border border-[#38bdf8]/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#38bdf8] mb-1.5">
                <ShieldCheck className="w-4 h-4" /> LAYER 2: EDGE AI &amp; BIOMECHANICAL INFERENCE
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-2">
                <strong className="text-white">Bộ xử lý biên NVIDIA Jetson:</strong> Thực hiện tiền xử lý tín hiệu điện cơ sEMG 8 kênh
                (Lọc thông dải Butterworth 20–450Hz, lọc Notch 50Hz, trích xuất đặc trưng MAV, RMS, Zero-crossing) và thực thi suy luận
                mô hình ONNX thời gian thực.
              </p>
              <div className="text-[11px] text-slate-400 bg-black/40 p-2 rounded border border-white/5">
                • Độ trễ suy luận: &lt; 2ms (Ultra-low latency inference)<br />
                • Định dạng triển khai: ONNX Runtime INT8 lượng tử hóa tối ưu TensorRT
              </div>
            </div>

            {/* Layer 3 */}
            <div className="bg-[#050812] border border-[#a06bff]/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#a06bff] mb-1.5">
                <Database className="w-4 h-4" /> LAYER 3: CLOUD ML &amp; TELEMETRY DATA LAKE
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-2">
                <strong className="text-white">Pipeline Học Máy &amp; Lưu Trữ Đám Mây:</strong> Hệ thống lưu trữ chuỗi thời gian telemetry,
                tự động tái huấn luyện mô hình (Continuous Training / AutoML) khi phát hiện trôi dạt dữ liệu (Data Drift) hoặc thích ứng
                với bệnh nhân mới.
              </p>
              <div className="text-[11px] text-slate-400 bg-black/40 p-2 rounded border border-white/5">
                • Kho dữ liệu: Time-series database + Đối tượng telemetry S3<br />
                • Môi trường huấn luyện: Google Colab GPU &amp; Cụm điện toán phân tán
              </div>
            </div>

            {/* Layer 4 */}
            <div className="bg-[#050812] border border-amber-400/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-400 mb-1.5">
                <Layout className="w-4 h-4" /> LAYER 4: CLINICAL DASHBOARD &amp; DIGITAL TWIN
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-2">
                <strong className="text-white">Giao diện Giám sát Lâm sàng &amp; Bệnh nhân:</strong> Hiển thị Digital Twin 3D bàn tay với
                lớp da Hologram bao quanh khung xương, theo dõi biên độ góc vận động (ROM), lực kẹp pháp tuyến, độ đàn hồi vật thể và
                phân tích mỏi cơ tần số sinh học (MDF/MNF).
              </p>
              <div className="text-[11px] text-slate-400 bg-black/40 p-2 rounded border border-white/5">
                • Giao thức bảo mật: WSS + HTTPS mã hóa TLS 1.3 theo chuẩn y tế HIPAA<br />
                • Phản hồi xúc giác: Haptic feedback cảnh báo trượt ma sát Coulomb
              </div>
            </div>
          </div>
        </div>

        {/* Regularization and Generalization Principle */}
        <div className="bg-gradient-to-r from-[#0c192e] to-[#120d26] border border-white/10 rounded-xl p-4 text-xs leading-relaxed space-y-2.5">
          <h3 className="font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" /> 2. NGUYÊN LÝ TỐI ƯU HÓA HỌC MÁY: KIỂM SOÁT OVERFITTING &amp; BẢO TOÀN KHẢ NĂNG TỔNG QUÁT HÓA
          </h3>
          <p>
            <strong className="text-[#2ee6c8]">Nguyên lý Giới hạn Sai số Tổng quát (Generalization Error Bound):</strong> Trong học máy cho thiết bị y sinh,
            độ chính xác (Accuracy) đạt 100% trên tập huấn luyện thường là dấu hiệu của <strong className="text-rose-400">hiện tượng quá khớp (Overfitting Pathology)</strong>.
            Mô hình học vẹt các nhiễu đo lường ngẫu nhiên và biên độ xung bất thường của người thử nghiệm cũ, dẫn đến mất ổn định khi áp dụng trên đối tượng bệnh nhân mới.
          </p>
          <p>
            <strong className="text-[#a06bff]">Kỹ thuật Điều hòa (Regularization Techniques):</strong> Bằng cách kết hợp hàm phạt $L_1/L_2$ (Lasso &amp; Ridge Penalty),
            giới hạn độ sâu phân nhánh cây (`max_depth=3`), ngưỡng suy giảm thông tin tối thiểu `gamma`, và kỹ thuật kiểm định chéo theo nhóm cá nhân độc lập
            (`GroupKFold Subject-Independent`), mô hình được ràng buộc chặt chẽ vào các quan hệ vật lý bản chất: quy luật cân bằng giữa áp suất tiếp xúc,
            lực pháp tuyến và góc co duỗi của từng đốt ngón tay sinh học.
          </p>
        </div>

        {/* Footer info */}
        <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#2ee6c8] text-black font-bold text-xs rounded-lg hover:bg-[#25c7ad] transition-all"
          >
            Đã Hiểu &amp; Tiếp Tục Trải Nghiệm
          </button>
        </div>
      </div>
    </div>
  );
};
