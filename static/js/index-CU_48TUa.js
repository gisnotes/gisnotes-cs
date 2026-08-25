import{c as d,o as E,C as n,D as V}from"./cesium-DdnnDhFM.js";import{C as v}from"./cesium-Cc-VHwZL.js";import{_ as x,r as b,T as g,F as R,M as D,o as _,m as k,f as M,h as t,i as B,H as S}from"./index-Ccqo7Xap.js";import"./index-CNSXQqF9.js";const T=`<template>
  <demo-box :codeBlocks>
    <div class="eagle-eye-container">
      <!-- 主三维视图 -->
      <div class="main-viewer" ref="mainViewerRef"></div>
      <!-- 鹰眼小地图视图 -->
      <div class="eagle-eye-wrapper">
        <div class="eagle-eye-header">
          <span class="title">鹰眼导航</span>
        </div>
        <div class="eagle-eye-viewer" ref="eagleEyeViewerRef"></div>
      </div>
    </div>
  </demo-box>
</template>

<script setup name="EagleEye">
import DemoBox from "@/components/DemoBox/index.vue";
import IndexSourceCode from "./index.vue?raw";
import CesiumSourceCode from "@/utils/cesium.js?raw";

import Cesium from "cesium";
import "cesium/Build/CesiumUnminified/Widgets/widgets.css";
import { createViewer, optimizeViewerQuality } from "@/utils/cesium";

const codeBlocks = ref([
  {
    fileName: "@/views/view/eagleEye/index.vue",
    rawCode: IndexSourceCode,
    language: "html",
  },
  {
    fileName: "@/utils/cesium.js",
    rawCode: CesiumSourceCode,
    language: "javascript",
  },
]);

const mainViewerRef = useTemplateRef("mainViewerRef");
const eagleEyeViewerRef = useTemplateRef("eagleEyeViewerRef");

let mainViewer = null;
let eagleEyeViewer = null;
let timer = null;
let extentEntity = null;

onMounted(() => {
  timer = setTimeout(() => {
    init();
  }, 0);
});

function init() {
  // 1. 初始化主三维视图
  mainViewer = createViewer(mainViewerRef.value);
  optimizeViewerQuality(mainViewer, { msaaSamples: 4, enableFxaa: true });

  // 2. 初始化鹰眼二维视图
  eagleEyeViewer = createViewer(eagleEyeViewerRef.value, {
    sceneMode: Cesium.SceneMode.SCENE2D,
  });

  // 禁用鹰眼视图的用户交互控制
  const controller = eagleEyeViewer.scene.screenSpaceCameraController;
  controller.enableRotate = false;
  controller.enableTranslate = false;
  controller.enableZoom = false;
  controller.enableTilt = false;
  controller.enableLook = false;

  // 3. 在鹰眼地图上添加主视图可视范围矩形实体
  extentEntity = eagleEyeViewer.entities.add({
    name: "主视图范围",
    rectangle: {
      coordinates: new Cesium.CallbackProperty(getExtentCoordinates, false),
      material: Cesium.Color.RED.withAlpha(0.2),
      outline: true,
      outlineColor: Cesium.Color.RED,
      outlineWidth: 2,
    },
  });

  // 4. 监听主视图相机变化，同步鹰眼地图中心与高度
  mainViewer.camera.changed.addEventListener(syncEagleEye);
  mainViewer.camera.percentageChanged = 0.01;

  // 初始定位到中国区域并触发一次同步
  mainViewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(104.0, 35.0, 10000000.0),
  });
  syncEagleEye();
}

// 获取主视图可视矩形范围
function getExtentCoordinates() {
  if (!mainViewer) return Cesium.Rectangle.fromDegrees(0, 0, 0, 0);
  try {
    const rect = mainViewer.camera.computeViewRectangle();
    return rect || Cesium.Rectangle.fromDegrees(0, 0, 0, 0);
  } catch (e) {
    return Cesium.Rectangle.fromDegrees(0, 0, 0, 0);
  }
}

// 主视图与鹰眼联动
function syncEagleEye() {
  if (!mainViewer || !eagleEyeViewer) return;

  // 获取主视图中心点地理坐标
  const viewCenter = new Cesium.Cartesian2(
    Math.floor(mainViewer.canvas.clientWidth / 2),
    Math.floor(mainViewer.canvas.clientHeight / 2),
  );

  const worldPosition = mainViewer.scene.camera.pickEllipsoid(viewCenter);
  if (!worldPosition) return;

  const cartographic = Cesium.Cartographic.fromCartesian(worldPosition);
  const lon = Cesium.Math.toDegrees(cartographic.longitude);
  const lat = Cesium.Math.toDegrees(cartographic.latitude);

  // 获取主视图相机距离地面的高度并成比例映射到鹰眼视图
  const cameraHeight = mainViewer.camera.positionCartographic.height;
  const eagleEyeHeight = Math.max(cameraHeight * 3.0, 2000000.0);

  // 更新鹰眼相机视图
  eagleEyeViewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(lon, lat, eagleEyeHeight),
  });
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
  if (mainViewer) {
    mainViewer.camera.changed.removeEventListener(syncEagleEye);
    mainViewer.destroy();
  }
  if (eagleEyeViewer) {
    eagleEyeViewer.destroy();
  }
});
<\/script>

<style lang="scss" scoped>
.eagle-eye-container {
  width: 100%;
  height: 100%;
  position: relative;

  .main-viewer {
    width: 100%;
    height: 100%;
    position: absolute;
    inset: 0;
  }

  .eagle-eye-wrapper {
    position: absolute;
    right: 20px;
    bottom: 20px;
    width: 260px;
    height: 200px;
    background: rgba(30, 30, 30, 0.85);
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    overflow: hidden;
    z-index: 99;
    backdrop-filter: blur(4px);
    display: flex;
    flex-direction: column;

    .eagle-eye-header {
      height: 28px;
      line-height: 28px;
      padding: 0 10px;
      background: rgba(0, 0, 0, 0.6);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);

      .title {
        font-size: 12px;
        color: #e0e0e0;
        font-weight: 500;
        user-select: none;
      }
    }

    .eagle-eye-viewer {
      flex: 1;
      width: 100%;
      height: calc(100% - 28px);
      position: relative;
    }
  }
}

/** 隐藏底部版权 */
:deep(.cesium-viewer-bottom) {
  display: none;
}
</style>
`,H={class:"eagle-eye-container"},N={class:"eagle-eye-wrapper"},j=S({name:"EagleEye"}),L=Object.assign(j,{setup(P){const u=b([{fileName:"@/views/view/eagleEye/index.vue",rawCode:T,language:"html"},{fileName:"@/utils/cesium.js",rawCode:v,language:"javascript"}]),l=g("mainViewerRef"),c=g("eagleEyeViewerRef");let e=null,i=null,o=null;R(()=>{o=setTimeout(()=>{f()},0)});function f(){e=d(l.value),E(e,{msaaSamples:4,enableFxaa:!0}),i=d(c.value,{sceneMode:n.SceneMode.SCENE2D});const a=i.scene.screenSpaceCameraController;a.enableRotate=!1,a.enableTranslate=!1,a.enableZoom=!1,a.enableTilt=!1,a.enableLook=!1,i.entities.add({name:"主视图范围",rectangle:{coordinates:new n.CallbackProperty(w,!1),material:n.Color.RED.withAlpha(.2),outline:!0,outlineColor:n.Color.RED,outlineWidth:2}}),e.camera.changed.addEventListener(s),e.camera.percentageChanged=.01,e.camera.setView({destination:n.Cartesian3.fromDegrees(104,35,1e7)}),s()}function w(){if(!e)return n.Rectangle.fromDegrees(0,0,0,0);try{return e.camera.computeViewRectangle()||n.Rectangle.fromDegrees(0,0,0,0)}catch{return n.Rectangle.fromDegrees(0,0,0,0)}}function s(){if(!e||!i)return;const a=new n.Cartesian2(Math.floor(e.canvas.clientWidth/2),Math.floor(e.canvas.clientHeight/2)),r=e.scene.camera.pickEllipsoid(a);if(!r)return;const m=n.Cartographic.fromCartesian(r),p=n.Math.toDegrees(m.longitude),h=n.Math.toDegrees(m.latitude),C=e.camera.positionCartographic.height,y=Math.max(C*3,2e6);i.camera.setView({destination:n.Cartesian3.fromDegrees(p,h,y)})}return D(()=>{o&&clearTimeout(o),e&&(e.camera.changed.removeEventListener(s),e.destroy()),i&&i.destroy()}),(a,r)=>(_(),k(V,{codeBlocks:B(u)},{default:M(()=>[t("div",H,[t("div",{class:"main-viewer",ref_key:"mainViewerRef",ref:l},null,512),t("div",N,[r[0]||(r[0]=t("div",{class:"eagle-eye-header"},[t("span",{class:"title"},"鹰眼导航")],-1)),t("div",{class:"eagle-eye-viewer",ref_key:"eagleEyeViewerRef",ref:c},null,512)])])]),_:1},8,["codeBlocks"]))}}),Q=x(L,[["__scopeId","data-v-4b38b9f5"]]);export{Q as default};
