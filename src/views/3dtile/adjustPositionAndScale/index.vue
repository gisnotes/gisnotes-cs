<template>
  <demo-box :codeBlocks>
    <div class="box" ref="viewerRef"></div>
  </demo-box>
</template>

<script setup name="AdjustPositionAndScale">
import DemoBox from "@/components/DemoBox/index.vue";
import IndexSourceCode from "./index.vue?raw";
import CesiumSourceCode from "@/utils/cesium.js?raw";

import Cesium from "cesium";
import "cesium/Build/CesiumUnminified/Widgets/widgets.css";
import { createViewer, optimizeViewerQuality } from "@/utils/cesium";
import MyDatGUI from "@/utils/datGUI";

const codeBlocks = ref([
  {
    fileName: "@/views/3dtile/adjustPositionAndScale/index.vue",
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
let tileset = null;
let timer = null;
let gui = null;
let initialCenter = null;

const controls = {
  longitude: 0,
  latitude: 0,
  height: 0,
  rotateX: 0,
  rotateY: 0,
  rotateZ: 0,
  scale: 1.0,
  reset: () => {
    if (initialCenter) {
      const carto = Cesium.Cartographic.fromCartesian(initialCenter);
      controls.longitude = Number(
        Cesium.Math.toDegrees(carto.longitude).toFixed(6),
      );
      controls.latitude = Number(
        Cesium.Math.toDegrees(carto.latitude).toFixed(6),
      );
    }
    controls.height = 0;
    controls.rotateX = 0;
    controls.rotateY = 0;
    controls.rotateZ = 0;
    controls.scale = 1.0;
    updateTilesetTransform();
    if (tileset && viewer) {
      viewer.zoomTo(
        tileset,
        new Cesium.HeadingPitchRange(
          0.0,
          -0.5,
          tileset.boundingSphere.radius * 2.0,
        ),
      );
    }
    // 同步更新 dat.GUI 面板上的数值显示
    if (gui) {
      gui.updateDisplay();
    }
  },
};

onMounted(() => {
  timer = setTimeout(() => {
    init();
  }, 0);
});

// =========================================================================
// 3D Tileset 空间几何变换工具函数（经纬度重定位、平移高度、局部三轴自转、等比缩放）
// =========================================================================

/**
 * 纯函数：计算 3D Tileset / 模型在局部 ENU 坐标系下的复合变换矩阵 (Matrix4)
 *
 * 【底层数学与图形学原理】：
 *  1. 3D Tiles 顶点位于世界地心坐标系 (ECEF)，原点在地球中心 (距离地表约 6378 km)。
 *  2. 基于模型【初始中心点】建立原始 东北天 (ENU) 局部坐标系矩阵 M_origin 及其逆矩阵 M_origin^(-1)。
 *  3. 基于【目标经纬度与高度】计算目标中心点 targetCenter，并建立目标位置的 东北天 (ENU) 局部坐标系矩阵 M_target_enu (自动贴合新地表切平面)。
 *  4. 在局部空间中计算三轴自转矩阵 (Rz * Ry * Rx) 与等比缩放矩阵 (S)，构建局部矩阵 M_local。
 *  5. 最终世界模型变换矩阵：M_world = M_target_enu * M_local * M_origin^(-1)
 *
 * @param {Cesium.Cartesian3} initialCenter - 模型初始未变换的包围球中心
 * @param {Object} options - 变换参数对象
 * @param {number} [options.longitude] - 目标经度（度），不传则默认使用初始经度
 * @param {number} [options.latitude] - 目标纬度（度），不传则默认使用初始纬度
 * @param {number} [options.height=0] - 相对地表高度偏移量（米）
 * @param {number} [options.rotateX=0] - 绕东向 X 轴旋转角度（度）
 * @param {number} [options.rotateY=0] - 绕北向 Y 轴旋转角度（度）
 * @param {number} [options.rotateZ=0] - 绕天向 Z 轴旋转角度（度）
 * @param {number} [options.scale=1.0] - 等比缩放倍数
 * @returns {Cesium.Matrix4} 计算出的最终 modelMatrix 矩阵
 */
function computeTilesetMatrix(initialCenter, options = {}) {
  if (!initialCenter) return new Cesium.Matrix4();

  const {
    longitude,
    latitude,
    height = 0,
    rotateX = 0,
    rotateY = 0,
    rotateZ = 0,
    scale = 1.0,
  } = options;

  // 1. 获取初始中心点的地理坐标 (经度、纬度、高度)
  const initialCarto = Cesium.Cartographic.fromCartesian(initialCenter);
  const defaultLng = Cesium.Math.toDegrees(initialCarto.longitude);
  const defaultLat = Cesium.Math.toDegrees(initialCarto.latitude);
  const defaultAlt = initialCarto.height;

  // 2. 计算目标位置的经纬度与高度
  const targetLng = longitude !== undefined ? Number(longitude) : defaultLng;
  const targetLat = latitude !== undefined ? Number(latitude) : defaultLat;
  const targetAlt = defaultAlt + (Number(height) || 0);

  // 3. 计算目标空间位置并构建目标位置的 ENU 坐标系矩阵 (自动贴合新地点的地表切平面，防止倾斜)
  const targetCenter = Cesium.Cartesian3.fromDegrees(
    targetLng,
    targetLat,
    targetAlt,
  );
  const targetOriginMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
    targetCenter,
    Cesium.Ellipsoid.WGS84,
    new Cesium.Matrix4(),
  );

  // 4. 构建原始位置的 ENU 矩阵及其逆矩阵
  const originMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
    initialCenter,
    Cesium.Ellipsoid.WGS84,
    new Cesium.Matrix4(),
  );
  const invOriginMatrix = Cesium.Matrix4.inverse(
    originMatrix,
    new Cesium.Matrix4(),
  );

  // 5. 分别计算局部坐标系下的三轴旋转矩阵并复合 (R = Rz * Ry * Rx)
  const rx = Cesium.Matrix3.fromRotationX(
    Cesium.Math.toRadians(Number(rotateX) || 0),
  );
  const ry = Cesium.Matrix3.fromRotationY(
    Cesium.Math.toRadians(Number(rotateY) || 0),
  );
  const rz = Cesium.Matrix3.fromRotationZ(
    Cesium.Math.toRadians(Number(rotateZ) || 0),
  );

  let rot = Cesium.Matrix3.multiply(rz, ry, new Cesium.Matrix3());
  rot = Cesium.Matrix3.multiply(rot, rx, new Cesium.Matrix3());

  // 6. 计算 3x3 等比缩放矩阵并与旋转矩阵复合 (R_final = Rot * Scale)
  const s = Number(scale) || 1.0;
  const scaleMatrix = Cesium.Matrix3.fromScale(
    new Cesium.Cartesian3(s, s, s),
    new Cesium.Matrix3(),
  );
  rot = Cesium.Matrix3.multiply(rot, scaleMatrix, new Cesium.Matrix3());

  // 7. 构建局部空间变换矩阵 (Local Matrix)：局部平移为零（平移已直接包含在 targetCenter 的构建中）
  const localMatrix = Cesium.Matrix4.fromRotationTranslation(
    rot,
    Cesium.Cartesian3.ZERO,
    new Cesium.Matrix4(),
  );

  // 8. 坐标基底转换：M_world = M_target_enu * M_local * M_origin^(-1)
  const temp = Cesium.Matrix4.multiply(
    targetOriginMatrix,
    localMatrix,
    new Cesium.Matrix4(),
  );
  return Cesium.Matrix4.multiply(temp, invOriginMatrix, new Cesium.Matrix4());
}

/**
 * 将变换参数应用到目标 3D Tileset 模型上
 * @param {Cesium.Cesium3DTileset} targetTileset - 目标 3D Tileset 实例
 * @param {Cesium.Cartesian3} center - 模型初始未变换的包围球中心
 * @param {Object} options - 变换参数对象 (longitude, latitude, height, rotateX, rotateY, rotateZ, scale)
 */
function applyTilesetTransform(targetTileset, center, options) {
  if (!targetTileset || !center) return;
  targetTileset.modelMatrix = computeTilesetMatrix(center, options);
}

/**
 * 当前组件视图层的更新入口
 */
function updateTilesetTransform() {
  applyTilesetTransform(tileset, initialCenter, controls);
}

async function init() {
  // 1. 创建 Cesium Viewer
  viewer = createViewer(viewerDivRef.value, {
    shadows: true,
  });

  // 2. 抗锯齿与高分屏画质优化
  optimizeViewerQuality(viewer, { msaaSamples: 4, enableFxaa: true });

  // 3. 开启地形深度检测，避免模型与地表穿模
  viewer.scene.globe.depthTestAgainstTerrain = true;

  // 4. 异步加载 3D Tileset 模型
  try {
    tileset = await Cesium.Cesium3DTileset.fromUrl(
      `${import.meta.env.BASE_URL}SampleData/Cesium3DTiles/Tilesets/Tileset/tileset.json`,
    );

    viewer.scene.primitives.add(tileset);

    // 记录模型最初的包围球中心点（必须保存 clone，避免 modelMatrix 改变后 boundingSphere.center 动态漂移导致累加发散）
    initialCenter = tileset.boundingSphere.center.clone();

    // 初始化控件中的经纬度初始值
    const carto = Cesium.Cartographic.fromCartesian(initialCenter);
    controls.longitude = Number(
      Cesium.Math.toDegrees(carto.longitude).toFixed(6),
    );
    controls.latitude = Number(
      Cesium.Math.toDegrees(carto.latitude).toFixed(6),
    );

    // 缩放聚焦到模型所在位置
    viewer.zoomTo(
      tileset,
      new Cesium.HeadingPitchRange(
        0.0,
        -0.5,
        tileset.boundingSphere.radius * 2.0,
      ),
    );

    // 初始应用空间变换
    updateTilesetTransform();
  } catch (error) {
    console.error(`tileset加载失败: ${error}`);
  }

  // 5. 初始化 dat.GUI 控件面板
  initDatGUI();
}

function initDatGUI() {
  gui = new MyDatGUI({ width: 350, labelWidth: 0.3 });
  gui.modifyPosition(viewerDivRef.value);

  const carto = Cesium.Cartographic.fromCartesian(initialCenter);
  const initialLng = Cesium.Math.toDegrees(carto.longitude);
  const initialLat = Cesium.Math.toDegrees(carto.latitude);

  gui
    .add(controls, "longitude", initialLng - 0.02, initialLng + 0.02, 0.00001)
    .name("经度 (°)")
    .onChange(() => updateTilesetTransform());

  gui
    .add(controls, "latitude", initialLat - 0.02, initialLat + 0.02, 0.00001)
    .name("纬度 (°)")
    .onChange(() => updateTilesetTransform());

  gui
    .add(controls, "height", -100, 100, 1)
    .name("高度偏移 (米)")
    .onChange(() => updateTilesetTransform());

  gui
    .add(controls, "rotateX", -180, 180, 1)
    .name("绕 X 轴旋转 (°)")
    .onChange(() => updateTilesetTransform());

  gui
    .add(controls, "rotateY", -180, 180, 1)
    .name("绕 Y 轴旋转 (°)")
    .onChange(() => updateTilesetTransform());

  gui
    .add(controls, "rotateZ", -180, 180, 1)
    .name("绕 Z 轴旋转 (°)")
    .onChange(() => updateTilesetTransform());

  gui
    .add(controls, "scale", 0.1, 5.0, 0.1)
    .name("模型缩放 (倍数)")
    .onChange(() => updateTilesetTransform());

  gui.add(controls, "reset").name("重置");
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
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
</style>
