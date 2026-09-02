import{C as t,c as g,o as y,D as w}from"./cesium-DrqHkmj_.js";import{C as v}from"./cesium-pNEfRpPT.js";import{C as M}from"./gui-lg9F6Ebh.js";import{_,r as P,T as x,U as T,F as I,M as z,o as b,m as S,f as B,h as D,i as F,H as V}from"./index-BZhg8qW3.js";import"./index-CWeydB1c.js";const G=`<template>
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
        source: \`
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
        \`,
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
<\/script>

<style lang="scss" scoped>
.box {
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
}
</style>
`,R={class:"box",ref:"viewerRef"},U=V({name:"GradientMaterial"}),j=Object.assign(U,{setup(k){const f=P([{fileName:"@/views/material/gradientMaterial/index.vue",rawCode:G,language:"html"},{fileName:"@/utils/cesium.js",rawCode:v,language:"javascript"}]),c=x("viewerRef");let i=null,m=null,s=null,o=null,a=null;const u="CustomGradientMaterial";function l(e={}){this._definitionChanged=new t.Event,this._color=e.color||new t.Color(1,1,0,1),this.duration=e.duration||2e3,this._time=window.performance.now()}Object.defineProperties(l.prototype,{isConstant:{get:function(){return!1}},definitionChanged:{get:function(){return this._definitionChanged}},color:{get:function(){return this._color},set:function(e){e instanceof t.Color?this._color=e:typeof e=="string"&&(this._color=t.Color.fromCssColorString(e))}}}),l.prototype.getType=function(e){return u},l.prototype.getValue=function(e,n){return n||(n={}),n.color=this._color,n.time=(window.performance.now()-this._time)%this.duration/this.duration,n},l.prototype.equals=function(e){return this===e||e instanceof l&&t.Color.equals(this._color,e._color)};function d(){t.Material._materialCache.getMaterial(u)||t.Material._materialCache.addMaterial(u,{fabric:{type:u,uniforms:{color:new t.Color(1,1,0,1),time:1,spacing:40,width:1},source:`
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
        `},translucent:function(e){return!0}})}const r=T({color:"#ffff00",alpha:1,height:1600});I(()=>{m=setTimeout(()=>{p()},0)});function p(){i=g(c.value,{shadows:!0}),y(i,{msaaSamples:4,enableFxaa:!0}),d(),h(),C()}function h(){const e=[[119.23953661189609,28.452901733153904,1e3],[119.23036420693285,28.45042140192172,1e3],[119.22774705558578,28.437181979280574,1e3],[119.24263341748609,28.433917365676937,1e3],[119.24855118879702,28.438461152942306,1e3],[119.24787462361024,28.447357804030766,1e3]],n=t.Cartesian3.fromDegreesArrayHeights(e.flat());a=new l({color:t.Color.fromCssColorString(r.color).withAlpha(r.alpha)}),o=i.entities.add({name:"渐变色材质多边形",polygon:{hierarchy:new t.PolygonHierarchy(n),material:a,height:r.height}}),i.zoomTo(o)}function C(){s=new M({container:c.value,title:"渐变色材质"});const e=s.addFolder("渐变色材质属性");e.addColor(r,"color").name("材质颜色").onChange(n=>{a&&(a.color=t.Color.fromCssColorString(n).withAlpha(r.alpha))}),e.add(r,"alpha",0,1,.05).name("透明度系数").onChange(n=>{a&&(a.color=t.Color.fromCssColorString(r.color).withAlpha(n))}),e.add(r,"height",500,5e3,50).name("多边形高度(m)").onChange(n=>{o&&o.polygon&&(o.polygon.height=n)}),e.add({fn:()=>o&&i.zoomTo(o)},"fn").name("视角聚焦多边形")}return z(()=>{m&&clearTimeout(m),s&&(s.destroy(),s=null),i&&(o&&(i.entities.remove(o),o=null),i.destroy(),i=null)}),(e,n)=>(b(),S(w,{codeBlocks:F(f)},{default:B(()=>[D("div",R,null,512)]),_:1},8,["codeBlocks"]))}}),O=_(j,[["__scopeId","data-v-6c437012"]]);export{O as default};
