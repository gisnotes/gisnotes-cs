<template>
  <demo-box :codeBlocks="codeBlocks">
    <div class="box" ref="viewerRef"></div>

    <!-- 3D热力图实时数据与指标卡片 -->
    <div class="hud-stats-card">
      <div class="hud-header">
        <span class="hud-title">3D 立体凸起热力图</span>
        <span class="hud-badge">GPU Vertex Displacement</span>
      </div>
      <div class="hud-item">
        <span class="label">渲染模式:</span>
        <span class="value highlight">
          {{ params.primitiveType === "TRIANGLES" ? "实体三角网格曲面" : "科技线框模型" }}
        </span>
      </div>
      <div class="hud-item">
        <span class="label">网格规模:</span>
        <span class="value">200 × 200 (40,000 顶点)</span>
      </div>
      <div class="hud-item">
        <span class="label">最大隆起高度:</span>
        <span class="value highlight">{{ params.maxHeight }} 米 (地表向上)</span>
      </div>
      <div class="hud-item">
        <span class="label">采样点数:</span>
        <span class="value">{{ pointsData.length }} 个离散监测点</span>
      </div>
      <div class="hud-item">
        <span class="label">示范中心:</span>
        <span class="value">北京核心区域 (116.46°E, 39.92°N)</span>
      </div>
    </div>
  </demo-box>
</template>

<script setup name="Heatmap3D">
import DemoBox from "@/components/DemoBox/index.vue";
import IndexSourceCode from "./index.vue?raw";
import Heatmap3DES6SourceCode from "./Heatmap3DES6.js?raw";
import Heatmap3DSourceCode from "./Heatmap3D.js?raw";
import CesiumSourceCode from "@/utils/cesium.js?raw";

import Cesium from "cesium";
import "cesium/Build/CesiumUnminified/Widgets/widgets.css";
import { createViewer, optimizeViewerQuality } from "@/utils/cesium";
import { CustomGUI } from "@/utils/gui";
import worldImage from "@/assets/images/worldimage.jpg";
import { Heatmap3D } from "./Heatmap3DES6.js";

// 代码查看器配置
const codeBlocks = ref([
  {
    fileName: "@/views/dataVisualization/heatmap3D/index.vue",
    rawCode: IndexSourceCode,
    language: "html",
  },
  {
    fileName: "@/views/dataVisualization/heatmap3D/Heatmap3DES6.js",
    rawCode: Heatmap3DES6SourceCode,
    language: "javascript",
  },
  {
    fileName: "@/views/dataVisualization/heatmap3D/Heatmap3D.js",
    rawCode: Heatmap3DSourceCode,
    language: "javascript",
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
let gui = null;
let heatmap3dInstance = null;
let pointEntities = [];

// 响应式数据与控制参数
const pointsData = ref([]);
const params = reactive({
  pointCount: 50,
  radius: 18,
  maxHeight: 1200, // GPU 顶点位移最大拉伸高度 (米)
  baseElevation: 0, // 最低基础海拔 (米)
  primitiveType: "TRIANGLES", // "TRIANGLES" | "LINES"
  showPoints: false,
});

/**
 * 生成围绕北京核心区的模拟数据点
 */
function generateRandomPoints(count = 50) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    pts.push({
      lnglat: [
        116.46 + (Math.random() - 0.5) * 0.16,
        39.92 + (Math.random() - 0.5) * 0.16,
      ],
      value: Math.floor(Math.random() * 900) + 100,
    });
  }
  pointsData.value = pts;
  return pts;
}

onMounted(() => {
  timer = setTimeout(() => {
    init();
  }, 0);
});

function init() {
  // 1. 初始化底图并创建 Viewer
  const baseLayer = Cesium.ImageryLayer.fromProviderAsync(
    Cesium.SingleTileImageryProvider.fromUrl(worldImage),
  );

  viewer = createViewer(viewerDivRef.value, {
    baseLayer,
    shadows: false,
  });

  // 2. 开启抗锯齿与高清品质
  optimizeViewerQuality(viewer, { msaaSamples: 4, enableFxaa: false });

  // 3. 生成 50 个初始数据点
  generateRandomPoints(params.pointCount);

  // 4. 构建 3D 立体热力图
  render3DHeatmap();

  // 5. 视角飞行至北京上空，以 45 度倾斜角立体俯瞰
  flyTo3DView();

  // 6. 初始化控制面板
  initGUI();
}

/**
 * 渲染或重建 3D 热力图
 */
function render3DHeatmap() {
  if (!viewer) return;

  if (heatmap3dInstance) {
    heatmap3dInstance.destroy();
    heatmap3dInstance = null;
  }

  heatmap3dInstance = new Heatmap3D(viewer, {
    dataPoints: pointsData.value,
    radius: params.radius,
    baseElevation: params.baseElevation,
    maxHeight: params.maxHeight,
    primitiveType: params.primitiveType,
    colorGradient: {
      ".2": "blue",
      ".5": "green",
      ".75": "yellow",
      ".98": "red",
    },
  });

  if (params.showPoints) {
    updatePointMarkers();
  }
}

/**
 * 3D 倾斜黄金俯瞰视角 (展现山峦起伏的立体感)
 */
function flyTo3DView() {
  if (!viewer) return;

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(116.46, 39.75, 24000.0),
    orientation: {
      heading: Cesium.Math.toRadians(0.0),
      pitch: Cesium.Math.toRadians(-45.0),
      roll: 0.0,
    },
    duration: 1.8,
  });
}

/**
 * 90 度垂直正俯视视角
 */
function topDownView() {
  if (!viewer) return;

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(116.46, 39.92, 35000.0),
    orientation: {
      heading: Cesium.Math.toRadians(0.0),
      pitch: Cesium.Math.toRadians(-89.9),
      roll: 0.0,
    },
    duration: 1.5,
  });
}

/**
 * 切换数据采样点标记
 */
function updatePointMarkers() {
  if (!viewer) return;

  for (const entity of pointEntities) {
    viewer.entities.remove(entity);
  }
  pointEntities = [];

  if (!params.showPoints) return;

  pointsData.value.forEach((pt, index) => {
    const entity = viewer.entities.add({
      name: `热力数据源 #${index + 1}`,
      position: Cesium.Cartesian3.fromDegrees(pt.lnglat[0], pt.lnglat[1], 0),
      point: {
        pixelSize: 5,
        color: Cesium.Color.fromCssColorString("#00E5FF"),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 1.5,
      },
      description: `经度: ${pt.lnglat[0].toFixed(4)}, 纬度: ${pt.lnglat[1].toFixed(4)}, 强度值: ${pt.value}`,
    });
    pointEntities.push(entity);
  });
}

/**
 * 初始化 CustomGUI 控制面板
 */
function initGUI() {
  gui = new CustomGUI({
    container: viewerDivRef.value,
    title: "3D热力图控制面板",
    width: 300,
  });

  const morphFolder = gui.addFolder("3D 立体隆起调节");

  morphFolder
    .add(params, "maxHeight", 300, 3000, 100)
    .name("最大隆起高度 (米)")
    .onChange(() => {
      render3DHeatmap();
    });

  morphFolder
    .add(params, "radius", 8, 35, 1)
    .name("热力扩散半径")
    .onChange(() => {
      render3DHeatmap();
    });

  morphFolder
    .add(params, "primitiveType", ["TRIANGLES", "LINES"])
    .name("几何体图元形态")
    .onChange(() => {
      render3DHeatmap();
    });

  const dataFolder = gui.addFolder("数据样本管理");

  dataFolder
    .add(params, "pointCount", [30, 50, 100])
    .name("数据采样数量")
    .onChange((val) => {
      generateRandomPoints(Number(val));
      render3DHeatmap();
    });

  dataFolder
    .add(
      {
        regenerate: () => {
          generateRandomPoints(params.pointCount);
          render3DHeatmap();
        },
      },
      "regenerate",
    )
    .name("🔄 重新随机生成点位");

  dataFolder
    .add(params, "showPoints")
    .name("显示数据源点位")
    .onChange(() => {
      updatePointMarkers();
    });

  const viewFolder = gui.addFolder("相机视角控制");

  viewFolder
    .add(
      {
        flyTo3D: () => {
          flyTo3DView();
        },
      },
      "flyTo3D",
    )
    .name("🏔️ 3D 倾斜立体视角");

  viewFolder
    .add(
      {
        topDown: () => {
          topDownView();
        },
      },
      "topDown",
    )
    .name("📐 90° 正俯视视角");

  morphFolder.open();
  dataFolder.open();
  viewFolder.open();
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);

  for (const entity of pointEntities) {
    viewer?.entities?.remove(entity);
  }
  pointEntities = [];

  if (heatmap3dInstance) {
    heatmap3dInstance.destroy();
    heatmap3dInstance = null;
  }

  if (gui) {
    gui.destroy();
    gui = null;
  }

  if (viewer) {
    viewer.destroy();
    viewer = null;
  }
});
</script>

<style lang="scss" scoped>
.box {
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
}

// 遥测与数据指标卡片 (左下角)
.hud-stats-card {
  position: absolute;
  bottom: 16px;
  left: 16px;
  z-index: 10;
  background: rgba(10, 18, 30, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(0, 229, 255, 0.35);
  border-radius: 8px;
  padding: 12px 16px;
  color: #f1f5f9;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  min-width: 260px;
  pointer-events: auto;

  .hud-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    .hud-title {
      font-size: 13px;
      font-weight: 700;
      color: #38bdf8;
      letter-spacing: 0.5px;
    }

    .hud-badge {
      font-size: 10px;
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.4);
      border-radius: 4px;
      padding: 1px 6px;
      font-weight: 600;
    }
  }

  .hud-item {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    line-height: 22px;

    .label {
      color: #94a3b8;
    }

    .value {
      font-weight: 600;
      color: #e2e8f0;

      &.highlight {
        color: #38bdf8;
      }
    }
  }
}
</style>
