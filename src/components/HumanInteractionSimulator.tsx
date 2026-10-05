import React, { useState, useEffect, useRef } from 'react';
import { JointAngles, GraspObjectType } from '../types';
import {
  Hand,
  Users,
  Sparkles,
  ArrowRightLeft,
  Zap,
  ShieldCheck,
  Activity,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Fingerprint,
  Smile,
  PackageCheck,
  Radio,
  Sliders,
  Maximize2
} from 'lucide-react';

interface HumanInteractionSimulatorProps {
  currentJointAngles: JointAngles;
  onApplyJoints: (angles: JointAngles, force?: number, pressure?: number, logMsg?: string) => void;
  currentForceN: number;
  currentPressureKPa: number;
  currentGraspObject: GraspObjectType;
  onSelectGraspObject: (obj: GraspObjectType) => void;
  onLogMessage?: (msg: string, type?: 'info' | 'warn' | 'success' | 'magic') => void;
}

type InteractionScenario = 'handshake' | 'handover' | 'tactile_reflex' | 'gestures';

export const HumanInteractionSimulator: React.FC<HumanInteractionSimulatorProps> = ({
  currentJointAngles,
  onApplyJoints,
  currentForceN,
  currentPressureKPa,
  currentGraspObject,
  onSelectGraspObject,
  onLogMessage
}) => {
  const [activeScenario, setActiveScenario] = useState<InteractionScenario>('handshake');

  // ==========================================
  // SCENARIO 1: ADAPTIVE HANDSHAKE STATE
  // ==========================================
  const [userGripForce, setUserGripForce] = useState<number>(14); // N from user
  const [handshakePhase, setHandshakePhase] = useState<'idle' | 'approach' | 'contact' | 'gripping' | 'oscillating' | 'releasing'>('idle');
  const [handshakeCycles, setHandshakeCycles] = useState<number>(0);
  const handshakeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ==========================================
  // SCENARIO 2: OBJECT HANDOVER STATE
  // ==========================================
  const [handoverDirection, setHandoverDirection] = useState<'user_to_robot' | 'robot_to_user'>('user_to_robot');
  const [handoverStep, setHandoverStep] = useState<'ready' | 'holding' | 'transferring' | 'completed'>('ready');
  const [selectedHandoverObject, setSelectedHandoverObject] = useState<GraspObjectType>('cylinder');

  // ==========================================
  // SCENARIO 3: TACTILE REFLEX STATE
  // ==========================================
  const [lastTouchedPoint, setLastTouchedPoint] = useState<string | null>(null);
  const [reflexLatencyMs, setReflexLatencyMs] = useState<number>(8.4);
  const [activeTaxelPressure, setActiveTaxelPressure] = useState<number>(0);

  // ==========================================
  // SCENARIO 4: SOCIAL GESTURE STATE
  // ==========================================
  const [activeGesture, setActiveGesture] = useState<string>('idle');
  const [isGestureAnimating, setIsGestureAnimating] = useState<boolean>(false);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (handshakeTimerRef.current) clearInterval(handshakeTimerRef.current);
    };
  }, []);

  // --------------------------------------------------------------------------
  // HANDSHAKE SIMULATION ENGINE
  // --------------------------------------------------------------------------
  const startHandshake = () => {
    if (handshakePhase !== 'idle') return;

    // 1. Approach phase: Extend hand forward, open fingers naturally, tilt wrist up
    setHandshakePhase('approach');
    onSelectGraspObject('none');
    onApplyJoints(
      { thumb: 0.15, index: 0.12, middle: 0.12, ring: 0.14, pinky: 0.15, wrist_pitch: 14, wrist_yaw: 0 },
      2.5,
      18,
      '🤝 [Bắt Tay - Pha 1]: Tay robot vươn về phía trước, mở ngón đón tiếp xúc với người dùng.'
    );

    // 2. Contact phase (after 450ms)
    setTimeout(() => {
      setHandshakePhase('contact');
      onApplyJoints(
        { thumb: 0.35, index: 0.38, middle: 0.38, ring: 0.38, pinky: 0.35, wrist_pitch: 8, wrist_yaw: 0 },
        8.2,
        45,
        '🤝 [Bắt Tay - Pha 2]: Cảm biến xúc giác FSR phát hiện tiếp xúc lòng bàn tay của người dùng.'
      );

      // 3. Adaptive Gripping: calculate adaptive robot grip force based on user force
      setTimeout(() => {
        setHandshakePhase('gripping');
        // If user is weak (<10N), robot clamps 10N gently. If user clamps 25N, robot caps at 20N ISO safe limit
        const robotForce = Math.min(22.0, Math.max(9.0, userGripForce * 0.95));
        const gripRatio = Math.min(0.85, 0.45 + (robotForce / 35.0) * 0.4);

        onApplyJoints(
          {
            thumb: gripRatio * 0.95,
            index: gripRatio,
            middle: gripRatio * 1.02,
            ring: gripRatio,
            pinky: gripRatio * 0.95,
            wrist_pitch: 0,
            wrist_yaw: 0
          },
          robotForce,
          robotForce * 7.5,
          `🤝 [Bắt Tay - Pha 3]: Thích ứng lực siết tự động: Lực người=${userGripForce}N -> Lực robot=${robotForce.toFixed(1)}N [Chuẩn an toàn ISO/TS 15066].`
        );

        // 4. Oscillating rhythm (up and down wrist pitch 3 times)
        setTimeout(() => {
          setHandshakePhase('oscillating');
          let cycle = 0;
          let pitchToggle = true;

          handshakeTimerRef.current = setInterval(() => {
            cycle++;
            setHandshakeCycles(cycle);
            pitchToggle = !pitchToggle;

            onApplyJoints(
              {
                thumb: gripRatio * 0.95,
                index: gripRatio,
                middle: gripRatio * 1.02,
                ring: gripRatio,
                pinky: gripRatio * 0.95,
                wrist_pitch: pitchToggle ? 10 : -8,
                wrist_yaw: pitchToggle ? 3 : -3
              },
              robotForce,
              robotForce * 7.5
            );

            if (cycle >= 6) {
              if (handshakeTimerRef.current) clearInterval(handshakeTimerRef.current);
              // 5. Release phase
              setHandshakePhase('releasing');
              onApplyJoints(
                { thumb: 0.1, index: 0.1, middle: 0.1, ring: 0.1, pinky: 0.1, wrist_pitch: 0, wrist_yaw: 0 },
                3.5,
                22,
                '🤝 [Bắt Tay - Pha 5]: Cảm biến phát hiện người dùng buông tay -> Mở ngón êm dịu, thu về tư thế chuẩn.'
              );

              setTimeout(() => {
                setHandshakePhase('idle');
                setHandshakeCycles(0);
              }, 600);
            }
          }, 320);
        }, 600);
      }, 500);
    }, 450);
  };

  const handleUserGripChange = (newForce: number) => {
    setUserGripForce(newForce);
    if (handshakePhase === 'gripping' || handshakePhase === 'oscillating') {
      const robotForce = Math.min(22.0, Math.max(9.0, newForce * 0.95));
      const gripRatio = Math.min(0.85, 0.45 + (robotForce / 35.0) * 0.4);
      onApplyJoints(
        {
          thumb: gripRatio * 0.95,
          index: gripRatio,
          middle: gripRatio * 1.02,
          ring: gripRatio,
          pinky: gripRatio * 0.95,
          wrist_pitch: 0
        },
        robotForce,
        robotForce * 7.5
      );
    }
  };

  // --------------------------------------------------------------------------
  // OBJECT HANDOVER SIMULATION ENGINE
  // --------------------------------------------------------------------------
  const runHandoverCycle = () => {
    if (handoverDirection === 'user_to_robot') {
      // Step 1: Robot opens hand in ready reception pose
      setHandoverStep('ready');
      onSelectGraspObject('none');
      onApplyJoints(
        { thumb: 0.2, index: 0.15, middle: 0.15, ring: 0.15, pinky: 0.15, wrist_pitch: 10 },
        3.0,
        15,
        '📦 [Trao Vật]: Robot mở rộng lòng bàn tay đón vật thể từ người dùng.'
      );

      // Step 2: User places object into hand
      setTimeout(() => {
        setHandoverStep('holding');
        onSelectGraspObject(selectedHandoverObject);
        onApplyJoints(
          { thumb: 0.55, index: 0.65, middle: 0.68, ring: 0.65, pinky: 0.62, wrist_pitch: 4 },
          16.5,
          98,
          `📦 [Tiếp Nhận]: Người dùng trao ${selectedHandoverObject.toUpperCase()} -> Cảm biến quang phát hiện vật thể.`
        );

        // Step 3: Firmly close fingers and secure object
        setTimeout(() => {
          setHandoverStep('completed');
          onApplyJoints(
            { thumb: 0.82, index: 0.85, middle: 0.86, ring: 0.85, pinky: 0.82, wrist_pitch: 0 },
            24.0,
            162,
            '✓ [Khóa Kẹp An Toàn]: Nón ma sát Coulomb Sf=1.48 > 1.0. Đã tiếp nhận đồ vật thành công!'
          );
        }, 600);
      }, 650);
    } else {
      // Robot holds object and presents it to the user
      setHandoverStep('holding');
      onSelectGraspObject(selectedHandoverObject);
      onApplyJoints(
        { thumb: 0.82, index: 0.85, middle: 0.86, ring: 0.85, pinky: 0.82, wrist_pitch: 12 },
        24.0,
        162,
        `📦 [Robot Trao Vật]: Robot chìa ${selectedHandoverObject.toUpperCase()} ra trước mặt người dùng.`
      );

      // User pulls object -> robot senses release tension and opens fingers
      setTimeout(() => {
        setHandoverStep('transferring');
        onApplyJoints(
          { thumb: 0.45, index: 0.45, middle: 0.45, ring: 0.45, pinky: 0.45, wrist_pitch: 6 },
          8.5,
          42,
          '⚡ [Cảm Biến Kéo]: Phát hiện lực kéo rút vật từ tay người dùng (F_pull = 4.8N).'
        );

        setTimeout(() => {
          setHandoverStep('completed');
          onSelectGraspObject('none');
          onApplyJoints(
            { thumb: 0.1, index: 0.1, middle: 0.1, ring: 0.1, pinky: 0.1, wrist_pitch: 0 },
            3.2,
            18,
            '✓ [Nhả Vật An Toàn]: Mở ngón tức thời (38ms). Người dùng đã nhận vật an toàn!'
          );
        }, 550);
      }, 900);
    }
  };

  // --------------------------------------------------------------------------
  // TACTILE TOUCH REFLEX ENGINE
  // --------------------------------------------------------------------------
  const triggerTactileTouch = (pointId: string, name: string) => {
    const randomPressure = Math.round(50 + Math.random() * 95);
    const latency = Number((7.2 + Math.random() * 3.5).toFixed(1));
    setLastTouchedPoint(name);
    setActiveTaxelPressure(randomPressure);
    setReflexLatencyMs(latency);

    // Dynamic micro-flexion reflex response depending on where touched
    if (pointId === 'thumb') {
      onApplyJoints(
        { ...currentJointAngles, thumb: Math.min(1.0, currentJointAngles.thumb + 0.4) },
        14.2,
        randomPressure,
        `⚡ [Phản Xạ Cung Tủy]: Người dùng chạm ĐẦU NGÓN CÁI -> Co phản ứng trong ${latency}ms (P=${randomPressure}kPa)`
      );
    } else if (pointId === 'index') {
      onApplyJoints(
        { ...currentJointAngles, index: Math.min(1.0, currentJointAngles.index + 0.45) },
        16.0,
        randomPressure,
        `⚡ [Phản Xạ Cung Tủy]: Người dùng chạm ĐẦU NGÓN TRỎ -> Co phản ứng trong ${latency}ms (P=${randomPressure}kPa)`
      );
    } else if (pointId === 'middle') {
      onApplyJoints(
        { ...currentJointAngles, middle: Math.min(1.0, currentJointAngles.middle + 0.45) },
        16.0,
        randomPressure,
        `⚡ [Phản Xạ Cung Tủy]: Người dùng chạm ĐẦU NGÓN GIỮA -> Co phản ứng trong ${latency}ms (P=${randomPressure}kPa)`
      );
    } else if (pointId === 'palm') {
      onApplyJoints(
        { thumb: 0.4, index: 0.4, middle: 0.4, ring: 0.4, pinky: 0.4, wrist_pitch: -6 },
        21.0,
        randomPressure,
        `⚡ [Phản Xạ Lòng Bàn Tay]: Cảm ứng xúc giác thenar -> Thu nhẹ 5 ngón đón kẹp (Độ trễ: ${latency}ms)`
      );
    } else if (pointId === 'wrist') {
      onApplyJoints(
        { ...currentJointAngles, wrist_pitch: 18 },
        8.0,
        randomPressure,
        `⚡ [Phản Xạ Tránh Va Chạm]: Chạm cổ tay -> Nâng góc cổ tay +18° tránh kẹt (Độ trễ: ${latency}ms)`
      );
    } else {
      // ring or pinky
      onApplyJoints(
        { ...currentJointAngles, ring: 0.6, pinky: 0.6 },
        12.0,
        randomPressure,
        `⚡ [Phản Xạ Cung Tủy]: Chạm ngón ${name} -> Phản hồi cơ co trong ${latency}ms`
      );
    }

    // Auto-relax back after 700ms
    setTimeout(() => {
      setLastTouchedPoint(null);
    }, 1200);
  };

  // --------------------------------------------------------------------------
  // SOCIAL GESTURE & INTERACTION ENGINE
  // --------------------------------------------------------------------------
  const runSocialGesture = (gestureId: string) => {
    setIsGestureAnimating(true);
    setActiveGesture(gestureId);
    onSelectGraspObject('none');

    switch (gestureId) {
      case 'high_five':
        // High Five: Raise hand, open all fingers flat, pitch wrist back
        onApplyJoints(
          { thumb: 0.05, index: 0.02, middle: 0.02, ring: 0.02, pinky: 0.02, wrist_pitch: -18 },
          25.0,
          140,
          '✋ [Đập Tay - High Five]: Giơ lòng bàn tay lên cao, sẵn sàng đón nhận xung lực va chạm 25N từ người dùng!'
        );
        break;
      case 'fist_bump':
        // Fist Bump: Full clench fist, pitch forward
        onApplyJoints(
          { thumb: 0.95, index: 0.98, middle: 0.98, ring: 0.98, pinky: 0.95, wrist_pitch: 6 },
          15.0,
          95,
          '👊 [Cụng Nắm Đấm - Fist Bump]: Nắm chặt tay đưa về phía trước để cụng tay với người dùng.'
        );
        break;
      case 'wave_hello':
        // Wave Hello: Oscillation of wrist
        onApplyJoints(
          { thumb: 0.15, index: 0.08, middle: 0.08, ring: 0.08, pinky: 0.08, wrist_pitch: 0, wrist_yaw: 16 },
          4.0,
          24,
          '👋 [Vẫy Tay Chào]: Dao động cổ tay qua lại thân thiện chào đón người dùng.'
        );
        setTimeout(() => {
          onApplyJoints(
            { thumb: 0.15, index: 0.08, middle: 0.08, ring: 0.08, pinky: 0.08, wrist_pitch: 0, wrist_yaw: -16 },
            4.0,
            24
          );
        }, 300);
        setTimeout(() => {
          onApplyJoints(
            { thumb: 0.15, index: 0.08, middle: 0.08, ring: 0.08, pinky: 0.08, wrist_pitch: 0, wrist_yaw: 0 },
            4.0,
            24
          );
        }, 650);
        break;
      case 'pointing':
        // Pointing: Extend index, close others
        onApplyJoints(
          { thumb: 0.75, index: 0.02, middle: 0.95, ring: 0.95, pinky: 0.95, wrist_pitch: 4 },
          6.5,
          35,
          '👉 [Chỉ Hướng - Pointing]: Duỗi thẳng ngón trỏ dẫn hướng mục tiêu cho người dùng.'
        );
        break;
      case 'thumbs_up':
        // Thumbs Up: Thumb straight up, others clenched
        onApplyJoints(
          { thumb: 0.05, index: 0.92, middle: 0.92, ring: 0.92, pinky: 0.92, wrist_pitch: 16 },
          8.5,
          48,
          '👍 [Khen Ngợi - Thumbs Up]: Dựng thẳng ngón cái xác nhận hoàn thành xuất sắc.'
        );
        break;
      case 'peace':
        // Peace Sign: Index and middle extended, others closed
        onApplyJoints(
          { thumb: 0.85, index: 0.02, middle: 0.02, ring: 0.95, pinky: 0.95, wrist_pitch: 0 },
          7.2,
          40,
          '✌️ [Hòa Bình - Peace Sign]: Giơ hai ngón trỏ và ngón giữa biểu tượng giao tiếp thân thiện.'
        );
        break;
      default:
        break;
    }

    setTimeout(() => {
      setIsGestureAnimating(false);
    }, 800);
  };

  // Finger Counting 1 to 5 sequence
  const countFingers = (count: number) => {
    setIsGestureAnimating(true);
    let angles: JointAngles;
    switch (count) {
      case 1:
        angles = { thumb: 0.9, index: 0.05, middle: 0.9, ring: 0.9, pinky: 0.9, wrist_pitch: 0 };
        break;
      case 2:
        angles = { thumb: 0.9, index: 0.05, middle: 0.05, ring: 0.9, pinky: 0.9, wrist_pitch: 0 };
        break;
      case 3:
        angles = { thumb: 0.9, index: 0.05, middle: 0.05, ring: 0.05, pinky: 0.9, wrist_pitch: 0 };
        break;
      case 4:
        angles = { thumb: 0.9, index: 0.05, middle: 0.05, ring: 0.05, pinky: 0.05, wrist_pitch: 0 };
        break;
      case 5:
      default:
        angles = { thumb: 0.05, index: 0.05, middle: 0.05, ring: 0.05, pinky: 0.05, wrist_pitch: 0 };
        break;
    }
    onApplyJoints(angles, 5.0, 30, `🔢 [Đếm Số]: Đang giơ ${count} ngón tay theo yêu cầu.`);
    setTimeout(() => setIsGestureAnimating(false), 400);
  };

  return (
    <div className="bg-[#09101f] border border-[#2ee6c8]/30 rounded-xl p-3 sm:p-4 shadow-2xl flex flex-col gap-3.5 font-mono text-slate-200">
      {/* Top Banner Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2ee6c8] to-[#38bdf8] flex items-center justify-center text-black font-bold shadow-lg shadow-[#2ee6c8]/20">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              MÔ PHỎNG THAO TÁC TƯƠNG TÁC VỚI NGƯỜI DÙNG
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase">
                Human-in-the-loop Cobot
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 font-sans">
              Bắt tay tự thích ứng lực · Trao nhận đồ vật an toàn ISO/TS 15066 · Phản xạ xúc giác thời gian thực
            </p>
          </div>
        </div>

        {/* Real-time Safety Status Pill */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#050812] border border-emerald-500/40 text-emerald-300 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>ISO 10218: AN TOÀN TUYỆT ĐỐI (&lt;25N)</span>
          </div>
        </div>
      </div>

      {/* Scenario Selector Navigation Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-[#050812] p-1.5 rounded-xl border border-white/10 text-xs">
        <button
          onClick={() => setActiveScenario('handshake')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg font-bold transition-all ${
            activeScenario === 'handshake'
              ? 'bg-[#2ee6c8] text-black shadow-md shadow-[#2ee6c8]/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Hand className="w-3.5 h-3.5" />
          <span>1. Bắt Tay Thích Ứng</span>
        </button>
        <button
          onClick={() => setActiveScenario('handover')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg font-bold transition-all ${
            activeScenario === 'handover'
              ? 'bg-[#38bdf8] text-black shadow-md shadow-[#38bdf8]/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>2. Trao &amp; Nhận Vật</span>
        </button>
        <button
          onClick={() => setActiveScenario('tactile_reflex')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg font-bold transition-all ${
            activeScenario === 'tactile_reflex'
              ? 'bg-[#a06bff] text-black shadow-md shadow-[#a06bff]/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Fingerprint className="w-3.5 h-3.5" />
          <span>3. Phản Xạ Xúc Giác</span>
        </button>
        <button
          onClick={() => setActiveScenario('gestures')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg font-bold transition-all ${
            activeScenario === 'gestures'
              ? 'bg-amber-400 text-black shadow-md shadow-amber-400/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Smile className="w-3.5 h-3.5" />
          <span>4. Cử Chỉ &amp; Đập Tay</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SCENARIO 1: ADAPTIVE HUMAN HANDSHAKE */}
      {/* ========================================================================= */}
      {activeScenario === 'handshake' && (
        <div className="bg-gradient-to-r from-[#071326] via-[#091a33] to-[#0c152e] border border-[#2ee6c8]/40 rounded-xl p-3 sm:p-4 flex flex-col gap-3 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                KỊCH BẢN 1: BẮT TAY TƯƠNG TÁC TỰ THÍCH ỨNG LỰC
                <span className="text-[9px] px-2 py-0.5 rounded bg-[#2ee6c8]/20 text-[#2ee6c8] border border-[#2ee6c8]/30">
                  Adaptive Impedance Control
                </span>
              </h3>
              <p className="text-[11px] text-slate-300 font-sans mt-0.5">
                Robot vươn tay, phát hiện tiếp xúc lòng bàn tay, tự động đồng điệu lực siết với tay người dùng và nhịp theo dao động tự nhiên.
              </p>
            </div>

            <button
              onClick={startHandshake}
              disabled={handshakePhase !== 'idle'}
              className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all shadow-md ${
                handshakePhase !== 'idle'
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#2ee6c8] to-[#38bdf8] text-black shadow-[#2ee6c8]/30 hover:scale-[1.02]'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>{handshakePhase === 'idle' ? 'Bắt Đầu Bắt Tay Với Robot' : `Đang Bắt Tay (${handshakePhase.toUpperCase()})...`}</span>
            </button>
          </div>

          {/* User Force Slider Simulator */}
          <div className="bg-[#050b18] p-3 rounded-lg border border-white/10 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#38bdf8]" />
                Mô phỏng lực bóp từ tay người dùng:
              </span>
              <span className="text-emerald-400 font-bold tabular-nums text-sm">
                {userGripForce.toFixed(1)} N ({userGripForce < 12 ? 'Bóp nhẹ' : userGripForce < 20 ? 'Bóp vừa chuẩn' : 'Bóp rất mạnh'})
              </span>
            </div>
            <input
              type="range"
              min="4"
              max="35"
              step="0.5"
              value={userGripForce}
              onChange={e => handleUserGripChange(parseFloat(e.target.value))}
              className="w-full accent-[#2ee6c8] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-sans">
              <span>Chạm nhẹ (4N)</span>
              <span>Bắt tay tiêu chuẩn văn phòng (12N - 18N)</span>
              <span>Bóp mạnh giới hạn an toàn (35N)</span>
            </div>
          </div>

          {/* 5-Phase Timeline Progress Indicator */}
          <div className="grid grid-cols-5 gap-1.5 text-center text-[10px]">
            {[
              { id: 'approach', label: '1. Vươn Tay (Approach)' },
              { id: 'contact', label: '2. Chạm Xúc Giác (Contact)' },
              { id: 'gripping', label: '3. Siết Tự Thích Ứng' },
              { id: 'oscillating', label: '4. Nhịp Tay (Shake)' },
              { id: 'releasing', label: '5. Nhả Dịu (Release)' }
            ].map(step => {
              const isActive = handshakePhase === step.id;
              const isPast =
                (handshakePhase === 'contact' && step.id === 'approach') ||
                (handshakePhase === 'gripping' && ['approach', 'contact'].includes(step.id)) ||
                (handshakePhase === 'oscillating' && ['approach', 'contact', 'gripping'].includes(step.id)) ||
                (handshakePhase === 'releasing' && step.id !== 'releasing');

              return (
                <div
                  key={step.id}
                  className={`p-2 rounded-lg border transition-all ${
                    isActive
                      ? 'bg-[#2ee6c8]/20 border-[#2ee6c8] text-white font-bold animate-pulse'
                      : isPast
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                      : 'bg-[#050b18] border-white/5 text-slate-500'
                  }`}
                >
                  <span className="block truncate">{step.label}</span>
                  <span className="text-[9px] text-slate-400">
                    {isActive ? 'ĐANG CHẠY' : isPast ? 'XONG' : 'CHỜ'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Telemetry metrics bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-[#050b18] p-2.5 rounded-lg border border-white/10">
            <div>
              <span className="text-[10px] text-slate-400 block">Lực siết phản hồi Robot:</span>
              <span className="text-base font-bold text-[#2ee6c8]">{currentForceN.toFixed(1)} N</span>
              <span className="text-[9px] text-slate-500 block">Điều chỉnh tự động theo lực người</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Áp suất đệm silicon (Thenar):</span>
              <span className="text-base font-bold text-[#38bdf8]">{currentPressureKPa.toFixed(0)} kPa</span>
              <span className="text-[9px] text-slate-500 block">Tiếp xúc đàn hồi Hertz</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Chu kỳ nhịp bắt tay:</span>
              <span className="text-base font-bold text-amber-300">{handshakeCycles} / 6 nhịp</span>
              <span className="text-[9px] text-slate-500 block">Tần số dao động 1.8 Hz</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCENARIO 2: OBJECT HANDOVER (GIVE & RECEIVE) */}
      {/* ========================================================================= */}
      {activeScenario === 'handover' && (
        <div className="bg-gradient-to-r from-[#071326] via-[#091a33] to-[#0c152e] border border-[#38bdf8]/40 rounded-xl p-3 sm:p-4 flex flex-col gap-3 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                KỊCH BẢN 2: TRAO &amp; NHẬN ĐỒ VẬT VỚI NGƯỜI DÙNG (OBJECT HANDOVER)
                <span className="text-[9px] px-2 py-0.5 rounded bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30">
                  Two-Way Handover Cycle
                </span>
              </h3>
              <p className="text-[11px] text-slate-300 font-sans mt-0.5">
                Thao tác chuyển giao đồ vật 2 chiều an toàn: Cảm biến quang và xúc giác phát hiện vật và lực kéo rút vật để đóng/mở ngón kịp thời.
              </p>
            </div>

            {/* Handover Direction Toggle */}
            <div className="flex items-center gap-1 bg-[#050812] p-1 rounded-lg border border-white/10 text-xs">
              <button
                onClick={() => setHandoverDirection('user_to_robot')}
                className={`px-3 py-1 rounded transition-colors ${
                  handoverDirection === 'user_to_robot'
                    ? 'bg-[#38bdf8] text-black font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Người Đưa ➔ Robot Nhận
              </button>
              <button
                onClick={() => setHandoverDirection('robot_to_user')}
                className={`px-3 py-1 rounded transition-colors ${
                  handoverDirection === 'robot_to_user'
                    ? 'bg-[#38bdf8] text-black font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Robot Trao ➔ Người Cầm
              </button>
            </div>
          </div>

          {/* Object Selection */}
          <div className="flex items-center gap-2 bg-[#050b18] p-2.5 rounded-lg border border-white/10 flex-wrap text-xs">
            <span className="text-slate-400 text-[11px] shrink-0">Chọn đồ vật thao tác:</span>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { id: 'cylinder', label: 'Lon Nước (Can 330ml)' },
                { id: 'sphere', label: 'Quả Cầu Đàn Hồi (Ø65mm)' },
                { id: 'key', label: 'Chìa Khóa / Thẻ Từ' },
                { id: 'box', label: 'Hộp Thiết Bị Nhỏ' }
              ].map(obj => (
                <button
                  key={obj.id}
                  onClick={() => {
                    setSelectedHandoverObject(obj.id as GraspObjectType);
                    onSelectGraspObject(obj.id as GraspObjectType);
                  }}
                  className={`px-2.5 py-1 rounded border text-xs transition-all ${
                    selectedHandoverObject === obj.id
                      ? 'bg-[#38bdf8] text-black font-bold border-[#38bdf8]'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {obj.label}
                </button>
              ))}
            </div>

            {/* Run Button */}
            <button
              onClick={runHandoverCycle}
              className="ml-auto px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#38bdf8] to-[#2ee6c8] text-black font-bold text-xs shadow-md shadow-[#38bdf8]/20 hover:scale-[1.02] flex items-center gap-1.5"
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>Thực Hiện Chuyển Giao</span>
            </button>
          </div>

          {/* Handover Flow Steps Box */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
            <div className={`p-2.5 rounded-lg border ${handoverStep === 'ready' ? 'bg-[#38bdf8]/15 border-[#38bdf8] text-white font-bold' : 'bg-[#050b18] border-white/5 text-slate-400'}`}>
              <span className="text-[10px] block text-slate-400">Bước 1: Tư Thế Sẵn Sàng</span>
              <span>{handoverDirection === 'user_to_robot' ? 'Mở ngón chờ nhận' : 'Cầm vật chìa ra'}</span>
            </div>
            <div className={`p-2.5 rounded-lg border ${handoverStep === 'holding' ? 'bg-[#38bdf8]/15 border-[#38bdf8] text-white font-bold' : 'bg-[#050b18] border-white/5 text-slate-400'}`}>
              <span className="text-[10px] block text-slate-400">Bước 2: Tiếp Xúc Vật Thể</span>
              <span>{handoverDirection === 'user_to_robot' ? 'Đặt vật vào lòng tay' : 'Người dùng chạm vào vật'}</span>
            </div>
            <div className={`p-2.5 rounded-lg border ${handoverStep === 'transferring' ? 'bg-[#38bdf8]/15 border-[#38bdf8] text-white font-bold' : 'bg-[#050b18] border-white/5 text-slate-400'}`}>
              <span className="text-[10px] block text-slate-400">Bước 3: Nhận Dạng Lực Kéo</span>
              <span>{handoverDirection === 'user_to_robot' ? 'Khép ngón kiểm tra ma sát' : 'Cảm biến kéo nhả ngón'}</span>
            </div>
            <div className={`p-2.5 rounded-lg border ${handoverStep === 'completed' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 font-bold' : 'bg-[#050b18] border-white/5 text-slate-400'}`}>
              <span className="text-[10px] block text-slate-400">Bước 4: Hoàn Tất</span>
              <span>{handoverDirection === 'user_to_robot' ? 'Đã kẹp chắc Sf=1.48' : 'Rút vật thành công!'}</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCENARIO 3: TACTILE TOUCH REFLEX MAP */}
      {/* ========================================================================= */}
      {activeScenario === 'tactile_reflex' && (
        <div className="bg-gradient-to-r from-[#071326] via-[#091a33] to-[#0c152e] border border-[#a06bff]/40 rounded-xl p-3 sm:p-4 flex flex-col gap-3 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                KỊCH BẢN 3: BẢNG CẢM ỨNG PHẢN XẠ XÚC GIÁC (TACTILE TOUCH REFLEX)
                <span className="text-[9px] px-2 py-0.5 rounded bg-[#a06bff]/20 text-[#a06bff] border border-[#a06bff]/30">
                  Sub-10ms Spinal Arc
                </span>
              </h3>
              <p className="text-[11px] text-slate-300 font-sans mt-0.5">
                Nhấp chuột vào bất kỳ điểm xúc giác nào trên bàn tay để kích hoạt phản xạ co cơ sinh học tức thời.
              </p>
            </div>

            {/* Latency badge */}
            <div className="px-3 py-1 rounded bg-[#050b18] border border-[#a06bff]/40 text-[#a06bff] text-xs font-bold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Độ trễ phản xạ cung tủy: {reflexLatencyMs} ms</span>
            </div>
          </div>

          {/* Interactive Touch Pad Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {[
              { id: 'thumb', label: 'Đầu Ngón Cái', icon: '👍' },
              { id: 'index', label: 'Đầu Ngón Trỏ', icon: '☝️' },
              { id: 'middle', label: 'Đầu Ngón Giữa', icon: '🖕' },
              { id: 'ring', label: 'Đầu Áp Út', icon: '💍' },
              { id: 'pinky', label: 'Đầu Ngón Út', icon: '🤙' },
              { id: 'palm', label: 'Lòng Bàn Tay', icon: '✋' },
              { id: 'wrist', label: 'Khớp Cổ Tay', icon: '⌚' }
            ].map(pt => (
              <button
                key={pt.id}
                onClick={() => triggerTactileTouch(pt.id, pt.label)}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs active:scale-95 ${
                  lastTouchedPoint === pt.label
                    ? 'bg-[#a06bff] text-black font-bold border-white shadow-lg shadow-[#a06bff]/50 scale-105'
                    : 'bg-[#050b18] hover:bg-white/10 border-white/10 text-slate-200'
                }`}
              >
                <span className="text-xl">{pt.icon}</span>
                <span className="text-[10.5px] font-semibold text-center leading-tight">{pt.label}</span>
                <span className="text-[9px] text-[#a06bff] bg-[#a06bff]/10 px-1.5 py-0.2 rounded border border-[#a06bff]/30">
                  Chạm thử
                </span>
              </button>
            ))}
          </div>

          {/* Touch feedback readout */}
          {lastTouchedPoint && (
            <div className="bg-[#050b18] border border-[#a06bff]/40 rounded-lg p-2.5 flex items-center justify-between text-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  Vừa phát hiện điểm chạm tại: <strong className="text-white">{lastTouchedPoint}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                <span>Áp lực tức thời: <strong className="text-amber-300">{activeTaxelPressure} kPa</strong></span>
                <span>Phản hồi co cơ: <strong className="text-emerald-300">{reflexLatencyMs} ms</strong></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCENARIO 4: SOCIAL GESTURE & HIGH-FIVE */}
      {/* ========================================================================= */}
      {activeScenario === 'gestures' && (
        <div className="bg-gradient-to-r from-[#071326] via-[#091a33] to-[#0c152e] border border-amber-400/40 rounded-xl p-3 sm:p-4 flex flex-col gap-3 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                KỊCH BẢN 4: TƯƠNG TÁC CỬ CHỈ GIAO TIẾP &amp; ĐẬP TAY (HIGH-FIVE)
                <span className="text-[9px] px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Expressive Gestural Cobot
                </span>
              </h3>
              <p className="text-[11px] text-slate-300 font-sans mt-0.5">
                Các cử chỉ giao tiếp xã hội sống động giữa người và robot: Đập tay, cụng nắm đấm, vẫy chào, ra hiệu và đếm ngón tay.
              </p>
            </div>
          </div>

          {/* Gesture Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
            <button
              onClick={() => runSocialGesture('high_five')}
              disabled={isGestureAnimating}
              className={`p-2.5 rounded-lg border font-bold flex flex-col items-center gap-1 transition-all ${
                activeGesture === 'high_five'
                  ? 'bg-amber-400 text-black border-white shadow-lg'
                  : 'bg-[#050b18] hover:bg-white/10 border-white/10 text-slate-200'
              }`}
            >
              <span className="text-xl">✋</span>
              <span>Đập Tay (High Five)</span>
              <span className="text-[9px] text-slate-400">Xung lực 25N</span>
            </button>

            <button
              onClick={() => runSocialGesture('fist_bump')}
              disabled={isGestureAnimating}
              className={`p-2.5 rounded-lg border font-bold flex flex-col items-center gap-1 transition-all ${
                activeGesture === 'fist_bump'
                  ? 'bg-amber-400 text-black border-white shadow-lg'
                  : 'bg-[#050b18] hover:bg-white/10 border-white/10 text-slate-200'
              }`}
            >
              <span className="text-xl">👊</span>
              <span>Cụng Nắm Đấm</span>
              <span className="text-[9px] text-slate-400">Chạm nhẹ 15N</span>
            </button>

            <button
              onClick={() => runSocialGesture('wave_hello')}
              disabled={isGestureAnimating}
              className={`p-2.5 rounded-lg border font-bold flex flex-col items-center gap-1 transition-all ${
                activeGesture === 'wave_hello'
                  ? 'bg-amber-400 text-black border-white shadow-lg'
                  : 'bg-[#050b18] hover:bg-white/10 border-white/10 text-slate-200'
              }`}
            >
              <span className="text-xl">👋</span>
              <span>Vẫy Tay Chào</span>
              <span className="text-[9px] text-slate-400">Lắc cổ tay ±16°</span>
            </button>

            <button
              onClick={() => runSocialGesture('pointing')}
              disabled={isGestureAnimating}
              className={`p-2.5 rounded-lg border font-bold flex flex-col items-center gap-1 transition-all ${
                activeGesture === 'pointing'
                  ? 'bg-amber-400 text-black border-white shadow-lg'
                  : 'bg-[#050b18] hover:bg-white/10 border-white/10 text-slate-200'
              }`}
            >
              <span className="text-xl">👉</span>
              <span>Chỉ Đường (Point)</span>
              <span className="text-[9px] text-slate-400">Duỗi ngón trỏ</span>
            </button>

            <button
              onClick={() => runSocialGesture('thumbs_up')}
              disabled={isGestureAnimating}
              className={`p-2.5 rounded-lg border font-bold flex flex-col items-center gap-1 transition-all ${
                activeGesture === 'thumbs_up'
                  ? 'bg-amber-400 text-black border-white shadow-lg'
                  : 'bg-[#050b18] hover:bg-white/10 border-white/10 text-slate-200'
              }`}
            >
              <span className="text-xl">👍</span>
              <span>Khen Ngợi</span>
              <span className="text-[9px] text-slate-400">Ngón cái dựng +16°</span>
            </button>

            <button
              onClick={() => runSocialGesture('peace')}
              disabled={isGestureAnimating}
              className={`p-2.5 rounded-lg border font-bold flex flex-col items-center gap-1 transition-all ${
                activeGesture === 'peace'
                  ? 'bg-amber-400 text-black border-white shadow-lg'
                  : 'bg-[#050b18] hover:bg-white/10 border-white/10 text-slate-200'
              }`}
            >
              <span className="text-xl">✌️</span>
              <span>Hòa Bình (Peace)</span>
              <span className="text-[9px] text-slate-400">Trỏ &amp; Giữa</span>
            </button>
          </div>

          {/* Interactive Finger Counting Row */}
          <div className="bg-[#050b18] p-3 rounded-lg border border-white/10 flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <span>🔢</span> Đếm ngón tay tương tác:
            </span>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(num => (
                <button
                  key={num}
                  onClick={() => countFingers(num)}
                  disabled={isGestureAnimating}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-amber-400 hover:text-black font-bold text-sm transition-all border border-white/10 flex items-center justify-center active:scale-95"
                >
                  {num}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-slate-400">Bấm số để robot giơ đúng số lượng ngón</span>
          </div>
        </div>
      )}

      {/* Real-time Interaction Safety Telemetry Footer */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Kiểm soát trở kháng thích ứng (Impedance Control) kích hoạt
          </span>
          <span>|</span>
          <span>
            Giới hạn công suất tiếp xúc:{' '}
            <strong className="text-white">P_max &lt; 0.5J (ISO/TS 15066)</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded border border-white/10 text-slate-300">
            Đồng bộ 3D Three.js: <strong className="text-[#2ee6c8]">60 FPS Live</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
