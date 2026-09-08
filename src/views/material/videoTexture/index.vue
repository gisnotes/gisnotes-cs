<template>
  <demo-box :codeBlocks>
    <div class="box" ref="viewerRef"></div>
    <video
      ref="videoRef"
      :src="trailerVideo"
      muted
      autoplay
      loop
      playsinline
      crossorigin="anonymous"
      style="display: none"
    >
      Your browser does not support the <code>video</code> element.
    </video>
  </demo-box>
</template>

<script setup name="VideoTexture">
import DemoBox from "@/components/DemoBox/index.vue";
import IndexSourceCode from "./index.vue?raw";
import CesiumSourceCode from "@/utils/cesium.js?raw";
import worldImage from "@/assets/images/worldimage.jpg";
import trailerVideo from "@/assets/video/tt.mp4";

import Cesium from "cesium";
import "cesium/Build/CesiumUnminified/Widgets/widgets.css";
import { createViewer, optimizeViewerQuality } from "@/utils/cesium";
import { CustomGUI } from "@/utils/gui";

const codeBlocks = ref([
  {
    fileName: "@/views/material/videoTexture/index.vue",
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
const videoRef = useTemplateRef("videoRef");

let viewer = null;
let timer = null;
let gui = null;
let videoPrimitive = null;

onMounted(() => {
  timer = setTimeout(() => {
    init();
  }, 0);
});

function init() {
  // 1. 创建单张全球瓦片底图（使用 assets/images/ 中的 worldimage.jpg）
  const baseLayer = Cesium.ImageryLayer.fromProviderAsync(
    Cesium.SingleTileImageryProvider.fromUrl(worldImage),
  );

  // 2. 创建 Cesium Viewer，显式启用 SceneMode 切换控件 (sceneModePicker: true)
  viewer = createViewer(viewerDivRef.value, {
    baseLayer,
    sceneModePicker: true,
    shadows: true,
  });

  // 3. 开启抗锯齿与高品质渲染
  optimizeViewerQuality(viewer, { msaaSamples: 4, enableFxaa: false });

  // 4. 获取视频 DOM 元素引用
  const videoElement = videoRef.value;

  // 5. 初始化控制面板（按需创建 Primitive 与播放控制）
  initGUI(videoElement);
}

/**
 * 基于 Cesium 底层 Primitive 体系添加局部矩形视频材质图元
 * @param {HTMLVideoElement} videoElement
 */
function addVideoPrimitive(videoElement) {
  if (videoPrimitive) {
    videoElement?.play();
    return;
  }
  if (!viewer || !videoElement) return;

  // 1. 创建底层 Image 材质并将 video DOM 元素作为纹理源
  const material = Cesium.Material.fromType("Image");
  material.uniforms.image = videoElement;
  material.uniforms.repeat = new Cesium.Cartesian2(1.0, 1.0);

  // 2. 构建包含 UV 纹理坐标顶点格式的矩形几何体 (经度 110~170, 纬度 -20~20)
  const instance = new Cesium.GeometryInstance({
    geometry: new Cesium.RectangleGeometry({
      rectangle: Cesium.Rectangle.fromDegrees(110.0, -20.0, 170.0, 20.0),
      vertexFormat:
        Cesium.MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat,
    }),
  });

  // 3. 创建通用 Primitive 并指定 MaterialAppearance 外观材质
  videoPrimitive = new Cesium.Primitive({
    geometryInstances: instance,
    appearance: new Cesium.MaterialAppearance({
      material: material,
    }),
  });

  viewer.scene.primitives.add(videoPrimitive);

  // 4. 镜头平滑飞往局部视频矩形区域
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(140.0, 0.0, 30000000.0),
    duration: 1.5,
  });

  videoElement.play().catch((err) => {
    console.warn("视频播放受浏览器策略限制，等待用户交互触发:", err);
  });
}

/**
 * 初始化 GUI 控制面板
 * @param {HTMLVideoElement} videoElement
 */
function initGUI(videoElement) {
  gui = new CustomGUI({
    container: viewerDivRef.value,
    title: "视频控制",
  });

  const videoCtrl = {
    play: () => {
      if (!videoPrimitive) {
        addVideoPrimitive(videoElement);
      } else {
        videoElement?.play();
      }
    },
    pause: () => videoElement?.pause(),
  };

  gui.add(videoCtrl, "play").name("开始播放");
  gui.add(videoCtrl, "pause").name("暂停播放");
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
  if (gui) {
    gui.destroy();
    gui = null;
  }
  const videoElement = videoRef.value;
  if (videoElement) {
    videoElement.pause();
  }
  if (viewer) {
    if (videoPrimitive && !viewer.isDestroyed()) {
      viewer.scene.primitives.remove(videoPrimitive);
      videoPrimitive = null;
    }
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

