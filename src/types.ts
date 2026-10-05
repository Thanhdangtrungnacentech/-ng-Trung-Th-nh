export interface GraspSample {
  id: string;
  subject_id: string; // S01 - S10, S11+ for synthetic
  modality: 'grasp' | 'emg' | 'tabular';
  gesture: 'power_grasp' | 'tripod_pinch' | 'lateral_key' | 'cylindrical' | 'rest';
  force_N: number;
  pressure_kPa: number;
  contact_area_cm2: number;
  thumb_angle_deg: number;
  index_angle_deg: number;
  middle_angle_deg: number;
  ring_angle_deg: number;
  pinky_angle_deg: number;
  success: boolean;
  notes?: string;
  isSynthetic?: boolean;
  simulationParams?: {
    friction_coef: number;
    stiffness_N_per_mm: number;
    hertz_depth_mm: number;
    tendon_tension_N: number;
    coulomb_safety_ratio: number;
    ode_solver?: string;
  };
}

export interface EMGSample {
  id: string;
  subject_id: string;
  channels: number[]; // 8 channels
  mav: number;
  rms: number;
  zero_crossings: number;
  waveform_length: number;
  active_gesture: string;
  isSynthetic?: boolean;
}

export interface TabularSample {
  id: string;
  subject_id: string;
  sampling_rate_hz: number;
  latency_ms: number;
  temperature_c: number;
  motor_current_ma: number[];
  battery_pct: number;
  status: 'STABLE' | 'WARNING' | 'RECALIBRATING';
  isSynthetic?: boolean;
}

export interface JointAngles {
  thumb: number;   // 0 to 1
  index: number;   // 0 to 1
  middle: number;  // 0 to 1
  ring: number;    // 0 to 1
  pinky: number;   // 0 to 1
  wrist_pitch?: number; // degrees
  wrist_yaw?: number;   // degrees
}

export type RenderMode = 'pbr' | 'cyberpunk' | 'wireframe' | 'sensor_heatmap';

export type GraspObjectType = 'none' | 'cylinder' | 'sphere' | 'key' | 'box';

export interface GraspObjectConfig {
  type: GraspObjectType;
  name: string;
  color: number;
  scale: [number, number, number];
  position: [number, number, number];
  targetGrasp: 'power_grasp' | 'tripod_pinch' | 'lateral_key' | 'cylindrical';
}

export interface ColabTelemetryPacket {
  epoch: number;
  total_epochs: number;
  train_loss: number;
  val_loss: number;
  train_accuracy: number;
  val_accuracy: number;
  joint_angles: JointAngles;
  force_N: number;
  pressure_kPa: number;
  current_sample_id: string;
  predicted_class: number;
  predicted_prob: number;
  timestamp: string;
}

export interface FFTFrequencyData {
  frequencies: number[]; // e.g. 0 to 500 Hz
  magnitudes: number[];  // dB or relative power
  medianFrequencyHz: number; // MDF
  meanFrequencyHz: number;   // MNF
  isFatigued: boolean;
}

export interface PipelineStage {
  id: string;
  step: number;
  title: string;
  scientificPrinciple: string;
  daoMaConcept?: string;
  description: string;
  status: 'pending' | 'active' | 'completed';
  metrics?: Partial<ModelMetrics>;
}

export interface HologramConfig {
  enabled: boolean;
  opacity: number;        // 0.1 to 0.95
  color: string;          // hex color e.g. '#2ee6c8'
  showWireframe: boolean;
  showScanRings: boolean;
  showAnatomicalPads: boolean;
}

export type ManipulationAction = 'idle' | 'approach' | 'swoop_grasp' | 'lift' | 'rotate' | 'compliance_test' | 'release';

export interface ManipulationStatus {
  action: ManipulationAction;
  progress: number; // 0 to 1
  liftHeightCm: number;
  rotationAngleDeg: number;
  complianceDeformationMm: number;
  tactileContactStable: boolean;
  graspPhasePercent?: number; // 0 to 100%
}

export interface ModelMetrics {
  name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number;
  train_acc: number;
  val_acc: number;
  gap: number;
  confusion_matrix: {
    tn: number;
    fp: number;
    fn: number;
    tp: number;
  };
}

export interface OptimizationRound {
  round: number;
  id: string;
  name: string;
  method: string;
  description: string;
  testAccuracy: number;
  trainAccuracy: number;
  generalizationGap: number;
  f1Score: number;
  rocAuc: number;
  falseNegatives: number;
  latencyMs: number;
  flashSizeKb: number;
  powerMa: number;
  noiseResiliencePct: number;
  status: 'baseline' | 'improved' | 'plateau' | 'regressed';
  statusBadge: string;
  gainSummary: string;
  regressionSummary: string;
  relativeGainAccuracyPct: number;
  relativeGainF1Pct: number;
  relativeGainRocAucPct: number;
  relativeLatencyChangePct: number;
  relativeFlashChangePct: number;
  relativePowerChangePct: number;
  keyImprovements: string[];
  keyRegressions: string[];
}

export interface OptimizationComparisonDiff {
  metricKey: string;
  metricLabel: string;
  unit: string;
  fromVal: number;
  toVal: number;
  absoluteDiff: number;
  percentageDiff: number;
  isPositiveForUser: boolean;
  category: 'performance' | 'hardware_efficiency' | 'safety';
}

export interface NotebookCell {
  id: number;
  stageId: string;
  title: string;
  code: string[];
  output: string[];
  outputType?: 'text' | 'table' | 'warning' | 'success';
  executionTime?: string;
  targetPose?: JointAngles;
  forceValue?: number;
  pressureValue?: number;
  metricsUpdate?: ModelMetrics;
  curveData?: {
    train: number[];
    val: number[];
    label: string;
  };
}
