import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, CheckCircle2, AlertTriangle, Terminal, Code2, Sparkles, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { NotebookCell, JointAngles, ModelMetrics } from '../types';
import { BENCHMARK_MODELS } from '../data/dataset';

interface ColabNotebookProps {
  onStageChange: (stageId: string) => void;
  onPoseChange: (pose: JointAngles, forceN: number, pressureKPa: number) => void;
  onMetricsUpdate: (metrics: ModelMetrics, modelKey: string) => void;
  onLogMessage: (msg: string, type?: 'info' | 'warn' | 'success' | 'magic') => void;
  currentActiveStage: string;
}

export const COLAB_CELLS: NotebookCell[] = [
  {
    id: 1,
    stageId: 'setup',
    title: 'Cài đặt thư viện & Pháp khí Machine Learning',
    code: [
      '# Ma đạo nhập môn — chuẩn bị môi trường tính toán',
      '!pip install -q xgboost==2.0.3 scikit-learn==1.4.2 pandas==2.2.1 openpyxl==3.1.2',
      'import torch, sklearn, xgboost, pandas as pd, numpy as np',
      'print(f"CUDA Available: {torch.cuda.is_available()} | Device: Tesla T4 16GB")'
    ],
    output: [
      '✓ Successfully installed xgboost-2.0.3 scikit-learn-1.4.2 openpyxl-3.1.2',
      'CUDA Available: True | Device: Tesla T4 16GB · GPU Acceleration Ready'
    ],
    executionTime: '1.2s',
    targetPose: { thumb: 0.15, index: 0.12, middle: 0.15, ring: 0.18, pinky: 0.2 },
    forceValue: 0.0,
    pressureValue: 0.0
  },
  {
    id: 2,
    stageId: 'data_ingest',
    title: 'Nạp DATASET.xls (300 Mẫu Đa Phương Thức)',
    code: [
      'from google.colab import files',
      'uploaded = files.upload()  # Chọn file DATASET.xls từ máy',
      '',
      'excel_path = "DATASET.xls"',
      'xl = pd.ExcelFile(excel_path)',
      'print("Sheets có trong dataset:", xl.sheet_names)',
      'df_all = pd.read_excel(excel_path, sheet_name="All")',
      'print(f"Cấu trúc bảng tổng hợp: {df_all.shape} (300 hàng x 54 cột)")'
    ],
    output: [
      'Saving DATASET.xls to DATASET.xls (148.2 kB)',
      'Sheets có trong dataset: [\'All\', \'Grasp\', \'EMG\', \'Tabular\', \'Metadata\']',
      'Cấu trúc bảng tổng hợp: (300, 54)'
    ],
    executionTime: '0.8s',
    targetPose: { thumb: 0.35, index: 0.28, middle: 0.26, ring: 0.32, pinky: 0.35 },
    forceValue: 8.5,
    pressureValue: 45.0
  },
  {
    id: 3,
    stageId: 'modality',
    title: 'Phân tích cấu trúc 3 Modal (EMG, Grasp, Tabular)',
    code: [
      'print("--- PHÂN BỔ CÁC MODALITY ---")',
      'print(df_all["modality"].value_counts())',
      '',
      'print("\\n--- TỶ LỆ NHÃN THÀNH CÔNG (success) ---")',
      'print(df_all["success"].value_counts(normalize=True).round(4))',
      'print(f"Tổng số giá trị khuyết thiếu (NaN): {df_all.isna().sum().sum()}")'
    ],
    output: [
      'emg        100 mẫu (8-channel raw sEMG, MAV, RMS, WL)',
      'grasp      100 mẫu (Góc khớp 5 ngón, lực FSR, Load cell)',
      'tabular    100 mẫu (Điện áp động cơ, độ trễ bus, nhiệt độ)',
      'True     0.9067 (90.67% thao tác thành công)',
      'False    0.0933 (9.33% thao tác trượt hỏng)',
      'Tổng số giá trị khuyết thiếu: 0'
    ],
    executionTime: '0.5s',
    targetPose: { thumb: 0.45, index: 0.42, middle: 0.38, ring: 0.42, pinky: 0.45 },
    forceValue: 14.2,
    pressureValue: 86.4
  },
  {
    id: 4,
    stageId: 'eda',
    title: 'EDA — Thăm Dò Ma Cảnh & Đặc Trưng Động Học',
    code: [
      'FEATURES = [',
      '    "force_N", "pressure_kPa", "contact_area_cm2",',
      '    "thumb_angle_deg", "index_angle_deg", "middle_angle_deg",',
      '    "ring_angle_deg", "pinky_angle_deg"',
      ']',
      'df_grasp = df_all.dropna(subset=FEATURES).copy()',
      'print(f"Tập dữ liệu Grasp: {df_grasp.shape}")',
      'desc = df_grasp[FEATURES].describe().T[["mean", "std", "min", "max"]]',
      'print(desc.round(2))'
    ],
    output: [
      'Tập dữ liệu Grasp: (100, 14)',
      '                  mean     std     min      max',
      'force_N          22.31   13.42    0.55    44.87',
      'pressure_kPa    136.85   71.03   11.30   249.80',
      'contact_area_cm2  7.12    3.18    1.39    11.87',
      'thumb_angle_deg  42.18   26.91    0.60    88.90',
      'index_angle_deg  39.74   25.12    0.20    87.70',
      '⚠ MẤT CÂN BẰNG NHÃN: 86 Thành Công vs 14 Thất Bại',
      '-> Accuracy thông thường sẽ bị ngộ nhận (High Accuracy Paradox)!'
    ],
    executionTime: '0.9s',
    targetPose: { thumb: 0.65, index: 0.55, middle: 0.48, ring: 0.45, pinky: 0.42 },
    forceValue: 19.8,
    pressureValue: 122.0
  },
  {
    id: 5,
    stageId: 'baseline',
    title: 'Baseline — Đo Căn Cơ (Majority Dummy Classifier)',
    code: [
      'from sklearn.dummy import DummyClassifier',
      'from sklearn.model_selection import train_test_split',
      '',
      'X = df_grasp[FEATURES].values',
      'y = df_grasp["success"].astype(int).values',
      'X_train, X_test, y_train, y_test = train_test_split(',
      '    X, y, test_size=0.30, stratify=y, random_state=42',
      ')',
      'dummy = DummyClassifier(strategy="most_frequent").fit(X_train, y_train)',
      'print(f"Majority Baseline Accuracy: {dummy.score(X_test, y_test):.4f}")'
    ],
    output: [
      'Majority Baseline Accuracy: 0.8667 (86.67%)',
      '→ Mọi mô hình tiếp theo PHẢI vượt qua mốc 86.67% mới có giá trị thực tế.'
    ],
    executionTime: '0.4s',
    targetPose: { thumb: 0.5, index: 0.5, middle: 0.5, ring: 0.5, pinky: 0.5 },
    forceValue: 16.5,
    pressureValue: 95.0,
    metricsUpdate: BENCHMARK_MODELS.baseline
  },
  {
    id: 6,
    stageId: 'logistic',
    title: 'Logistic Regression — Nhập Môn Chính Đạo Tuyến Tính',
    code: [
      'from sklearn.pipeline import make_pipeline',
      'from sklearn.preprocessing import StandardScaler',
      'from sklearn.linear_model import LogisticRegression',
      'from sklearn.metrics import classification_report, roc_auc_score',
      '',
      'pipe_lr = make_pipeline(StandardScaler(), LogisticRegression(C=1.0, max_iter=1000))',
      'pipe_lr.fit(X_train, y_train)',
      'pred_lr = pipe_lr.predict(X_test)',
      'prob_lr = pipe_lr.predict_proba(X_test)[:, 1]',
      'print(f"LR Test Accuracy: {pipe_lr.score(X_test, y_test):.4f}")',
      'print(f"LR ROC-AUC: {roc_auc_score(y_test, prob_lr):.4f}")'
    ],
    output: [
      'LR Test Accuracy: 0.8667 | F1: 0.9286 | ROC-AUC: 0.6429',
      '→ Quan hệ phi tuyến giữa các góc khớp và lực tiếp xúc không thể biểu diễn tuyến tính!'
    ],
    executionTime: '0.6s',
    targetPose: { thumb: 0.62, index: 0.58, middle: 0.55, ring: 0.52, pinky: 0.48 },
    forceValue: 21.0,
    pressureValue: 130.0,
    metricsUpdate: BENCHMARK_MODELS.logistic_regression,
    curveData: {
      train: [0.80, 0.83, 0.85, 0.86, 0.88, 0.885],
      val: [0.75, 0.79, 0.82, 0.84, 0.86, 0.8667],
      label: 'Logistic Regression'
    }
  },
  {
    id: 7,
    stageId: 'xgboost_unreg',
    title: 'XGBoost Không Điều Chuẩn — Tấu Hỏa Nhập Ma (Overfitting)',
    code: [
      'from xgboost import XGBClassifier',
      '',
      '# Cây quyết định sâu (depth=8), không phạt L1/L2 -> Ghi nhớ toàn bộ nhiễu',
      'xgb_unreg = XGBClassifier(',
      '    n_estimators=400, max_depth=8, learning_rate=0.15,',
      '    subsample=1.0, reg_alpha=0, reg_lambda=0, random_state=42',
      ')',
      'xgb_unreg.fit(X_train, y_train)',
      'tr_acc = xgb_unreg.score(X_train, y_train)',
      'te_acc = xgb_unreg.score(X_test, y_test)',
      'print(f"Train Accuracy: {tr_acc:.4f} (100%!) | Test Accuracy: {te_acc:.4f}")',
      'print(f"Khoảng cách Train - Test Gap: {tr_acc - te_acc:.4f}")'
    ],
    output: [
      'Train Accuracy: 1.0000 (100%) | Test Accuracy: 0.8333 (83.33%)',
      '⚠ CẢNH BÁO TẤU HỎA NHẬP MA (Severe Overfitting):',
      'Mô hình học vẹt tập train, gặp dữ liệu lạ lập tức suy giảm độ chính xác!'
    ],
    executionTime: '1.4s',
    targetPose: { thumb: 0.98, index: 1.0, middle: 1.0, ring: 0.98, pinky: 0.95 },
    forceValue: 38.5,
    pressureValue: 240.0,
    metricsUpdate: BENCHMARK_MODELS.xgboost_overfitted,
    curveData: {
      train: [0.88, 0.94, 0.98, 0.995, 1.0, 1.0],
      val: [0.80, 0.85, 0.88, 0.87, 0.85, 0.8333],
      label: 'XGBoost Overfitted'
    }
  },
  {
    id: 8,
    stageId: 'regularization',
    title: 'Regularization — Khóa Tâm Ma (L1, L2, Gamma, Subsampling)',
    code: [
      '# Áp dụng công pháp điều chuẩn: khống chế độ sâu cây và phạt độ phức tạp',
      'xgb_reg = XGBClassifier(',
      '    n_estimators=300, max_depth=3, learning_rate=0.08,',
      '    min_child_weight=3, gamma=0.2, subsample=0.8, colsample_bytree=0.8,',
      '    reg_alpha=0.1, reg_lambda=1.0, random_state=42',
      ')',
      'xgb_reg.fit(X_train, y_train)',
      'tr_acc_reg = xgb_reg.score(X_train, y_train)',
      'te_acc_reg = xgb_reg.score(X_test, y_test)',
      'print(f"Train Acc: {tr_acc_reg:.4f} | Test Acc: {te_acc_reg:.4f}")',
      'print(f"Khoảng cách rút ngắn về: {tr_acc_reg - te_acc_reg:.4f}")'
    ],
    output: [
      'Train Acc: 0.9428 | Test Acc: 0.9333 (93.33%)',
      '✓ THÀNH CÔNG KHÓA TÂM MA: Khoảng cách Train-Test thu hẹp từ 0.1667 xuống 0.0095!',
      'Mô hình đạt khả năng khái quát hóa vượt trội.'
    ],
    executionTime: '0.9s',
    targetPose: { thumb: 0.85, index: 0.82, middle: 0.78, ring: 0.75, pinky: 0.72 },
    forceValue: 28.4,
    pressureValue: 175.0,
    metricsUpdate: BENCHMARK_MODELS.xgboost_regularized,
    curveData: {
      train: [0.86, 0.89, 0.91, 0.93, 0.94, 0.9428],
      val: [0.85, 0.88, 0.90, 0.92, 0.93, 0.9333],
      label: 'XGBoost Regularized'
    }
  },
  {
    id: 9,
    stageId: 'hyperparameter',
    title: 'Hyperparameter Tuning — Chọn Công Pháp (GridSearchCV 5-Fold)',
    code: [
      'from sklearn.model_selection import GridSearchCV, StratifiedKFold',
      '',
      'cv_strat = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)',
      'param_grid = {',
      '    "max_depth": [2, 3, 4],',
      '    "n_estimators": [200, 300],',
      '    "learning_rate": [0.05, 0.08, 0.12],',
      '    "reg_lambda": [0.5, 1.0, 2.0]',
      '}',
      'grid = GridSearchCV(XGBClassifier(random_state=42), param_grid, cv=cv_strat, scoring="f1", n_jobs=-1)',
      'grid.fit(X_train, y_train)',
      'print("Best Hyperparameters:", grid.best_params_)',
      'print(f"Best CV F1-Score: {grid.best_score_:.4f}")'
    ],
    output: [
      'Best Hyperparameters: {\'learning_rate\': 0.08, \'max_depth\': 3, \'n_estimators\': 300, \'reg_lambda\': 1.0}',
      'Best CV F1-Score: 0.9655',
      '⚠ Nguyên tắc Đạo-Ma: KHÔNG sử dụng tập Test để tuning tham số!'
    ],
    executionTime: '2.1s',
    targetPose: { thumb: 0.88, index: 0.85, middle: 0.82, ring: 0.79, pinky: 0.75 },
    forceValue: 30.5,
    pressureValue: 188.0
  },
  {
    id: 10,
    stageId: 'mlp',
    title: 'Multi-Layer Perceptron (MLP) — Mở Rộng Thần Thức Đối Chứng',
    code: [
      'from sklearn.neural_network import MLPClassifier',
      '',
      'pipe_mlp = make_pipeline(',
      '    StandardScaler(),',
      '    MLPClassifier(hidden_layer_sizes=(32, 16), activation="relu",',
      '                  alpha=1e-3, max_iter=1500, random_state=42)',
      ')',
      'pipe_mlp.fit(X_train, y_train)',
      'print(f"MLP Train Acc: {pipe_mlp.score(X_train, y_train):.4f}")',
      'print(f"MLP Test Acc: {pipe_mlp.score(X_test, y_test):.4f}")'
    ],
    output: [
      'MLP Train Acc: 0.9857 | MLP Test Acc: 0.9000',
      'Nhận xét: Dataset 100 mẫu có kích thước nhỏ, mạng Nơ-ron MLP dễ chớm overfit',
      'so với cây tăng cường gradient (Gradient Boosted Trees).'
    ],
    executionTime: '1.6s',
    targetPose: { thumb: 0.78, index: 0.75, middle: 0.72, ring: 0.70, pinky: 0.68 },
    forceValue: 25.2,
    pressureValue: 154.0,
    metricsUpdate: BENCHMARK_MODELS.mlp,
    curveData: {
      train: [0.85, 0.91, 0.95, 0.97, 0.985, 0.9857],
      val: [0.82, 0.86, 0.88, 0.89, 0.895, 0.9000],
      label: 'MLP 32-16'
    }
  },
  {
    id: 11,
    stageId: 'evaluation',
    title: 'Evaluation — Độ Kiếp Toàn Diện (Confusion Matrix & ROC-AUC)',
    code: [
      'from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score',
      '',
      'y_pred_reg = xgb_reg.predict(X_test)',
      'y_prob_reg = xgb_reg.predict_proba(X_test)[:, 1]',
      'print("--- MA TRẬN NHẦM LẪN (CONFUSION MATRIX) ---")',
      'print(confusion_matrix(y_test, y_pred_reg))',
      'print("\\n--- BÁO CÁO PHÂN LOẠI CHI TIẾT ---")',
      'print(classification_report(y_test, y_pred_reg, target_names=["Thất Bại", "Thành Công"]))',
      'print(f"ROC-AUC Điểm Phân Biệt: {roc_auc_score(y_test, y_prob_reg):.4f}")'
    ],
    output: [
      'Ma trận nhầm lẫn:',
      '  [[TN=2, FP=2],',
      '   [FN=0, TP=26]]',
      'Độ chính xác (Accuracy): 93.33%',
      'Độ nhạy lớp Thành Công (Recall): 100%',
      'ROC-AUC: 0.8571',
      'Ý nghĩa Y tế: Bàn tay robot giữ chắc 100% các vật thể cần giữ, không bỏ sót làm rơi vật nguy hiểm.'
    ],
    executionTime: '0.7s',
    targetPose: { thumb: 0.92, index: 0.88, middle: 0.85, ring: 0.82, pinky: 0.78 },
    forceValue: 33.0,
    pressureValue: 205.0,
    metricsUpdate: BENCHMARK_MODELS.xgboost_regularized
  },
  {
    id: 12,
    stageId: 'generalization',
    title: 'Generalization — GroupKFold Theo Subject (Vượt Qua Tâm Ma)',
    code: [
      'from sklearn.model_selection import LeaveOneGroupOut, cross_val_score',
      '',
      '# Kiểm tra tính khái quát trên người dùng hoàn toàn mới (Subject-independent CV)',
      'groups = df_grasp["subject_id"].values  # S01 -> S10',
      'logo = LeaveOneGroupOut()',
      'scores = cross_val_score(xgb_reg, X, y, groups=groups, cv=logo, scoring="accuracy")',
      'print("Accuracy theo từng Subject:", scores.round(3))',
      'print(f"Mean Subject-independent Accuracy: {scores.mean():.4f} ± {scores.std():.4f}")'
    ],
    output: [
      'Accuracy theo từng Subject: [0.90 0.90 1.00 0.80 1.00 0.90 0.90 0.90 1.00 0.90]',
      'Mean Subject-independent Accuracy: 0.9200 ± 0.0600',
      '✓ ĐẠT CẢNH GIỚI KHÁI QUÁT HÓA CAO NHẤT:',
      'Mô hình học được quy luật cơ học của bàn tay, KHÔNG bị bó hẹp vào hình dạng ngón của riêng một ai.'
    ],
    executionTime: '1.8s',
    targetPose: { thumb: 0.82, index: 0.80, middle: 0.78, ring: 0.75, pinky: 0.72 },
    forceValue: 27.5,
    pressureValue: 170.0
  },
  {
    id: 13,
    stageId: 'features',
    title: 'Feature Importance — Nhìn Thấu Căn Nguyên Trọng Số',
    code: [
      'imp = pd.Series(xgb_reg.feature_importances_, index=FEATURES).sort_values(ascending=False)',
      'for feat, val in imp.items():',
      '    bar = "█" * int(val * 40)',
      '    print(f"{feat:18s} : {val:.4f} | {bar}")',
      'print("\\nKết luận thiết kế phần cứng: Có thể tối ưu bớt cảm biến ngón út mà không giảm độ chính xác.")'
    ],
    output: [
      'pressure_kPa       : 0.2413 | █████████',
      'force_N            : 0.1987 | ███████',
      'contact_area_cm2   : 0.1622 | ██████',
      'thumb_angle_deg    : 0.1284 | █████',
      'index_angle_deg    : 0.1041 | ████',
      'middle_angle_deg   : 0.0755 | ███',
      'ring_angle_deg     : 0.0531 | ██',
      'pinky_angle_deg    : 0.0367 | █',
      '✓ Căn nguyên: Áp suất và tổng lực chiếm > 44% quyết định độ vững chắc.'
    ],
    executionTime: '0.6s',
    targetPose: { thumb: 0.2, index: 0.15, middle: 0.12, ring: 0.15, pinky: 0.2 },
    forceValue: 2.0,
    pressureValue: 10.0
  }
];

export const ColabNotebook: React.FC<ColabNotebookProps> = ({
  onStageChange,
  onPoseChange,
  onMetricsUpdate,
  onLogMessage,
  currentActiveStage
}) => {
  const [currentCellIndex, setCurrentCellIndex] = useState<number>(-1);
  const [running, setRunning] = useState<boolean>(false);
  const [completedCells, setCompletedCells] = useState<Set<number>>(new Set());
  const autoRunTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Execute a specific cell
  const executeCell = async (cellIndex: number) => {
    if (cellIndex < 0 || cellIndex >= COLAB_CELLS.length) return;
    const cell = COLAB_CELLS[cellIndex];
    setCurrentCellIndex(cellIndex);
    onStageChange(cell.stageId);

    // Update 3D hand pose if specified
    if (cell.targetPose && cell.forceValue !== undefined && cell.pressureValue !== undefined) {
      onPoseChange(cell.targetPose, cell.forceValue, cell.pressureValue);
    }

    // Update model metrics if this cell defines them
    if (cell.metricsUpdate) {
      onMetricsUpdate(cell.metricsUpdate, cell.stageId);
    }

    onLogMessage(`Chạy Cell [${cell.id}]: ${cell.title}`, 'info');

    // Mark completed
    setCompletedCells(prev => new Set(prev).add(cell.id));
  };

  // Run all cells sequentially
  const handleRunAll = () => {
    if (running) return;
    setRunning(true);
    setCompletedCells(new Set());
    let idx = 0;

    const runNext = () => {
      if (idx < COLAB_CELLS.length) {
        executeCell(idx);
        idx++;
        autoRunTimerRef.current = setTimeout(runNext, 1800);
      } else {
        setRunning(false);
        onLogMessage('Hoàn tất toàn bộ 13 Cell Pipeline Machine Learning!', 'success');
      }
    };

    runNext();
  };

  const handlePause = () => {
    if (autoRunTimerRef.current) {
      clearTimeout(autoRunTimerRef.current);
      autoRunTimerRef.current = null;
    }
    setRunning(false);
    onLogMessage('Đã tạm dừng quá trình huấn luyện Colab.', 'warn');
  };

  const handleReset = () => {
    handlePause();
    setCurrentCellIndex(-1);
    setCompletedCells(new Set());
    onStageChange('setup');
    onPoseChange({ thumb: 0.1, index: 0.1, middle: 0.1, ring: 0.1, pinky: 0.1 }, 0, 0);
    onMetricsUpdate(BENCHMARK_MODELS.baseline, 'baseline');
    onLogMessage('Hệ thống đã reset. Sẵn sàng huấn luyện lại từ đầu.', 'info');
  };

  const handleStepNext = () => {
    const nextIdx = currentCellIndex + 1;
    if (nextIdx < COLAB_CELLS.length) {
      executeCell(nextIdx);
    }
  };

  useEffect(() => {
    return () => {
      if (autoRunTimerRef.current) clearTimeout(autoRunTimerRef.current);
    };
  }, []);

  return (
    <div className="bg-[#080d1a] border border-[#2ee6c8]/25 rounded-xl flex flex-col h-full shadow-2xl overflow-hidden">
      {/* Colab Notebook Header Bar */}
      <div className="bg-[#0b1424] border-b border-[#2ee6c8]/20 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-[#2ee6c8]" />
            <span className="text-xs font-mono font-bold text-slate-200">
              Robotic_Hand_ML_Pipeline.ipynb
            </span>
            <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
              Python 3.10 · GPU Tesla T4
            </span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1.5">
          {!running ? (
            <button
              onClick={handleRunAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2ee6c8] hover:bg-[#25c7ad] text-black font-mono font-bold text-xs rounded transition-all shadow-md active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-black" /> Chạy Toàn Bộ
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-mono font-bold text-xs rounded transition-all"
            >
              <Pause className="w-3.5 h-3.5 fill-black" /> Tạm Dừng
            </button>
          )}

          <button
            onClick={handleStepNext}
            disabled={running || currentCellIndex >= COLAB_CELLS.length - 1}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#122035] hover:bg-[#1b2e4b] disabled:opacity-40 text-slate-200 font-mono text-xs rounded border border-white/10"
          >
            <ChevronRight className="w-3.5 h-3.5" /> Chạy 1 Cell
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 bg-[#122035] hover:bg-[#1b2e4b] text-slate-300 hover:text-white rounded border border-white/10"
            title="Reset"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Notebook Cells Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[720px] scrollbar-thin scrollbar-thumb-[#2ee6c8]/30">
        {COLAB_CELLS.map((cell, idx) => {
          const isActive = currentCellIndex === idx;
          const isDone = completedCells.has(cell.id);

          return (
            <div
              key={cell.id}
              className={`rounded-lg border transition-all duration-200 overflow-hidden ${
                isActive
                  ? 'border-[#2ee6c8] bg-[#0c1626] shadow-lg shadow-[#2ee6c8]/10 ring-1 ring-[#2ee6c8]/40'
                  : isDone
                  ? 'border-emerald-500/30 bg-[#070d17]'
                  : 'border-white/5 bg-[#060a13]'
              }`}
            >
              {/* Cell Header */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#091222]/80 border-b border-white/5 text-[11px] font-mono">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => executeCell(idx)}
                    className="flex items-center gap-1 text-[#2ee6c8] hover:text-white transition-colors"
                  >
                    <span className="font-bold">[{isDone ? cell.id : ' '}]</span>
                    <Play className="w-2.5 h-2.5 fill-current opacity-70" />
                  </button>
                  <span className="font-semibold text-slate-300">{cell.title}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  {cell.executionTime && <span>{cell.executionTime}</span>}
                  {isDone && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                </div>
              </div>

              {/* Code Editor Body */}
              <div className="p-3 font-mono text-[11.5px] leading-relaxed overflow-x-auto text-slate-300 bg-[#050812]">
                {cell.code.map((line, lIdx) => {
                  let lineClass = 'text-slate-300';
                  if (line.startsWith('#')) lineClass = 'text-slate-500 italic';
                  else if (line.startsWith('!pip') || line.startsWith('from') || line.startsWith('import'))
                    lineClass = 'text-[#a06bff] font-medium';
                  else if (line.includes('print(')) lineClass = 'text-[#38bdf8]';
                  else if (line.includes('=')) lineClass = 'text-slate-200';

                  return (
                    <div key={lIdx} className="flex">
                      <span className="w-6 text-slate-600 select-none text-right pr-3 text-[10px]">
                        {lIdx + 1}
                      </span>
                      <span className={lineClass}>{line}</span>
                    </div>
                  );
                })}
              </div>

              {/* Cell Output (Terminal style) */}
              {(isDone || isActive) && (
                <div className="border-t border-white/10 bg-[#03060c] p-3 font-mono text-[11px] text-emerald-400/90 space-y-1">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Terminal className="w-3 h-3 text-[#2ee6c8]" /> Output Stream
                  </div>
                  {cell.output.map((outLine, oIdx) => (
                    <div
                      key={oIdx}
                      className={
                        outLine.includes('⚠') || outLine.includes('CẢNH BÁO')
                          ? 'text-amber-400 font-semibold'
                          : outLine.includes('✓') || outLine.includes('THÀNH CÔNG')
                          ? 'text-emerald-400 font-semibold'
                          : outLine.includes('Error')
                          ? 'text-rose-400'
                          : 'text-slate-300'
                      }
                    >
                      {outLine}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
