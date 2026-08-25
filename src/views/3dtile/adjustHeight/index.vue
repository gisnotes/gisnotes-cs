<template>
  <demo-box :codeBlocks>
    <div class="box" ref="viewerRef"></div>
  </demo-box>
</template>

<script setup name="AdjustHeight">
import DemoBox from "@/components/DemoBox/index.vue";
import IndexSourceCode from "./index.vue?raw";
import CesiumSourceCode from "@/utils/cesium.js?raw";

import Cesium from "cesium";
import "cesium/Build/CesiumUnminified/Widgets/widgets.css";
import { createViewer, optimizeViewerQuality } from "@/utils/cesium";
import MyDatGUI from "@/utils/datGUI";

const codeBlocks = ref([
  {
    fileName: "@/views/3dtile/adjustHeight/index.vue",
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

const controls = {
  height: 0,
  resetView: () => {
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
  },
};

onMounted(() => {
  timer = setTimeout(() => {
    init();
  }, 0);
});

/**
 * 调整 3D Tileset 离地高度
 * @param {number} height - 偏移高度（米）
 */
function updateTilesetHeight(height) {
  height = Number(height);
  if (isNaN(height) || !tileset) return;

  // 1. 获取 Tileset 包围球中心点的地理坐标（经度、纬度）
  const cartographic = Cesium.Cartographic.fromCartesian(
    tileset.boundingSphere.center,
  );

  // 2. 分别计算地表原点 (高度 0) 与目标偏移高度处的笛卡尔坐标
  const surface = Cesium.Cartesian3.fromRadians(
    cartographic.longitude,
    cartographic.latitude,
    0.0,
  );
  const offset = Cesium.Cartesian3.fromRadians(
    cartographic.longitude,
    cartographic.latitude,
    height,
  );

  // 3. 计算从地表到目标高度的平移向量 (Translation Vector)
  const translation = Cesium.Cartesian3.subtract(
    offset,
    surface,
    new Cesium.Cartesian3(),
  );

  // 4. 将平移变换矩阵赋值给 tileset.modelMatrix
  tileset.modelMatrix = Cesium.Matrix4.fromTranslation(translation);
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
      "/SampleData/Cesium3DTiles/Tilesets/Tileset/tileset.json",
    );

    viewer.scene.primitives.add(tileset);

    // 缩放聚焦到模型所在位置
    viewer.zoomTo(
      tileset,
      new Cesium.HeadingPitchRange(
        0.0,
        -0.5,
        tileset.boundingSphere.radius * 2.0,
      ),
    );

    // 初始应用高度
    updateTilesetHeight(controls.height);
  } catch (error) {
    console.error(`Error loading tileset: ${error}`);
  }

  // 5. 初始化 dat.GUI 控件面板
  initDatGUI();
}

function initDatGUI() {
  gui = new MyDatGUI();
  gui.modifyPosition(viewerDivRef.value);

  gui
    .add(controls, "height", -100, 100, 1)
    .name("高度偏移 (米)")
    .onChange((val) => updateTilesetHeight(val));

  gui.add(controls, "resetView").name("重置视角");
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
