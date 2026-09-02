<template>
  <demo-box :codeBlocks>
    <div class="box" ref="viewerRef"></div>
  </demo-box>
</template>

<script setup name="ChangeColor">
import DemoBox from "@/components/DemoBox/index.vue";
import IndexSourceCode from "./index.vue?raw";
import RubikCubeSourceCode from "./RubikCubeMaterialProperty.js?raw";
import QuadrantMaterialSourceCode from "./QuadrantMaterialProperty.js?raw";
import CustomMaterialES6SourceCode from "./CustomMaterialPropertyES6.js?raw";
import CesiumSourceCode from "@/utils/cesium.js?raw";

import Cesium from "cesium";
import "cesium/Build/CesiumUnminified/Widgets/widgets.css";
import { createViewer, optimizeViewerQuality } from "@/utils/cesium";
import { CustomGUI } from "@/utils/gui";
import { CustomMaterialProperty } from "./CustomMaterialPropertyES6.js";
import { QuadrantMaterialProperty } from "./QuadrantMaterialProperty.js";
import { RubikCubeMaterialProperty } from "./RubikCubeMaterialProperty.js";

const codeBlocks = ref([
  {
    fileName: "@/views/material/changeColor/index.vue",
    rawCode: IndexSourceCode,
    language: "html",
  },
  {
    fileName: "@/views/material/changeColor/RubikCubeMaterialProperty.js (3x3九宫格魔方材质)",
    rawCode: RubikCubeSourceCode,
    language: "javascript",
  },
  {
    fileName: "@/views/material/changeColor/QuadrantMaterialProperty.js (四色象限材质)",
    rawCode: QuadrantMaterialSourceCode,
    language: "javascript",
  },
  {
    fileName: "@/views/material/changeColor/CustomMaterialPropertyES6.js (纯色变色材质)",
    rawCode: CustomMaterialES6SourceCode,
    language: "javascript",
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

// 实体管理
let entity = null;
let material = null;
let quadrantEntity = null;
let rubikCubeEntity = null; // 3x3 九宫格 Shader 魔方实体

// 控件响应数据
const vModel = reactive({
  color: "#ff0000",
});

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

  // 3. 添加默认变色立方体实体
  addBoxEntity();

  // 4. 初始化 lil-gui 控件面板
  initGUI();
}

/**
 * 基础示例：添加变色长方体
 */
function addBoxEntity() {
  const position = Cesium.Cartesian3.fromDegrees(
    -75.59670696331766,
    40.0387958759388,
    100,
  );
  const dimensions = new Cesium.Cartesian3(300, 100, 200);

  material = new CustomMaterialProperty({
    color: Cesium.Color.RED,
  });

  entity = viewer.entities.add({
    name: "变色长方体",
    position: position,
    box: {
      dimensions: dimensions,
      material: material,
    },
  });

  viewer.zoomTo(viewer.entities);
}

/**
 * 示例 2：添加四色象限材质实体
 */
function addQuadrantEntity() {
  if (quadrantEntity) {
    viewer.zoomTo(quadrantEntity);
    return;
  }
  const position = Cesium.Cartesian3.fromDegrees(
    -75.5915,
    40.0387958759388,
    100,
  );
  quadrantEntity = viewer.entities.add({
    name: "四色象限长方体",
    position: position,
    box: {
      dimensions: new Cesium.Cartesian3(300, 100, 200),
      material: new QuadrantMaterialProperty(),
    },
  });
  viewer.zoomTo(quadrantEntity);
}

function removeQuadrantEntity() {
  if (quadrantEntity) {
    viewer.entities.remove(quadrantEntity);
    quadrantEntity = null;
  }
}

/**
 * 示例 3：添加 3x3 九宫格 Shader 魔方立方体（纯 Shader 实现）
 */
function addRubikCube() {
  if (rubikCubeEntity) {
    viewer.zoomTo(rubikCubeEntity);
    return;
  }

  const position = Cesium.Cartesian3.fromDegrees(
    -75.59670696331766,
    40.0435,
    100,
  );

  rubikCubeEntity = viewer.entities.add({
    name: "3x3 九宫格魔方正方体",
    position: position,
    box: {
      dimensions: new Cesium.Cartesian3(180, 180, 180),
      material: new RubikCubeMaterialProperty(),
    },
  });

  viewer.zoomTo(rubikCubeEntity);
}

function removeRubikCube() {
  if (rubikCubeEntity) {
    viewer.entities.remove(rubikCubeEntity);
    rubikCubeEntity = null;
  }
}

/**
 * 初始化 lil-gui 控制面板
 */
function initGUI() {
  gui = new CustomGUI({
    container: viewerDivRef.value,
    title: "材质控制",
  });

  // Folder 1: 变更长方体颜色
  const folder1 = gui.addFolder("基础: 变更长方体颜色");
  folder1.addColor(vModel, "color").name("表面颜色").onChange((val) => {
    if (material) {
      material.color = Cesium.Color.fromCssColorString(val);
    }
  });
  folder1
    .add({ fn: () => entity && viewer.zoomTo(entity) }, "fn")
    .name("视角聚焦长方体");

  // Folder 2: 四色象限材质
  const folder2 = gui.addFolder("进阶: 四色象限材质 (ST坐标)");
  folder2.add({ fn: addQuadrantEntity }, "fn").name("添加四色实体");
  folder2.add({ fn: removeQuadrantEntity }, "fn").name("移除四色实体");
  folder2
    .add(
      {
        fn: () => {
          if (!quadrantEntity) addQuadrantEntity();
          else viewer.zoomTo(quadrantEntity);
        },
      },
      "fn",
    )
    .name("视角聚焦四色实体");

  // Folder 3: 3x3 九宫格魔方材质正方体
  const folder3 = gui.addFolder("进阶: 3x3九宫格魔方正方体");
  folder3.add({ fn: addRubikCube }, "fn").name("添加魔方正方体");
  folder3.add({ fn: removeRubikCube }, "fn").name("移除魔方正方体");
  folder3
    .add(
      {
        fn: () => {
          if (!rubikCubeEntity) addRubikCube();
          else viewer.zoomTo(rubikCubeEntity);
        },
      },
      "fn",
    )
    .name("视角聚焦魔方");
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
  if (gui) {
    gui.destroy();
    gui = null;
  }
  if (viewer) {
    if (entity) {
      viewer.entities.remove(entity);
      entity = null;
    }
    if (quadrantEntity) {
      viewer.entities.remove(quadrantEntity);
      quadrantEntity = null;
    }
    removeRubikCube();
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
