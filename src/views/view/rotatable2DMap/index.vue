<template>
  <demo-box :codeBlocks>
    <div class="rotatable-2d-map" ref="viewerRef"></div>
  </demo-box>
</template>

<script setup name="Rotatable2DMap">
import DemoBox from "@/components/DemoBox/index.vue";
import IndexSourceCode from "./index.vue?raw";

const codeBlocks = ref([
  {
    fileName: "@/views/view/multipleSyncedViews/index.vue",
    rawCode: IndexSourceCode,
    language: "html",
  },
]);

import Cesium from "cesium";
import "cesium/Build/CesiumUnminified/Widgets/widgets.css";

const viewerDivRef = useTemplateRef("viewerRef");

let viewer = null;

onMounted(() => {
  setTimeout(() => {
    viewer = new Cesium.Viewer(viewerDivRef.value, {
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
  }, 0);
});

onBeforeUnmount(() => {
  if (viewer) viewer.destroy();
});
</script>

<style lang="scss" scoped>
.rotatable-2d-map {
  height: 100%;
  position: absolute;
  inset: 0;
}

/** 隐藏底部版权 */
:deep(.cesium-viewer-bottom) {
  display: none;
}
</style>
