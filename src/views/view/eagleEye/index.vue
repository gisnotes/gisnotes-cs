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
let syncEntity = null;
let timer = null;

onMounted(() => {
  timer = setTimeout(() => {
    init();
  }, 0);
});

// 相机视角同步函数
function syncViewer() {
  if (!viewer || !viewer1 || !viewer.camera || !viewer1.camera) return;

  // 1. 获取主视图相机的地理坐标（经度、纬度、离地高度）
  const carto = viewer.camera.positionCartographic;
  if (!carto) return;

  const lon = Cesium.Math.toDegrees(carto.longitude);
  const lat = Cesium.Math.toDegrees(carto.latitude);
  const mainHeight = carto.height; // 主图相机真实离地高度（米）

  // 2. 模拟 OpenLayers 缩放等级差：设定等级差 deltaLevel（例如 4 级），高度扩大 2^4 = 16 倍
  const deltaLevel = 4; // 相差 4 个缩放等级（可按需调整为 3~5 级）
  const scaleRatio = Math.pow(2, deltaLevel); // 16 倍

  // 设置合理的高低区间限制（Clamp）：
  // - 最小保底高度（5000米）：避免贴地时鹰眼失去宏观意义
  // - 最大高度上限（3.0e7米，约3.0万公里）：全球视角下刚好完整展示整颗地球
  const minEagleEyeHeight = 5000.0;
  const maxEagleEyeHeight = 30000000.0;
  const eagleEyeHeight = Cesium.Math.clamp(
    mainHeight * scaleRatio,
    minEagleEyeHeight,
    maxEagleEyeHeight,
  );

  // 3. 将计算后的高空位置与姿态同步给鹰眼相机
  viewer1.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lon, lat, eagleEyeHeight),
    orientation: {
      heading: viewer.camera.heading,
      pitch: viewer.camera.pitch,
      roll: viewer.camera.roll,
    },
    duration: 0.0,
  });
}

function init() {
  const sharedClock = new Cesium.ClockViewModel();
  // 1. 创建主视图
  viewer = createViewer(mainViewerRef.value, { clockViewModel: sharedClock });
  viewer.resolutionScale = window.devicePixelRatio || 1.0;

  // 2. 创建鹰眼视图
  viewer1 = createViewer(eagleEyeViewerRef.value, {
    clockViewModel: sharedClock,
    sceneMode: Cesium.SceneMode.SCENE2D,
  });
  viewer1.resolutionScale = window.devicePixelRatio || 1.0;

  // 3. 禁用鹰眼视图的用户交互控制
  const control = viewer1.scene.screenSpaceCameraController;
  control.enableRotate = false;
  control.enableTranslate = false;
  control.enableZoom = false;
  control.enableTilt = false;
  control.enableLook = false;

  // 4. 利用实体 CallbackProperty 逐帧执行同步逻辑（平滑零延迟联动）
  // 这里随便写一个空间位置，Entity才能进入渲染队列，最终返回空字符串，即什么都不渲染
  syncEntity = viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(0, 0),
    label: {
      text: new Cesium.CallbackProperty(() => {
        syncViewer();
        return "";
      }, false), //第二个参数设置为false，表示不缓存回调结果，每次渲染都执行
      //Cesium 在每一帧准备绘制该实体前，必须强行调用一次回调函数以获取最新值
    },
  });
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
  if (viewer) {
    if (syncEntity) {
      viewer.entities.remove(syncEntity);
    }
    viewer.destroy();
  }
  if (viewer1) {
    viewer1.destroy();
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
    right: 20px;
    bottom: 20px;
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
