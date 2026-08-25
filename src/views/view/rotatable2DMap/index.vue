<template>
  <demo-box :codeBlocks>
    <div class="rotatable-2d-map" ref="viewerRef"></div>
  </demo-box>
</template>

<script setup name="Rotatable2DMap">
import DemoBox from "@/components/DemoBox/index.vue";
import IndexSourceCode from "./index.vue?raw";


import Cesium from "cesium";
import "cesium/Build/CesiumUnminified/Widgets/widgets.css";
import { createViewer } from "@/utils/cesium";

const codeBlocks = ref([
  {
    fileName: "@/views/view/rotatable2DMap/index.vue",
    rawCode: IndexSourceCode,
    language: "html",
  },
]);
const viewerDivRef = useTemplateRef("viewerRef");

let viewer = null;
let timer = null;

onMounted(() => {
  timer = setTimeout(() => {
    init();
  }, 0);
});

function init() {
  viewer = createViewer(viewerDivRef.value, {
    // 关键配置选项：2D 模式和旋转模式
    sceneMode: Cesium.SceneMode.SCENE2D,
    mapMode2D: Cesium.MapMode2D.ROTATE,
  });

  viewer.scene.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(-73.0, 42.0, 50000000.0),
    orientation: {
      heading: Cesium.Math.toRadians(-45.0),
    },
  });
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
  if (viewer) viewer.destroy();
});
</script>

<style lang="scss" scoped>
.rotatable-2d-map {
  height: 100%;
  position: absolute;
  inset: 0;
}
</style>
