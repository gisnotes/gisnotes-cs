<template>
  <demo-box :codeBlocks>
    <div class="eagle-eye-container">
      <!-- 主三维视图 -->
      <div class="main-viewer" ref="mainViewerRef"></div>
      <!-- 鹰眼视图小窗口 -->
      <div class="eagle-eye-wrapper">
        <div class="eagle-eye-header">
          <span class="title">鹰眼视图</span>
        </div>
        <div class="eagle-eye-viewer" ref="eagleEyeViewerRef"></div>
      </div>
    </div>
  </demo-box>
</template>

<script setup name="EagleEye">
import DemoBox from "@/components/DemoBox/index.vue";
import IndexSourceCode from "./index.vue?raw";
import CesiumSourceCode from "@/utils/cesium.js?raw";

import Cesium from "cesium";
import "cesium/Build/CesiumUnminified/Widgets/widgets.css";
import { createViewer } from "@/utils/cesium";

const codeBlocks = ref([
  {
    fileName: "@/views/view/eagleEye/index.vue",
    rawCode: IndexSourceCode,
    language: "html",
  },
  {
    fileName: "@/utils/cesium.js",
    rawCode: CesiumSourceCode,
    language: "javascript",
  },
]);

const mainViewerRef = useTemplateRef("mainViewerRef");
const eagleEyeViewerRef = useTemplateRef("eagleEyeViewerRef");

let viewer = null;
let viewer1 = null;
let extentEntity = null;
let removePreRenderListener = null;
let timer = null;

onMounted(() => {
  timer = setTimeout(() => {
    init();
  }, 0);
});

// 预分配对象与缓存数组，彻底避免每帧 GC
const scratchC2 = new Cesium.Cartesian2();
let activePositions = [];
let closedPositions = [];

/**
 * 拾取屏幕坐标与椭球面交点；若在地球外部（如全球远景或看天），则从中心向外二分逼近地平线切线边缘
 */
function pickScreenOrHorizon(
  scene,
  ellipsoid,
  targetX,
  targetY,
  centerX,
  centerY,
) {
  scratchC2.x = targetX;
  scratchC2.y = targetY;
  const directPos = scene.camera.pickEllipsoid(scratchC2, ellipsoid);
  if (directPos) return Cesium.Cartesian3.clone(directPos);

  // 如果目标角在地球外部，从中心点向目标角二分探测地平线边缘
  let lowT = 0.0;
  let highT = 1.0;
  let bestPos = null;

  for (let i = 0; i < 4; i++) {
    const midT = (lowT + highT) * 0.5;
    scratchC2.x = centerX + (targetX - centerX) * midT;
    scratchC2.y = centerY + (targetY - centerY) * midT;
    const testPos = scene.camera.pickEllipsoid(scratchC2, ellipsoid);
    if (testPos) {
      bestPos = testPos;
      lowT = midT;
    } else {
      highT = midT;
    }
  }

  return bestPos ? Cesium.Cartesian3.clone(bestPos) : null;
}

/**
 * 获取主视图 Camera 在地面的 4 个角视域范围，支持任意旋转与全缩放等级
 */
function updateCameraExtent() {
  if (!viewer || !viewer.scene || !viewer.camera) {
    activePositions = [];
    return;
  }

  const scene = viewer.scene;
  const canvas = scene.canvas;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width <= 0 || height <= 0) return;

  const ellipsoid = scene.globe.ellipsoid;
  const cx = width * 0.5;
  const cy = height * 0.5;

  // 四个角点（按顺时针/逆时针闭合顺序：左下 -> 右下 -> 右上 -> 左上）
  const corners = [
    { x: 0, y: height },
    { x: width, y: height },
    { x: width, y: 0 },
    { x: 0, y: 0 },
  ];

  const points = [];
  for (let i = 0; i < 4; i++) {
    const pt = pickScreenOrHorizon(
      scene,
      ellipsoid,
      corners[i].x,
      corners[i].y,
      cx,
      cy,
    );
    if (pt) {
      const prev = points[points.length - 1];
      if (!prev || Cesium.Cartesian3.distance(pt, prev) > 1.0) {
        points.push(pt);
      }
    }
  }

  if (points.length >= 3) {
    activePositions = points;
    closedPositions = points.concat(points[0]);
  } else {
    activePositions = [];
    closedPositions = [];
  }
}

// 相机视角同步与范围框更新函数
function syncViewer() {
  if (!viewer || !viewer1 || !viewer.camera || !viewer1.camera) return;

  // 1. 获取主视图相机的地理坐标（经度、纬度、离地高度）
  const carto = viewer.camera.positionCartographic;
  if (!carto) return;

  const lon = Cesium.Math.toDegrees(carto.longitude);
  const lat = Cesium.Math.toDegrees(carto.latitude);
  const mainHeight = carto.height; // 主图相机真实离地高度（米）

  // 2. 计算合理的高空比例：
  const scaleRatio = 3.0;

  /**
   * 设置平滑的高低区间限制（Clamp）:
   *   - 最小高度（300米）：近地视角下依然能灵敏响应缩放
   *   - 最大高度（2.0e7米）：全球视角下完整覆盖
   */
  const minEagleEyeHeight = 300.0;
  const maxEagleEyeHeight = 20000000.0;
  const eagleEyeHeight = Cesium.Math.clamp(
    mainHeight * scaleRatio,
    minEagleEyeHeight,
    maxEagleEyeHeight,
  );

  // 3. 鹰眼视图保持正俯视平面视角，实现纯平面的二维小地图效果
  viewer1.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(lon, lat, eagleEyeHeight),
    orientation: {
      heading: viewer.camera.heading,
      pitch: Cesium.Math.toRadians(-90), // 正俯视
      roll: 0,
    },
  });

  // 4. 更新主视口相机的平面视图范围
  updateCameraExtent();
}

function init() {
  const sharedClock = new Cesium.ClockViewModel();
  // 1. 创建主视图
  viewer = createViewer(mainViewerRef.value, { clockViewModel: sharedClock });
  viewer.resolutionScale = window.devicePixelRatio || 1.0;

  // 2. 创建鹰眼视图
  viewer1 = createViewer(eagleEyeViewerRef.value, {
    clockViewModel: sharedClock,
  });
  viewer1.resolutionScale = window.devicePixelRatio || 1.0;

  // 3. 禁用鹰眼视图的用户交互控制
  const control = viewer1.scene.screenSpaceCameraController;
  control.enableRotate = false;
  control.enableTranslate = false;
  control.enableZoom = false;
  control.enableTilt = false;
  control.enableLook = false;

  // 4. 在鹰眼视图中添加主视图视域范围实体（纯红色线框，零剖分开销，全球拖动60FPS）
  extentEntity = viewer1.entities.add({
    name: "主视图视域范围",
    show: new Cesium.CallbackProperty(() => activePositions.length >= 3, false),
    polyline: {
      positions: new Cesium.CallbackProperty(() => closedPositions, false),
      width: 2.5,
      material: Cesium.Color.RED,
      arcType: Cesium.ArcType.NONE, // 纯直线段连接，无任何球面三角化细分开销
      clampToGround: false,
    },
  });

  // 5. 监听主场景 preRender 事件，每帧零开销平滑联动
  removePreRenderListener = viewer.scene.preRender.addEventListener(syncViewer);
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
  if (removePreRenderListener) {
    removePreRenderListener();
    removePreRenderListener = null;
  }
  if (viewer1) {
    if (extentEntity) {
      viewer1.entities.remove(extentEntity);
      extentEntity = null;
    }
    viewer1.destroy();
    viewer1 = null;
  }
  if (viewer) {
    viewer.destroy();
    viewer = null;
  }
});
</script>

<style lang="scss" scoped>
.eagle-eye-container {
  width: 100%;
  height: 100%;
  position: relative;

  .main-viewer {
    width: 100%;
    height: 100%;
    position: absolute;
    inset: 0;
  }

  .eagle-eye-wrapper {
    position: absolute;
    right: 8px;
    bottom: 8px;
    width: 260px;
    height: 200px;
    background: rgba(30, 30, 30, 0.85);
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    overflow: hidden;
    z-index: 99;
    backdrop-filter: blur(4px);
    display: flex;
    flex-direction: column;

    .eagle-eye-header {
      height: 28px;
      line-height: 28px;
      padding: 0 10px;
      background: rgba(0, 0, 0, 0.6);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);

      .title {
        font-size: 12px;
        color: #e0e0e0;
        font-weight: 500;
        user-select: none;
      }
    }

    .eagle-eye-viewer {
      flex: 1;
      width: 100%;
      height: calc(100% - 28px);
      position: relative;
    }
  }
}

/** 隐藏底部版权 */
:deep(.cesium-viewer-bottom) {
  display: none;
}
</style>
