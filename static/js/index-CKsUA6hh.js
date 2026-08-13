import{C as i,c,D as p}from"./cesium-BsaaIHww.js";import{_ as C,r as h,T as d,F as _,M as k,o as B,m as M,f as g,h as a,i as R,H as y}from"./index-IeycYJqZ.js";import"./index-DHQa5Yyz.js";const x=`<template>\r
  <demo-box :codeBlocks>\r
    <div class="multiple-synced-views">\r
      <!-- 三维视图 -->\r
      <div class="viewer-container" ref="viewer3DRef"></div>\r
      <!-- 二维视图 -->\r
      <div class="viewer-container" ref="viewer2DRef"></div>\r
    </div>\r
  </demo-box>\r
</template>\r
\r
<script setup name="MultipleSyncedViews">\r
import DemoBox from "@/components/DemoBox/index.vue";\r
import IndexSourceCode from "./index.vue?raw";\r
\r
import Cesium from "cesium";\r
import "cesium/Build/CesiumUnminified/Widgets/widgets.css";\r
import { createViewer } from "@/utils/cesium";\r
\r
const codeBlocks = ref([\r
  {\r
    fileName: "@/views/view/multipleSyncedViews/index.vue",\r
    rawCode: IndexSourceCode,\r
    language: "html",\r
  },\r
]);\r
\r
const viewer3DDivRef = useTemplateRef("viewer3DRef");\r
const viewer2DDivRef = useTemplateRef("viewer2DRef");\r
\r
let viewer3D = null;\r
let viewer2D = null;\r
let timer = null;\r
\r
const sysBaseUrl = import.meta.env.BASE_URL;\r
const mode = import.meta.env.MODE;\r
const sourceCesiumBaseUrl = import.meta.env.VITE_CESIUM_BASE_URL;\r
window.CESIUM_BASE_URL =\r
  mode === "development"\r
    ? \`\${sysBaseUrl}\${sourceCesiumBaseUrl}\`\r
    : sourceCesiumBaseUrl;\r
\r
\r
// 联动逻辑函数\r
let worldPosition;\r
const sync2DView = () => {\r
  if (!viewer3D || !viewer2D) return;\r
\r
  const viewCenter = new Cesium.Cartesian2(\r
    Math.floor(viewer3D.canvas.clientWidth / 2),\r
    Math.floor(viewer3D.canvas.clientHeight / 2),\r
  );\r
\r
  const newWorldPosition = viewer3D.scene.camera.pickEllipsoid(viewCenter);\r
  if (Cesium.defined(newWorldPosition)) {\r
    worldPosition = newWorldPosition;\r
  }\r
\r
  if (!worldPosition) return;\r
\r
  const distance = Cesium.Cartesian3.distance(\r
    worldPosition,\r
    viewer3D.scene.camera.positionWC,\r
  );\r
\r
  viewer2D.scene.camera.lookAt(\r
    worldPosition,\r
    new Cesium.Cartesian3(0.0, 0.0, distance),\r
  );\r
};\r
\r
onMounted(() => {\r
  /**\r
   * 由于el-splitter组件的宽度是动态计算的，\r
   * 所以需要等待 DOM 元素加载完成后再初始化，\r
   * 因此这里采用 setTimeout 确保 DOM 元素加载完成\r
   */\r
  timer = setTimeout(() => {\r
    init();\r
  }, 0);\r
});\r
\r
function init() {\r
  const sharedClock = new Cesium.ClockViewModel();\r
\r
  viewer3D = createViewer(viewer3DDivRef.value, {\r
    clockViewModel: sharedClock,\r
  });\r
\r
  viewer2D = createViewer(viewer2DDivRef.value, {\r
    clockViewModel: sharedClock,\r
    sceneMode: Cesium.SceneMode.SCENE2D,\r
  });\r
\r
  // 配置联动\r
  viewer3D.camera.changed.addEventListener(sync2DView);\r
  viewer3D.camera.percentageChanged = 0.01;\r
\r
  // 禁用 2D 视图交互，使其只读\r
  const controller2D = viewer2D.scene.screenSpaceCameraController;\r
  controller2D.enableRotate = false;\r
  controller2D.enableTranslate = false;\r
  controller2D.enableZoom = false;\r
  controller2D.enableTilt = false;\r
  controller2D.enableLook = false;\r
}\r
\r
// 销毁时解绑事件，防止内存泄漏\r
onBeforeUnmount(() => {\r
  if (timer) clearTimeout(timer);\r
  if (viewer3D) {\r
    viewer3D.camera.changed.removeEventListener(sync2DView);\r
    viewer3D.destroy();\r
  }\r
  if (viewer2D) viewer2D.destroy();\r
});\r
<\/script>\r
\r
<style lang="scss" scoped>\r
.multiple-synced-views {\r
  height: 100%;\r
  position: absolute;\r
  inset: 0;\r
  display: flex;\r
  gap: 2px;\r
  background-color: #000;\r
\r
  .viewer-container {\r
    flex: 1;\r
    height: 100%;\r
    position: relative;\r
  }\r
}\r
\r
/** 隐藏底部版权 */\r
:deep(.cesium-viewer-bottom) {\r
  display: none;\r
}\r
</style>\r
`,S={class:"multiple-synced-views"},V={class:"viewer-container",ref:"viewer3DRef"},E={class:"viewer-container",ref:"viewer2DRef"},b=y({name:"MultipleSyncedViews"}),U=Object.assign(b,{setup(T){const m=h([{fileName:"@/views/view/multipleSyncedViews/index.vue",rawCode:x,language:"html"}]),w=d("viewer3DRef"),v=d("viewer2DRef");let e=null,r=null,t=null;const u="https://www.unpkg.com/cesium@1.144.0/Build/Cesium/";window.CESIUM_BASE_URL=u;let s;const l=()=>{if(!e||!r)return;const o=new i.Cartesian2(Math.floor(e.canvas.clientWidth/2),Math.floor(e.canvas.clientHeight/2)),n=e.scene.camera.pickEllipsoid(o);if(i.defined(n)&&(s=n),!s)return;const D=i.Cartesian3.distance(s,e.scene.camera.positionWC);r.scene.camera.lookAt(s,new i.Cartesian3(0,0,D))};_(()=>{t=setTimeout(()=>{f()},0)});function f(){const o=new i.ClockViewModel;e=c(w.value,{clockViewModel:o}),r=c(v.value,{clockViewModel:o,sceneMode:i.SceneMode.SCENE2D}),e.camera.changed.addEventListener(l),e.camera.percentageChanged=.01;const n=r.scene.screenSpaceCameraController;n.enableRotate=!1,n.enableTranslate=!1,n.enableZoom=!1,n.enableTilt=!1,n.enableLook=!1}return k(()=>{t&&clearTimeout(t),e&&(e.camera.changed.removeEventListener(l),e.destroy()),r&&r.destroy()}),(o,n)=>(B(),M(p,{codeBlocks:R(m)},{default:g(()=>[a("div",S,[a("div",V,null,512),a("div",E,null,512)])]),_:1},8,["codeBlocks"]))}}),I=C(U,[["__scopeId","data-v-60399fa8"]]);export{I as default};
