import{c as D,o as y,C as n,D as R}from"./cesium-DrqHkmj_.js";import{C as T}from"./cesium-pNEfRpPT.js";import{C as _}from"./gui-lg9F6Ebh.js";import{_ as F,r as x,T as V,F as I,M as B,o as b,m as U,f as N,h as E,i as S,H as k}from"./index-BZhg8qW3.js";import"./index-CWeydB1c.js";const z=`<template>
  <demo-box :codeBlocks>
    <div class="box" ref="viewerRef"></div>
  </demo-box>
</template>

<script setup name="CameraVisualization">
import DemoBox from "@/components/DemoBox/index.vue";
import IndexSourceCode from "./index.vue?raw";
import CesiumSourceCode from "@/utils/cesium.js?raw";

import Cesium from "cesium";
import "cesium/Build/CesiumUnminified/Widgets/widgets.css";
import { createViewer, optimizeViewerQuality } from "@/utils/cesium";
import { CustomGUI } from "@/utils/gui";

const codeBlocks = ref([
  {
    fileName: "@/views/camera/cameraVisualization/index.vue",
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
let mainCameraPrimitive = null;
let targetCamera = null;
let targetPrimitive = null;

// 相机姿态控制模型
const vModel = {
  heading: 0,
  pitch: 0,
  roll: 0,
};

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

  // 3. 默认加载并展示相机实体
  addTargetCamera();

  // 4. 初始化 lil-gui 控制面板
  initGUI();
}

/**
 * 将主相机设置到北极视角（最开始的代码）
 */
function setNorthPoleView() {
  if (!viewer) return;
  // 将相机设置到北极
  viewer.camera.position = Cesium.Cartesian3.fromDegrees(0, 90, 50000000);
  // 北极向南极看
  viewer.camera.direction = Cesium.Cartesian3.negate(
    Cesium.Cartesian3.UNIT_Z,
    new Cesium.Cartesian3(),
  );
  viewer.camera.up = Cesium.Cartesian3.clone(Cesium.Cartesian3.UNIT_Y);
}

/**
 * 添加主相机可视化视锥体 primitive
 */
function addMainCameraPrimitive() {
  if (!viewer) return;
  if (mainCameraPrimitive && !mainCameraPrimitive.isDestroyed?.()) {
    viewer.scene.primitives.remove(mainCameraPrimitive);
  }

  // 可视化相机
  mainCameraPrimitive = new Cesium.DebugCameraPrimitive({
    camera: viewer.camera,
    color: Cesium.Color.RED,
    show: true,
    updateOnChange: false,
  });

  viewer.scene.primitives.add(mainCameraPrimitive);
}

/**
 * 移除主相机可视化视锥体
 */
function removeMainCameraPrimitive() {
  if (!viewer) return;
  if (mainCameraPrimitive && !mainCameraPrimitive.isDestroyed?.()) {
    viewer.scene.primitives.remove(mainCameraPrimitive);
    mainCameraPrimitive = null;
  }
}

/**
 * 添加并可视化独立相机实体
 */
function addTargetCamera() {
  if (!viewer) return;
  if (targetPrimitive && !targetPrimitive.isDestroyed?.()) {
    viewer.scene.primitives.remove(targetPrimitive);
  }

  targetCamera = new Cesium.Camera(viewer.scene);
  targetCamera.frustum.fov = Cesium.Math.PI_OVER_THREE;
  targetCamera.frustum.near = 1.0;
  targetCamera.frustum.far = 2000.0;
  update();

  targetPrimitive = new Cesium.DebugCameraPrimitive({
    camera: targetCamera,
    color: Cesium.Color.RED,
    show: true,
    updateOnChange: true,
  });
  viewer.scene.primitives.add(targetPrimitive);

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(120, 36, 10000),
  });
}

/**
 * 移除相机实体
 */
function removeTargetCamera() {
  if (!viewer) return;
  if (targetPrimitive && !targetPrimitive.isDestroyed?.()) {
    viewer.scene.primitives.remove(targetPrimitive);
    targetPrimitive = null;
    targetCamera = null;
  }
}

/**
 * 更新目标相机的 Heading、Pitch、Roll 姿态
 */
function update() {
  if (!targetCamera) return;
  targetCamera.setView({
    destination: Cesium.Cartesian3.fromDegrees(120, 36, 2500),
    orientation: {
      heading: Cesium.Math.toRadians(vModel.heading),
      pitch: Cesium.Math.toRadians(vModel.pitch),
      roll: Cesium.Math.toRadians(vModel.roll),
    },
  });
}

/**
 * 重置相机实体姿态为初始状态 (0, 0, 0)
 */
function resetTargetCameraPose() {
  vModel.heading = 0;
  vModel.pitch = 0;
  vModel.roll = 0;
  update();
}

/**
 * 将当前姿态参数应用到主相机
 */
function applyToMainCamera() {
  if (!viewer) return;
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(120, 36, 2500),
    orientation: {
      heading: Cesium.Math.toRadians(vModel.heading),
      pitch: Cesium.Math.toRadians(vModel.pitch),
      roll: Cesium.Math.toRadians(vModel.roll),
    },
  });
}

/**
 * 初始化 lil-gui 控制面板
 */
function initGUI() {
  gui = new CustomGUI({
    container: viewerDivRef.value,
    title: "相机控制",
  });

  // 1. 最开始的主相机视锥可视化 Folder
  const mainCameraFolder = gui.addFolder("主相机视锥可视化");
  mainCameraFolder.add({ fn: setNorthPoleView }, "fn").name("设置北极观察视角");
  mainCameraFolder.add({ fn: addMainCameraPrimitive }, "fn").name("添加主相机视锥");
  mainCameraFolder.add({ fn: removeMainCameraPrimitive }, "fn").name("移除主相机视锥");

  // 2. 独立相机实体与姿态调整 Folder
  const entityFolder = gui.addFolder("相机实体姿态控制");
  entityFolder.add({ fn: addTargetCamera }, "fn").name("添加相机实体");
  entityFolder.add({ fn: removeTargetCamera }, "fn").name("移除相机实体");

  entityFolder
    .add(vModel, "heading", 0, 360, 1)
    .listen()
    .onChange(() => {
      update();
    });

  entityFolder
    .add(vModel, "pitch", -180, 180, 1)
    .listen()
    .onChange(() => {
      update();
    });

  entityFolder
    .add(vModel, "roll", -180, 180, 1)
    .listen()
    .onChange(() => {
      update();
    });

  entityFolder.add({ fn: resetTargetCameraPose }, "fn").name("重置姿态");
  entityFolder.add({ fn: applyToMainCamera }, "fn").name("应用到主相机");
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
  if (gui) {
    gui.destroy();
    gui = null;
  }
  if (viewer) {
    removeMainCameraPrimitive();
    removeTargetCamera();
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
`,O={class:"box",ref:"viewerRef"},j=k({name:"CameraVisualization"}),G=Object.assign(j,{setup(H){const v=x([{fileName:"@/views/camera/cameraVisualization/index.vue",rawCode:z,language:"html"},{fileName:"@/utils/cesium.js",rawCode:T,language:"javascript"}]),u=V("viewerRef");let e=null,l=null,s=null,a=null,o=null,r=null;const t={heading:0,pitch:0,roll:0};I(()=>{l=setTimeout(()=>{g()},0)});function g(){e=D(u.value,{shadows:!0}),y(e,{msaaSamples:4,enableFxaa:!0}),f(),P()}function p(){e&&(e.camera.position=n.Cartesian3.fromDegrees(0,90,5e7),e.camera.direction=n.Cartesian3.negate(n.Cartesian3.UNIT_Z,new n.Cartesian3),e.camera.up=n.Cartesian3.clone(n.Cartesian3.UNIT_Y))}function w(){var i;e&&(a&&!((i=a.isDestroyed)!=null&&i.call(a))&&e.scene.primitives.remove(a),a=new n.DebugCameraPrimitive({camera:e.camera,color:n.Color.RED,show:!0,updateOnChange:!1}),e.scene.primitives.add(a))}function c(){var i;e&&a&&!((i=a.isDestroyed)!=null&&i.call(a))&&(e.scene.primitives.remove(a),a=null)}function f(){var i;e&&(r&&!((i=r.isDestroyed)!=null&&i.call(r))&&e.scene.primitives.remove(r),o=new n.Camera(e.scene),o.frustum.fov=n.Math.PI_OVER_THREE,o.frustum.near=1,o.frustum.far=2e3,d(),r=new n.DebugCameraPrimitive({camera:o,color:n.Color.RED,show:!0,updateOnChange:!0}),e.scene.primitives.add(r),e.camera.flyTo({destination:n.Cartesian3.fromDegrees(120,36,1e4)}))}function C(){var i;e&&r&&!((i=r.isDestroyed)!=null&&i.call(r))&&(e.scene.primitives.remove(r),r=null,o=null)}function d(){o&&o.setView({destination:n.Cartesian3.fromDegrees(120,36,2500),orientation:{heading:n.Math.toRadians(t.heading),pitch:n.Math.toRadians(t.pitch),roll:n.Math.toRadians(t.roll)}})}function h(){t.heading=0,t.pitch=0,t.roll=0,d()}function M(){e&&e.camera.setView({destination:n.Cartesian3.fromDegrees(120,36,2500),orientation:{heading:n.Math.toRadians(t.heading),pitch:n.Math.toRadians(t.pitch),roll:n.Math.toRadians(t.roll)}})}function P(){s=new _({container:u.value,title:"相机控制"});const i=s.addFolder("主相机视锥可视化");i.add({fn:p},"fn").name("设置北极观察视角"),i.add({fn:w},"fn").name("添加主相机视锥"),i.add({fn:c},"fn").name("移除主相机视锥");const m=s.addFolder("相机实体姿态控制");m.add({fn:f},"fn").name("添加相机实体"),m.add({fn:C},"fn").name("移除相机实体"),m.add(t,"heading",0,360,1).listen().onChange(()=>{d()}),m.add(t,"pitch",-180,180,1).listen().onChange(()=>{d()}),m.add(t,"roll",-180,180,1).listen().onChange(()=>{d()}),m.add({fn:h},"fn").name("重置姿态"),m.add({fn:M},"fn").name("应用到主相机")}return B(()=>{l&&clearTimeout(l),s&&(s.destroy(),s=null),e&&(c(),C(),e.destroy(),e=null)}),(i,m)=>(b(),U(R,{codeBlocks:S(v)},{default:N(()=>[E("div",O,null,512)]),_:1},8,["codeBlocks"]))}}),A=F(G,[["__scopeId","data-v-dd7fd149"]]);export{A as default};
