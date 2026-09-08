<template>
  <demo-box :codeBlocks>
    <div class="box" ref="viewerRef"></div>
    <div class="status-panel">{{ statusText }}</div>
  </demo-box>
</template>

<script setup name="OverlayAnalysis">
import DemoBox from "@/components/DemoBox/index.vue";
import IndexSourceCode from "./index.vue?raw";
import CesiumSourceCode from "@/utils/cesium.js?raw";

import Cesium from "cesium";
import "cesium/Build/CesiumUnminified/Widgets/widgets.css";
import { createViewer, optimizeViewerQuality } from "@/utils/cesium";
import { CustomGUI } from "@/utils/gui";

// 按需导入 Turf 核心函数
import {
  polygon as turfPolygon,
  featureCollection as turfFeatureCollection,
  intersect as turfIntersect,
  area as turfArea,
  pointOnFeature as turfPointOnFeature,
} from "@turf/turf";

const codeBlocks = ref([
  {
    fileName: "@/views/spaceAnalysis/overlayAnalysis/index.vue",
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

// 两个待叠加分析的面，坐标顺序为 [经度, 纬度]
const POLYGON_1 = [
  [117.182288, 31.854164],
  [117.210254, 31.878324],
  [117.238229, 31.855796],
  [117.242307, 31.826109],
  [117.177277, 31.821475],
  [117.182288, 31.854164],
];
const POLYGON_2 = [
  [117.267046, 31.842971],
  [117.20963, 31.840323],
  [117.230646, 31.787122],
  [117.28833, 31.799624],
  [117.267046, 31.842971],
];

let viewer = null;
let imageryLayer = null;
let terrainProvider = null;
let myLilGui = null;
let polygon1Entity = null;
let polygon2Entity = null;
let intersectionEntity = null; // 相交区域多边形实体
let areaLabelEntity = null;
let intersectionFeature = null;

const statusText = ref("正在初始化叠加分析…");

const params = reactive({
  polygon1Color: "#ff3b30",
  polygon1Opacity: 0.5,
  polygon2Color: "#34c759",
  polygon2Opacity: 0.5,
  intersectionColor: "#2979ff",
  intersectionOpacity: 0.78,
  showPolygon1: true,
  showPolygon2: true,
  showIntersection: true,
  showLabel: true,
  calculate: () => calculateIntersection(),
  clear: () => clearIntersection(),
  resetCamera: () => resetCamera(),
});

onMounted(async () => {
  initMap();
  addBasePolygons();
  addlilgui();
  await initTerrain();
  await calculateIntersection();
});

onBeforeUnmount(() => {
  if (myLilGui) {
    myLilGui.destroy();
    myLilGui = null;
  }
  clearIntersection();
  if (viewer) {
    viewer.destroy();
    viewer = null;
  }
});

/**
 * 辅助方法：按需请求渲染一帧（当开启 requestRenderMode 时）
 */
function requestRender() {
  if (viewer?.scene) {
    viewer.scene.requestRender();
  }
}

function initMap() {
  viewer = createViewer(viewerDivRef.value, {
    baseLayer: false,
  });

  // 开启原生 WebGL2 4x MSAA 抗锯齿
  optimizeViewerQuality(viewer, { msaaSamples: 4, enableFxaa: false });

  viewer.scene.debugShowFramesPerSecond = true;
  viewer.scene.globe.depthTestAgainstTerrain = true;
  viewer.scene.globe.enableLighting = false;
  viewer.scene.fog.enabled = true;
  viewer.scene.fog.density = 0.00008;
  viewer.scene.skyAtmosphere.show = true;
  if (viewer._cesiumWidget?._creditContainer) {
    viewer._cesiumWidget._creditContainer.style.display = "none";
  }

  imageryLayer = viewer.imageryLayers.addImageryProvider(
    new Cesium.UrlTemplateImageryProvider({
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      maximumLevel: 18,
    }),
  );
  resetCamera();
}

async function initTerrain() {
  try {
    statusText.value = "正在加载地形…";
    terrainProvider =
      await Cesium.ArcGISTiledElevationTerrainProvider.fromUrl(
        "https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer",
      );
    viewer.terrainProvider = terrainProvider;
    statusText.value = "地形加载完成，正在计算相交区域…";
  } catch (error) {
    console.warn("地形加载失败，将使用椭球面显示：", error);
    statusText.value = "地形加载失败，正在使用椭球面计算…";
  }
  requestRender();
}

function addBasePolygons() {
  polygon1Entity = viewer.entities.add({
    id: "overlay-polygon-1",
    polygon: {
      hierarchy: Cesium.Cartesian3.fromDegreesArray(POLYGON_1.flat()),
      material: getColorMaterial(
        params.polygon1Color,
        params.polygon1Opacity,
      ),
      outline: true,
      outlineColor: Cesium.Color.WHITE.withAlpha(0.9),
      outlineWidth: 2,
      classificationType: Cesium.ClassificationType.TERRAIN,
    },
  });

  polygon2Entity = viewer.entities.add({
    id: "overlay-polygon-2",
    polygon: {
      hierarchy: Cesium.Cartesian3.fromDegreesArray(POLYGON_2.flat()),
      material: getColorMaterial(
        params.polygon2Color,
        params.polygon2Opacity,
      ),
      outline: true,
      outlineColor: Cesium.Color.WHITE.withAlpha(0.9),
      outlineWidth: 2,
      classificationType: Cesium.ClassificationType.TERRAIN,
    },
  });
  requestRender();
}

function addlilgui() {
  const gui = new CustomGUI({
    container: viewerDivRef.value,
    title: "叠加分析",
  });
  myLilGui = gui;

  const operationFolder = gui.addFolder("分析操作");
  operationFolder.add(params, "calculate").name("重新分析");
  operationFolder.add(params, "clear").name("清除相交结果");
  operationFolder.add(params, "resetCamera").name("重置视角");

  const styleFolder = gui.addFolder("图层样式");
  styleFolder
    .addColor(params, "polygon1Color")
    .name("区域一颜色")
    .onChange(() => updateBasePolygonStyle());
  styleFolder
    .add(params, "polygon1Opacity", 0, 1, 0.01)
    .name("区域一透明度")
    .onChange(() => updateBasePolygonStyle());
  styleFolder
    .addColor(params, "polygon2Color")
    .name("区域二颜色")
    .onChange(() => updateBasePolygonStyle());
  styleFolder
    .add(params, "polygon2Opacity", 0, 1, 0.01)
    .name("区域二透明度")
    .onChange(() => updateBasePolygonStyle());
  styleFolder
    .addColor(params, "intersectionColor")
    .name("相交区域颜色")
    .onChange(() => updateIntersectionStyle());
  styleFolder
    .add(params, "intersectionOpacity", 0, 1, 0.01)
    .name("相交区域透明度")
    .onChange(() => updateIntersectionStyle());

  const visibilityFolder = gui.addFolder("显示控制");
  visibilityFolder
    .add(params, "showPolygon1")
    .name("显示区域一")
    .onChange((value) => {
      if (polygon1Entity) {
        polygon1Entity.show = value;
        requestRender();
      }
    });
  visibilityFolder
    .add(params, "showPolygon2")
    .name("显示区域二")
    .onChange((value) => {
      if (polygon2Entity) {
        polygon2Entity.show = value;
        requestRender();
      }
    });
  visibilityFolder
    .add(params, "showIntersection")
    .name("显示相交区域")
    .onChange((value) => {
      if (intersectionEntity) {
        intersectionEntity.show = value;
        requestRender();
      }
    });
  visibilityFolder
    .add(params, "showLabel")
    .name("显示面积标签")
    .onChange((value) => {
      if (areaLabelEntity) {
        areaLabelEntity.show = value;
        requestRender();
      }
    });

  const layerFolder = gui.addFolder("影像图层");
  layerFolder
    .add(imageryLayer, "show")
    .name("显示影像")
    .onChange(() => requestRender());
  layerFolder
    .add(imageryLayer, "alpha", 0, 1, 0.01)
    .name("影像透明度")
    .onChange(() => requestRender());
}

function getColorMaterial(color, alpha) {
  return Cesium.Color.fromCssColorString(color).withAlpha(alpha);
}

function updateBasePolygonStyle() {
  if (polygon1Entity) {
    polygon1Entity.polygon.material = getColorMaterial(
      params.polygon1Color,
      params.polygon1Opacity,
    );
  }
  if (polygon2Entity) {
    polygon2Entity.polygon.material = getColorMaterial(
      params.polygon2Color,
      params.polygon2Opacity,
    );
  }
  requestRender();
}

function updateIntersectionStyle() {
  if (!intersectionEntity) return;
  intersectionEntity.polygon.material = getColorMaterial(
    params.intersectionColor,
    params.intersectionOpacity,
  );
  requestRender();
}

async function calculateIntersection() {
  if (!viewer) return;
  clearIntersection();
  statusText.value = "正在计算两个多边形的相交区域…";

  try {
    const p1 = turfPolygon([POLYGON_1]);
    const p2 = turfPolygon([POLYGON_2]);
    // Turf 7 使用 featureCollection 传入待求交要素
    const intersection = turfIntersect(turfFeatureCollection([p1, p2]));

    if (!intersection) {
      statusText.value = "两个区域没有相交部分。";
      requestRender();
      return;
    }

    intersectionFeature = intersection;

    // 解析相交面经纬度坐标序列
    const coords = [];
    if (intersection.geometry.type === "Polygon") {
      intersection.geometry.coordinates[0].forEach(([lon, lat]) => {
        coords.push(lon, lat);
      });
    } else if (intersection.geometry.type === "MultiPolygon") {
      intersection.geometry.coordinates.forEach((poly) => {
        poly[0].forEach(([lon, lat]) => coords.push(lon, lat));
      });
    }

    const hierarchy = Cesium.Cartesian3.fromDegreesArray(coords);
    const material = getColorMaterial(
      params.intersectionColor,
      params.intersectionOpacity,
    );

    // 复用已有 Entity 或添加贴地多边形
    if (intersectionEntity) {
      intersectionEntity.polygon.hierarchy = hierarchy;
      intersectionEntity.polygon.material = material;
      intersectionEntity.show = params.showIntersection;
    } else {
      intersectionEntity = viewer.entities.add({
        id: "overlay-intersection-result",
        polygon: {
          hierarchy: hierarchy,
          material: material,
          outline: true,
          outlineColor: Cesium.Color.WHITE.withAlpha(0.95),
          outlineWidth: 2,
          classificationType: Cesium.ClassificationType.TERRAIN,
        },
        show: params.showIntersection,
      });
    }

    const areaVal = turfArea(intersection);
    const center = turfPointOnFeature(intersection).geometry.coordinates;

    if (areaLabelEntity) {
      areaLabelEntity.position = Cesium.Cartesian3.fromDegrees(
        center[0],
        center[1],
      );
      areaLabelEntity.label.text = `相交部分\n${formatArea(areaVal)}`;
      areaLabelEntity.show = params.showLabel;
    } else {
      areaLabelEntity = viewer.entities.add({
        id: "overlay-intersection-area",
        position: Cesium.Cartesian3.fromDegrees(center[0], center[1]),
        label: {
          text: `相交部分\n${formatArea(areaVal)}`,
          fillColor: Cesium.Color.WHITE,
          font: "18px sans-serif",
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          showBackground: true,
          backgroundColor: Cesium.Color.BLACK.withAlpha(0.55),
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: Cesium.VerticalOrigin.TOP,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        show: params.showLabel,
      });
    }

    statusText.value = `分析完成：相交面积 ${formatArea(areaVal)}。`;
    requestRender();
  } catch (error) {
    console.error("叠加分析失败：", error);
    statusText.value = `叠加分析失败：${error.message}`;
  }
}

function formatArea(areaVal) {
  return areaVal >= 10000
    ? `${(areaVal / 10000).toFixed(2)} 公顷`
    : `${areaVal.toFixed(2)} 平方米`;
}

function clearIntersection() {
  if (intersectionEntity && viewer) {
    viewer.entities.remove(intersectionEntity);
    intersectionEntity = null;
  }
  intersectionFeature = null;
  if (areaLabelEntity && viewer) {
    viewer.entities.remove(areaLabelEntity);
    areaLabelEntity = null;
  }
  requestRender();
}

function resetCamera() {
  if (!viewer) return;
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(
      117.225959,
      31.705235,
      18000,
    ),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-50),
      roll: 0,
    },
  });
  requestRender();
}
</script>

<style lang="scss" scoped>
.box {
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
}

.status-panel {
  position: absolute;
  left: 10px;
  bottom: 10px;
  z-index: 998;
  min-width: 300px;
  max-width: calc(100vw - 40px);
  padding: 10px 12px;
  border-radius: 6px;
  color: #e8f1ff;
  background: rgba(12, 18, 28, 0.78);
  font-size: 13px;
  line-height: 1.7;
  pointer-events: none;
  white-space: pre-line;
}
</style>
