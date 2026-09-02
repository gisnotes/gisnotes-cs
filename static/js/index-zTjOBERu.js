import{C as n,c as k,o as S,D as R}from"./cesium-DrqHkmj_.js";import{C as I}from"./cesium-pNEfRpPT.js";import{C as P}from"./gui-lg9F6Ebh.js";import{_ as j,r as Q,T as q,U as D,F as B,M as V,o as N,m as U,f as F,h as G,i as L,H as O}from"./index-BZhg8qW3.js";import"./index-CWeydB1c.js";const W=`<template>
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
<\/script>

<style lang="scss" scoped>
.box {
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
}
</style>
`,A=`import Cesium from "cesium";

// 方案 A：自定义 3x3 九宫格魔方材质类型标识
export const MaterialType = "RubikCubeMaterialType";

// 注册 3x3 九宫格魔方着色器到 Cesium 的 MaterialCache 中
if (!Cesium.Material._materialCache.getMaterial(MaterialType)) {
  Cesium.Material._materialCache.addMaterial(MaterialType, {
    fabric: {
      type: MaterialType,
      uniforms: {},
      source: \`
        czm_material czm_getMaterial(czm_materialInput materialInput) {
          czm_material material = czm_getDefaultMaterial(materialInput);
          vec2 st = materialInput.st;

          // 1. 将 0.0 ~ 1.0 的纹理坐标分为 3x3 九宫格
          vec2 grid = floor(st * 3.0); // 坐标 (0,1,2, 0,1,2)
          vec2 f = fract(st * 3.0);    // 每个格子内部局部坐标 (0.0 ~ 1.0)

          // 2. 黑色分界缝隙边框（模拟魔方黑色塑料缝隙）
          float border = 0.06;
          if (f.x < border || f.x > (1.0 - border) || f.y < border || f.y > (1.0 - border)) {
            material.diffuse = vec3(0.05); // 黑色塑料胶骨
            return material;
          }

          // 3. 根据格子序号渲染经典魔方 9 宫格色彩
          int idx = int(grid.y) * 3 + int(grid.x);
          if (idx == 0) material.diffuse = vec3(0.85, 0.0, 0.0);   // 经典红
          else if (idx == 1) material.diffuse = vec3(0.0, 0.3, 0.9); // 经典蓝
          else if (idx == 2) material.diffuse = vec3(0.95, 0.85, 0.0); // 经典黄
          else if (idx == 3) material.diffuse = vec3(0.0, 0.75, 0.2); // 经典绿
          else if (idx == 4) material.diffuse = vec3(0.95, 0.45, 0.0); // 经典橙
          else if (idx == 5) material.diffuse = vec3(0.95, 0.95, 0.95); // 经典白
          else if (idx == 6) material.diffuse = vec3(0.0, 0.8, 0.85);  // 青蓝
          else if (idx == 7) material.diffuse = vec3(0.85, 0.05, 0.75); // 玫红
          else material.diffuse = vec3(1.0, 0.65, 0.0);               // 亮橙

          return material;
        }
      \`,
    },
    translucent: false,
  });
}

/**
 * 方案 A：ES6 Class 语法的 3x3 九宫格魔方材质属性类
 */
export class RubikCubeMaterialProperty {
  constructor(options = {}) {
    this._definitionChanged = new Cesium.Event();
  }

  get isConstant() {
    return true;
  }

  get definitionChanged() {
    return this._definitionChanged;
  }

  getType(time) {
    return MaterialType;
  }

  getValue(time, result = {}) {
    return result || {};
  }

  equals(other) {
    return this === other || other instanceof RubikCubeMaterialProperty;
  }
}

export default RubikCubeMaterialProperty;

`,Y=`import Cesium from "cesium";

// 自定义四色象限材质类型标识
export const MaterialType = "QuadrantMaterialType";

// 注册基于 ST 纹理坐标的四色象限材质到 Cesium 的 MaterialCache 中
if (!Cesium.Material._materialCache.getMaterial(MaterialType)) {
  Cesium.Material._materialCache.addMaterial(MaterialType, {
    fabric: {
      type: MaterialType,
      uniforms: {},
      source: \`
        czm_material czm_getMaterial(czm_materialInput materialInput) {
          czm_material material = czm_getDefaultMaterial(materialInput);

          vec2 st = materialInput.st;
          if (st.s < 0.5 && st.t < 0.5) {
            material.diffuse = vec3(0., 1., 0.);
          }
          if (st.s < 0.5 && st.t > 0.5) {
            material.diffuse = vec3(0., 0., 1.);
          }
          if (st.s > 0.5 && st.t > 0.5) {
            material.diffuse = vec3(0., 1., 1.);
          }
          if (st.s > 0.5 && st.t < 0.5) {
            material.diffuse = vec3(1., 0., 0.);
          }
          return material;
        }
      \`,
    },
    translucent: false,
  });
}

/**
 * ES6 Class 语法的四色象限材质属性类 (QuadrantMaterialProperty)
 */
export class QuadrantMaterialProperty {
  constructor(options = {}) {
    this._definitionChanged = new Cesium.Event();
  }

  /**
   * 该材质属于常量材质（内部颜色固定，无需逐帧拉取）
   */
  get isConstant() {
    return true;
  }

  get definitionChanged() {
    return this._definitionChanged;
  }

  getType(time) {
    return MaterialType;
  }

  getValue(time, result = {}) {
    return result || {};
  }

  equals(other) {
    return this === other || other instanceof QuadrantMaterialProperty;
  }
}

export default QuadrantMaterialProperty;

`,$=`import Cesium from "cesium";

// 自定义材质类型标识
export const MaterialType = "ChangeColorMaterialType";

// 注册纯色自定义材质到 Cesium 的 MaterialCache 中
if (!Cesium.Material._materialCache.getMaterial(MaterialType)) {
  /**
   * 这段代码是向 Cesium 底层的全局材质池（_materialCache）注册一种新的材质模板。
   * 一旦注册，后续所有的 Entity、Primitive 都可以通过该 MaterialType 名字直接调用。
   */
  Cesium.Material._materialCache.addMaterial(MaterialType, {
    fabric: {
      type: MaterialType,
      uniforms: {
        color: Cesium.Color.BLUE,
      },
      /**
       * source属性写的是GLSL着色器代码，定义了材质的渲染方式。
       *  - czm_getMaterial 是 Cesium 内置的一个函数，用于获取材质的最终渲染结果。
       *  - materialInput 是 Cesium 内部传入的材质输入参数，包含了顶点信息、纹理坐标等。
       *  - material.diffuse = color.rgb; 这行代码将材质的漫反射颜色设置为传入的 color uniform 的 RGB 值。
       *    最终返回的 material 对象会被 Cesium 用于渲染实体。
       * 
       *  diffuse 代表物体的漫反射颜色（即表面基础固有色），类型是 vec3（包含 r、g、b 三个色彩通道）。
       */
      source: \`
        czm_material czm_getMaterial(czm_materialInput materialInput) {
          czm_material material = czm_getDefaultMaterial(materialInput);
          material.diffuse = color.rgb;
          return material;
        }
      \`,
    },
    translucent: true,//这个材质支持半透明
  });
}

/**
 * ES6 Class 语法的自定义材质属性类
 */
export class CustomMaterialProperty {
  /**
   * 构造函数
   * @param {Object} [options={}] - 材质配置项
   * @param {Cesium.Color|string} [options.color] - 初始颜色
   */
  constructor(options = {}) {
    this._definitionChanged = new Cesium.Event();
    this._color = options.color || Cesium.Color.GREEN;
    this.color = this._color;
  }

  /**
   * 是否为常量属性（返回 false 表示每帧都会拉取 getValue 更新）
   */
  get isConstant() {
    return false;
  }

  /**
   * 材质定义变更事件
   */
  get definitionChanged() {
    return this._definitionChanged;
  }

  /**
   * 获取材质颜色
   */
  get color() {
    return this._color;
  }

  /**
   * 设置材质颜色（直接修改 uniform 数据，不触发网格重构以避免闪烁）
   */
  set color(value) {
    if (value instanceof Cesium.Color) {
      this._color = value;
    } else if (typeof value === "string") {
      this._color = Cesium.Color.fromCssColorString(value);
    }
  }

  /**
   * 获取材质类型标识
   */
  getType(time) {
    return MaterialType;
  }

  /**
   * 每帧由渲染器调用，返回传递给着色器的 Uniform 对象
   */
  getValue(time, result = {}) {
    if (!result) {
      result = {};
    }
    result.color = this._color || Cesium.Color.YELLOW;
    return result;
  }

  /**
   * 判断材质属性是否相等
   */
  equals(other) {
    return (
      this === other ||
      (other instanceof CustomMaterialProperty &&
        Cesium.Color.equals(this._color, other._color))
    );
  }
}

export default CustomMaterialProperty;

`,d="ChangeColorMaterialType";n.Material._materialCache.getMaterial(d)||n.Material._materialCache.addMaterial(d,{fabric:{type:d,uniforms:{color:n.Color.BLUE},source:`
        czm_material czm_getMaterial(czm_materialInput materialInput) {
          czm_material material = czm_getDefaultMaterial(materialInput);
          material.diffuse = color.rgb;
          return material;
        }
      `},translucent:!0});class g{constructor(e={}){this._definitionChanged=new n.Event,this._color=e.color||n.Color.GREEN,this.color=this._color}get isConstant(){return!1}get definitionChanged(){return this._definitionChanged}get color(){return this._color}set color(e){e instanceof n.Color?this._color=e:typeof e=="string"&&(this._color=n.Color.fromCssColorString(e))}getType(e){return d}getValue(e,a={}){return a||(a={}),a.color=this._color||n.Color.YELLOW,a}equals(e){return this===e||e instanceof g&&n.Color.equals(this._color,e._color)}}const f="QuadrantMaterialType";n.Material._materialCache.getMaterial(f)||n.Material._materialCache.addMaterial(f,{fabric:{type:f,uniforms:{},source:`
        czm_material czm_getMaterial(czm_materialInput materialInput) {
          czm_material material = czm_getDefaultMaterial(materialInput);

          vec2 st = materialInput.st;
          if (st.s < 0.5 && st.t < 0.5) {
            material.diffuse = vec3(0., 1., 0.);
          }
          if (st.s < 0.5 && st.t > 0.5) {
            material.diffuse = vec3(0., 0., 1.);
          }
          if (st.s > 0.5 && st.t > 0.5) {
            material.diffuse = vec3(0., 1., 1.);
          }
          if (st.s > 0.5 && st.t < 0.5) {
            material.diffuse = vec3(1., 0., 0.);
          }
          return material;
        }
      `},translucent:!1});class v{constructor(e={}){this._definitionChanged=new n.Event}get isConstant(){return!0}get definitionChanged(){return this._definitionChanged}getType(e){return f}getValue(e,a={}){return a||{}}equals(e){return this===e||e instanceof v}}const c="RubikCubeMaterialType";n.Material._materialCache.getMaterial(c)||n.Material._materialCache.addMaterial(c,{fabric:{type:c,uniforms:{},source:`
        czm_material czm_getMaterial(czm_materialInput materialInput) {
          czm_material material = czm_getDefaultMaterial(materialInput);
          vec2 st = materialInput.st;

          // 1. 将 0.0 ~ 1.0 的纹理坐标分为 3x3 九宫格
          vec2 grid = floor(st * 3.0); // 坐标 (0,1,2, 0,1,2)
          vec2 f = fract(st * 3.0);    // 每个格子内部局部坐标 (0.0 ~ 1.0)

          // 2. 黑色分界缝隙边框（模拟魔方黑色塑料缝隙）
          float border = 0.06;
          if (f.x < border || f.x > (1.0 - border) || f.y < border || f.y > (1.0 - border)) {
            material.diffuse = vec3(0.05); // 黑色塑料胶骨
            return material;
          }

          // 3. 根据格子序号渲染经典魔方 9 宫格色彩
          int idx = int(grid.y) * 3 + int(grid.x);
          if (idx == 0) material.diffuse = vec3(0.85, 0.0, 0.0);   // 经典红
          else if (idx == 1) material.diffuse = vec3(0.0, 0.3, 0.9); // 经典蓝
          else if (idx == 2) material.diffuse = vec3(0.95, 0.85, 0.0); // 经典黄
          else if (idx == 3) material.diffuse = vec3(0.0, 0.75, 0.2); // 经典绿
          else if (idx == 4) material.diffuse = vec3(0.95, 0.45, 0.0); // 经典橙
          else if (idx == 5) material.diffuse = vec3(0.95, 0.95, 0.95); // 经典白
          else if (idx == 6) material.diffuse = vec3(0.0, 0.8, 0.85);  // 青蓝
          else if (idx == 7) material.diffuse = vec3(0.85, 0.05, 0.75); // 玫红
          else material.diffuse = vec3(1.0, 0.65, 0.0);               // 亮橙

          return material;
        }
      `},translucent:!1});class y{constructor(e={}){this._definitionChanged=new n.Event}get isConstant(){return!0}get definitionChanged(){return this._definitionChanged}getType(e){return c}getValue(e,a={}){return a||{}}equals(e){return this===e||e instanceof y}}const H={class:"box",ref:"viewerRef"},J=O({name:"ChangeColor"}),K=Object.assign(J,{setup(X){const e=Q([{fileName:"@/views/material/changeColor/index.vue",rawCode:W,language:"html"},{fileName:"@/views/material/changeColor/RubikCubeMaterialProperty.js (3x3九宫格魔方材质)",rawCode:A,language:"javascript"},{fileName:"@/views/material/changeColor/QuadrantMaterialProperty.js (四色象限材质)",rawCode:Y,language:"javascript"},{fileName:"@/views/material/changeColor/CustomMaterialPropertyES6.js (纯色变色材质)",rawCode:$,language:"javascript"},{fileName:"@/utils/cesium.js",rawCode:I,language:"javascript"}]),a=q("viewerRef");let t=null,C=null,l=null,s=null,m=null,i=null,r=null;const _=D({color:"#ff0000"});B(()=>{C=setTimeout(()=>{w()},0)});function w(){t=k(a.value,{shadows:!0}),S(t,{msaaSamples:4,enableFxaa:!0}),x(),T()}function x(){const o=n.Cartesian3.fromDegrees(-75.59670696331766,40.0387958759388,100),u=new n.Cartesian3(300,100,200);m=new g({color:n.Color.RED}),s=t.entities.add({name:"变色长方体",position:o,box:{dimensions:u,material:m}}),t.zoomTo(t.entities)}function M(){if(i){t.zoomTo(i);return}const o=n.Cartesian3.fromDegrees(-75.5915,40.0387958759388,100);i=t.entities.add({name:"四色象限长方体",position:o,box:{dimensions:new n.Cartesian3(300,100,200),material:new v}}),t.zoomTo(i)}function E(){i&&(t.entities.remove(i),i=null)}function b(){if(r){t.zoomTo(r);return}const o=n.Cartesian3.fromDegrees(-75.59670696331766,40.0435,100);r=t.entities.add({name:"3x3 九宫格魔方正方体",position:o,box:{dimensions:new n.Cartesian3(180,180,180),material:new y}}),t.zoomTo(r)}function h(){r&&(t.entities.remove(r),r=null)}function T(){l=new P({container:a.value,title:"材质控制"});const o=l.addFolder("基础: 变更长方体颜色");o.addColor(_,"color").name("表面颜色").onChange(z=>{m&&(m.color=n.Color.fromCssColorString(z))}),o.add({fn:()=>s&&t.zoomTo(s)},"fn").name("视角聚焦长方体");const u=l.addFolder("进阶: 四色象限材质 (ST坐标)");u.add({fn:M},"fn").name("添加四色实体"),u.add({fn:E},"fn").name("移除四色实体"),u.add({fn:()=>{i?t.zoomTo(i):M()}},"fn").name("视角聚焦四色实体");const p=l.addFolder("进阶: 3x3九宫格魔方正方体");p.add({fn:b},"fn").name("添加魔方正方体"),p.add({fn:h},"fn").name("移除魔方正方体"),p.add({fn:()=>{r?t.zoomTo(r):b()}},"fn").name("视角聚焦魔方")}return V(()=>{C&&clearTimeout(C),l&&(l.destroy(),l=null),t&&(s&&(t.entities.remove(s),s=null),i&&(t.entities.remove(i),i=null),h(),t.destroy(),t=null)}),(o,u)=>(N(),U(R,{codeBlocks:L(e)},{default:F(()=>[G("div",H,null,512)]),_:1},8,["codeBlocks"]))}}),ae=j(K,[["__scopeId","data-v-9efaf243"]]);export{ae as default};
