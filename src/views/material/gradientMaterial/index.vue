<template>
  <demo-box :codeBlocks>
    <div class="box" ref="viewerRef"></div>
  </demo-box>
</template>

<script setup name="GradientMaterial">
import DemoBox from "@/components/DemoBox/index.vue";
import IndexSourceCode from "./index.vue?raw";
import CesiumSourceCode from "@/utils/cesium.js?raw";

import Cesium from "cesium";
import "cesium/Build/CesiumUnminified/Widgets/widgets.css";
import { createViewer, optimizeViewerQuality } from "@/utils/cesium";
import { CustomGUI } from "@/utils/gui";

const codeBlocks = ref([
  {
    fileName: "@/views/material/gradientMaterial/index.vue",
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
let entity = null;
let customMaterialProperty = null;

// 自定义材质类型标识
const MaterialType = "CustomGradientMaterial";

/**
 * 自定义材质属性类 (CustomMaterialProperty)
 */
function CustomMaterialProperty(options = {}) {
  this._definitionChanged = new Cesium.Event();
  this._color = options.color || new Cesium.Color(1.0, 1.0, 0.0, 1.0);
  this.duration = options.duration || 2000;
  this._time = window.performance.now();
}

Object.defineProperties(CustomMaterialProperty.prototype, {
  isConstant: {
    get: function () {
      // 动态材质返回 false，每帧都会通过 getValue 实时获取最新 uniform 数据，无需重建几何体
      return false;
    },
  },
  definitionChanged: {
    get: function () {
      return this._definitionChanged;
    },
  },
  color: {
    get: function () {
      return this._color;
    },
    set: function (val) {
      if (val instanceof Cesium.Color) {
        this._color = val;
      } else if (typeof val === "string") {
        this._color = Cesium.Color.fromCssColorString(val);
      }
      // 注意：不要在此处触发 this._definitionChanged.raiseEvent(this)！
      // 否则 Cesium 会认为整个材质元定义发生变更，从而在 WebWorker 中销毁并重新三角剖分网格，产生界面闪烁。
    },
  },
});

CustomMaterialProperty.prototype.getType = function (time) {
  return MaterialType;
};

CustomMaterialProperty.prototype.getValue = function (time, result) {
  if (!result) {
    result = {};
  }
  result.color = this._color;
  result.time =
    ((window.performance.now() - this._time) % this.duration) / this.duration;
  return result;
};

CustomMaterialProperty.prototype.equals = function (other) {
  return (
    this === other ||
    (other instanceof CustomMaterialProperty &&
      Cesium.Color.equals(this._color, other._color))
  );
};

// 注册自定义材质到 Cesium 的 MaterialCache 中
function registerMaterial() {
  if (!Cesium.Material._materialCache.getMaterial(MaterialType)) {
    Cesium.Material._materialCache.addMaterial(MaterialType, {
      fabric: {
        type: MaterialType,
        uniforms: {
          color: new Cesium.Color(1.0, 1.0, 0.0, 1.0),
          time: 1.0,
          spacing: 40.0,
          width: 1.0,
        },
        source: `
          uniform vec4 color;
          czm_material czm_getMaterial(czm_materialInput materialInput)
          {
            czm_material material = czm_getDefaultMaterial(materialInput);
            vec2 st = materialInput.st;
            float alpha = distance(st, vec2(0.5));
            material.alpha = color.a * alpha * 1.5;
            material.diffuse = color.rgb * 1.3;
            return material;
          }
        `,
      },
      translucent: function (material) {
        return true;
      },
    });
  }
}

// 控件响应数据
const vModel = reactive({
  color: "#ffff00",
  alpha: 1.0,
  height: 1600,
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

  // 3. 注册材质并添加多边形实体
  registerMaterial();
  addPolygonEntity();

  // 4. 初始化 lil-gui 控件面板
  initGUI();
}

/**
 * 添加渐变材质多边形实体
 */
function addPolygonEntity() {
  const positions = [
    [119.23953661189609, 28.452901733153904, 1000],
    [119.23036420693285, 28.45042140192172, 1000],
    [119.22774705558578, 28.437181979280574, 1000],
    [119.24263341748609, 28.433917365676937, 1000],
    [119.24855118879702, 28.438461152942306, 1000],
    [119.24787462361024, 28.447357804030766, 1000],
  ];
  const cartesianPositions = Cesium.Cartesian3.fromDegreesArrayHeights(
    positions.flat(),
  );

  customMaterialProperty = new CustomMaterialProperty({
    color: Cesium.Color.fromCssColorString(vModel.color).withAlpha(
      vModel.alpha,
    ),
  });

  entity = viewer.entities.add({
    name: "渐变色材质多边形",
    polygon: {
      hierarchy: new Cesium.PolygonHierarchy(cartesianPositions),
      material: customMaterialProperty,
      height: vModel.height,
    },
  });

  viewer.zoomTo(entity);
}

/**
 * 初始化 lil-gui 控制面板
 */
function initGUI() {
  gui = new CustomGUI({
    container: viewerDivRef.value,
    title: "渐变色材质",
  });

  const materialFolder = gui.addFolder("渐变色材质属性");

  materialFolder.addColor(vModel, "color").name("材质颜色").onChange((val) => {
    if (customMaterialProperty) {
      customMaterialProperty.color = Cesium.Color.fromCssColorString(
        val,
      ).withAlpha(vModel.alpha);
    }
  });

  materialFolder
    .add(vModel, "alpha", 0.0, 1.0, 0.05)
    .name("透明度系数")
    .onChange((val) => {
      if (customMaterialProperty) {
        customMaterialProperty.color = Cesium.Color.fromCssColorString(
          vModel.color,
        ).withAlpha(val);
      }
    });

  materialFolder
    .add(vModel, "height", 500, 5000, 50)
    .name("多边形高度(m)")
    .onChange((val) => {
      if (entity && entity.polygon) {
        entity.polygon.height = val;
      }
    });

  materialFolder
    .add({ fn: () => entity && viewer.zoomTo(entity) }, "fn")
    .name("视角聚焦多边形");
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
