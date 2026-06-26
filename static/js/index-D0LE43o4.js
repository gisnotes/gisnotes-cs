import{C as r,D as p}from"./widgets-C-SRN5zU.js";import{_ as D,r as C,de as c,F as h,M as y,o as B,m as M,f as g,h as t,i as _,H as k}from"./index-DDECBUcT.js";import"./index-D66JAQSl.js";const b=`<template>\r
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
\r
const sysBaseUrl = import.meta.env.BASE_URL;\r
const mode = import.meta.env.MODE;\r
const sourceCesiumBaseUrl = import.meta.env.VITE_CESIUM_BASE_URL;\r
window.CESIUM_BASE_URL =\r
  mode === "development"\r
    ? \`\${sysBaseUrl}\${sourceCesiumBaseUrl}\`\r
    : sourceCesiumBaseUrl;\r
\r
/**\r
 * 通用的创建 Viewer 方法\r
 * @param {HTMLElement} container 容器引用\r
 * @param {Object} options 自定义配置项\r
 */\r
function createGenericViewer(container, options = {}) {\r
  return new Cesium.Viewer(container, {\r
    geocoder: false,\r
    homeButton: false,\r
    sceneModePicker: false,\r
    baseLayerPicker: false,\r
    navigationHelpButton: false,\r
    animation: false,\r
    timeline: false,\r
    fullscreenButton: false,\r
    infoBox: false,\r
    selectionIndicator: false,\r
    shouldAnimate: true,\r
    baseLayer: Cesium.ImageryLayer.fromProviderAsync(\r
      Cesium.TileMapServiceImageryProvider.fromUrl(\r
        Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII"),\r
      ),\r
    ),\r
    ...options, // 允许外部覆盖默认配置\r
  });\r
}\r
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
  setTimeout(() => {\r
    init();\r
  }, 0);\r
});\r
\r
function init() {\r
  const sharedClock = new Cesium.ClockViewModel();\r
\r
  viewer3D = createGenericViewer(viewer3DDivRef.value, {\r
    clockViewModel: sharedClock,\r
  });\r
\r
  viewer2D = createGenericViewer(viewer2DDivRef.value, {\r
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
`,x={class:"multiple-synced-views"},R={class:"viewer-container",ref:"viewer3DRef"},V={class:"viewer-container",ref:"viewer2DRef"},E=k({name:"MultipleSyncedViews"}),S=Object.assign(E,{setup(U){const d=C([{fileName:"@/views/view/multipleSyncedViews/index.vue",rawCode:b,language:"html"}]),m=c("viewer3DRef"),u=c("viewer2DRef");let e=null,o=null;const f="https://www.unpkg.com/cesium@1.140.0/Build/Cesium/";window.CESIUM_BASE_URL=f;function a(i,n={}){return new r.Viewer(i,{geocoder:!1,homeButton:!1,sceneModePicker:!1,baseLayerPicker:!1,navigationHelpButton:!1,animation:!1,timeline:!1,fullscreenButton:!1,infoBox:!1,selectionIndicator:!1,shouldAnimate:!0,baseLayer:r.ImageryLayer.fromProviderAsync(r.TileMapServiceImageryProvider.fromUrl(r.buildModuleUrl("Assets/Textures/NaturalEarthII"))),...n})}let s;const l=()=>{if(!e||!o)return;const i=new r.Cartesian2(Math.floor(e.canvas.clientWidth/2),Math.floor(e.canvas.clientHeight/2)),n=e.scene.camera.pickEllipsoid(i);if(r.defined(n)&&(s=n),!s)return;const v=r.Cartesian3.distance(s,e.scene.camera.positionWC);o.scene.camera.lookAt(s,new r.Cartesian3(0,0,v))};h(()=>{setTimeout(()=>{w()},0)});function w(){const i=new r.ClockViewModel;e=a(m.value,{clockViewModel:i}),o=a(u.value,{clockViewModel:i,sceneMode:r.SceneMode.SCENE2D}),e.camera.changed.addEventListener(l),e.camera.percentageChanged=.01;const n=o.scene.screenSpaceCameraController;n.enableRotate=!1,n.enableTranslate=!1,n.enableZoom=!1,n.enableTilt=!1,n.enableLook=!1}return y(()=>{e&&(e.camera.changed.removeEventListener(l),e.destroy()),o&&o.destroy()}),(i,n)=>(B(),M(p,{codeBlocks:_(d)},{default:g(()=>[t("div",x,[t("div",R,null,512),t("div",V,null,512)])]),_:1},8,["codeBlocks"]))}}),T=D(S,[["__scopeId","data-v-afb26d49"]]);export{T as default};
