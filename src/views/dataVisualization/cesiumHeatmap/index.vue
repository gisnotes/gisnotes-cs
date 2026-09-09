<template>
  <demo-box :codeBlocks="codeBlocks">
    <div class="box" ref="viewerRef"></div>

    <!-- 热力图实时数据与配置参数面板 -->
    <div class="hud-stats-card">
      <div class="hud-header">
        <span class="hud-title">CesiumHeatmap 热力图</span>
        <span class="hud-badge">cesium-heatmap</span>
      </div>
      <div class="hud-item">
        <span class="label">观测区域:</span>
        <span class="value">塔斯马尼亚 (澳大利亚)</span>
      </div>
      <div class="hud-item">
        <span class="label">样本点数:</span>
        <span class="value">{{ HEATMAP_DATA.length }} 个监测站</span>
      </div>
      <div class="hud-item">
        <span class="label">权重极值:</span>
        <span class="value">[{{ valueMin }}, {{ valueMax }}]</span>
      </div>
      <div class="hud-item">
        <span class="label">中心坐标:</span>
        <span class="value">{{ centerLon.toFixed(5) }}, {{ centerLat.toFixed(5) }}</span>
      </div>
    </div>
  </demo-box>
</template>

<script setup name="CesiumHeatmap">
import DemoBox from "@/components/DemoBox/index.vue";
import IndexSourceCode from "./index.vue?raw";
import CesiumSourceCode from "@/utils/cesium.js?raw";

import Cesium from "cesium";
import "cesium/Build/CesiumUnminified/Widgets/widgets.css";
import { createViewer, optimizeViewerQuality } from "@/utils/cesium";
import { CustomGUI } from "@/utils/gui";
import worldImage from "@/assets/images/worldimage.jpg";

// 1. 兼容 cesium-heatmap 在现代模块环境下的全局依赖与隐式变量赋值
if (typeof window !== "undefined") {
  window.Cesium = Cesium;
  window.material = null;

  // 关键补丁 1：兼容修复旧版 heatmap.js 内部对 ImageData.data 只读属性进行赋值报错的问题
  // (TypeError: Cannot assign to read only property 'data' of object '#<ImageData>')
  if (typeof ImageData !== "undefined") {
    try {
      const desc = Object.getOwnPropertyDescriptor(ImageData.prototype, "data");
      if (desc && !desc.set) {
        Object.defineProperty(ImageData.prototype, "data", {
          get: desc.get,
          set: function () {
            // 空 setter：允许静默跳过多余赋值，因为数组内容已在内存中原地修改
          },
          configurable: true,
          enumerable: desc.enumerable,
        });
      }
    } catch (e) {
      console.warn("ImageData prototype polyfill warning:", e);
    }
  }
}

// 代码查看器配置
const codeBlocks = ref([
  {
    fileName: "@/views/dataVisualization/cesiumHeatmap/index.vue",
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
let gui = null;
let heatMapInstance = null;
let pointEntities = [];

// 示例原始离散热力采样点数据（共 52 个点，WGS84坐标体系）
const HEATMAP_DATA = [
  { x: 147.1383442264, y: -41.4360048372, value: 76 },
  { x: 147.1384363011, y: -41.4360298848, value: 63 },
  { x: 147.138368102, y: -41.4358360603, value: 1 },
  { x: 147.1385627739, y: -41.4358799123, value: 21 },
  { x: 147.1385138501, y: -41.4359327669, value: 28 },
  { x: 147.1385031219, y: -41.4359730105, value: 41 },
  { x: 147.1384127393, y: -41.435928255, value: 75 },
  { x: 147.1384551136, y: -41.4359450132, value: 3 },
  { x: 147.1384927196, y: -41.4359158649, value: 45 },
  { x: 147.1384938639, y: -41.4358498311, value: 45 },
  { x: 147.1385183299, y: -41.4360213794, value: 93 },
  { x: 147.1384007925, y: -41.4359860133, value: 46 },
  { x: 147.1383604844, y: -41.4358298672, value: 54 },
  { x: 147.13851025, y: -41.4359098303, value: 39 },
  { x: 147.1383874733, y: -41.4358511035, value: 34 },
  { x: 147.1384981796, y: -41.4359355403, value: 81 },
  { x: 147.1384504107, y: -41.4360332348, value: 39 },
  { x: 147.1385582664, y: -41.4359788335, value: 20 },
  { x: 147.1383967364, y: -41.4360581999, value: 35 },
  { x: 147.1383839615, y: -41.436016316, value: 47 },
  { x: 147.1384082712, y: -41.4358423338, value: 36 },
  { x: 147.1385092651, y: -41.4358577623, value: 69 },
  { x: 147.138360356, y: -41.436046789, value: 90 },
  { x: 147.138471893, y: -41.4359184292, value: 88 },
  { x: 147.1385605689, y: -41.4360271359, value: 81 },
  { x: 147.1383585714, y: -41.4359362476, value: 32 },
  { x: 147.1384939114, y: -41.4358844253, value: 67 },
  { x: 147.138466724, y: -41.436019121, value: 17 },
  { x: 147.1385504355, y: -41.4360614056, value: 49 },
  { x: 147.1383883832, y: -41.4358733544, value: 82 },
  { x: 147.1385670669, y: -41.4359650236, value: 25 },
  { x: 147.1383416534, y: -41.4359310876, value: 82 },
  { x: 147.138525285, y: -41.4359394661, value: 66 },
  { x: 147.1385487719, y: -41.4360137656, value: 73 },
  { x: 147.1385496029, y: -41.4359187277, value: 73 },
  { x: 147.1383989222, y: -41.4358556562, value: 61 },
  { x: 147.1385499424, y: -41.4359149305, value: 67 },
  { x: 147.138404523, y: -41.4359563326, value: 90 },
  { x: 147.1383883675, y: -41.4359794855, value: 78 },
  { x: 147.1383967187, y: -41.435891185, value: 15 },
  { x: 147.1384610005, y: -41.4359044797, value: 15 },
  { x: 147.1384688489, y: -41.4360396127, value: 91 },
  { x: 147.1384431875, y: -41.4360684409, value: 8 },
  { x: 147.1385411067, y: -41.4360645847, value: 42 },
  { x: 147.1385237178, y: -41.4358843181, value: 31 },
  { x: 147.1384406464, y: -41.4360003831, value: 51 },
  { x: 147.1384679169, y: -41.4359950456, value: 96 },
  { x: 147.1384194314, y: -41.4358419739, value: 22 },
  { x: 147.1385049792, y: -41.4359574813, value: 44 },
  { x: 147.1384097378, y: -41.4358598672, value: 82 },
  { x: 147.1384993219, y: -41.4360352975, value: 84 },
  { x: 147.1383640499, y: -41.4359839518, value: 81 },
];

// 计算边界范围与权重区间
let valueMin = Number.MAX_VALUE;
let valueMax = -Number.MAX_VALUE;

const bounds = {
  west: 180,
  east: -180,
  south: 90,
  north: -90,
};

HEATMAP_DATA.forEach((item) => {
  bounds.west = Math.min(bounds.west, item.x);
  bounds.east = Math.max(bounds.east, item.x);
  bounds.south = Math.min(bounds.south, item.y);
  bounds.north = Math.max(bounds.north, item.y);

  valueMin = Math.min(valueMin, item.value);
  valueMax = Math.max(valueMax, item.value);
});

const centerLon = (bounds.west + bounds.east) / 2;
const centerLat = (bounds.south + bounds.north) / 2;

// 交互参数配置
const params = reactive({
  radius: 80, // 热力扩散半径
  maxOpacity: 0.85, // 最大透明度
  minOpacity: 0.05, // 最小透明度
  blur: 0.85, // 模糊度
  showHeatmap: true, // 显示/隐藏热力图
  showPoints: false, // 显示/隐藏原始采样点
});

onMounted(() => {
  timer = setTimeout(() => {
    init();
  }, 0);
});

async function init() {
  // 1. 采用 SingleTileImageryProvider 初始化全球底图，与参考代码一致
  const baseLayer = Cesium.ImageryLayer.fromProviderAsync(
    Cesium.SingleTileImageryProvider.fromUrl(worldImage),
  );

  viewer = createViewer(viewerDivRef.value, {
    baseLayer,
    shadows: false,
  });

  // 2. 开启抗锯齿与高清品质
  optimizeViewerQuality(viewer, { msaaSamples: 4, enableFxaa: false });

  // 3. 动态加载 cesium-heatmap 库，并注入关键环境补丁
  const heatmapLib = await import("cesium-heatmap");
  const h337 = heatmapLib.default || heatmapLib;
  window.h337 = h337;
  globalThis.h337 = h337;

  const CesiumHeatmap = window.CesiumHeatmap;
  if (!CesiumHeatmap) {
    console.error("CesiumHeatmap 库未正确加载");
    return;
  }

  // 关键补丁 2：重写 _getContainer，避免 display: none 导致 getComputedStyle 读取宽高为 0/NaN
  CesiumHeatmap._getContainer = function (width, height, id) {
    let c = id ? document.getElementById(id) : null;
    if (!c) {
      c = document.createElement("div");
      if (id) c.setAttribute("id", id);
      c.setAttribute(
        "style",
        `width: ${width}px; height: ${height}px; margin: 0px; position: fixed; left: -9999px; top: -9999px; visibility: hidden; pointer-events: none;`,
      );
      document.body.appendChild(c);
    }
    return c;
  };

  // 4. 初始化采样点位（若开启）
  if (params.showPoints) {
    updatePointMarkers();
  }

  // 5. 构建并渲染热力图实例
  createHeatmapLayer(CesiumHeatmap);

  // 6. 相机平滑飞行至热力图区域上空，最佳角度俯瞰
  flyToHeatmapView();

  // 7. 初始化控制面板
  initGUI(CesiumHeatmap);
}

/**
 * 创建/重建 CesiumHeatmap 图层实例
 */
function createHeatmapLayer(CesiumHeatmap) {
  // 清理现有热力图图层与离屏 DOM 节点，避免内存泄漏
  if (heatMapInstance) {
    if (heatMapInstance._layer) {
      viewer.entities.remove(heatMapInstance._layer);
    }
    if (heatMapInstance._container && heatMapInstance._container.parentNode) {
      heatMapInstance._container.parentNode.removeChild(heatMapInstance._container);
    }
    heatMapInstance = null;
  }

  // 调用 CesiumHeatmap.create 创建热力图
  heatMapInstance = CesiumHeatmap.create(viewer, bounds, {
    radius: params.radius,
    maxOpacity: params.maxOpacity,
    minOpacity: params.minOpacity,
    blur: params.blur,
  });

  // 关键补丁 3：直接重写底层 _renderer._colorize，彻底去除 k.data = l 的只读属性赋值报错
  if (heatMapInstance?._heatmap?._renderer) {
    const renderer = heatMapInstance._heatmap._renderer;
    const rendererProto = Object.getPrototypeOf(renderer);
    if (rendererProto && !rendererProto._colorizeFixed) {
      rendererProto._colorize = function () {
        let a = this._renderBoundaries[0];
        let b = this._renderBoundaries[1];
        let c = this._renderBoundaries[2] - a;
        let d = this._renderBoundaries[3] - b;
        const e = this._width;
        const f = this._height;
        const g = this._opacity;
        const h = this._maxOpacity;
        const i = this._minOpacity;
        const j = this._useGradientOpacity;

        if (a < 0) a = 0;
        if (b < 0) b = 0;
        if (a + c > e) c = e - a;
        if (b + d > f) d = f - b;
        if (c <= 0 || d <= 0) return;

        const k = this.shadowCtx.getImageData(a, b, c, d);
        const l = k.data;
        const m = l.length;
        const n = this._palette;

        for (let o = 3; o < m; o += 4) {
          const p = l[o];
          const q = p * 4;
          if (!q) continue;
          let r;
          if (g > 0) {
            r = g;
          } else {
            if (p < h) {
              r = p < i ? i : p;
            } else {
              r = h;
            }
          }
          l[o - 3] = n[q];
          l[o - 2] = n[q + 1];
          l[o - 1] = n[q + 2];
          l[o] = j ? n[q + 3] : r;
        }

        // 注意：l 是 k.data 引用，原地已修改完成，严禁执行 k.data = l
        this.ctx.putImageData(k, a, b);
        this._renderBoundaries = [1e3, 1e3, 0, 0];
      };
      rendererProto._colorizeFixed = true;
    }
  }

  // 关键补丁 4：拦截并重写 updateLayer，以 DataURL 注入贴地图元并显式强制 transparent: true
  heatMapInstance.updateLayer = function () {
    if (this._layer) {
      this._cesium.entities.remove(this._layer);
    }

    const dataUrl = this._heatmap.getDataURL();
    const material = new Cesium.ImageMaterialProperty({
      image: dataUrl,
      transparent: true,
    });

    this._layer = this._cesium.entities.add({
      name: "CesiumHeatmapLayer",
      show: params.showHeatmap,
      rectangle: {
        coordinates: this._rectangle,
        material: material,
        classificationType: Cesium.ClassificationType.BOTH,
      },
    });
  };

  // 注入 WGS84 经纬度数据并触发更新
  heatMapInstance.setWGS84Data(valueMin, valueMax, HEATMAP_DATA);
}

/**
 * 相机平滑飞行聚焦到热力图正上方（距离适中，清晰完整呈现热力晕圈）
 */
function flyToHeatmapView() {
  if (!viewer) return;

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      centerLon,
      centerLat - 0.00045,
      130.0,
    ),
    orientation: {
      heading: Cesium.Math.toRadians(0.0),
      pitch: Cesium.Math.toRadians(-65.0),
      roll: 0.0,
    },
    duration: 1.5,
  });
}

/**
 * 切换原始 52 个数据采样点的可视化展示
 */
function updatePointMarkers() {
  if (!viewer) return;

  for (const entity of pointEntities) {
    viewer.entities.remove(entity);
  }
  pointEntities = [];

  if (!params.showPoints) return;

  // 遍历添加点位实体
  HEATMAP_DATA.forEach((item, index) => {
    const ratio = (item.value - valueMin) / (valueMax - valueMin || 1);
    // HSL 色环：从蓝色(0.65)到红色(0.0)渐变映射
    const color = Cesium.Color.fromHsl(
      (1.0 - ratio) * 0.65,
      1.0,
      0.55,
      0.95,
    );

    const entity = viewer.entities.add({
      name: `采样点 #${index + 1} (权重: ${item.value})`,
      position: Cesium.Cartesian3.fromDegrees(item.x, item.y, 0),
      point: {
        pixelSize: 6,
        color: color,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 1.5,
      },
      description: `序号: ${index + 1} | 经度: ${item.x.toFixed(6)} | 纬度: ${item.y.toFixed(6)} | 权重: ${item.value}`,
    });
    pointEntities.push(entity);
  });
}

/**
 * 控制面板初始化
 */
function initGUI(CesiumHeatmap) {
  gui = new CustomGUI({
    container: viewerDivRef.value,
    title: "热力图控制面板",
    width: 290,
  });

  const heatmapFolder = gui.addFolder("热力图参数 (cesium-heatmap)");

  heatmapFolder
    .add(params, "radius", 30, 220, 5)
    .name("影响半径 (radius)")
    .onChange(() => {
      createHeatmapLayer(CesiumHeatmap);
    });

  heatmapFolder
    .add(params, "maxOpacity", 0.2, 1.0, 0.05)
    .name("最大透明度")
    .onChange(() => {
      createHeatmapLayer(CesiumHeatmap);
    });

  heatmapFolder
    .add(params, "minOpacity", 0.0, 0.4, 0.05)
    .name("最小透明度")
    .onChange(() => {
      createHeatmapLayer(CesiumHeatmap);
    });

  heatmapFolder
    .add(params, "blur", 0.3, 1.0, 0.05)
    .name("模糊系数 (blur)")
    .onChange(() => {
      createHeatmapLayer(CesiumHeatmap);
    });

  const layerFolder = gui.addFolder("图层与视角控制");

  layerFolder
    .add(params, "showHeatmap")
    .name("显示热力图")
    .onChange((show) => {
      if (heatMapInstance && heatMapInstance._layer) {
        heatMapInstance._layer.show = show;
      }
    });

  layerFolder
    .add(params, "showPoints")
    .name("显示 52 个原始采样点")
    .onChange(() => {
      updatePointMarkers();
    });

  layerFolder
    .add(
      {
        flyTo: () => {
          flyToHeatmapView();
        },
      },
      "flyTo",
    )
    .name("🎯 聚焦热力图区域");

  layerFolder
    .add(
      {
        topDownView: () => {
          viewer.camera.setView({
            destination: Cesium.Rectangle.fromDegrees(
              bounds.west,
              bounds.south,
              bounds.east,
              bounds.north,
            ),
          });
        },
      },
      "topDownView",
    )
    .name("📐 正俯视视口 (参考代码setView)");

  heatmapFolder.open();
  layerFolder.open();
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);

  // 清除采样点实体
  for (const entity of pointEntities) {
    viewer?.entities?.remove(entity);
  }
  pointEntities = [];

  // 清除热力图图层与离屏 DOM
  if (heatMapInstance) {
    if (heatMapInstance._layer) {
      viewer?.entities?.remove(heatMapInstance._layer);
    }
    if (heatMapInstance._container && heatMapInstance._container.parentNode) {
      heatMapInstance._container.parentNode.removeChild(heatMapInstance._container);
    }
    heatMapInstance = null;
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
  min-width: 250px;
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
      background: rgba(56, 189, 248, 0.2);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.4);
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
    }
  }
}
</style>
