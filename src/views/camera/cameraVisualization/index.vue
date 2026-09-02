<template>
  <demo-box :codeBlocks>
    <div class="box" ref="viewerRef"></div>
  </demo-box>
</template>

<script setup name="CameraVisualization">
import DemoBox from "@/components/DemoBox/index.vue";
import IndexSourceCode from "./index.vue?raw";
import CesiumSourceCode from "@/utils/cesium.js?raw";

import Cesium from "cesium";
import "cesium/Build/CesiumUnminified/Widgets/widgets.css";
import { createViewer, optimizeViewerQuality } from "@/utils/cesium";
import { CustomGUI } from "@/utils/gui";

const codeBlocks = ref([
  {
    fileName: "@/views/camera/cameraVisualization/index.vue",
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
let mainCameraPrimitive = null;
let targetCamera = null;
let targetPrimitive = null;

// 相机姿态控制模型
const vModel = {
  heading: 0,
  pitch: 0,
  roll: 0,
};

onMounted(() => {
  timer = setTimeout(() => {
    init();
  }, 0);
});

function init() {
  // 1. 创建 Cesium Viewer
  viewer = createViewer(viewerDivRef.value, {
    shadows: true,
  });

  // 2. 开启抗锯齿优化
  optimizeViewerQuality(viewer, { msaaSamples: 4, enableFxaa: true });

  // 3. 默认加载并展示相机实体
  addTargetCamera();

  // 4. 初始化 lil-gui 控制面板
  initGUI();
}

/**
 * 将主相机设置到北极视角（最开始的代码）
 */
function setNorthPoleView() {
  if (!viewer) return;
  // 将相机设置到北极
  viewer.camera.position = Cesium.Cartesian3.fromDegrees(0, 90, 50000000);
  // 北极向南极看
  viewer.camera.direction = Cesium.Cartesian3.negate(
    Cesium.Cartesian3.UNIT_Z,
    new Cesium.Cartesian3(),
  );
  viewer.camera.up = Cesium.Cartesian3.clone(Cesium.Cartesian3.UNIT_Y);
}

/**
 * 添加主相机可视化视锥体 primitive
 */
function addMainCameraPrimitive() {
  if (!viewer) return;
  if (mainCameraPrimitive && !mainCameraPrimitive.isDestroyed?.()) {
    viewer.scene.primitives.remove(mainCameraPrimitive);
  }

  // 可视化相机
  mainCameraPrimitive = new Cesium.DebugCameraPrimitive({
    camera: viewer.camera,
    color: Cesium.Color.RED,
    show: true,
    updateOnChange: false,
  });

  viewer.scene.primitives.add(mainCameraPrimitive);
}

/**
 * 移除主相机可视化视锥体
 */
function removeMainCameraPrimitive() {
  if (!viewer) return;
  if (mainCameraPrimitive && !mainCameraPrimitive.isDestroyed?.()) {
    viewer.scene.primitives.remove(mainCameraPrimitive);
    mainCameraPrimitive = null;
  }
}

/**
 * 添加并可视化独立相机实体
 */
function addTargetCamera() {
  if (!viewer) return;
  if (targetPrimitive && !targetPrimitive.isDestroyed?.()) {
    viewer.scene.primitives.remove(targetPrimitive);
  }

  targetCamera = new Cesium.Camera(viewer.scene);
  targetCamera.frustum.fov = Cesium.Math.PI_OVER_THREE;
  targetCamera.frustum.near = 1.0;
  targetCamera.frustum.far = 2000.0;
  update();

  targetPrimitive = new Cesium.DebugCameraPrimitive({
    camera: targetCamera,
    color: Cesium.Color.RED,
    show: true,
    updateOnChange: true,
  });
  viewer.scene.primitives.add(targetPrimitive);

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(120, 36, 10000),
  });
}

/**
 * 移除相机实体
 */
function removeTargetCamera() {
  if (!viewer) return;
  if (targetPrimitive && !targetPrimitive.isDestroyed?.()) {
    viewer.scene.primitives.remove(targetPrimitive);
    targetPrimitive = null;
    targetCamera = null;
  }
}

/**
 * 更新目标相机的 Heading、Pitch、Roll 姿态
 */
function update() {
  if (!targetCamera) return;
  targetCamera.setView({
    destination: Cesium.Cartesian3.fromDegrees(120, 36, 2500),
    orientation: {
      heading: Cesium.Math.toRadians(vModel.heading),
      pitch: Cesium.Math.toRadians(vModel.pitch),
      roll: Cesium.Math.toRadians(vModel.roll),
    },
  });
}

/**
 * 重置相机实体姿态为初始状态 (0, 0, 0)
 */
function resetTargetCameraPose() {
  vModel.heading = 0;
  vModel.pitch = 0;
  vModel.roll = 0;
  update();
}

/**
 * 将当前姿态参数应用到主相机
 */
function applyToMainCamera() {
  if (!viewer) return;
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(120, 36, 2500),
    orientation: {
      heading: Cesium.Math.toRadians(vModel.heading),
      pitch: Cesium.Math.toRadians(vModel.pitch),
      roll: Cesium.Math.toRadians(vModel.roll),
    },
  });
}

/**
 * 初始化 lil-gui 控制面板
 */
function initGUI() {
  gui = new CustomGUI({
    container: viewerDivRef.value,
    title: "相机控制",
  });

  // 1. 最开始的主相机视锥可视化 Folder
  const mainCameraFolder = gui.addFolder("主相机视锥可视化");
  mainCameraFolder.add({ fn: setNorthPoleView }, "fn").name("设置北极观察视角");
  mainCameraFolder.add({ fn: addMainCameraPrimitive }, "fn").name("添加主相机视锥");
  mainCameraFolder.add({ fn: removeMainCameraPrimitive }, "fn").name("移除主相机视锥");

  // 2. 独立相机实体与姿态调整 Folder
  const entityFolder = gui.addFolder("相机实体姿态控制");
  entityFolder.add({ fn: addTargetCamera }, "fn").name("添加相机实体");
  entityFolder.add({ fn: removeTargetCamera }, "fn").name("移除相机实体");

  entityFolder
    .add(vModel, "heading", 0, 360, 1)
    .listen()
    .onChange(() => {
      update();
    });

  entityFolder
    .add(vModel, "pitch", -180, 180, 1)
    .listen()
    .onChange(() => {
      update();
    });

  entityFolder
    .add(vModel, "roll", -180, 180, 1)
    .listen()
    .onChange(() => {
      update();
    });

  entityFolder.add({ fn: resetTargetCameraPose }, "fn").name("重置姿态");
  entityFolder.add({ fn: applyToMainCamera }, "fn").name("应用到主相机");
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
  if (gui) {
    gui.destroy();
    gui = null;
  }
  if (viewer) {
    removeMainCameraPrimitive();
    removeTargetCamera();
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
