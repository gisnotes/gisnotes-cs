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
import { createViewer } from "@/utils/cesium";

const codeBlocks = ref([
  {
    fileName: "@/views/view/multipleSyncedViews/index.vue",
    rawCode: IndexSourceCode,
    language: "html",
  },
]);

const viewer3DDivRef = useTemplateRef("viewer3DRef");
const viewer2DDivRef = useTemplateRef("viewer2DRef");

let viewer3D = null;
let viewer2D = null;
let timer = null;

const sysBaseUrl = import.meta.env.BASE_URL;
const mode = import.meta.env.MODE;
const sourceCesiumBaseUrl = import.meta.env.VITE_CESIUM_BASE_URL;
window.CESIUM_BASE_URL =
  mode === "development"
    ? `${sysBaseUrl}${sourceCesiumBaseUrl}`
    : sourceCesiumBaseUrl;


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
  timer = setTimeout(() => {
    init();
  }, 0);
});

function init() {
  const sharedClock = new Cesium.ClockViewModel();

  viewer3D = createViewer(viewer3DDivRef.value, {
    clockViewModel: sharedClock,
  });

  viewer2D = createViewer(viewer2DDivRef.value, {
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
  if (timer) clearTimeout(timer);
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
