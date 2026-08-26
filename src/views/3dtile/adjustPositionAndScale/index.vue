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

/**
 * 整体思路：
 *  1. 首先将模型顶点从世界 ECEF 映射到局部 ENU（East-North-Up，东北天）坐标系，
 *  2. 在局部空间做旋转与缩放后，再映射到目标位置的新 ENU 坐标系中，
 *  3. 最终得到模型在世界坐标系下的 modelMatrix。
 */

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

  /**
   * 2. 计算目标位置的经纬度与高度:
   *  这里不是运行更改模型的经纬度，因此需要考虑下拖动控件后的模型的新经纬度及高度
   */
  const targetLng = longitude !== undefined ? Number(longitude) : defaultLng;
  const targetLat = latitude !== undefined ? Number(latitude) : defaultLat;
  const targetAlt = defaultAlt + (Number(height) || 0);

  // 3. 计算目标空间位置：及将目标位置的经纬度和高度坐标转为三维笛卡尔坐标形式
  const targetCenter = Cesium.Cartesian3.fromDegrees(
    targetLng,
    targetLat,
    targetAlt,
  );

  /**
   * 4. 它计算出了一个 4x4 矩阵，用于把“以 targetCenter 为中心、朝向东-北-天的局部坐标(ENU)”
   *    转换成“Cesium 的世界坐标（地心地固 ECEF）”
   */
  const targetOriginMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
    targetCenter,
    Cesium.Ellipsoid.WGS84,
    new Cesium.Matrix4(),
  );

  /**
   * 5. 同上，用于将“以 initialCenter 为中心、朝向东-北-天的局部坐标(ENU)”
   *    转换成“Cesium 的世界坐标（地心地固 ECEF）”
   *
   *  局部 ENU 坐标  ⟶ 世界 ECEF 坐标
   */
  const originMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
    initialCenter,
    Cesium.Ellipsoid.WGS84,
    new Cesium.Matrix4(),
  );

  /**
   * 6. 计算局部 ENU 坐标系下的逆矩阵 (M_origin^(-1))，用于将世界坐标转换回局部 ENU 坐标
   * 世界 ECEF 坐标 ⟶ 局部 ENU 坐标
   */
  const invOriginMatrix = Cesium.Matrix4.inverse(
    originMatrix,
    new Cesium.Matrix4(),
  );

  // 7. 分别计算局部坐标系下的三轴旋转矩阵并复合 (R = Rz * Ry * Rx)
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

  // 8. 计算 3x3 等比缩放矩阵并与旋转矩阵复合 (R_final = Rot * Scale)
  const s = Number(scale) || 1.0;
  const scaleMatrix = Cesium.Matrix3.fromScale(
    new Cesium.Cartesian3(s, s, s),
    new Cesium.Matrix3(),
  );
  rot = Cesium.Matrix3.multiply(rot, scaleMatrix, new Cesium.Matrix3());

  /**
   * 9. Matrix4.fromRotationTranslation
   *  把 3x3 的旋转缩放矩阵和三维平移向量拼装成一个标准的 4x4 矩阵。
   * ┌                        ┐
   * │ rot00  rot01  rot02  0 │  <- 前 3 列为 3x3 旋转和缩放
   * │ rot10  rot11  rot12  0 │
   * │ rot20  rot21  rot22  0 │
   * │   0      0      0    1 │  <- 第 4 列平移为 (0, 0, 0)
   * └                        ┘
   */
  const localMatrix = Cesium.Matrix4.fromRotationTranslation(
    rot,
    Cesium.Cartesian3.ZERO,
    new Cesium.Matrix4(),
  );

  /**
   * 10. 坐标基底转换：M_world = M_target_enu * M_local * M_origin^(-1)
   * 最终顶点坐标 = [targetOriginMatrix] × [localMatrix] × [invOriginMatrix] × 原始顶点
   *                └────────┬─────────┘   └─────┬─────┘   └────────┬──────┘
   *                     第 3 步                第 2 步            第 1 步
   *              放到新经纬度并贴平地面       原地自转与缩放     从地球表面拉回原点 (0,0,0)
   */
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
