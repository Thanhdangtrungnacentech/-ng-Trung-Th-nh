import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { JointAngles, RenderMode, GraspObjectType, HologramConfig, ManipulationAction, ManipulationStatus } from '../types';
import {
  Eye,
  RotateCw,
  Sliders,
  Sparkles,
  Crosshair,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Fingerprint,
  Scan,
  MoveVertical,
  RotateCcw,
  Activity,
  Gauge,
  Cpu,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Compass,
  ArrowUpRight,
  Play,
  Pause,
  Zap,
  Lock,
  ArrowDown
} from 'lucide-react';

interface Hand3DCanvasProps {
  jointAngles: JointAngles;
  forceN: number;
  pressureKPa: number;
  renderMode?: RenderMode;
  onJointsChange?: (newAngles: JointAngles) => void;
  interactiveManualControl?: boolean;
  currentGraspObject?: GraspObjectType;
  onGraspObjectChange?: (obj: GraspObjectType) => void;
  onForceChange?: (force: number) => void;
}

interface FingerMeshGroup {
  mcpJoint: THREE.Group;
  pipJoint: THREE.Group;
  dipJoint: THREE.Group;
  tipSensor: THREE.Mesh;
  tipPulp?: THREE.Mesh;
  phalanxMeshes: THREE.Mesh[];
  skinMeshes: THREE.Mesh[];
}

export const Hand3DCanvas: React.FC<Hand3DCanvasProps> = ({
  jointAngles,
  forceN,
  pressureKPa,
  renderMode = 'cyberpunk',
  onJointsChange,
  interactiveManualControl = false,
  currentGraspObject = 'cylinder',
  onGraspObjectChange,
  onForceChange
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const handRootRef = useRef<THREE.Group | null>(null);
  const fingersRef = useRef<Record<string, FingerMeshGroup>>({});
  const forceArrowsRef = useRef<Record<string, THREE.ArrowHelper>>({});
  const objectGroupRef = useRef<THREE.Group | null>(null);
  const wristRef = useRef<THREE.Group | null>(null);
  const palmSensorRef = useRef<THREE.Mesh[]>([]);
  const coreLightRef = useRef<THREE.PointLight | null>(null);
  const hologramMeshesRef = useRef<THREE.Mesh[]>([]);
  const scanRingsRef = useRef<THREE.Mesh[]>([]);

  // 3D Spatial Kinetic Interpolation & Laser Height Measurement Column Refs
  const targetHandXRef = useRef<number>(0.0);
  const targetHandYRef = useRef<number>(-0.4);
  const targetHandZRef = useRef<number>(0.0);
  const targetHandRotXRef = useRef<number>(0.0);
  const targetHandRotYRef = useRef<number>(0.0);
  const targetHandRotZRef = useRef<number>(0.0);
  const targetObjYRef = useRef<number>(0.0);
  const targetObjRotYRef = useRef<number>(0.0);
  const targetWristRotZRef = useRef<number>(0.0);
  const targetObjScaleRef = useRef<THREE.Vector3>(new THREE.Vector3(1, 1, 1));
  const laserCarriageRef = useRef<THREE.Group | null>(null);
  const laserBeamRef = useRef<THREE.Line | null>(null);
  const trajectoryLineRef = useRef<THREE.Line | null>(null);
  const contactPatchesRef = useRef<{
    group: THREE.Group;
    ring: THREE.Mesh;
    disc: THREE.Mesh;
    arrow: THREE.ArrowHelper;
    cone: THREE.Mesh;
    fingerId: string;
  }[]>([]);

  const [autoRotate, setAutoRotate] = useState(false);
  const [showSliders, setShowSliders] = useState(false);
  const [showForceVectors, setShowForceVectors] = useState(true);
  const [graspObject, setGraspObject] = useState<GraspObjectType>(currentGraspObject);
  const [currentMode, setCurrentMode] = useState<RenderMode>(renderMode);
  const [camView, setCamView] = useState<'wide' | 'iso' | 'front' | 'side' | 'top'>('wide');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Dynamic Reach-and-Grasp Timeline & Auto-Play Loop State
  const [graspTimelinePct, setGraspTimelinePct] = useState<number>(0);
  const [isAutoGraspPlaying, setIsAutoGraspPlaying] = useState<boolean>(false);

  // Biomimetic Holographic Skin Settings
  const [hologramConfig, setHologramConfig] = useState<HologramConfig>({
    enabled: true,
    opacity: 0.38,
    color: '#2ee6c8',
    showWireframe: false,
    showScanRings: true,
    showAnatomicalPads: true
  });

  // Dynamic Object Manipulation Actions
  const [manipulation, setManipulation] = useState<ManipulationStatus>({
    action: 'idle',
    progress: 0,
    liftHeightCm: 0,
    rotationAngleDeg: 0,
    complianceDeformationMm: 0,
    tactileContactStable: true
  });

  // Sync mode if parent changes
  useEffect(() => {
    setCurrentMode(renderMode);
  }, [renderMode]);

  useEffect(() => {
    if (currentGraspObject) {
      setGraspObject(currentGraspObject);
    }
  }, [currentGraspObject]);

  // Helper to define 3D tactile contact coordinates and surface normals on active object
  const getObjectContactPoints = (objType: GraspObjectType) => {
    switch (objType) {
      case 'cylinder':
        return [
          { id: 'thumb', pos: new THREE.Vector3(-0.26, 0.12, 0.10), normal: new THREE.Vector3(-0.85, 0, 0.52).normalize() },
          { id: 'index', pos: new THREE.Vector3(-0.15, 0.16, 0.26), normal: new THREE.Vector3(-0.50, 0, 0.86).normalize() },
          { id: 'middle', pos: new THREE.Vector3(0.03, 0.06, 0.30), normal: new THREE.Vector3(0.10, 0, 0.99).normalize() },
          { id: 'ring', pos: new THREE.Vector3(0.18, -0.04, 0.24), normal: new THREE.Vector3(0.60, 0, 0.80).normalize() },
          { id: 'pinky', pos: new THREE.Vector3(0.25, -0.14, 0.16), normal: new THREE.Vector3(0.84, 0, 0.54).normalize() }
        ];
      case 'sphere':
        return [
          { id: 'thumb', pos: new THREE.Vector3(-0.26, -0.04, 0.26), normal: new THREE.Vector3(-0.68, -0.10, 0.68).normalize() },
          { id: 'index', pos: new THREE.Vector3(-0.15, 0.16, 0.31), normal: new THREE.Vector3(-0.39, 0.42, 0.81).normalize() },
          { id: 'middle', pos: new THREE.Vector3(0.02, 0.18, 0.33), normal: new THREE.Vector3(0.05, 0.47, 0.87).normalize() },
          { id: 'ring', pos: new THREE.Vector3(0.18, 0.12, 0.30), normal: new THREE.Vector3(0.47, 0.31, 0.79).normalize() },
          { id: 'pinky', pos: new THREE.Vector3(0.26, -0.04, 0.26), normal: new THREE.Vector3(0.68, -0.10, 0.68).normalize() }
        ];
      case 'key':
        return [
          { id: 'thumb', pos: new THREE.Vector3(-0.035, 0.04, 0.0), normal: new THREE.Vector3(-1.0, 0, 0) },
          { id: 'index', pos: new THREE.Vector3(0.035, 0.04, 0.0), normal: new THREE.Vector3(1.0, 0, 0) },
          { id: 'middle', pos: new THREE.Vector3(0.0, -0.35, -0.15), normal: new THREE.Vector3(0, -1, 0) },
          { id: 'ring', pos: new THREE.Vector3(0.0, -0.35, -0.15), normal: new THREE.Vector3(0, -1, 0) },
          { id: 'pinky', pos: new THREE.Vector3(0.0, -0.35, -0.15), normal: new THREE.Vector3(0, -1, 0) }
        ];
      case 'box':
        return [
          { id: 'thumb', pos: new THREE.Vector3(-0.285, 0.06, 0.0), normal: new THREE.Vector3(-1.0, 0, 0) },
          { id: 'index', pos: new THREE.Vector3(-0.16, 0.14, 0.225), normal: new THREE.Vector3(0, 0, 1.0) },
          { id: 'middle', pos: new THREE.Vector3(0.02, 0.06, 0.225), normal: new THREE.Vector3(0, 0, 1.0) },
          { id: 'ring', pos: new THREE.Vector3(0.15, -0.02, 0.225), normal: new THREE.Vector3(0, 0, 1.0) },
          { id: 'pinky', pos: new THREE.Vector3(0.22, -0.10, 0.225), normal: new THREE.Vector3(0, 0, 1.0) }
        ];
      default:
        return [];
    }
  };

  // Helper to construct 3D Grasp Objects
  const populateObjectGroup = useCallback((group: THREE.Group, objType: GraspObjectType, mode: RenderMode) => {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
    }
    contactPatchesRef.current = [];

    if (objType === 'none') return;

    const isWire = mode === 'wireframe';
    let targetSubGroup: THREE.Group | null = null;

    if (objType === 'cylinder') {
      // Cylindrical Laboratory Titanium / Carbon-Fiber Canister
      const botGroup = new THREE.Group();
      botGroup.position.set(0.0, 0.22, 0.25);

      const cylGeo = new THREE.CylinderGeometry(0.30, 0.30, 1.25, 32);
      const cylMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.85,
        roughness: 0.22,
        wireframe: isWire
      });
      const cylMesh = new THREE.Mesh(cylGeo, cylMat);
      cylMesh.castShadow = true;
      cylMesh.receiveShadow = true;
      botGroup.add(cylMesh);

      // Glowing Capacitive Center Sensor Ring
      const bandGeo = new THREE.CylinderGeometry(0.305, 0.305, 0.22, 32);
      const bandMat = new THREE.MeshStandardMaterial({
        color: 0x2ee6c8,
        emissive: 0x2ee6c8,
        emissiveIntensity: 1.2,
        wireframe: isWire
      });
      const bandMesh = new THREE.Mesh(bandGeo, bandMat);
      bandMesh.position.y = 0.04;
      botGroup.add(bandMesh);

      // Threaded Pressure Seal Cap
      const capGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.16, 24);
      const capMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.3, metalness: 0.9 });
      const capMesh = new THREE.Mesh(capGeo, capMat);
      capMesh.position.y = 0.70;
      botGroup.add(capMesh);

      group.add(botGroup);
      targetSubGroup = botGroup;
    } else if (objType === 'sphere') {
      // Rehabilitation Spherical Ball
      const sphereGroup = new THREE.Group();
      sphereGroup.position.set(0.0, 0.22, 0.25);

      const sphGeo = new THREE.SphereGeometry(0.38, 32, 32);
      const sphMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        metalness: 0.55,
        roughness: 0.32,
        wireframe: isWire
      });
      const sphMesh = new THREE.Mesh(sphGeo, sphMat);
      sphMesh.castShadow = true;
      sphereGroup.add(sphMesh);

      // Medical sensor cross-rings
      const ring1 = new THREE.Mesh(
        new THREE.TorusGeometry(0.385, 0.016, 16, 48),
        new THREE.MeshStandardMaterial({ color: 0x2ee6c8, emissive: 0x2ee6c8, emissiveIntensity: 0.9 })
      );
      ring1.rotation.x = Math.PI / 2;
      sphereGroup.add(ring1);

      const ring2 = new THREE.Mesh(
        new THREE.TorusGeometry(0.385, 0.016, 16, 48),
        new THREE.MeshStandardMaterial({ color: 0xa06bff, emissive: 0xa06bff, emissiveIntensity: 0.9 })
      );
      sphereGroup.add(ring2);

      group.add(sphereGroup);
      targetSubGroup = sphereGroup;
    } else if (objType === 'key') {
      // Precision Key / Medical Actuator Peg
      const keyGroup = new THREE.Group();
      keyGroup.position.set(-0.15, 0.22, 0.25);

      // Key head ring
      const headGeo = new THREE.TorusGeometry(0.16, 0.035, 16, 32);
      const keyMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.95,
        roughness: 0.15,
        wireframe: isWire
      });
      const headMesh = new THREE.Mesh(headGeo, keyMat);
      keyGroup.add(headMesh);

      // Key shaft
      const shaftGeo = new THREE.BoxGeometry(0.06, 0.65, 0.04);
      const shaftMesh = new THREE.Mesh(shaftGeo, keyMat);
      shaftMesh.position.y = -0.36;
      keyGroup.add(shaftMesh);

      // Key teeth
      const teethGeo = new THREE.BoxGeometry(0.12, 0.20, 0.04);
      const teethMesh = new THREE.Mesh(teethGeo, keyMat);
      teethMesh.position.set(0.06, -0.48, 0);
      keyGroup.add(teethMesh);

      group.add(keyGroup);
      targetSubGroup = keyGroup;
    } else if (objType === 'box') {
      // Medical Box / Medication Container
      const boxGroup = new THREE.Group();
      boxGroup.position.set(0.0, 0.22, 0.25);

      const boxGeo = new THREE.BoxGeometry(0.56, 0.85, 0.44);
      const boxMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.35,
        roughness: 0.4,
        wireframe: isWire
      });
      const boxMesh = new THREE.Mesh(boxGeo, boxMat);
      boxMesh.castShadow = true;
      boxGroup.add(boxMesh);

      // Medical Cross Decal
      const vCross = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.30, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.9 })
      );
      vCross.position.set(0, 0.04, 0.225);
      boxGroup.add(vCross);

      const hCross = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.07, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.9 })
      );
      hCross.position.set(0, 0.04, 0.225);
      boxGroup.add(hCross);

      group.add(boxGroup);
      targetSubGroup = boxGroup;
    }

    // Attach 5 Dynamic Tactile Contact Patches on the Object
    if (targetSubGroup) {
      const contactDefs = getObjectContactPoints(objType);
      const newPatches: any[] = [];

      contactDefs.forEach(cDef => {
        const patchGroup = new THREE.Group();
        patchGroup.position.copy(cDef.pos);
        patchGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), cDef.normal);

        // Tactile Contact Ring
        const ringGeo = new THREE.RingGeometry(0.035, 0.065, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x2ee6c8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        patchGroup.add(ringMesh);

        // Tactile Pressure Core Disc
        const discGeo = new THREE.CircleGeometry(0.032, 20);
        const discMat = new THREE.MeshBasicMaterial({
          color: 0x2ee6c8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.75
        });
        const discMesh = new THREE.Mesh(discGeo, discMat);
        patchGroup.add(discMesh);

        // Normal Force Vector Arrow Helper (shooting out along normal)
        const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0.01), 0.28, 0x2ee6c8, 0.07, 0.04);
        patchGroup.add(arrow);

        // Coulomb Friction Cone Wireframe (mu = 0.45, angle ~24 deg)
        const coneGeo = new THREE.ConeGeometry(0.06, 0.13, 16);
        coneGeo.rotateX(Math.PI / 2);
        const coneMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          wireframe: true,
          transparent: true,
          opacity: 0.28
        });
        const coneMesh = new THREE.Mesh(coneGeo, coneMat);
        coneMesh.position.z = 0.065;
        patchGroup.add(coneMesh);

        patchGroup.visible = false;
        targetSubGroup!.add(patchGroup);

        newPatches.push({
          group: patchGroup,
          ring: ringMesh,
          disc: discMesh,
          arrow,
          cone: coneMesh,
          fingerId: cDef.id
        });
      });

      contactPatchesRef.current = newPatches;
    }
  }, []);

  // Initialize Scene, Materials, 3D Hand, and Biomimetic Holographic Skin
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Reset references
    hologramMeshesRef.current = [];
    scanRingsRef.current = [];

    // 1. Three.js Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040711);
    scene.fog = new THREE.FogExp2(0x040711, 0.032);
    sceneRef.current = scene;

    // 2. Camera Setup (Wide Field of View & Far Perspective)
    const camera = new THREE.PerspectiveCamera(
      48,
      container.clientWidth / container.clientHeight,
      0.1,
      120
    );
    // Default to Far Wide Overview so the entire apparatus, arm base, hand, and object are clearly framed
    camera.position.set(4.4, 3.0, 5.8);
    cameraRef.current = camera;

    // 3. WebGL Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls with Expanded Distance Range
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxDistance = 18.0; // Allow user to zoom far out to see full testbed
    controls.minDistance = 0.8;  // Allow close inspection of tactile sensors
    controls.target.set(0, -0.1, 0);
    controlsRef.current = controls;

    // 5. Lighting Scheme
    const ambientLight = new THREE.AmbientLight(0x0f1c30, 2.0);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x6ee7b7, 2.8);
    keyLight.position.set(4, 5, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xa06bff, 3.0);
    rimLight.position.set(-4, 3, -4);
    scene.add(rimLight);

    const blueFill = new THREE.DirectionalLight(0x0284c7, 1.8);
    blueFill.position.set(0, -3, 3);
    scene.add(blueFill);

    const coreLight = new THREE.PointLight(0x2ee6c8, 3.5, 3.5);
    coreLight.position.set(0, 0.1, 0.35);
    scene.add(coreLight);
    coreLightRef.current = coreLight;

    // 6. High-Tech Robotic Workstation Lab Table & Coordinate Stage
    const tableGeo = new THREE.BoxGeometry(11, 0.22, 11);
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x070c18,
      metalness: 0.85,
      roughness: 0.3
    });
    const labTable = new THREE.Mesh(tableGeo, tableMat);
    labTable.position.set(0, -1.95, 0);
    labTable.receiveShadow = true;
    scene.add(labTable);

    // Robotic Arm Heavy Mounting Base Flange
    const pedestalGeo = new THREE.CylinderGeometry(1.65, 1.95, 0.28, 48);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x0b1426,
      metalness: 0.9,
      roughness: 0.25
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.set(0, -1.72, 0);
    pedestal.receiveShadow = true;
    scene.add(pedestal);

    // Dual Neon Status Rings around base
    const ringGeo = new THREE.RingGeometry(1.6, 1.68, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x2ee6c8, side: THREE.DoubleSide });
    const edgeRing = new THREE.Mesh(ringGeo, ringMat);
    edgeRing.rotation.x = Math.PI / 2;
    edgeRing.position.set(0, -1.57, 0);
    scene.add(edgeRing);

    const innerRingGeo = new THREE.RingGeometry(1.1, 1.15, 48);
    const innerRingMat = new THREE.MeshBasicMaterial({ color: 0xa06bff, side: THREE.DoubleSide });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.set(0, -1.56, 0);
    scene.add(innerRing);

    // Precision Optical Grid
    const gridHelper = new THREE.GridHelper(12, 36, 0x2ee6c8, 0x15283c);
    gridHelper.position.y = -1.83;
    scene.add(gridHelper);

    // Precision Optical Specimen Stage Pedestal (Bệ Đặt Mẫu Thí Nghiệm Chuẩn)
    const stagePedestalGroup = new THREE.Group();
    stagePedestalGroup.position.set(0.0, -1.14, 0.25);

    const pedGeo = new THREE.CylinderGeometry(0.48, 0.54, 1.45, 32);
    const pedMat = new THREE.MeshStandardMaterial({
      color: 0x0a101d,
      metalness: 0.85,
      roughness: 0.25
    });
    const pedMesh = new THREE.Mesh(pedGeo, pedMat);
    pedMesh.receiveShadow = true;
    stagePedestalGroup.add(pedMesh);

    // Collar bevel rim
    const collarGeo = new THREE.CylinderGeometry(0.50, 0.48, 0.12, 32);
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.9,
      roughness: 0.2
    });
    const collarMesh = new THREE.Mesh(collarGeo, collarMat);
    collarMesh.position.y = 0.72;
    stagePedestalGroup.add(collarMesh);

    // Neon Rim Ring
    const neonRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.49, 0.012, 16, 48),
      new THREE.MeshStandardMaterial({ color: 0x2ee6c8, emissive: 0x2ee6c8, emissiveIntensity: 1.2 })
    );
    neonRim.rotation.x = Math.PI / 2;
    neonRim.position.y = 0.78;
    stagePedestalGroup.add(neonRim);

    scene.add(stagePedestalGroup);

    // Target Object Placement & Landing Zone (Vùng Đặt Vật Thể Chuẩn)
    const targetRing1 = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.58, 32),
      new THREE.MeshBasicMaterial({ color: 0x2ee6c8, side: THREE.DoubleSide, transparent: true, opacity: 0.65 })
    );
    targetRing1.rotation.x = Math.PI / 2;
    targetRing1.position.set(0.0, -1.82, 0.25);
    scene.add(targetRing1);

    const targetRing2 = new THREE.Mesh(
      new THREE.RingGeometry(0.32, 0.35, 32),
      new THREE.MeshBasicMaterial({ color: 0xa06bff, side: THREE.DoubleSide, transparent: true, opacity: 0.65 })
    );
    targetRing2.rotation.x = Math.PI / 2;
    targetRing2.position.set(0.0, -1.815, 0.25);
    scene.add(targetRing2);

    // Target crosshair alignment marks
    const crossX = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.005, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x2ee6c8, transparent: true, opacity: 0.5 })
    );
    crossX.position.set(0.0, -1.81, 0.25);
    scene.add(crossX);

    const crossZ = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.005, 1.3),
      new THREE.MeshBasicMaterial({ color: 0x2ee6c8, transparent: true, opacity: 0.5 })
    );
    crossZ.position.set(0.0, -1.81, 0.25);
    scene.add(crossZ);

    // Optical Laser Height Gauge Column (Cột Thước Đo Độ Cao Laser 0cm - 30cm)
    const pillarGroup = new THREE.Group();
    pillarGroup.position.set(2.0, 0, 0.35);

    const railGeo = new THREE.CylinderGeometry(0.035, 0.035, 3.2, 16);
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.2
    });
    const railMesh = new THREE.Mesh(railGeo, railMat);
    railMesh.position.y = -0.2;
    pillarGroup.add(railMesh);

    const footGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.1, 24);
    const footMesh = new THREE.Mesh(footGeo, railMat);
    footMesh.position.y = -1.8;
    pillarGroup.add(footMesh);

    // Height tick levels (0cm to 30cm)
    const tickLevels = [
      { cm: 0, y: -0.42, color: 0x2ee6c8 },
      { cm: 5, y: -0.15, color: 0x64748b },
      { cm: 10, y: 0.12, color: 0x38bdf8 },
      { cm: 15, y: 0.38, color: 0xa06bff },
      { cm: 20, y: 0.65, color: 0x64748b },
      { cm: 25, y: 0.92, color: 0x38bdf8 },
      { cm: 30, y: 1.18, color: 0xf59e0b }
    ];

    tickLevels.forEach(t => {
      const tickGeo = new THREE.BoxGeometry(0.16, 0.015, 0.015);
      const tickMat = new THREE.MeshBasicMaterial({ color: t.color });
      const tickMesh = new THREE.Mesh(tickGeo, tickMat);
      tickMesh.position.set(-0.06, t.y, 0);
      pillarGroup.add(tickMesh);

      const beadGeo = new THREE.SphereGeometry(0.025, 8, 8);
      const beadMat = new THREE.MeshBasicMaterial({ color: t.color });
      const bead = new THREE.Mesh(beadGeo, beadMat);
      bead.position.set(-0.16, t.y, 0);
      pillarGroup.add(bead);
    });

    // Dynamic Sliding Laser Carriage on Pillar
    const carriageGroup = new THREE.Group();
    const carriageGeo = new THREE.BoxGeometry(0.12, 0.08, 0.1);
    const carriageMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.2
    });
    const carriageMesh = new THREE.Mesh(carriageGeo, carriageMat);
    carriageGroup.add(carriageMesh);

    const nozzleGeo = new THREE.CylinderGeometry(0.018, 0.022, 0.07, 12);
    const nozzleMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
    nozzle.rotation.z = Math.PI / 2;
    nozzle.position.x = -0.07;
    carriageGroup.add(nozzle);

    carriageGroup.position.set(0, -0.42, 0);
    pillarGroup.add(carriageGroup);
    laserCarriageRef.current = carriageGroup;

    scene.add(pillarGroup);

    // Dynamic Horizontal Laser Beam tracking object height
    const laserPoints = [
      new THREE.Vector3(2.0, -0.42, 0.35),
      new THREE.Vector3(0.08, -0.42, 0.28)
    ];
    const laserGeo = new THREE.BufferGeometry().setFromPoints(laserPoints);
    const laserMat = new THREE.LineBasicMaterial({
      color: 0xff2a5f,
      linewidth: 2,
      transparent: true,
      opacity: 0.85
    });
    const laserLine = new THREE.Line(laserGeo, laserMat);
    scene.add(laserLine);
    laserBeamRef.current = laserLine;

    // 3D Motion Trajectory Arc (when lifting / manipulating)
    const trajectoryCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0.08, -0.42, 0.28),
      new THREE.Vector3(0.32, 0.12, 0.42),
      new THREE.Vector3(0.08, 0.38, 0.28)
    );
    const trajectoryPoints = trajectoryCurve.getPoints(24);
    const trajectoryGeo = new THREE.BufferGeometry().setFromPoints(trajectoryPoints);
    const trajectoryMat = new THREE.LineDashedMaterial({
      color: 0xa06bff,
      dashSize: 0.08,
      gapSize: 0.04,
      transparent: true,
      opacity: 0.75
    });
    const trajectoryLine = new THREE.Line(trajectoryGeo, trajectoryMat);
    trajectoryLine.computeLineDistances();
    trajectoryLine.visible = false;
    scene.add(trajectoryLine);
    trajectoryLineRef.current = trajectoryLine;

    // 7. Assemble Complete Robotic Hand Root
    const handRoot = new THREE.Group();
    handRoot.position.set(0, -0.4, 0);
    scene.add(handRoot);
    handRootRef.current = handRoot;

    // 7b. 3D Grasp Target Object Group
    const objGroup = new THREE.Group();
    scene.add(objGroup);
    objectGroupRef.current = objGroup;
    populateObjectGroup(objGroup, graspObject, currentMode);

    // Materials Palette (Metallic Endoskeleton + Biomimetic Holographic Skin)
    const isWire = currentMode === 'wireframe';
    const isHeatmap = currentMode === 'sensor_heatmap';
    const holoColorNum = parseInt(hologramConfig.color.replace('#', '0x'), 16) || 0x2ee6c8;

    const mats = {
      metalChassis: new THREE.MeshStandardMaterial({
        color: isHeatmap ? 0x122238 : currentMode === 'cyberpunk' ? 0x141e2e : 0x243447,
        metalness: isHeatmap ? 0.4 : 0.88,
        roughness: isHeatmap ? 0.3 : 0.28,
        wireframe: isWire,
        transparent: isHeatmap,
        opacity: isHeatmap ? 0.75 : 1.0
      }),
      jointSteel: new THREE.MeshStandardMaterial({
        color: 0x3d4b60,
        metalness: 0.95,
        roughness: 0.18,
        wireframe: isWire
      }),
      carbonFiber: new THREE.MeshStandardMaterial({
        color: 0x0a0f18,
        metalness: 0.35,
        roughness: 0.65,
        wireframe: isWire
      }),
      goldJoint: new THREE.MeshStandardMaterial({
        color: 0xffb703,
        metalness: 0.9,
        roughness: 0.25,
        wireframe: isWire
      }),
      ledGlow: new THREE.MeshStandardMaterial({
        color: 0x2ee6c8,
        emissive: 0x2ee6c8,
        emissiveIntensity: isWire ? 0.2 : 1.8,
        wireframe: isWire
      }),
      sensorPad: new THREE.MeshStandardMaterial({
        color: 0x2ee6c8,
        emissive: 0x2ee6c8,
        emissiveIntensity: 0.8,
        roughness: 0.2,
        metalness: 0.5
      }),
      // Biomimetic Holographic Translucent Skin Material
      hologramSkin: new THREE.MeshStandardMaterial({
        color: holoColorNum,
        emissive: holoColorNum,
        emissiveIntensity: 0.55,
        roughness: 0.12,
        metalness: 0.1,
        transparent: true,
        opacity: hologramConfig.enabled ? hologramConfig.opacity : 0.0,
        depthWrite: false,
        wireframe: hologramConfig.showWireframe
      }),
      hologramScanRing: new THREE.MeshBasicMaterial({
        color: holoColorNum,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide
      })
    };

    // A. Forearm Mount
    const forearmGroup = new THREE.Group();
    forearmGroup.position.set(0, -1.3, 0);
    handRoot.add(forearmGroup);

    const forearmGeo = new THREE.CylinderGeometry(0.48, 0.54, 0.9, 20);
    const forearmMesh = new THREE.Mesh(forearmGeo, mats.metalChassis);
    forearmMesh.castShadow = true;
    forearmMesh.receiveShadow = true;
    forearmGroup.add(forearmMesh);

    // B. Wrist Dual-Axis Servo Gimbal
    const wrist = new THREE.Group();
    wrist.position.set(0, -0.65, 0);
    handRoot.add(wrist);
    wristRef.current = wrist;

    const wristServoGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 24);
    wristServoGeo.rotateX(Math.PI / 2);
    const wristServoMesh = new THREE.Mesh(wristServoGeo, mats.jointSteel);
    wrist.add(wristServoMesh);

    // C. Palm Chassis (Endoskeleton) & Biomimetic Flesh Envelop (Hologram)
    const palm = new THREE.Group();
    palm.position.set(0, 0, 0);
    wrist.add(palm);

    // 1. Palm Metallic Skeleton Chassis
    const palmShape = new THREE.Shape();
    palmShape.moveTo(-0.62, -0.45);
    palmShape.lineTo(0.62, -0.45);
    palmShape.lineTo(0.72, 0.48);
    palmShape.lineTo(-0.72, 0.48);
    palmShape.closePath();

    const extrudeSettings = {
      depth: 0.28,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.05,
      bevelThickness: 0.04
    };
    const palmGeo = new THREE.ExtrudeGeometry(palmShape, extrudeSettings);
    palmGeo.center();
    const palmMesh = new THREE.Mesh(palmGeo, mats.metalChassis);
    palmMesh.castShadow = true;
    palmMesh.receiveShadow = true;
    palm.add(palmMesh);

    // 2. Biomimetic Human Palmar Flesh Hologram (Lớp Da Hologram Bàn Tay Người)
    const palmHoloShape = new THREE.Shape();
    palmHoloShape.moveTo(-0.74, -0.52);
    palmHoloShape.lineTo(0.74, -0.52);
    palmHoloShape.lineTo(0.84, 0.54);
    palmHoloShape.lineTo(-0.84, 0.54);
    palmHoloShape.closePath();

    const palmHoloGeo = new THREE.ExtrudeGeometry(palmHoloShape, {
      depth: 0.42,
      bevelEnabled: true,
      bevelSegments: 6,
      bevelSize: 0.08,
      bevelThickness: 0.08
    });
    palmHoloGeo.center();
    const palmHoloMesh = new THREE.Mesh(palmHoloGeo, mats.hologramSkin.clone());
    palm.add(palmHoloMesh);
    hologramMeshesRef.current.push(palmHoloMesh);

    // Anatomical Thenar Eminence (Mô Cơ Cái Mềm Bàn Tay Người)
    const thenarGeo = new THREE.SphereGeometry(0.36, 20, 20);
    thenarGeo.scale(1.25, 0.85, 0.72);
    const thenarMesh = new THREE.Mesh(thenarGeo, mats.hologramSkin.clone());
    thenarMesh.position.set(-0.44, -0.16, 0.16);
    palm.add(thenarMesh);
    hologramMeshesRef.current.push(thenarMesh);

    // Anatomical Hypothenar Eminence (Mô Cơ Út Cạnh Bàn Tay)
    const hypoGeo = new THREE.SphereGeometry(0.30, 20, 20);
    hypoGeo.scale(0.85, 1.25, 0.68);
    const hypoMesh = new THREE.Mesh(hypoGeo, mats.hologramSkin.clone());
    hypoMesh.position.set(0.48, -0.12, 0.14);
    palm.add(hypoMesh);
    hologramMeshesRef.current.push(hypoMesh);

    // Palm Central Core ring
    const coreRingGeo = new THREE.TorusGeometry(0.24, 0.035, 16, 32);
    const coreRingMesh = new THREE.Mesh(coreRingGeo, mats.ledGlow);
    coreRingMesh.position.set(0, 0, 0.17);
    palm.add(coreRingMesh);

    // Palm Tactile Sensor Nodes (4 FSR pressure pads)
    const sensorGeo = new THREE.BoxGeometry(0.18, 0.14, 0.04);
    const palmSensors: THREE.Mesh[] = [];
    const sensorCoords = [
      [-0.32, 0.28, 0.18],
      [0.32, 0.28, 0.18],
      [-0.30, -0.22, 0.18],
      [0.28, -0.22, 0.18]
    ];
    sensorCoords.forEach(pos => {
      const pad = new THREE.Mesh(sensorGeo, mats.sensorPad.clone());
      pad.position.set(pos[0], pos[1], pos[2]);
      palm.add(pad);
      palmSensors.push(pad);
    });
    palmSensorRef.current = palmSensors;

    // Scanning Holographic Laser Rings (2 Hiệu Ứng Vòng Quét Laser)
    const scanRingGeo = new THREE.RingGeometry(0.78, 0.84, 32);
    const scanRing1 = new THREE.Mesh(scanRingGeo, mats.hologramScanRing);
    scanRing1.rotation.x = Math.PI / 2;
    scanRing1.position.y = 0.2;
    handRoot.add(scanRing1);
    scanRingsRef.current.push(scanRing1);

    const scanRing2 = new THREE.Mesh(scanRingGeo, mats.hologramScanRing.clone());
    scanRing2.rotation.x = Math.PI / 2;
    scanRing2.position.y = -0.5;
    handRoot.add(scanRing2);
    scanRingsRef.current.push(scanRing2);

    // D. Build 5 Articulated Fingers (Endoskeleton Bones + Human Biomimetic Holographic Skin Sleeves)
    const fingerDefs = [
      { id: 'thumb', x: -0.66, y: -0.16, z: 0.06, rotX: 0.35, rotY: -0.6, rotZ: 0.72, w: 0.14, l1: 0.38, l2: 0.32, l3: 0.28 },
      { id: 'index', x: -0.45, y: 0.54, z: 0.02, rotX: 0, rotY: 0, rotZ: 0.05, w: 0.125, l1: 0.44, l2: 0.36, l3: 0.28 },
      { id: 'middle', x: -0.15, y: 0.58, z: 0.04, rotX: 0, rotY: 0, rotZ: 0.01, w: 0.13, l1: 0.50, l2: 0.40, l3: 0.31 },
      { id: 'ring', x: 0.16, y: 0.55, z: 0.02, rotX: 0, rotY: 0, rotZ: -0.04, w: 0.125, l1: 0.45, l2: 0.37, l3: 0.29 },
      { id: 'pinky', x: 0.46, y: 0.47, z: -0.01, rotX: 0, rotY: 0, rotZ: -0.10, w: 0.11, l1: 0.38, l2: 0.30, l3: 0.24 }
    ];

    const fingerGroups: Record<string, FingerMeshGroup> = {};

    fingerDefs.forEach(f => {
      const phalanxMeshes: THREE.Mesh[] = [];
      const skinMeshes: THREE.Mesh[] = [];

      // MCP (Metacarpophalangeal) Joint
      const mcpJoint = new THREE.Group();
      mcpJoint.position.set(f.x, f.y, f.z);
      mcpJoint.rotation.set(f.rotX, f.rotY, f.rotZ);
      palm.add(mcpJoint);

      // Knuckle hinge housing (Metal Bone)
      const mcpHingeGeo = new THREE.CylinderGeometry(f.w * 0.95, f.w * 0.95, f.w * 1.5, 16);
      mcpHingeGeo.rotateZ(Math.PI / 2);
      const mcpHinge = new THREE.Mesh(mcpHingeGeo, mats.jointSteel);
      mcpHinge.castShadow = true;
      mcpJoint.add(mcpHinge);

      // Phalanx 1 Metal Bone (Proximal)
      const p1Geo = new THREE.BoxGeometry(f.w * 1.25, f.l1, f.w * 1.1);
      const p1Mesh = new THREE.Mesh(p1Geo, mats.metalChassis);
      p1Mesh.position.y = f.l1 / 2;
      p1Mesh.castShadow = true;
      mcpJoint.add(p1Mesh);
      phalanxMeshes.push(p1Mesh);

      // Phalanx 1 Human Flesh Hologram Sleeve (Bọc Da Khung Xương Đốt 1)
      const p1SkinGeo = new THREE.CylinderGeometry(f.w * 1.05, f.w * 1.15, f.l1 * 0.98, 18);
      const p1SkinMesh = new THREE.Mesh(p1SkinGeo, mats.hologramSkin.clone());
      p1SkinMesh.position.y = f.l1 / 2;
      mcpJoint.add(p1SkinMesh);
      skinMeshes.push(p1SkinMesh);
      hologramMeshesRef.current.push(p1SkinMesh);

      // PIP (Proximal Interphalangeal) Joint
      const pipJoint = new THREE.Group();
      pipJoint.position.set(0, f.l1, 0);
      mcpJoint.add(pipJoint);

      const pipHingeGeo = new THREE.CylinderGeometry(f.w * 0.8, f.w * 0.8, f.w * 1.3, 14);
      pipHingeGeo.rotateZ(Math.PI / 2);
      const pipHinge = new THREE.Mesh(pipHingeGeo, mats.goldJoint);
      pipJoint.add(pipHinge);

      // Phalanx 2 Metal Bone (Intermediate)
      const p2Geo = new THREE.BoxGeometry(f.w * 1.1, f.l2, f.w * 0.95);
      const p2Mesh = new THREE.Mesh(p2Geo, mats.metalChassis);
      p2Mesh.position.y = f.l2 / 2;
      p2Mesh.castShadow = true;
      pipJoint.add(p2Mesh);
      phalanxMeshes.push(p2Mesh);

      // Phalanx 2 Human Flesh Hologram Sleeve (Bọc Da Khung Xương Đốt 2)
      const p2SkinGeo = new THREE.CylinderGeometry(f.w * 0.92, f.w * 1.02, f.l2 * 0.98, 18);
      const p2SkinMesh = new THREE.Mesh(p2SkinGeo, mats.hologramSkin.clone());
      p2SkinMesh.position.y = f.l2 / 2;
      pipJoint.add(p2SkinMesh);
      skinMeshes.push(p2SkinMesh);
      hologramMeshesRef.current.push(p2SkinMesh);

      // DIP (Distal Interphalangeal) Joint
      const dipJoint = new THREE.Group();
      dipJoint.position.set(0, f.l2, 0);
      pipJoint.add(dipJoint);

      const dipHingeGeo = new THREE.CylinderGeometry(f.w * 0.68, f.w * 0.68, f.w * 1.15, 14);
      dipHingeGeo.rotateZ(Math.PI / 2);
      const dipHinge = new THREE.Mesh(dipHingeGeo, mats.jointSteel);
      dipJoint.add(dipHinge);

      // Phalanx 3 Metal Bone (Distal)
      const p3Geo = new THREE.ConeGeometry(f.w * 0.9, f.l3, 12);
      p3Geo.rotateX(Math.PI);
      const p3Mesh = new THREE.Mesh(p3Geo, mats.metalChassis);
      p3Mesh.position.y = f.l3 / 2;
      dipJoint.add(p3Mesh);
      phalanxMeshes.push(p3Mesh);

      // Phalanx 3 Biomimetic Human Fingertip Pulp (Búp Ngón Tay Người Sinh Học)
      const tipPulpGeo = new THREE.SphereGeometry(f.w * 0.95, 18, 18);
      tipPulpGeo.scale(1.0, 1.25, 0.95);
      const tipPulpMesh = new THREE.Mesh(tipPulpGeo, mats.hologramSkin.clone());
      tipPulpMesh.position.set(0, f.l3 * 0.85, 0.02);
      dipJoint.add(tipPulpMesh);
      skinMeshes.push(tipPulpMesh);
      hologramMeshesRef.current.push(tipPulpMesh);

      // Silicone tactile sensor node on fingertip
      const tipSensorGeo = new THREE.SphereGeometry(f.w * 0.55, 16, 16);
      const tipSensorMesh = new THREE.Mesh(tipSensorGeo, mats.sensorPad.clone());
      tipSensorMesh.position.set(0, f.l3, 0.03);
      dipJoint.add(tipSensorMesh);

      // 3D Normal Contact Force Vector Arrow
      const arrowDir = new THREE.Vector3(0, 0, -1);
      const arrowOrigin = new THREE.Vector3(0, f.l3, 0.05);
      const arrow = new THREE.ArrowHelper(arrowDir, arrowOrigin, 0.25, 0x2ee6c8, 0.08, 0.04);
      dipJoint.add(arrow);
      forceArrowsRef.current[f.id] = arrow;

      fingerGroups[f.id] = {
        mcpJoint,
        pipJoint,
        dipJoint,
        tipSensor: tipSensorMesh,
        tipPulp: tipPulpMesh,
        phalanxMeshes,
        skinMeshes
      };
    });

    fingersRef.current = fingerGroups;

    // 8. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Core light gentle pulse
      if (coreLightRef.current) {
        const pulse = 2.8 + Math.sin(elapsedTime * 3.5) * 1.2;
        coreLightRef.current.intensity = pulse;
      }

      // Smooth 3D Kinematics Lerping for Hand, Target Object, Wrist & Elastic Deformation
      if (handRootRef.current) {
        handRootRef.current.position.x += (targetHandXRef.current - handRootRef.current.position.x) * 0.08;
        handRootRef.current.position.y += (targetHandYRef.current - handRootRef.current.position.y) * 0.08;
        handRootRef.current.position.z += (targetHandZRef.current - handRootRef.current.position.z) * 0.08;
        handRootRef.current.rotation.x += (targetHandRotXRef.current - handRootRef.current.rotation.x) * 0.08;
        handRootRef.current.rotation.y += (targetHandRotYRef.current - handRootRef.current.rotation.y) * 0.08;
        handRootRef.current.rotation.z += (targetHandRotZRef.current - handRootRef.current.rotation.z) * 0.08;
      }
      if (objectGroupRef.current) {
        objectGroupRef.current.position.y += (targetObjYRef.current - objectGroupRef.current.position.y) * 0.08;
        objectGroupRef.current.rotation.y += (targetObjRotYRef.current - objectGroupRef.current.rotation.y) * 0.08;
        objectGroupRef.current.scale.lerp(targetObjScaleRef.current, 0.08);

        // Update dynamic laser height beam & carriage position on pillar
        const curObjY = 0.22 + objectGroupRef.current.position.y;
        if (laserCarriageRef.current) {
          laserCarriageRef.current.position.y = curObjY;
        }
        if (laserBeamRef.current) {
          const posAttr = (laserBeamRef.current.geometry as THREE.BufferGeometry).attributes.position;
          if (posAttr) {
            posAttr.setXYZ(0, 2.0, curObjY, 0.35);
            posAttr.setXYZ(1, 0.0, curObjY, 0.25);
            posAttr.needsUpdate = true;
          }
        }
      }
      if (wristRef.current) {
        wristRef.current.rotation.z += (targetWristRotZRef.current - wristRef.current.rotation.z) * 0.08;
      }

      // Real-time Tactile Contact Patches & Coulomb Friction Cone Feedback
      if (contactPatchesRef.current.length > 0) {
        const isContactActive = graspTimelinePct >= 35 || forceN > 2.0;
        const pulse = 0.7 + Math.sin(elapsedTime * 6.0) * 0.25;
        const forceRatio = Math.min(1.0, Math.max(0, forceN / 45.0));

        contactPatchesRef.current.forEach(patch => {
          patch.group.visible = isContactActive;
          if (isContactActive) {
            const matRing = patch.ring.material as THREE.MeshBasicMaterial;
            const matDisc = patch.disc.material as THREE.MeshBasicMaterial;
            matRing.opacity = pulse;
            matDisc.opacity = pulse * 0.85;

            // Color transition cyan -> emerald -> amber based on force
            if (forceN > 25) {
              matRing.color.setHex(0xf59e0b);
              matDisc.color.setHex(0xf59e0b);
            } else if (forceN > 10) {
              matRing.color.setHex(0x10b981);
              matDisc.color.setHex(0x10b981);
            } else {
              matRing.color.setHex(0x2ee6c8);
              matDisc.color.setHex(0x2ee6c8);
            }

            // Normal vector length scaling
            patch.arrow.setLength(0.18 + forceRatio * 0.25, 0.06, 0.035);
          }
        });
      }

      // Fingertip Biomimetic Silicone Pulp Elastic Compression
      if (fingersRef.current) {
        const f = fingersRef.current;
        const isContactActive = graspTimelinePct >= 35 || forceN > 2.0;
        const compScaleZ = isContactActive ? Math.max(0.72, 1.0 - (forceN / 50) * 0.28) : 1.0;
        Object.values(f).forEach(finger => {
          if (finger.tipPulp) {
            finger.tipPulp.scale.z += (compScaleZ - finger.tipPulp.scale.z) * 0.1;
          }
        });
      }

      // Animated sweeping laser scan rings
      if (scanRingsRef.current.length > 0 && hologramConfig.showScanRings && hologramConfig.enabled) {
        const yOffset1 = Math.sin(elapsedTime * 2.2) * 0.55 + 0.1;
        const yOffset2 = Math.cos(elapsedTime * 2.2) * 0.45 - 0.4;
        scanRingsRef.current[0].position.y = yOffset1;
        scanRingsRef.current[1].position.y = yOffset2;
        scanRingsRef.current[0].rotation.z += 0.015;
        scanRingsRef.current[1].rotation.z -= 0.012;
      }

      // Auto rotation when enabled
      if (controlsRef.current) {
        controlsRef.current.autoRotate = autoRotate;
        controlsRef.current.autoRotateSpeed = 1.2;
        controlsRef.current.update();
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    // 9. Resize handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      if (rendererRef.current?.domElement && container.contains(rendererRef.current.domElement)) {
        container.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();
    };
  }, [currentMode, autoRotate, graspObject, populateObjectGroup]);

  // Update Hologram Skin Material properties live when config changes
  useEffect(() => {
    const holoColorNum = parseInt(hologramConfig.color.replace('#', '0x'), 16) || 0x2ee6c8;

    hologramMeshesRef.current.forEach(mesh => {
      mesh.visible = hologramConfig.enabled;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.opacity = hologramConfig.opacity;
        mat.color.setHex(holoColorNum);
        mat.emissive.setHex(holoColorNum);
        mat.wireframe = hologramConfig.showWireframe;
        mat.needsUpdate = true;
      }
    });

    scanRingsRef.current.forEach(ring => {
      ring.visible = hologramConfig.enabled && hologramConfig.showScanRings;
      const mat = ring.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.color.setHex(holoColorNum);
      }
    });
  }, [hologramConfig]);

  // Apply Forward Kinematics (FK) rotations to 3D Finger Groups
  useEffect(() => {
    const f = fingersRef.current;
    if (!f || Object.keys(f).length === 0) return;

    const applyFingerCurl = (id: string, curlVal: number, sideMult: number = 1) => {
      const finger = f[id];
      if (!finger) return;

      const c = Math.max(0, Math.min(1, curlVal));

      if (id === 'thumb') {
        const mcpAngle = c * 0.95;
        const pipAngle = c * 1.15;
        const dipAngle = c * 0.85;

        finger.mcpJoint.rotation.x = 0.35 + mcpAngle * 0.65;
        finger.mcpJoint.rotation.y = -0.6 + mcpAngle * 0.45;
        finger.mcpJoint.rotation.z = 0.72 - mcpAngle * 0.35;

        finger.pipJoint.rotation.x = -pipAngle * 0.8;
        finger.dipJoint.rotation.x = -dipAngle * 0.75;
      } else {
        const mcpMax = (88 * Math.PI) / 180;
        const pipMax = (100 * Math.PI) / 180;
        const dipMax = (65 * Math.PI) / 180;

        finger.mcpJoint.rotation.x = c * mcpMax;
        finger.pipJoint.rotation.x = c * pipMax;
        finger.dipJoint.rotation.x = c * dipMax;
      }
    };

    applyFingerCurl('thumb', jointAngles.thumb);
    applyFingerCurl('index', jointAngles.index);
    applyFingerCurl('middle', jointAngles.middle);
    applyFingerCurl('ring', jointAngles.ring);
    applyFingerCurl('pinky', jointAngles.pinky);

    // Wrist dual-axis pitch and yaw rotations
    if (wristRef.current) {
      const pitchRad = ((jointAngles.wrist_pitch || 0) * Math.PI) / 180;
      const yawRad = ((jointAngles.wrist_yaw || 0) * Math.PI) / 180;
      wristRef.current.rotation.x = pitchRad;
      wristRef.current.rotation.z = yawRad;
    }

    // Dynamic Tactile Sensor Heatmap Coloration
    const forceRatio = Math.min(1, Math.max(0, forceN / 45));
    const pressRatio = Math.min(1, Math.max(0, pressureKPa / 280));

    let sensorColor = new THREE.Color(0x2ee6c8);
    let emissiveBoost = 0.6 + forceRatio * 2.2;

    if (forceN > 32) {
      sensorColor.setHex(0xf43f5e); // Critical force (Rose)
    } else if (forceN > 18) {
      sensorColor.setHex(0xf59e0b); // Moderate force (Amber)
    } else {
      sensorColor.setHex(0x2ee6c8); // Stable grip (Cyan)
    }

    Object.values(f).forEach(finger => {
      const mat = finger.tipSensor.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.color.copy(sensorColor);
        mat.emissive.copy(sensorColor);
        mat.emissiveIntensity = emissiveBoost;
      }
    });

    palmSensorRef.current.forEach((pad, idx) => {
      const mat = pad.material as THREE.MeshStandardMaterial;
      if (mat) {
        const padLoad = Math.min(1, pressRatio * (0.6 + (idx % 2) * 0.4));
        mat.color.copy(sensorColor);
        mat.emissive.copy(sensorColor);
        mat.emissiveIntensity = padLoad * 1.8;
      }
    });

    // Update 3D Normal Force Vector Arrows
    Object.values(forceArrowsRef.current).forEach(arrow => {
      const isVisible = showForceVectors && forceN > 0.6;
      arrow.visible = isVisible;
      if (isVisible) {
        const arrowLen = Math.max(0.08, Math.min(0.48, 0.08 + (forceN / 45) * 0.38));
        arrow.setLength(arrowLen, 0.07, 0.04);
        arrow.setColor(sensorColor);
      }
    });
  }, [jointAngles, forceN, pressureKPa, showForceVectors]);

  // Set camera view angles with expanded distant perspectives
  const setCameraView = useCallback((view: 'wide' | 'iso' | 'front' | 'side' | 'top') => {
    if (!cameraRef.current || !controlsRef.current) return;
    setCamView(view);
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;

    switch (view) {
      case 'wide':
        // GÓC RỘNG TOÀN CẢNH (Default / Recommended): Quan sát toàn bộ không gian phòng thí nghiệm, giá đỡ và bàn tay
        cam.position.set(4.4, 3.0, 5.8);
        break;
      case 'iso':
        // GÓC ISO TIÊU CHUẨN
        cam.position.set(2.8, 1.9, 3.6);
        break;
      case 'front':
        // CHÍNH DIỆN: Trực diện kẹp ngón
        cam.position.set(0, 0.4, 5.4);
        break;
      case 'side':
        // CẠNH BÊN (Lateral): Quan sát khe hở kẹp và độ uốn cong
        cam.position.set(5.2, 0.5, 0.4);
        break;
      case 'top':
        // TRÊN CAO CHIẾU XUỐNG
        cam.position.set(0, 6.2, 0.6);
        break;
    }
    ctrl.target.set(0, -0.1, 0);
    ctrl.update();
  }, []);

  // Incremental Zoom Controls
  const handleZoom = (direction: 'in' | 'out') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const cam = cameraRef.current;
    const factor = direction === 'in' ? 0.8 : 1.25;
    cam.position.multiplyScalar(factor);
    controlsRef.current.update();
  };

  const handleResetCamera = () => {
    setCameraView('wide');
  };

  // Listen to Escape key to exit fullscreen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const handleSliderChange = (finger: keyof JointAngles, val: number) => {
    if (onJointsChange) {
      onJointsChange({
        ...jointAngles,
        [finger]: val
      });
    }
  };

  const handleSelectObject = (obj: GraspObjectType) => {
    setGraspObject(obj);
    if (onGraspObjectChange) {
      onGraspObjectChange(obj);
    }
    if (objectGroupRef.current) {
      populateObjectGroup(objectGroupRef.current, obj, currentMode);
    }
  };

  // Biomechanical Preset Hand Configurations
  const handleApplyGraspPreset = (type: 'power' | 'pinch' | 'tripod' | 'lateral' | 'spherical' | 'extension') => {
    if (!onJointsChange) return;

    switch (type) {
      case 'power':
        onJointsChange({
          thumb: 0.88,
          index: 0.92,
          middle: 0.94,
          ring: 0.88,
          pinky: 0.84,
          wrist_pitch: -6
        });
        if (onForceChange) onForceChange(32.5);
        break;
      case 'pinch':
        onJointsChange({
          thumb: 0.82,
          index: 0.86,
          middle: 0.15,
          ring: 0.12,
          pinky: 0.10,
          wrist_pitch: 3
        });
        if (onForceChange) onForceChange(12.0);
        break;
      case 'tripod':
        onJointsChange({
          thumb: 0.84,
          index: 0.82,
          middle: 0.76,
          ring: 0.22,
          pinky: 0.18,
          wrist_pitch: 4
        });
        if (onForceChange) onForceChange(18.5);
        break;
      case 'lateral':
        onJointsChange({
          thumb: 0.72,
          index: 0.78,
          middle: 0.35,
          ring: 0.28,
          pinky: 0.24,
          wrist_pitch: 2
        });
        if (onForceChange) onForceChange(16.0);
        break;
      case 'spherical':
        onJointsChange({
          thumb: 0.78,
          index: 0.75,
          middle: 0.78,
          ring: 0.74,
          pinky: 0.70,
          wrist_pitch: 0
        });
        if (onForceChange) onForceChange(24.0);
        break;
      case 'extension':
        onJointsChange({
          thumb: 0.05,
          index: 0.05,
          middle: 0.05,
          ring: 0.05,
          pinky: 0.05,
          wrist_pitch: 0
        });
        if (onForceChange) onForceChange(0.5);
        break;
    }
  };

  // Kinematic Grasp Offsets & Curvature Map tailored specifically for each 3D Object
  const getObjectGraspKinematics = (objType: GraspObjectType) => {
    switch (objType) {
      case 'cylinder':
        return {
          reachX: 0.0,
          reachY: 0.12,
          reachZ: 0.22,
          rotX: -0.15,
          rotY: 0.0,
          rotZ: 0.0,
          approachY: 0.32,
          approachZ: 0.05,
          approachRotX: -0.25,
          contactCurl: { thumb: 0.78, index: 0.72, middle: 0.75, ring: 0.70, pinky: 0.65, wrist_pitch: -4, wrist_yaw: 0 },
          liftY: 0.38
        };
      case 'sphere':
        return {
          reachX: 0.0,
          reachY: 0.10,
          reachZ: 0.20,
          rotX: -0.20,
          rotY: 0.0,
          rotZ: 0.0,
          approachY: 0.30,
          approachZ: 0.02,
          approachRotX: -0.28,
          contactCurl: { thumb: 0.75, index: 0.68, middle: 0.72, ring: 0.68, pinky: 0.62, wrist_pitch: 0, wrist_yaw: 0 },
          liftY: 0.38
        };
      case 'key':
        return {
          reachX: -0.15,
          reachY: 0.16,
          reachZ: 0.22,
          rotX: -0.05,
          rotY: 0.08,
          rotZ: 0.05,
          approachY: 0.32,
          approachZ: 0.05,
          approachRotX: -0.18,
          contactCurl: { thumb: 0.82, index: 0.78, middle: 0.90, ring: 0.90, pinky: 0.90, wrist_pitch: 2, wrist_yaw: 0 },
          liftY: 0.38
        };
      case 'box':
        return {
          reachX: 0.0,
          reachY: 0.14,
          reachZ: 0.20,
          rotX: -0.12,
          rotY: 0.0,
          rotZ: 0.0,
          approachY: 0.34,
          approachZ: 0.05,
          approachRotX: -0.22,
          contactCurl: { thumb: 0.68, index: 0.60, middle: 0.62, ring: 0.60, pinky: 0.55, wrist_pitch: -2, wrist_yaw: 0 },
          liftY: 0.38
        };
      default:
        return {
          reachX: 0.0,
          reachY: 0.12,
          reachZ: 0.22,
          rotX: -0.15,
          rotY: 0.0,
          rotZ: 0.0,
          approachY: 0.32,
          approachZ: 0.05,
          approachRotX: -0.25,
          contactCurl: { thumb: 0.78, index: 0.72, middle: 0.75, ring: 0.70, pinky: 0.65, wrist_pitch: -4, wrist_yaw: 0 },
          liftY: 0.38
        };
    }
  };

  // Inverse Kinematics (IK) Snap helper for target objects
  const handleIKSnap = () => {
    switch (graspObject) {
      case 'cylinder':
        handleApplyGraspPreset('power');
        break;
      case 'sphere':
        handleApplyGraspPreset('spherical');
        break;
      case 'key':
        handleApplyGraspPreset('lateral');
        break;
      case 'box':
        handleApplyGraspPreset('tripod');
        break;
      case 'none':
        handleApplyGraspPreset('extension');
        break;
    }
  };

  // Continuous Grasp Scrubbing Controller (0% -> 100%)
  const applyGraspTimeline = useCallback((percent: number) => {
    setGraspTimelinePct(percent);
    const p = Math.max(0, Math.min(100, percent)) / 100;
    const k = getObjectGraspKinematics(graspObject);

    if (p <= 0.02) {
      // 0%: Ready Stance - Hand retracted at resting table pedestal, fingers open
      targetHandXRef.current = 0.0;
      targetHandYRef.current = -0.42;
      targetHandZRef.current = -0.20;
      targetHandRotXRef.current = 0.0;
      targetHandRotYRef.current = 0.0;
      targetHandRotZRef.current = 0.0;
      targetObjYRef.current = 0.0;
      targetObjRotYRef.current = 0.0;
      targetWristRotZRef.current = 0.0;
      targetObjScaleRef.current.set(1.0, 1.0, 1.0);
      if (trajectoryLineRef.current) trajectoryLineRef.current.visible = false;
      handleApplyGraspPreset('extension');
      if (onForceChange) onForceChange(0.5);
      setManipulation({
        action: 'idle',
        progress: 0,
        liftHeightCm: 0,
        rotationAngleDeg: 0,
        complianceDeformationMm: 0,
        tactileContactStable: true,
        graspPhasePercent: 0
      });
    } else if (p <= 0.35) {
      // 1% - 35%: Approach & Swoop Phase (Tiến tới & Bổ nhào chuẩn bị ôm vật)
      const t = p / 0.35;
      targetHandXRef.current = k.reachX * t;
      targetHandYRef.current = -0.42 + (k.approachY - (-0.42)) * t;
      targetHandZRef.current = -0.20 + (k.approachZ - (-0.20)) * t;
      targetHandRotXRef.current = k.approachRotX * t;
      targetHandRotYRef.current = k.rotY * t;
      targetHandRotZRef.current = k.rotZ * t;
      targetObjYRef.current = 0.0;
      targetObjRotYRef.current = 0.0;
      targetWristRotZRef.current = 0.0;
      targetObjScaleRef.current.set(1.0, 1.0, 1.0);
      if (trajectoryLineRef.current) trajectoryLineRef.current.visible = false;

      // Fingers spread wide in anticipation
      if (onJointsChange) {
        onJointsChange({
          thumb: 0.05,
          index: 0.05 * (1 - t * 0.5),
          middle: 0.05 * (1 - t * 0.5),
          ring: 0.05 * (1 - t * 0.5),
          pinky: 0.05 * (1 - t * 0.5),
          wrist_pitch: -15 * t,
          wrist_yaw: 0
        });
      }
      if (onForceChange) onForceChange(1.0 + t * 2.0);
      setManipulation({
        action: 'approach',
        progress: p,
        liftHeightCm: 0,
        rotationAngleDeg: 0,
        complianceDeformationMm: 0,
        tactileContactStable: true,
        graspPhasePercent: Math.round(p * 100)
      });
    } else if (p <= 0.70) {
      // 36% - 70%: Touch & Power Lock Phase (Chạm bề mặt & Khóa nón ma sát Coulomb)
      const t = (p - 0.35) / 0.35;
      targetHandXRef.current = k.reachX;
      targetHandYRef.current = k.approachY + (k.reachY - k.approachY) * t;
      targetHandZRef.current = k.approachZ + (k.reachZ - k.approachZ) * t;
      targetHandRotXRef.current = k.approachRotX + (k.rotX - k.approachRotX) * t;
      targetHandRotYRef.current = k.rotY;
      targetHandRotZRef.current = k.rotZ;
      targetObjYRef.current = 0.0;
      targetObjRotYRef.current = 0.0;
      targetWristRotZRef.current = 0.0;
      targetObjScaleRef.current.set(1.0 - 0.025 * t, 1.0, 1.0 - 0.025 * t);
      if (trajectoryLineRef.current) trajectoryLineRef.current.visible = true;

      // Dynamic finger curls matching exact object geometry
      if (onJointsChange) {
        onJointsChange({
          thumb: 0.05 + (k.contactCurl.thumb - 0.05) * t,
          index: 0.025 + (k.contactCurl.index - 0.025) * t,
          middle: 0.025 + (k.contactCurl.middle - 0.025) * t,
          ring: 0.025 + (k.contactCurl.ring - 0.025) * t,
          pinky: 0.025 + (k.contactCurl.pinky - 0.025) * t,
          wrist_pitch: k.contactCurl.wrist_pitch * t,
          wrist_yaw: k.contactCurl.wrist_yaw * t
        });
      }
      const curForce = 3.0 + t * 25.5; // Force ramps up to 28.5N
      if (onForceChange) onForceChange(curForce);
      setManipulation({
        action: 'swoop_grasp',
        progress: p,
        liftHeightCm: 0,
        rotationAngleDeg: 0,
        complianceDeformationMm: 0.3 + 1.2 * t,
        tactileContactStable: true,
        graspPhasePercent: Math.round(p * 100)
      });
    } else {
      // 71% - 100%: Lift & Secure Elevation (Nâng bổng vật thể lên +15cm)
      const t = (p - 0.70) / 0.30;
      targetHandXRef.current = k.reachX;
      targetHandYRef.current = k.reachY + k.liftY * t;
      targetHandZRef.current = k.reachZ;
      targetHandRotXRef.current = k.rotX;
      targetHandRotYRef.current = k.rotY;
      targetHandRotZRef.current = k.rotZ;
      targetObjYRef.current = k.liftY * t; // Object lifts in 100% rigid lockstep with hand
      targetObjRotYRef.current = 0.0;
      targetWristRotZRef.current = 0.0;
      targetObjScaleRef.current.set(0.975, 1.0, 0.975);
      if (trajectoryLineRef.current) trajectoryLineRef.current.visible = true;

      if (onJointsChange) {
        onJointsChange(k.contactCurl);
      }
      if (onForceChange) onForceChange(28.5);
      setManipulation({
        action: 'lift',
        progress: p,
        liftHeightCm: Math.round(15.0 * t * 10) / 10,
        rotationAngleDeg: 0,
        complianceDeformationMm: 1.5,
        tactileContactStable: true,
        graspPhasePercent: Math.round(p * 100)
      });
    }
  }, [graspObject, onForceChange, onJointsChange]);

  // Dynamic Object Manipulation Tasks (Approach, Swoop Grasp, Lift, Rotate, Compliance, Safe Release)
  const executeManipulation = (action: ManipulationAction) => {
    const k = getObjectGraspKinematics(graspObject);
    switch (action) {
      case 'approach':
        // Pha 1: Tiếp Cận (35%) - vươn tay tới vị trí đón đầu ngay phía trên vật thể
        applyGraspTimeline(35);
        break;

      case 'swoop_grasp':
        // Pha 2: Bổ Nhào Nắm Vật (70%) - hạ bổ nhào xuống, 5 ngón ôm khít khóa nón ma sát
        if (graspTimelinePct < 30) {
          // Nếu đang ở tư thế nghỉ, thực hiện tuần tự: Tiếp Cận (35%) rồi mới Bổ Nhào Nắm Vật (70%)
          applyGraspTimeline(35);
          setTimeout(() => {
            applyGraspTimeline(70);
          }, 350);
        } else {
          // Đã ở vị trí tiếp cận, lập tức bổ nhào ôm chặt khóa vật thể
          applyGraspTimeline(70);
        }
        break;

      case 'lift':
        // Pha 3: Nâng Vật (+15cm) - nhấc bổng vật thể lên khỏi bệ thí nghiệm
        if (graspTimelinePct < 65) {
          // Đảm bảo đã bổ nhào nắm chặt trước khi nâng
          applyGraspTimeline(70);
          setTimeout(() => {
            applyGraspTimeline(100);
          }, 350);
        } else {
          applyGraspTimeline(100);
        }
        break;

      case 'rotate':
        // Smoothly Rotate Wrist and Object (+35 deg lateral rotation) while lifted
        targetHandXRef.current = k.reachX;
        targetHandYRef.current = k.reachY + k.liftY;
        targetHandZRef.current = k.reachZ;
        targetHandRotXRef.current = k.rotX;
        targetHandRotYRef.current = k.rotY + 0.61;
        targetHandRotZRef.current = k.rotZ;
        targetObjYRef.current = k.liftY;
        targetObjRotYRef.current = 0.61;
        targetWristRotZRef.current = 0.61;
        targetObjScaleRef.current.set(0.975, 1.0, 0.975);
        if (trajectoryLineRef.current) trajectoryLineRef.current.visible = true;
        setGraspTimelinePct(100);
        setManipulation({
          action: 'rotate',
          progress: 1.0,
          liftHeightCm: 15.0,
          rotationAngleDeg: 35.0,
          complianceDeformationMm: 1.4,
          tactileContactStable: true,
          graspPhasePercent: 100
        });
        break;

      case 'compliance_test':
        // Squeeze test for elastomeric compliance (radial compression)
        targetHandXRef.current = k.reachX;
        targetHandYRef.current = k.reachY + k.liftY;
        targetHandZRef.current = k.reachZ;
        targetHandRotXRef.current = k.rotX;
        targetObjYRef.current = k.liftY;
        targetObjRotYRef.current = 0.0;
        targetWristRotZRef.current = 0.0;
        targetObjScaleRef.current.set(0.92, 1.0, 0.92);
        if (trajectoryLineRef.current) trajectoryLineRef.current.visible = false;
        if (onForceChange) onForceChange(36.0);
        setGraspTimelinePct(100);
        setManipulation({
          action: 'compliance_test',
          progress: 1.0,
          liftHeightCm: 15.0,
          rotationAngleDeg: 0,
          complianceDeformationMm: 3.2,
          tactileContactStable: true,
          graspPhasePercent: 100
        });
        break;

      case 'release':
      case 'idle':
        applyGraspTimeline(0);
        break;
    }
  };

  // Auto Grasp Loop Player
  useEffect(() => {
    let intervalId: any;
    if (isAutoGraspPlaying) {
      let currentStep = 0;
      const sequence = [0, 35, 70, 100, 100, 0];
      intervalId = setInterval(() => {
        currentStep = (currentStep + 1) % sequence.length;
        if (sequence[currentStep] === 100 && currentStep === 4) {
          executeManipulation('rotate');
        } else {
          applyGraspTimeline(sequence[currentStep]);
        }
      }, 1400);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAutoGraspPlaying, applyGraspTimeline]);

  // Coulomb Friction Cone evaluation
  const avgCurl = (jointAngles.thumb + jointAngles.index + jointAngles.middle + jointAngles.ring + jointAngles.pinky) / 5;
  const isObjectPresent = graspObject !== 'none';
  let slipStatus: { safe: boolean; label: string; sub: string } = {
    safe: true,
    label: 'CÂN BẰNG MA SÁT COULOMB (STABLE IN CONE)',
    sub: 'Lực tiếp tuyến |Ft| <= 0.45 * Fn · Điểm tiếp xúc bám dính ổn định'
  };

  if (isObjectPresent) {
    if (avgCurl > 0.4 && forceN < 7.0) {
      slipStatus = {
        safe: false,
        label: 'CẢNH BÁO TRƯỢT MA SÁT (SLIP RISK)',
        sub: 'Lực pháp tuyến Fn < 7.0N không đủ duy trì nón ma sát tĩnh'
      };
    } else if (avgCurl < 0.3 && forceN > 14.0) {
      slipStatus = {
        safe: false,
        label: 'CHƯA TỐI ƯU TIẾP XÚC BIÊN DẠNG',
        sub: 'Góc khớp FK chưa ôm sát bề mặt vật thể'
      };
    } else if (forceN > 38.0) {
      slipStatus = {
        safe: false,
        label: 'CẢNH BÁO QUÁ TẢI TIẾP XÚC (>38N)',
        sub: 'Áp lực vượt ngưỡng an toàn đàn hồi của vật thể'
      };
    }
  }

  // 5-Finger Tactile Contact Status Matrix
  const fingerContactStatus = useMemo(() => {
    const isGrasping = graspObject !== 'none' && (graspTimelinePct >= 35 || forceN > 2.0);
    if (graspObject === 'key') {
      return [
        { id: 'thumb', name: 'Cái', contact: isGrasping, force: isGrasping ? forceN * 0.52 : 0, angle: '90° Kẹp Má', role: 'Kẹp Ép Má Chìa' },
        { id: 'index', name: 'Trỏ', contact: isGrasping, force: isGrasping ? forceN * 0.48 : 0, angle: '90° Đối Lực', role: 'Kẹp Đối Xứng' },
        { id: 'middle', name: 'Giữa', contact: false, force: 0, angle: 'Gấp Thu', role: 'Thu Lòng Bàn' },
        { id: 'ring', name: 'Áp Út', contact: false, force: 0, angle: 'Gấp Thu', role: 'Thu Lòng Bàn' },
        { id: 'pinky', name: 'Út', contact: false, force: 0, angle: 'Gấp Thu', role: 'Thu Lòng Bàn' },
      ];
    }

    return [
      { id: 'thumb', name: 'Cái', contact: isGrasping, force: isGrasping ? forceN * 0.29 : 0, angle: '52° Đối Lực', role: 'Khóa Trọng Tâm' },
      { id: 'index', name: 'Trỏ', contact: isGrasping, force: isGrasping ? forceN * 0.24 : 0, angle: '38° Vòm Trên', role: 'Ôm Vòm Trước' },
      { id: 'middle', name: 'Giữa', contact: isGrasping, force: isGrasping ? forceN * 0.26 : 0, angle: '24° Trực Diện', role: 'Khóa Trực Diện' },
      { id: 'ring', name: 'Áp Út', contact: isGrasping, force: isGrasping ? forceN * 0.14 : 0, angle: '18° Cung Phải', role: 'Hỗ Trợ Bên' },
      { id: 'pinky', name: 'Út', contact: isGrasping, force: isGrasping ? forceN * 0.07 : 0, angle: '12° Khóa Trượt', role: 'Ngăn Trượt Dọc' },
    ];
  }, [graspObject, graspTimelinePct, forceN]);

  return (
    <div
      className={`${
        isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen bg-[#04060c] p-3 sm:p-5'
          : 'relative w-full h-full min-h-[560px] lg:min-h-[640px] bg-gradient-to-b from-[#080d1a] to-[#04060c] rounded-xl border border-[#2ee6c8]/20 shadow-2xl'
      } overflow-hidden flex flex-col transition-all duration-300`}
    >
      {/* Top HUD Header: Biomechanical Kinematics & Hologram Info */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2ee6c8] animate-ping" />
            <span className="text-[11px] font-mono tracking-widest text-[#2ee6c8] uppercase font-semibold bg-[#0a1220]/85 px-2.5 py-1 rounded border border-[#2ee6c8]/30 backdrop-blur-md flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" /> STM32F4 · KINEMATICS &amp; BIOMIMETIC ENGINE
            </span>

            {/* Coulomb Friction Status Badge */}
            {isObjectPresent && (
              <div
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-mono backdrop-blur-md ${
                  slipStatus.safe
                    ? 'bg-emerald-950/75 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/85 border-rose-500/50 text-rose-200 animate-pulse'
                }`}
              >
                {slipStatus.safe ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                )}
                <span>{slipStatus.label}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto flex-wrap">
            {/* Hologram Skin Envelop Toggle */}
            <button
              onClick={() => setHologramConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
              title="Bật/tắt lớp vỏ Hologram sinh học bao quanh khung xương"
              className={`px-2 py-1 text-[10.5px] font-mono rounded border flex items-center gap-1 transition-all ${
                hologramConfig.enabled
                  ? 'bg-[#2ee6c8]/25 border-[#2ee6c8] text-[#2ee6c8] font-bold shadow-sm'
                  : 'bg-[#09101f]/80 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Fingerprint className="w-3 h-3" /> Vỏ Hologram: {hologramConfig.enabled ? 'BẬT' : 'TẮT'}
            </button>

            {/* Force Vector 3D Toggle */}
            <button
              onClick={() => setShowForceVectors(!showForceVectors)}
              title="Bật/tắt hiển thị vector lực pháp tuyến 3D ở đầu 5 ngón"
              className={`px-2 py-1 text-[10.5px] font-mono rounded border flex items-center gap-1 transition-all ${
                showForceVectors
                  ? 'bg-[#2ee6c8]/20 border-[#2ee6c8] text-[#2ee6c8]'
                  : 'bg-[#09101f]/80 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Crosshair className="w-3 h-3" /> Vector Lực 3D
            </button>

            {/* IK Snap Button */}
            {isObjectPresent && (
              <button
                onClick={handleIKSnap}
                title="Tự động tính góc khớp bám sát bề mặt vật thể (Inverse Kinematics)"
                className="px-2.5 py-1 text-[10.5px] font-mono rounded border bg-gradient-to-r from-[#a06bff]/25 to-[#2ee6c8]/25 border-[#a06bff]/50 text-white hover:border-[#a06bff] flex items-center gap-1 transition-all shadow-md active:scale-95"
              >
                <Sparkles className="w-3 h-3 text-amber-300" /> IK Snap Ôm Vật
              </button>
            )}

            <button
              onClick={() => setAutoRotate(!autoRotate)}
              title="Tự động xoay 360°"
              className={`p-1.5 text-xs rounded border transition-all ${
                autoRotate
                  ? 'bg-[#2ee6c8]/20 border-[#2ee6c8] text-[#2ee6c8]'
                  : 'bg-[#09101f]/70 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowSliders(!showSliders)}
              title="Điều khiển thủ công góc 5 ngón"
              className={`p-1.5 text-xs rounded border transition-all ${
                showSliders
                  ? 'bg-[#a06bff]/20 border-[#a06bff] text-[#a06bff]'
                  : 'bg-[#09101f]/70 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Row 2: 3D Physical Target Object Selector Bar */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-[#070c18]/85 border border-white/10 p-1 rounded-lg backdrop-blur-md self-start text-[10.5px] font-mono flex-wrap">
          <span className="text-slate-400 px-1.5 flex items-center gap-1">
            <Layers className="w-3 h-3 text-[#2ee6c8]" /> Vật Thể 3D:
          </span>
          <button
            onClick={() => handleSelectObject('cylinder')}
            className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
              graspObject === 'cylinder'
                ? 'bg-[#2ee6c8] text-black font-bold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Chai Nước Trụ (Cylinder)
          </button>
          <button
            onClick={() => handleSelectObject('sphere')}
            className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
              graspObject === 'sphere'
                ? 'bg-[#2ee6c8] text-black font-bold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Quả Cầu Phục Hồi (Sphere)
          </button>
          <button
            onClick={() => handleSelectObject('key')}
            className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
              graspObject === 'key'
                ? 'bg-[#2ee6c8] text-black font-bold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Chìa Khóa / Chốt Vặn (Key)
          </button>
          <button
            onClick={() => handleSelectObject('box')}
            className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
              graspObject === 'box'
                ? 'bg-[#2ee6c8] text-black font-bold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Hộp Thuốc Y Tế (Box)
          </button>
          <button
            onClick={() => handleSelectObject('none')}
            className={`px-2 py-0.5 rounded transition-all ${
              graspObject === 'none'
                ? 'bg-slate-700 text-white font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Không
          </button>
        </div>

        {/* Row 3: Biomechanical Grasp Presets & Dynamic Manipulation Actions */}
        <div className="flex items-center gap-2 pointer-events-auto flex-wrap">
          {/* Grasp Presets */}
          <div className="flex items-center gap-1 bg-[#070c18]/90 border border-white/10 p-1 rounded-lg backdrop-blur-md text-[10px] font-mono">
            <span className="text-slate-400 px-1 font-semibold">Tư Thế Gắp:</span>
            <button
              onClick={() => handleApplyGraspPreset('power')}
              className="px-2 py-0.5 rounded bg-white/5 hover:bg-[#2ee6c8]/20 hover:text-[#2ee6c8] text-slate-300 transition-colors"
            >
              Gắp Trụ (Power)
            </button>
            <button
              onClick={() => handleApplyGraspPreset('pinch')}
              className="px-2 py-0.5 rounded bg-white/5 hover:bg-[#2ee6c8]/20 hover:text-[#2ee6c8] text-slate-300 transition-colors"
            >
              Gắp Véo 2 Điểm (Pinch)
            </button>
            <button
              onClick={() => handleApplyGraspPreset('tripod')}
              className="px-2 py-0.5 rounded bg-white/5 hover:bg-[#2ee6c8]/20 hover:text-[#2ee6c8] text-slate-300 transition-colors"
            >
              Gắp 3 Điểm (Tripod)
            </button>
            <button
              onClick={() => handleApplyGraspPreset('lateral')}
              className="px-2 py-0.5 rounded bg-white/5 hover:bg-[#2ee6c8]/20 hover:text-[#2ee6c8] text-slate-300 transition-colors"
            >
              Kẹp Cạnh Bên (Lateral)
            </button>
            <button
              onClick={() => handleApplyGraspPreset('spherical')}
              className="px-2 py-0.5 rounded bg-white/5 hover:bg-[#2ee6c8]/20 hover:text-[#2ee6c8] text-slate-300 transition-colors"
            >
              Ôm Cầu (Spherical)
            </button>
            <button
              onClick={() => handleApplyGraspPreset('extension')}
              className="px-2 py-0.5 rounded bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-300 transition-colors"
            >
              Duỗi Thẳng 0°
            </button>
          </div>

          {/* Dynamic Controlled Reach & Grasp Motion Controller (Điều Khiển Bàn Tay Chuyển Động Nắm Bổ Vật) */}
          {isObjectPresent && (
            <div className="flex flex-col gap-1.5 bg-[#091222]/95 border border-[#38bdf8]/40 p-2 rounded-xl backdrop-blur-md text-[10px] font-mono shadow-xl">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[#38bdf8] font-bold flex items-center gap-1.5 uppercase tracking-wider">
                  <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  ĐIỀU KHIỂN CHUYỂN ĐỘNG NẮM BẮT VẬT THỂ:
                </span>
                
                {/* Auto Play / Loop Reach-and-Grasp Cycle */}
                <button
                  onClick={() => setIsAutoGraspPlaying(!isAutoGraspPlaying)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
                    isAutoGraspPlaying
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30 animate-pulse'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  {isAutoGraspPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {isAutoGraspPlaying ? 'Đang Lặp Chu Trình...' : 'Tự Động Lặp Chu Trình'}
                </button>
              </div>

              {/* Continuous Interactive Grasp Scrubbing Slider (0% to 100%) */}
              <div className="flex items-center gap-2 bg-black/40 px-2 py-1 rounded-lg border border-white/5">
                <span className="text-slate-400 text-[9px] whitespace-nowrap">
                  Tiến Trình (0% - 100%):
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={graspTimelinePct}
                  onChange={e => applyGraspTimeline(parseInt(e.target.value))}
                  className="w-full accent-[#38bdf8] bg-slate-800 h-1.5 rounded cursor-pointer"
                />
                <span className="text-[#38bdf8] font-bold tabular-nums min-w-[34px] text-right">
                  {graspTimelinePct}%
                </span>
                <span className="text-[8.5px] px-1.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10 whitespace-nowrap hidden sm:inline-block">
                  {graspTimelinePct === 0
                    ? 'Tư Thế Nghỉ'
                    : graspTimelinePct <= 35
                    ? 'Pha 1: Tiếp Cận (Approach)'
                    : graspTimelinePct <= 70
                    ? 'Pha 2: Bổ Nhào Nắm Vật (Swoop & Grasp)'
                    : 'Pha 3: Nâng Vật & Thao Tác (Lift)'}
                </span>
              </div>

              {/* Step-by-Step Motion Control Buttons (Thứ tự chuẩn: Tiếp Cận -> Bổ Nhào Nắm -> Nâng Vật) */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* 1. Approach Phase First */}
                <button
                  onClick={() => executeManipulation('approach')}
                  className={`px-2.5 py-1 rounded font-bold flex items-center gap-1 transition-all shadow-sm ${
                    manipulation.action === 'approach' || (graspTimelinePct > 0 && graspTimelinePct <= 35)
                      ? 'bg-[#38bdf8] text-black shadow-[#38bdf8]/30'
                      : 'bg-white/10 hover:bg-[#38bdf8]/20 text-slate-200 hover:text-[#38bdf8] border border-[#38bdf8]/40'
                  }`}
                  title="Pha 1: Vươn bàn tay tới vị trí phía trên vật thể, mở ngón tay đón trước"
                >
                  <ArrowDown className="w-3 h-3 text-amber-400" /> 1. Tiếp Cận (35%)
                </button>

                {/* 2. Swoop & Grasp Phase Second */}
                <button
                  onClick={() => executeManipulation('swoop_grasp')}
                  className={`px-2.5 py-1 rounded font-bold flex items-center gap-1 transition-all shadow-sm ${
                    manipulation.action === 'swoop_grasp' || (graspTimelinePct > 35 && graspTimelinePct <= 70)
                      ? 'bg-gradient-to-r from-[#38bdf8] to-[#2ee6c8] text-black shadow-md shadow-[#2ee6c8]/40'
                      : 'bg-white/10 hover:bg-[#2ee6c8]/20 text-slate-200 hover:text-[#2ee6c8] border border-[#2ee6c8]/40'
                  }`}
                  title="Pha 2: Bổ nhào xuống ôm khít biên dạng vật thể, khóa nón ma sát Coulomb và lực kẹp 28.5N"
                >
                  <Zap className="w-3 h-3 text-amber-400 animate-pulse" /> 2. Bổ Nhào Nắm Vật (70%)
                </button>

                {/* 3. Lift Phase Third */}
                <button
                  onClick={() => executeManipulation('lift')}
                  className={`px-2 py-1 rounded transition-all flex items-center gap-1 ${
                    manipulation.action === 'lift' || graspTimelinePct > 70
                      ? 'bg-[#a06bff] text-white font-bold shadow-md shadow-[#a06bff]/30'
                      : 'bg-white/5 hover:bg-white/10 text-slate-200'
                  }`}
                  title="Pha 3: Nhấc bổng vật thể lên +15cm khỏi bệ thí nghiệm"
                >
                  <ArrowUpRight className="w-3 h-3" /> 3. Nâng Vật (+15cm)
                </button>

                {/* 4. Rotate */}
                <button
                  onClick={() => executeManipulation('rotate')}
                  className={`px-2 py-1 rounded transition-all ${
                    manipulation.action === 'rotate'
                      ? 'bg-[#a06bff] text-white font-bold'
                      : 'bg-white/5 hover:bg-white/10 text-slate-200'
                  }`}
                  title="Xoay cổ tay và vật thể ±35° theo phương ngang"
                >
                  4. Xoay (±35°)
                </button>

                {/* 5. Compliance */}
                <button
                  onClick={() => executeManipulation('compliance_test')}
                  className={`px-2 py-1 rounded transition-all ${
                    manipulation.action === 'compliance_test'
                      ? 'bg-[#a06bff] text-white font-bold'
                      : 'bg-white/5 hover:bg-white/10 text-slate-200'
                  }`}
                  title="Đo độ biến dạng đàn hồi của vật thể và đệm ngón silicon"
                >
                  5. Đo Đàn Hồi (Δx)
                </button>

                {/* 6. Release */}
                <button
                  onClick={() => executeManipulation('release')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-rose-500/20 hover:text-rose-300 text-slate-300 transition-colors ml-auto flex items-center gap-1"
                  title="Hạ vật thể về lại bệ đỡ và thu tay về tư thế nghỉ"
                >
                  <RotateCcw className="w-3 h-3" /> Nhả Vật Về Bàn (0%)
                </button>
              </div>

              {/* 5-Finger Tactile Contact & Force Closure Status Matrix HUD */}
              <div className="mt-1 pt-1.5 border-t border-white/10 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[#2ee6c8] text-[9.5px] font-bold flex items-center gap-1 uppercase tracking-wider">
                    <Activity className="w-3 h-3 text-[#2ee6c8]" />
                    Ma Trận Tiếp Xúc 5 Ngón (Force Closure):
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[8.5px] font-bold font-mono tracking-tight ${
                      (manipulation.graspPhasePercent ?? 0) >= 35 || forceN > 2.0
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-white/5 text-slate-400 border border-white/10'
                    }`}
                  >
                    {(manipulation.graspPhasePercent ?? 0) >= 35 || forceN > 2.0
                      ? '● KHÓA CÂN BẰNG KHÉP KÍN (ISO 10218)'
                      : '○ CHỜ KHÓA TIẾP XÚC'}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1">
                  {fingerContactStatus.map((f: { id: string; name: string; contact: boolean; force: number; angle: string; role: string }) => (
                    <div
                      key={f.id}
                      className={`p-1 rounded border transition-all text-center ${
                        f.contact
                          ? 'bg-[#2ee6c8]/10 border-[#2ee6c8]/40 shadow-sm shadow-[#2ee6c8]/10'
                          : 'bg-black/40 border-white/5 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[8.5px]">
                        <span className="font-bold text-slate-200">{f.name}</span>
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            f.contact ? 'bg-[#2ee6c8] animate-pulse' : 'bg-slate-600'
                          }`}
                        />
                      </div>
                      <div className="text-[10px] font-bold tabular-nums text-[#2ee6c8] mt-0.5">
                        {f.force > 0 ? `${f.force.toFixed(1)}N` : '0N'}
                      </div>
                      <div className="text-[7.5px] text-slate-400 truncate mt-0.2" title={f.role}>
                        {f.angle}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full flex-1 cursor-grab active:cursor-grabbing" />

      {/* Overlay telemetry badges */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-2 pointer-events-none">
        <div className="bg-[#091222]/90 border border-[#2ee6c8]/25 rounded-md px-2.5 py-1 backdrop-blur-md">
          <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-mono">Lực Pháp Tuyến (Fn)</span>
          <span className="text-sm font-bold font-mono text-[#2ee6c8] tabular-nums">
            {forceN.toFixed(2)} <span className="text-[10px] text-slate-400">N</span>
          </span>
        </div>
        <div className="bg-[#091222]/90 border border-[#a06bff]/25 rounded-md px-2.5 py-1 backdrop-blur-md">
          <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-mono">Áp Suất Tiếp Xúc (FSR)</span>
          <span className="text-sm font-bold font-mono text-[#a06bff] tabular-nums">
            {pressureKPa.toFixed(1)} <span className="text-[10px] text-slate-400">kPa</span>
          </span>
        </div>
        <div className="bg-[#091222]/90 border border-emerald-500/25 rounded-md px-2.5 py-1 backdrop-blur-md">
          <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-mono">Biến Dạng Đàn Hồi (Δx)</span>
          <span className="text-sm font-bold font-mono text-emerald-400 tabular-nums">
            {manipulation.complianceDeformationMm.toFixed(1)} <span className="text-[10px] text-slate-400">mm</span>
          </span>
        </div>
        <div className="bg-[#091222]/90 border border-sky-500/25 rounded-md px-2.5 py-1 backdrop-blur-md">
          <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-mono">Độ Cao Thao Tác (H)</span>
          <span className="text-sm font-bold font-mono text-sky-400 tabular-nums">
            {manipulation.liftHeightCm.toFixed(1)} <span className="text-[10px] text-slate-400">cm</span>
          </span>
        </div>
        <div className="bg-[#091222]/90 border border-amber-500/25 rounded-md px-2.5 py-1 backdrop-blur-md">
          <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-mono">Góc Xoay Vật Thể (θ)</span>
          <span className="text-sm font-bold font-mono text-amber-400 tabular-nums">
            {manipulation.rotationAngleDeg > 0 ? `+${manipulation.rotationAngleDeg.toFixed(0)}°` : '0°'}
          </span>
        </div>
      </div>

      {/* Camera View Switcher Bar & Hologram Skin Control Drawer Trigger */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 flex-wrap">
        {/* Hologram Settings Toggle Box */}
        {hologramConfig.enabled && (
          <div className="flex items-center gap-1.5 bg-[#0a1220]/90 border border-[#2ee6c8]/30 px-2 py-1 rounded-lg backdrop-blur-md text-[10px] font-mono">
            <span className="text-slate-400">Độ Mờ Vỏ:</span>
            <input
              type="range"
              min="0.1"
              max="0.85"
              step="0.05"
              value={hologramConfig.opacity}
              onChange={e => setHologramConfig(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
              className="w-16 accent-[#2ee6c8] cursor-pointer"
            />
            <span className="text-[#2ee6c8] tabular-nums font-bold">
              {Math.round(hologramConfig.opacity * 100)}%
            </span>

            <div className="h-3 w-px bg-white/10 mx-1" />

            {/* Hologram Color Chooser */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setHologramConfig(prev => ({ ...prev, color: '#2ee6c8' }))}
                title="Màu Cyan Sinh Học"
                className={`w-3.5 h-3.5 rounded-full bg-[#2ee6c8] ${hologramConfig.color === '#2ee6c8' ? 'ring-2 ring-white' : ''}`}
              />
              <button
                onClick={() => setHologramConfig(prev => ({ ...prev, color: '#10b981' }))}
                title="Màu Xanh Y Tế (Emerald)"
                className={`w-3.5 h-3.5 rounded-full bg-[#10b981] ${hologramConfig.color === '#10b981' ? 'ring-2 ring-white' : ''}`}
              />
              <button
                onClick={() => setHologramConfig(prev => ({ ...prev, color: '#38bdf8' }))}
                title="Màu Lam Lạnh (Sky)"
                className={`w-3.5 h-3.5 rounded-full bg-[#38bdf8] ${hologramConfig.color === '#38bdf8' ? 'ring-2 ring-white' : ''}`}
              />
              <button
                onClick={() => setHologramConfig(prev => ({ ...prev, color: '#a06bff' }))}
                title="Màu Tím Lưới Thần Kinh (Violet)"
                className={`w-3.5 h-3.5 rounded-full bg-[#a06bff] ${hologramConfig.color === '#a06bff' ? 'ring-2 ring-white' : ''}`}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 bg-[#0a1220]/95 border border-white/15 p-1 rounded-lg backdrop-blur-md shadow-xl">
          <span className="text-[10px] font-mono text-slate-400 px-1 hidden sm:flex items-center gap-1">
            <Compass className="w-3 h-3 text-[#2ee6c8]" /> Góc Nhìn:
          </span>
          <button
            onClick={() => setCameraView('wide')}
            title="Góc nhìn xa toàn cảnh: thấy rõ toàn bộ cánh tay, bàn tay, vật thể và bàn thao tác"
            className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors font-bold ${
              camView === 'wide' ? 'bg-[#2ee6c8] text-black shadow' : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            TOÀN CẢNH XA
          </button>
          <button
            onClick={() => setCameraView('iso')}
            title="Góc nhìn Isometric 3D tiêu chuẩn"
            className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
              camView === 'iso' ? 'bg-[#2ee6c8] text-black font-semibold' : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            ISO CHUẨN
          </button>
          <button
            onClick={() => setCameraView('front')}
            title="Nhìn trực diện từ phía trước"
            className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
              camView === 'front' ? 'bg-[#2ee6c8] text-black font-semibold' : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            CHÍNH DIỆN
          </button>
          <button
            onClick={() => setCameraView('side')}
            title="Nhìn cạnh bên để thấy độ cong ngón và khe hở kẹp"
            className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
              camView === 'side' ? 'bg-[#2ee6c8] text-black font-semibold' : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            CẠNH BÊN
          </button>
          <button
            onClick={() => setCameraView('top')}
            title="Nhìn thẳng từ trên xuống"
            className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
              camView === 'top' ? 'bg-[#2ee6c8] text-black font-semibold' : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            TRÊN XUỐNG
          </button>

          <div className="h-3.5 w-px bg-white/15 mx-0.5" />

          {/* Direct Zoom Controls */}
          <button
            onClick={() => handleZoom('in')}
            title="Thu phóng gần (Zoom In)"
            className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleZoom('out')}
            title="Góc nhìn xa hơn nữa (Zoom Out)"
            className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetCamera}
            title="Đặt lại camera về góc xa mặc định"
            className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="h-3.5 w-px bg-white/15 mx-0.5" />

          {/* Fullscreen Expand Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Thu nhỏ khung mô phỏng (Esc)" : "Mở rộng toàn màn hình (Fullscreen)"}
            className={`p-1 px-1.5 rounded transition-colors flex items-center gap-1 text-[10px] font-mono ${
              isFullscreen ? 'bg-[#a06bff] text-white font-bold' : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Thu Nhỏ</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Toàn Màn Hình</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Manual Sliders Drawer for 5 Fingers */}
      {showSliders && (
        <div className="absolute top-12 right-3 z-20 w-64 bg-[#080e1b]/95 border border-[#a06bff]/40 rounded-xl p-3.5 shadow-2xl backdrop-blur-lg animate-in fade-in slide-in-from-top-3">
          <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-white/10">
            <span className="text-xs font-mono font-bold text-[#a06bff] flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> GÓC CO 5 NGÓN (FK)
            </span>
            <button
              onClick={() => setShowSliders(false)}
              className="text-slate-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            {(['thumb', 'index', 'middle', 'ring', 'pinky'] as const).map(finger => (
              <div key={finger} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400 capitalize">{finger}</span>
                  <span className="text-[#2ee6c8] tabular-nums font-semibold">
                    {Math.round(jointAngles[finger] * 100)}% ({Math.round(jointAngles[finger] * 90)}°)
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={jointAngles[finger]}
                  onChange={e => handleSliderChange(finger, parseFloat(e.target.value))}
                  className="w-full accent-[#2ee6c8] bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            ))}

            <div className="pt-2 border-t border-white/10 flex justify-between">
              <button
                onClick={() => handleApplyGraspPreset('extension')}
                className="px-2 py-1 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Duỗi Thẳng (0°)
              </button>
              <button
                onClick={() => handleApplyGraspPreset('power')}
                className="px-2 py-1 text-[10px] rounded bg-[#2ee6c8]/20 hover:bg-[#2ee6c8]/30 text-[#2ee6c8]"
              >
                Nắm Chặt (100%)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
