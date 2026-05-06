<template>
  <demo-box :codeBlocks>
    <div class="multiple-synced-views">
      <!-- 三维视图 -->
      <div class="viewer-container" ref="viewer3DRef"></div>
      <!-- 二维视图 -->
      <div class="viewer-container" ref="viewer2DRef"></div>
    </div>
  </demo-box>
</template>

<script setup name="MultipleSyncedViews">
import DemoBox from "@/components/DemoBox/index.vue";
import IndexSourceCode from "./index.vue?raw";

import Cesium from "cesium";
import "cesium/Build/CesiumUnminified/Widgets/widgets.css";

const codeBlocks = ref([
  {
    fileName: "@/views/view/multipleSyncedViews/index.vue",
    rawCode: IndexSourceCode,
    language: "html",
  },
]);

const viewer3DRef = ref(null);
const viewer2DRef = ref(null);

let viewer3D = null;
let viewer2D = null;

const sysBaseUrl = import.meta.env.BASE_URL;
const mode = import.meta.env.MODE;
const sourceCesiumBaseUrl = import.meta.env.VITE_CESIUM_BASE_URL;
window.CESIUM_BASE_URL =
  mode === "development"
    ? `${sysBaseUrl}${sourceCesiumBaseUrl}`
    : sourceCesiumBaseUrl;

/**
 * 通用的创建 Viewer 方法
 * @param {HTMLElement} container 容器引用
 * @param {Object} options 自定义配置项
 */
function createGenericViewer(container, options = {}) {
  return new Cesium.Viewer(container, {
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    baseLayerPicker: false,
    navigationHelpButton: false,
    animation: false,
    timeline: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    shouldAnimate: true,
    baseLayer: Cesium.ImageryLayer.fromProviderAsync(
      Cesium.TileMapServiceImageryProvider.fromUrl(
        Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII"),
      ),
    ),
    ...options, // 允许外部覆盖默认配置
  });
}

// 联动逻辑函数
let worldPosition;
const sync2DView = () => {
  if (!viewer3D || !viewer2D) return;

  const viewCenter = new Cesium.Cartesian2(
    Math.floor(viewer3D.canvas.clientWidth / 2),
    Math.floor(viewer3D.canvas.clientHeight / 2),
  );

  const newWorldPosition = viewer3D.scene.camera.pickEllipsoid(viewCenter);
  if (Cesium.defined(newWorldPosition)) {
    worldPosition = newWorldPosition;
  }

  if (!worldPosition) return;

  const distance = Cesium.Cartesian3.distance(
    worldPosition,
    viewer3D.scene.camera.positionWC,
  );

  viewer2D.scene.camera.lookAt(
    worldPosition,
    new Cesium.Cartesian3(0.0, 0.0, distance),
  );
};

onMounted(() => {
  /**
   * 由于el-splitter组件的宽度是动态计算的，
   * 所以需要等待 DOM 元素加载完成后再初始化，
   * 因此这里采用 setTimeout 确保 DOM 元素加载完成
   */
  setTimeout(() => {
    init();
  }, 0);
});

function init() {
  const sharedClock = new Cesium.ClockViewModel();

  viewer3D = createGenericViewer(viewer3DRef.value, {
    clockViewModel: sharedClock,
  });

  viewer2D = createGenericViewer(viewer2DRef.value, {
    clockViewModel: sharedClock,
    sceneMode: Cesium.SceneMode.SCENE2D,
  });

  // 配置联动
  viewer3D.camera.changed.addEventListener(sync2DView);
  viewer3D.camera.percentageChanged = 0.01;

  // 禁用 2D 视图交互，使其只读
  const controller2D = viewer2D.scene.screenSpaceCameraController;
  controller2D.enableRotate = false;
  controller2D.enableTranslate = false;
  controller2D.enableZoom = false;
  controller2D.enableTilt = false;
  controller2D.enableLook = false;
}

// 销毁时解绑事件，防止内存泄漏
onBeforeUnmount(() => {
  if (viewer3D) {
    viewer3D.camera.changed.removeEventListener(sync2DView);
    viewer3D.destroy();
  }
  if (viewer2D) viewer2D.destroy();
});
</script>

<style lang="scss" scoped>
.multiple-synced-views {
  height: 100%;
  position: absolute;
  inset: 0;
  display: flex;
  gap: 2px;
  background-color: #000;

  .viewer-container {
    flex: 1;
    height: 100%;
    position: relative;
  }
}

/** 隐藏底部版权 */
:deep(.cesium-viewer-bottom) {
  display: none;
}
</style>
