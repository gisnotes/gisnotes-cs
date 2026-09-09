<template>
  <demo-box :codeBlocks>
    <div class="uav-monitor-container">
      <!-- 三维地球容器 -->
      <div class="box" ref="viewerRef"></div>

      <!-- 无人机实时遥测 HUD 仪表盘 (Glassmorphism 工业科技风) -->
      <div class="uav-hud-panel">
        <!-- 头部状态栏 -->
        <div class="hud-header">
          <div class="hud-title-box">
            <span
              class="hud-status-dot"
              :class="{ paused: !state.isStreaming }"
            ></span>
            <span class="hud-title">UAV-X80 线性巡检 · 圆锥扫描监控</span>
          </div>
          <span
            class="hud-badge"
            :class="state.isStreaming ? 'badge-live' : 'badge-pause'"
          >
            {{ state.isStreaming ? "实时推流扫描中" : "推流已暂停 (悬停)" }}
          </span>
        </div>

        <!-- 核心飞行指标卡片网格 (2x2) -->
        <div class="hud-grid">
          <div class="hud-metric-card">
            <div class="metric-label">实时地速 (Speed)</div>
            <div class="metric-value-row">
              <span class="metric-value">{{ telemetry.speed.toFixed(1) }}</span>
              <span class="metric-unit">km/h</span>
            </div>
          </div>
          <div class="hud-metric-card">
            <div class="metric-label">巡检高程 (Altitude)</div>
            <div class="metric-value-row">
              <span class="metric-value">{{ telemetry.alt.toFixed(1) }}</span>
              <span class="metric-unit">m</span>
            </div>
          </div>
          <div class="hud-metric-card">
            <div class="metric-label">已巡检总航程</div>
            <div class="metric-value-row">
              <span class="metric-value">{{
                (telemetry.totalDistance / 1000).toFixed(2)
              }}</span>
              <span class="metric-unit">km</span>
            </div>
          </div>
          <div class="hud-metric-card">
            <div class="metric-label">当前航段节点</div>
            <div class="metric-value-row">
              <span class="metric-value">WP#{{ state.pointCount }}</span>
              <span class="metric-unit">/ {{ ALL_PATROL_WAYPOINTS.length }}</span>
            </div>
          </div>
        </div>

        <!-- 航线起终点与当前目标点信息 -->
        <div class="hud-target-row">
          <span class="target-tag">巡检目标</span>
          <span class="target-name">{{ telemetry.currentWpName }}</span>
        </div>

        <!-- 经纬度动态坐标读数 -->
        <div class="hud-coords">
          <div class="coord-item">
            <span class="coord-tag">LON</span>
            <span class="coord-val">{{ telemetry.lon.toFixed(6) }}° E</span>
          </div>
          <div class="coord-item">
            <span class="coord-tag">LAT</span>
            <span class="coord-val">{{ telemetry.lat.toFixed(6) }}° N</span>
          </div>
        </div>

        <!-- 机载系统与通信链路状态 -->
        <div class="hud-subsystems">
          <div class="sub-item">
            <span class="sub-label">机载电池</span>
            <div class="battery-bar">
              <div
                class="battery-inner"
                :style="{ width: telemetry.battery + '%' }"
              ></div>
            </div>
            <span class="sub-val">{{ telemetry.battery }}%</span>
          </div>
          <div class="sub-item">
            <span class="sub-label">光电载荷</span>
            <span class="sub-val text-cyan">激光雷达圆锥扫描</span>
          </div>
          <div class="sub-item">
            <span class="sub-label">RTK 定位</span>
            <span class="sub-val text-green"
              >FIX 厘米级 ({{ telemetry.satellites }}星)</span
            >
          </div>
        </div>

        <!-- 快捷操作栏 -->
        <div class="hud-actions">
          <button
            class="hud-btn"
            :class="{ active: state.isStreaming }"
            @click="toggleStreaming"
          >
            {{ state.isStreaming ? "暂停推流" : "恢复推流" }}
          </button>
          <button
            class="hud-btn"
            :class="{ active: state.cameraMode === '伴飞跟踪' }"
            @click="toggleFollowView"
          >
            {{ state.cameraMode === "伴飞跟踪" ? "释放跟踪" : "伴飞视角" }}
          </button>
          <button class="hud-btn" @click="stepStream">单步推流</button>
          <button class="hud-btn" @click="resetTrajectory">重置任务</button>
        </div>
      </div>
    </div>
  </demo-box>
</template>

<script setup name="CzmlDroneInspection">
import DemoBox from "@/components/DemoBox/index.vue";
import IndexSourceCode from "./index.vue?raw";
import CesiumSourceCode from "@/utils/cesium.js?raw";
import worldImage from "@/assets/images/worldimage.jpg";

import Cesium from "cesium";
import "cesium/Build/CesiumUnminified/Widgets/widgets.css";
import { createViewer, optimizeViewerQuality } from "@/utils/cesium";

const codeBlocks = ref([
  {
    fileName: "@/views/trajectory/czmlDroneInspection/index.vue",
    rawCode: IndexSourceCode,
    language: "html",
  },
  {
    fileName: "@/utils/cesium.js",
    rawCode: CesiumSourceCode,
    language: "javascript",
  },
]);

const viewerDivRef = useTemplateRef("viewerRef");

let viewer = null;
let timer = null;
let dataSource = null;
let targetEntity = null;
let plannedRouteEntity = null;
let scanConeEntity = null;
let scanFootprintEntity = null;
let scanCenterEntity = null;
let removeTickListener = null;

// 起点、终点及各要素实体池
const startEndEntities = [];
let samplePointEntities = [];

// CZML 仿真基准时钟配置
const START_TIME = "2024-06-15T08:00:00Z";
const STOP_TIME = "2024-06-15T12:00:00Z";
let epochDate = null;

// 非闭合单向线性巡检航线序列：从【起点】运维指挥中心 沿输电线路巡视至 【终点】北区智慧变电站
const ALL_PATROL_WAYPOINTS = [
  { lon: 118.8785, lat: 30.9568, alt: 60.0, name: "运维指挥中心" }, // 起点
  { lon: 118.877, lat: 30.9572, alt: 70.0, name: "线路#01跨越塔" }, // WP2
  { lon: 118.8752, lat: 30.9578, alt: 80.0, name: "线路#02耐张塔" }, // WP3
  { lon: 118.8735, lat: 30.9586, alt: 88.0, name: "220kV进线终端塔" }, // WP4
  { lon: 118.8718, lat: 30.9598, alt: 95.0, name: "主变压器巡检位" }, // WP5
  { lon: 118.8705, lat: 30.9612, alt: 100.0, name: "微波通信铁塔" }, // WP6
  { lon: 118.8692, lat: 30.9628, alt: 95.0, name: "光伏电站汇集站" }, // WP7
  { lon: 118.8678, lat: 30.9642, alt: 85.0, name: "北区高压配电所" }, // WP8
  { lon: 118.866, lat: 30.9655, alt: 75.0, name: "输电出线跨河塔" }, // WP9
  { lon: 118.8642, lat: 30.9668, alt: 60.0, name: "北区智慧变电站" }, // 终点 (WP10)
];

// 起飞前在起点的驻留等待时机 (秒)，保证开局看清起点与起航姿态
const TAKEOFF_DELAY = 1.5;

// 航段推流时序指针
let currentWpIndex = 0;
let targetWpIndex = 1;
let currentLegStartTime = 0.0;
let currentLegEndTime = 5.5;
let isStepStreaming = false;

// 响应式状态管理
const state = reactive({
  pointCount: 1,
  isStreaming: true,
  streamingStatus: "无人机位于起点机巢 (准备就绪)",
  multiplier: 2,
  isAnimating: true,
  cameraMode: "全线概览",
});

// 遥测实时指标
const telemetry = reactive({
  speed: 0.0,
  alt: 60.0,
  lon: 118.8785,
  lat: 30.9568,
  totalDistance: 0,
  battery: 98,
  satellites: 18,
  delay: 12,
  currentWpName: "【起点】运维指挥中心 (整装待发)",
});

onMounted(() => {
  timer = setTimeout(() => {
    init();
  }, 0);
});

async function init() {
  epochDate = Cesium.JulianDate.fromIso8601(START_TIME);

  // 1. 创建单张全球瓦片底图
  const baseLayer = Cesium.ImageryLayer.fromProviderAsync(
    Cesium.SingleTileImageryProvider.fromUrl(worldImage),
  );

  // 2. 初始化 Viewer (关闭阴影)
  viewer = createViewer(viewerDivRef.value, {
    baseLayer,
    shadows: false,
  });

  // 3. 开启抗锯齿与高品质渲染
  optimizeViewerQuality(viewer, { msaaSamples: 4, enableFxaa: false });

  // 4. 默认第一视角：直接锁定在【起点】正前上方，开箱即见起点！
  setInitialCameraView();

  // 5. 绘制显眼的【起点】(绿) 与【终点】(红) 地标及地面停机坪
  initStartAndEndMarkers();

  // 6. 绘制非闭合的预设规划航线虚线底图
  initPlannedRouteLine();

  // 7. 创建单一 CzmlDataSource 实例并挂载
  dataSource = new Cesium.CzmlDataSource("dynamic_czml_stream");
  await viewer.dataSources.add(dataSource);

  // 8. 加载初始 CZML 无人机数据（在起点驻留 1.5s 后起飞）
  await loadInitialData();

  // 9. 创建无人机传感器动态三维高科技扫描圆锥体 (Cone Beam)
  initScanCone();

  // 10. 启动帧率驱动的推流-航行严格同步时钟监听器
  setupSynchronizedTick();

  // 11. 监听 trackedEntity 变化同步视角状态
  viewer.trackedEntityChanged.addEventListener((entity) => {
    state.cameraMode = entity ? "伴飞跟踪" : "自由漫游";
  });
}

/**
 * 默认第一视角定位：直接正对【起点】机巢、无人机与整条西北向航线
 */
function setInitialCameraView() {
  if (!viewer) return;
  viewer.trackedEntity = undefined;
  state.cameraMode = "全线概览";
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(118.8825, 30.953, 480.0),
    orientation: {
      heading: Cesium.Math.toRadians(318),
      pitch: Cesium.Math.toRadians(-26),
      roll: 0,
    },
  });
}

/**
 * 绘制独立的【起点】(绿色) 与【终点】(红色) 地标
 * 关键优化：
 * 1. 停机坪与地标统一锚定在地面 (height: 0)，而非 60 米高空无人机所在位置；
 * 2. 移除中空的实心 Point，避免在俯视图中出现大圆点盖住无人机模型；
 * 3. 移除 disableDepthTestDistance: Infinity，恢复正常的 WebGL 深度测试，
 *    在俯视图中处于 60 米高空的无人机天然位于地面停机坪上方，绝不被遮挡。
 */
function initStartAndEndMarkers() {
  const startWp = ALL_PATROL_WAYPOINTS[0];
  const endWp = ALL_PATROL_WAYPOINTS[ALL_PATROL_WAYPOINTS.length - 1];

  // 1. 起点地面停机坪 (height: 0) + 悬浮文字
  const startPad = viewer.entities.add({
    name: "起点停机坪",
    position: Cesium.Cartesian3.fromDegrees(startWp.lon, startWp.lat, 0),
    ellipse: {
      semiMinorAxis: 18.0,
      semiMajorAxis: 18.0,
      material: Cesium.Color.fromCssColorString("#10B981").withAlpha(0.25),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString("#10B981"),
      outlineWidth: 2.0,
      height: 0,
    },
    label: {
      text: `🚩 起点: ${startWp.name}`,
      font: "bold 12px sans-serif",
      fillColor: Cesium.Color.fromCssColorString("#10B981"),
      outlineColor: Cesium.Color.fromCssColorString("#022c22"),
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, 24),
      verticalOrigin: Cesium.VerticalOrigin.TOP,
    },
  });
  startEndEntities.push(startPad);

  // 起点地面中心十字准星
  const startCenter = viewer.entities.add({
    name: "起点停机坪靶心",
    position: Cesium.Cartesian3.fromDegrees(startWp.lon, startWp.lat, 0),
    point: {
      pixelSize: 6,
      color: Cesium.Color.fromCssColorString("#10B981"),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 1.5,
    },
  });
  startEndEntities.push(startCenter);

  // 起点垂直起飞通道虚线 (从地面 0m 连接至起飞悬停高度 60m)
  const startCorridor = viewer.entities.add({
    name: "起点垂直起降通道",
    polyline: {
      positions: [
        Cesium.Cartesian3.fromDegrees(startWp.lon, startWp.lat, 0),
        Cesium.Cartesian3.fromDegrees(startWp.lon, startWp.lat, startWp.alt),
      ],
      width: 1.5,
      material: new Cesium.PolylineDashMaterialProperty({
        color: Cesium.Color.fromCssColorString("#10B981").withAlpha(0.6),
        dashLength: 6.0,
      }),
    },
  });
  startEndEntities.push(startCorridor);

  // 2. 终点地面降落坪 (height: 0) + 悬浮文字
  const endPad = viewer.entities.add({
    name: "终点降落坪",
    position: Cesium.Cartesian3.fromDegrees(endWp.lon, endWp.lat, 0),
    ellipse: {
      semiMinorAxis: 18.0,
      semiMajorAxis: 18.0,
      material: Cesium.Color.fromCssColorString("#EF4444").withAlpha(0.25),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString("#EF4444"),
      outlineWidth: 2.0,
      height: 0,
    },
    label: {
      text: `🏁 终点: ${endWp.name}`,
      font: "bold 12px sans-serif",
      fillColor: Cesium.Color.fromCssColorString("#EF4444"),
      outlineColor: Cesium.Color.fromCssColorString("#450a0a"),
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, 24),
      verticalOrigin: Cesium.VerticalOrigin.TOP,
    },
  });
  startEndEntities.push(endPad);

  // 终点地面中心十字准星
  const endCenter = viewer.entities.add({
    name: "终点降落坪靶心",
    position: Cesium.Cartesian3.fromDegrees(endWp.lon, endWp.lat, 0),
    point: {
      pixelSize: 6,
      color: Cesium.Color.fromCssColorString("#EF4444"),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 1.5,
    },
  });
  startEndEntities.push(endCenter);

  // 终点垂直降落通道虚线
  const endCorridor = viewer.entities.add({
    name: "终点垂直降落通道",
    polyline: {
      positions: [
        Cesium.Cartesian3.fromDegrees(endWp.lon, endWp.lat, 0),
        Cesium.Cartesian3.fromDegrees(endWp.lon, endWp.lat, endWp.alt),
      ],
      width: 1.5,
      material: new Cesium.PolylineDashMaterialProperty({
        color: Cesium.Color.fromCssColorString("#EF4444").withAlpha(0.6),
        dashLength: 6.0,
      }),
    },
  });
  startEndEntities.push(endCorridor);
}

/**
 * 绘制非闭合的规划巡检航线虚线
 */
function initPlannedRouteLine() {
  const positions = ALL_PATROL_WAYPOINTS.map((wp) =>
    Cesium.Cartesian3.fromDegrees(wp.lon, wp.lat, wp.alt),
  );

  plannedRouteEntity = viewer.entities.add({
    name: "预设规划巡检航线",
    polyline: {
      positions,
      width: 2.0,
      material: new Cesium.PolylineDashMaterialProperty({
        color: Cesium.Color.fromCssColorString("#94a3b8").withAlpha(0.45),
        dashLength: 12.0,
      }),
    },
  });
}

/**
 * 绘制中间经过的黄色空心航路点（到达该点后立即标记）
 */
function addHollowYellowPoint(lon, lat, alt, index, timeSec, wpName) {
  if (!viewer) return;

  const entity = viewer.entities.add({
    name: `航路点 WP#${index} - ${wpName} (${timeSec.toFixed(0)}s)`,
    position: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
    point: {
      pixelSize: 12,
      color: Cesium.Color.TRANSPARENT,
      outlineColor: Cesium.Color.fromCssColorString("#FFD700"),
      outlineWidth: 3.0,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text: `WP#${index} ${wpName}`,
      font: "bold 11px sans-serif",
      fillColor: Cesium.Color.fromCssColorString("#FFD700"),
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, 18),
      verticalOrigin: Cesium.VerticalOrigin.TOP,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });

  samplePointEntities.push(entity);
  return entity;
}

/**
 * 清理所有黄色空心航点
 */
function clearSamplePointEntities() {
  if (!viewer) return;
  for (const entity of samplePointEntities) {
    viewer.entities.remove(entity);
  }
  samplePointEntities = [];
}

/**
 * 计算两点间根据巡航速度 (15 m/s ≈ 54 km/h) 所需的飞行耗时
 */
function calculateLegDuration(wpA, wpB) {
  const pA = Cesium.Cartesian3.fromDegrees(wpA.lon, wpA.lat, wpA.alt);
  const pB = Cesium.Cartesian3.fromDegrees(wpB.lon, wpB.lat, wpB.alt);
  const dist = Cesium.Cartesian3.distance(pA, pB);
  const cruiseSpeed = 15.0;
  return Math.max(3.0, dist / cruiseSpeed);
}

/**
 * 组装初始 CZML 数据包
 */
function buildInitialCzml() {
  const wp1 = ALL_PATROL_WAYPOINTS[0];
  const wp2 = ALL_PATROL_WAYPOINTS[1];
  const legDuration = calculateLegDuration(wp1, wp2);

  currentLegStartTime = TAKEOFF_DELAY;
  currentLegEndTime = TAKEOFF_DELAY + legDuration;
  currentWpIndex = 0;
  targetWpIndex = 1;

  const flatCoords = [
    0.0,
    wp1.lon,
    wp1.lat,
    wp1.alt,
    TAKEOFF_DELAY,
    wp1.lon,
    wp1.lat,
    wp1.alt,
    currentLegEndTime,
    wp2.lon,
    wp2.lat,
    wp2.alt,
  ];

  const droneModelUri = `${import.meta.env.BASE_URL}SampleData/models/CesiumDrone/CesiumDrone.glb`;

  return [
    {
      id: "document",
      name: "uav_inspection_czml",
      version: "1.0",
      clock: {
        interval: `${START_TIME}/${STOP_TIME}`,
        currentTime: START_TIME,
        multiplier: state.multiplier,
        range: "UNBOUNDED",
      },
    },
    {
      id: "uav_target",
      name: "UAV-X80 巡检无人机",
      availability: `${START_TIME}/${STOP_TIME}`,
      // 1. 无人机三维模型
      model: {
        gltf: droneModelUri,
        scale: 12.0,
        minimumPixelSize: 48,
        maximumScale: 120,
        runAnimations: true,
      },
      // 2. 运动切线自动航向朝向
      orientation: {
        velocityReference: "#position",
      },
      // 3. 悬浮状态信息标签
      label: {
        text: "UAV-X80 [激光雷达扫描中]",
        font: "bold 13px sans-serif",
        fillColor: {
          rgba: [240, 255, 255, 255],
        },
        outlineColor: {
          rgba: [0, 24, 48, 255],
        },
        outlineWidth: 3,
        style: "FILL_AND_OUTLINE",
        pixelOffset: {
          cartesian2: [0, -42],
        },
        verticalOrigin: "BOTTOM",
      },
      // 4. 巡检航迹线：leadTime 严格为 0，前方绝无虚假预绘制
      path: {
        material: {
          solidColor: {
            color: {
              rgba: [0, 230, 255, 255],
            },
          },
        },
        width: 4.0,
        show: true,
        leadTime: 0,
        trailTime: 7200,
        resolution: 1,
      },
      // 6. 线性精准通过航路点
      position: {
        interpolationAlgorithm: "LINEAR",
        interpolationDegree: 1,
        epoch: START_TIME,
        cartographicDegrees: flatCoords,
      },
    },
  ];
}

/**
 * 加载初始数据并设置时钟基准
 */
async function loadInitialData() {
  clearSamplePointEntities();

  state.pointCount = 1;
  telemetry.totalDistance = 0;
  telemetry.currentWpName = `【起点】运维指挥中心 (驻留准备)`;

  await dataSource.load(buildInitialCzml());
  targetEntity = dataSource.entities.getById("uav_target");

  if (targetEntity) {
    targetEntity.orientation = new Cesium.VelocityOrientationProperty(
      targetEntity.position,
    );
  }

  // 校准时钟
  const stopDate = Cesium.JulianDate.fromIso8601(STOP_TIME);
  viewer.clock.startTime = epochDate.clone();
  viewer.clock.stopTime = stopDate.clone();
  viewer.clock.currentTime = epochDate.clone();
  viewer.clock.clockRange = Cesium.ClockRange.UNBOUNDED;
  viewer.clock.multiplier = state.multiplier;
  viewer.clock.shouldAnimate = state.isAnimating;
}

/**
 * 动态圆锥底面半径计算 (模拟 FOV 约 42°：底面半径随高度自适应，高空视野大、低空精度高)
 */
function getScanRadius(altitude) {
  return Math.max(16.0, altitude * 0.38);
}

/**
 * 初始化无人机机载传感器动态高科技「圆锥扫描体」 (Circular Cone Beam)
 * 具备平滑半透明发光圆锥面、4 条激光母线与地面探测雷达环
 */
function initScanCone() {
  // 1. 三维动态平滑发光圆锥体 (Cylinder with topRadius 0.1)
  scanConeEntity = viewer.entities.add({
    name: "激光雷达动态扫描圆锥",
    position: new Cesium.CallbackProperty(() => {
      if (!targetEntity) return undefined;
      const pos = targetEntity.position.getValue(viewer.clock.currentTime);
      if (!pos) return undefined;
      const carto = Cesium.Cartographic.fromCartesian(pos);
      // 圆锥中心位于无人机机腹与地面正中间
      return Cesium.Cartesian3.fromDegrees(
        Cesium.Math.toDegrees(carto.longitude),
        Cesium.Math.toDegrees(carto.latitude),
        Math.max(1.0, carto.height / 2),
      );
    }, false),
    cylinder: {
      length: new Cesium.CallbackProperty(() => {
        if (!targetEntity) return 0;
        const pos = targetEntity.position.getValue(viewer.clock.currentTime);
        if (!pos) return 0;
        return Math.max(2.0, Cesium.Cartographic.fromCartesian(pos).height);
      }, false),
      topRadius: 0.1, // 顶点尖端在无人机机腹
      bottomRadius: new Cesium.CallbackProperty(() => {
        if (!targetEntity) return 20.0;
        const pos = targetEntity.position.getValue(viewer.clock.currentTime);
        if (!pos) return 20.0;
        const h = Cesium.Cartographic.fromCartesian(pos).height;
        return getScanRadius(h);
      }, false),
      material: Cesium.Color.fromCssColorString("#00E5FF").withAlpha(0.18),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString("#00F0FF").withAlpha(0.6),
      numberOfVerticalLines: 4, // 4条精致对称的激光导向母线
      slices: 64, // 64切片极致平滑圆润
    },
  });

  // 2. 地面动态圆形扫描画幅 (雷达底面光斑)
  scanFootprintEntity = viewer.entities.add({
    name: "地面雷达扫描画幅",
    position: new Cesium.CallbackProperty(() => {
      if (!targetEntity) return undefined;
      const pos = targetEntity.position.getValue(viewer.clock.currentTime);
      if (!pos) return undefined;
      const carto = Cesium.Cartographic.fromCartesian(pos);
      return Cesium.Cartesian3.fromDegrees(
        Cesium.Math.toDegrees(carto.longitude),
        Cesium.Math.toDegrees(carto.latitude),
        0,
      );
    }, false),
    ellipse: {
      semiMinorAxis: new Cesium.CallbackProperty(() => {
        if (!targetEntity) return 20.0;
        const pos = targetEntity.position.getValue(viewer.clock.currentTime);
        if (!pos) return 20.0;
        return getScanRadius(Cesium.Cartographic.fromCartesian(pos).height);
      }, false),
      semiMajorAxis: new Cesium.CallbackProperty(() => {
        if (!targetEntity) return 20.0;
        const pos = targetEntity.position.getValue(viewer.clock.currentTime);
        if (!pos) return 20.0;
        return getScanRadius(Cesium.Cartographic.fromCartesian(pos).height);
      }, false),
      material: Cesium.Color.fromCssColorString("#00E5FF").withAlpha(0.22),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString("#00F0FF").withAlpha(0.85),
      outlineWidth: 2.0,
      height: 0,
    },
  });

  // 3. 地面中心准星瞄准点
  scanCenterEntity = viewer.entities.add({
    name: "地面准星瞄准点",
    position: new Cesium.CallbackProperty(() => {
      if (!targetEntity) return undefined;
      const pos = targetEntity.position.getValue(viewer.clock.currentTime);
      if (!pos) return undefined;
      const carto = Cesium.Cartographic.fromCartesian(pos);
      return Cesium.Cartesian3.fromDegrees(
        Cesium.Math.toDegrees(carto.longitude),
        Cesium.Math.toDegrees(carto.latitude),
        0,
      );
    }, false),
    point: {
      pixelSize: 6,
      color: Cesium.Color.fromCssColorString("#00F0FF"),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 1.5,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });
}

/**
 * 实时同步时钟监听器
 */
let lastPos = null;
let lastTickTime = null;

function setupSynchronizedTick() {
  if (removeTickListener) {
    removeTickListener();
    removeTickListener = null;
  }

  removeTickListener = viewer.clock.onTick.addEventListener((clock) => {
    if (!targetEntity) return;

    const currentJulian = clock.currentTime;
    const currentSec = Cesium.JulianDate.secondsDifference(
      currentJulian,
      epochDate,
    );

    // 检查起飞驻留时段与航段终点
    if (currentSec < TAKEOFF_DELAY) {
      telemetry.speed = 0.0;
      telemetry.currentWpName = "【起点】运维指挥中心 (驻留起飞准备)";
      state.streamingStatus = "位于起点机巢 (准备启航)";
    } else if (currentSec >= currentLegEndTime - 0.05) {
      handleWaypointArrival(currentSec);
    }

    const pos = targetEntity.position.getValue(currentJulian);
    if (!pos) return;

    const carto = Cesium.Cartographic.fromCartesian(pos);
    telemetry.lon = Cesium.Math.toDegrees(carto.longitude);
    telemetry.lat = Cesium.Math.toDegrees(carto.latitude);
    telemetry.alt = carto.height;

    // 即时航速计算
    if (lastPos && lastTickTime) {
      const dt = Cesium.JulianDate.secondsDifference(
        currentJulian,
        lastTickTime,
      );
      if (dt > 0.02 && dt < 5.0) {
        const d = Cesium.Cartesian3.distance(lastPos, pos);
        const instantSpeed = (d / dt) * 3.6;
        if (!viewer.clock.shouldAnimate || currentSec < TAKEOFF_DELAY) {
          telemetry.speed = 0.0;
        } else if (instantSpeed < 180) {
          telemetry.speed = telemetry.speed * 0.7 + instantSpeed * 0.3;
        }
      }
    }
    lastPos = Cesium.Cartesian3.clone(pos, lastPos || new Cesium.Cartesian3());
    lastTickTime = Cesium.JulianDate.clone(
      currentJulian,
      lastTickTime || new Cesium.JulianDate(),
    );

    // 动力电池微量消耗模拟
    const elapsed = Math.max(0, currentSec);
    const bat = Math.max(
      20,
      Math.min(100, Math.round(98 - (elapsed / 600) * 15)),
    );
    telemetry.battery = bat;
  });
}

/**
 * 飞抵航点事件处理
 */
function handleWaypointArrival(currentSec) {
  if (currentWpIndex === targetWpIndex) return;

  const arrivedIndex = targetWpIndex;
  const arrivedWp = ALL_PATROL_WAYPOINTS[arrivedIndex];
  if (!arrivedWp) return;

  state.pointCount = arrivedIndex + 1;

  // 如果不是终点，则点亮中间黄色空心航点
  if (arrivedIndex < ALL_PATROL_WAYPOINTS.length - 1) {
    addHollowYellowPoint(
      arrivedWp.lon,
      arrivedWp.lat,
      arrivedWp.alt,
      state.pointCount,
      currentLegEndTime,
      arrivedWp.name,
    );
  }

  // 累计巡检航程
  const prevWp = ALL_PATROL_WAYPOINTS[currentWpIndex];
  const pPrev = Cesium.Cartesian3.fromDegrees(prevWp.lon, prevWp.lat, prevWp.alt);
  const pCurr = Cesium.Cartesian3.fromDegrees(
    arrivedWp.lon,
    arrivedWp.lat,
    arrivedWp.alt,
  );
  telemetry.totalDistance += Cesium.Cartesian3.distance(pPrev, pCurr);

  currentWpIndex = arrivedIndex;

  // 1. 如果已到达【终点】
  if (currentWpIndex >= ALL_PATROL_WAYPOINTS.length - 1) {
    viewer.clock.shouldAnimate = false;
    state.isAnimating = false;
    state.isStreaming = false;
    state.streamingStatus = "已飞抵【终点】北区变电站！巡检任务圆满完成";
    telemetry.currentWpName = "【终点】北区智慧变电站 (安全降落)";
    telemetry.speed = 0.0;
    return;
  }

  // 2. 单步推流处理
  if (isStepStreaming) {
    isStepStreaming = false;
    viewer.clock.shouldAnimate = false;
    state.isAnimating = false;
    state.streamingStatus = `单步到达 WP#${state.pointCount} (${arrivedWp.name})，已悬停`;
    telemetry.currentWpName = `悬停于 WP#${state.pointCount} (${arrivedWp.name})`;
    telemetry.speed = 0.0;
    return;
  }

  // 3. 暂停推流处理
  if (!state.isStreaming) {
    viewer.clock.shouldAnimate = false;
    state.isAnimating = false;
    state.streamingStatus = `推流已暂停 (悬停于 WP#${state.pointCount} ${arrivedWp.name})`;
    telemetry.currentWpName = `悬停于 WP#${state.pointCount} (${arrivedWp.name})`;
    telemetry.speed = 0.0;
    return;
  }

  // 4. 持续推流：同步推进下一航段
  pushNextSynchronizedLeg();
}

/**
 * 同步推送下一段航路点
 */
function pushNextSynchronizedLeg() {
  targetWpIndex = currentWpIndex + 1;
  if (targetWpIndex >= ALL_PATROL_WAYPOINTS.length) return;

  const fromWp = ALL_PATROL_WAYPOINTS[currentWpIndex];
  const nextWp = ALL_PATROL_WAYPOINTS[targetWpIndex];
  const legDuration = calculateLegDuration(fromWp, nextWp);

  currentLegStartTime = currentLegEndTime;
  currentLegEndTime = currentLegStartTime + legDuration;

  const nextSampleTime = Cesium.JulianDate.addSeconds(
    epochDate,
    currentLegEndTime,
    new Cesium.JulianDate(),
  );
  const nextPos = Cesium.Cartesian3.fromDegrees(
    nextWp.lon,
    nextWp.lat,
    nextWp.alt,
  );

  if (
    targetEntity.position &&
    typeof targetEntity.position.addSample === "function"
  ) {
    targetEntity.position.addSample(nextSampleTime, nextPos);
  }

  const deltaPacket = {
    id: "uav_target",
    position: {
      epoch: START_TIME,
      cartographicDegrees: [
        currentLegEndTime,
        nextWp.lon,
        nextWp.lat,
        nextWp.alt,
      ],
    },
  };
  dataSource.process(deltaPacket);

  const isFinal = targetWpIndex === ALL_PATROL_WAYPOINTS.length - 1;
  const targetPrefix = isFinal ? "【终点】" : `WP#${targetWpIndex + 1} `;
  telemetry.currentWpName = `前往 ${targetPrefix}(${nextWp.name})`;
  state.streamingStatus = `推流同步扫描飞往 ${targetPrefix}(${nextWp.name})`;

  viewer.clock.shouldAnimate = true;
  state.isAnimating = true;
}

/**
 * 伴飞跟踪与自由视角切换
 */
function toggleFollowView() {
  if (!viewer || !targetEntity) return;
  if (viewer.trackedEntity) {
    viewer.trackedEntity = undefined;
    state.cameraMode = "自由漫游";
  } else {
    viewer.trackedEntity = targetEntity;
    state.cameraMode = "伴飞跟踪";
  }
}

/**
 * 暂停 / 恢复推流
 */
function toggleStreaming(forceVal) {
  const nextState =
    typeof forceVal === "boolean" ? forceVal : !state.isStreaming;

  if (!nextState) {
    state.isStreaming = false;
    state.streamingStatus = `已下达暂停指令 (完成当前航段后悬停)`;
  } else {
    if (currentWpIndex >= ALL_PATROL_WAYPOINTS.length - 1) {
      resetTrajectory();
      return;
    }
    state.isStreaming = true;
    state.streamingStatus = "推流已恢复，无人机启航";
    viewer.clock.shouldAnimate = true;
    state.isAnimating = true;
    if (currentWpIndex === targetWpIndex) {
      pushNextSynchronizedLeg();
    }
  }
}

/**
 * 单步推流
 */
function stepStream() {
  if (currentWpIndex >= ALL_PATROL_WAYPOINTS.length - 1) {
    resetTrajectory();
    return;
  }
  isStepStreaming = true;
  state.isStreaming = false;
  state.streamingStatus = `单步推流中: 前往 WP#${currentWpIndex + 2}`;

  if (currentWpIndex === targetWpIndex) {
    pushNextSynchronizedLeg();
  } else {
    viewer.clock.shouldAnimate = true;
    state.isAnimating = true;
  }
}

/**
 * 重置巡检任务回起点，并自动校准回初始正面视角
 */
async function resetTrajectory() {
  isStepStreaming = false;
  state.isStreaming = true;
  state.streamingStatus = "无人机位于起点机巢 (准备就绪)";
  lastPos = null;
  lastTickTime = null;

  setInitialCameraView();
  await loadInitialData();
}

onBeforeUnmount(() => {
  clearSamplePointEntities();
  if (removeTickListener) {
    removeTickListener();
    removeTickListener = null;
  }
  if (timer) clearTimeout(timer);
  if (viewer) {
    viewer.trackedEntity = undefined;
    for (const entity of startEndEntities) {
      viewer.entities.remove(entity);
    }
    startEndEntities.length = 0;
    if (scanConeEntity) {
      viewer.entities.remove(scanConeEntity);
      scanConeEntity = null;
    }
    if (scanFootprintEntity) {
      viewer.entities.remove(scanFootprintEntity);
      scanFootprintEntity = null;
    }
    if (scanCenterEntity) {
      viewer.entities.remove(scanCenterEntity);
      scanCenterEntity = null;
    }
    if (plannedRouteEntity) {
      viewer.entities.remove(plannedRouteEntity);
      plannedRouteEntity = null;
    }
    if (dataSource && !viewer.isDestroyed()) {
      viewer.dataSources.remove(dataSource, true);
      dataSource = null;
    }
    viewer.destroy();
    viewer = null;
  }
});
</script>

<style lang="scss" scoped>
.uav-monitor-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.box {
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
}

/* 工业级无人机遥测 HUD 悬浮面板 */
.uav-hud-panel {
  position: absolute;
  bottom: 8px;
  left: 8px;
  z-index: 10;
  width: 340px;
  background: rgba(11, 22, 38, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 229, 255, 0.35);
  border-radius: 8px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.5),
    0 0 16px rgba(0, 229, 255, 0.12);
  color: #e2e8f0;
  padding: 14px 16px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
  pointer-events: auto;
  user-select: none;
  transition: all 0.3s ease;

  .hud-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    .hud-title-box {
      display: flex;
      align-items: center;

      .hud-status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #00e5ff;
        box-shadow: 0 0 8px #00e5ff;
        margin-right: 8px;
        animation: hud-pulse 1.8s infinite;

        &.paused {
          background: #eab308;
          box-shadow: 0 0 8px #eab308;
          animation: none;
        }
      }

      .hud-title {
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.5px;
        color: #f8fafc;
      }
    }

    .hud-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 500;

      &.badge-live {
        background: rgba(16, 185, 129, 0.2);
        border: 1px solid rgba(16, 185, 129, 0.5);
        color: #34d399;
      }

      &.badge-pause {
        background: rgba(245, 158, 11, 0.2);
        border: 1px solid rgba(245, 158, 11, 0.5);
        color: #fbbf24;
      }
    }
  }

  .hud-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 10px;

    .hud-metric-card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 6px;
      padding: 8px 10px;

      .metric-label {
        font-size: 11px;
        color: #94a3b8;
        margin-bottom: 4px;
      }

      .metric-value-row {
        display: flex;
        align-items: baseline;
        gap: 4px;

        .metric-value {
          font-size: 18px;
          font-weight: 700;
          color: #00f0ff;
          font-variant-numeric: tabular-nums;
        }

        .metric-unit {
          font-size: 11px;
          color: #64748b;
        }
      }
    }
  }

  .hud-target-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(0, 229, 255, 0.08);
    border: 1px dashed rgba(0, 229, 255, 0.35);
    border-radius: 4px;
    padding: 5px 10px;
    margin-bottom: 8px;
    font-size: 11px;

    .target-tag {
      color: #38bdf8;
      font-weight: 500;
    }

    .target-name {
      color: #f8fafc;
      font-weight: 600;
    }
  }

  .hud-coords {
    display: flex;
    justify-content: space-between;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 4px;
    padding: 6px 10px;
    margin-bottom: 10px;

    .coord-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;

      .coord-tag {
        color: #00e5ff;
        font-weight: 600;
      }

      .coord-val {
        color: #cbd5e1;
        font-variant-numeric: tabular-nums;
      }
    }
  }

  .hud-subsystems {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 6px;
    padding: 8px 10px;
    margin-bottom: 12px;
    font-size: 11px;

    .sub-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 5px;

      &:last-child {
        margin-bottom: 0;
      }

      .sub-label {
        color: #94a3b8;
      }

      .sub-val {
        font-variant-numeric: tabular-nums;

        &.text-green {
          color: #34d399;
        }

        &.text-cyan {
          color: #38bdf8;
        }
      }

      .battery-bar {
        width: 80px;
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        overflow: hidden;

        .battery-inner {
          height: 100%;
          background: linear-gradient(90deg, #10b981, #00e5ff);
          transition: width 0.3s ease;
        }
      }
    }
  }

  .hud-actions {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;

    .hud-btn {
      background: rgba(0, 229, 255, 0.1);
      border: 1px solid rgba(0, 229, 255, 0.3);
      color: #38bdf8;
      font-size: 11px;
      font-weight: 500;
      padding: 6px 0;
      border-radius: 4px;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(0, 229, 255, 0.22);
        color: #ffffff;
        border-color: rgba(0, 229, 255, 0.6);
      }

      &.active {
        background: #00b4d8;
        color: #ffffff;
        border-color: #00b4d8;
      }
    }
  }
}

@keyframes hud-pulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(0, 229, 255, 0.7);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 6px rgba(0, 229, 255, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(0, 229, 255, 0);
  }
}
</style>
