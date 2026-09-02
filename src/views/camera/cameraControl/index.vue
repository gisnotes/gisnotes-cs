<template>
  <demo-box :codeBlocks>
    <div class="box" ref="viewerRef"></div>
  </demo-box>
</template>

<script setup name="CameraControl">
import DemoBox from "@/components/DemoBox/index.vue";
import IndexSourceCode from "./index.vue?raw";
import CesiumSourceCode from "@/utils/cesium.js?raw";

import Cesium from "cesium";
import "cesium/Build/CesiumUnminified/Widgets/widgets.css";
import { createViewer, optimizeViewerQuality } from "@/utils/cesium";
import { CustomGUI } from "@/utils/gui";

const codeBlocks = ref([
  {
    fileName: "@/views/camera/cameraControl/index.vue",
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
const entities = [];

// 各示例目标点与模型信息配置
const targets = {
  // 1. 北京 · 热气球 (演示 flyToBoundingSphere)
  balloon: {
    name: "北京 · 热气球",
    desc: "flyToBoundingSphere 演示",
    position: Cesium.Cartesian3.fromDegrees(116.3912, 39.9075, 600.0),
    url: `${import.meta.env.BASE_URL}SampleData/models/CesiumBalloon/CesiumBalloon.glb`,
    scale: 1.0,
    radius: 120.0,
    boundingSphere: null,
  },
  // 2. 上海 · 民航客机 (演示 flyTo)
  airplane: {
    name: "上海 · 民航客机",
    desc: "flyTo 演示",
    position: Cesium.Cartesian3.fromDegrees(121.505, 31.235, 1200.0),
    url: `${import.meta.env.BASE_URL}SampleData/models/CesiumAir/Cesium_Air.glb`,
    scale: 2.5,
    radius: 180.0,
    boundingSphere: null,
  },
  // 3. 西安 · 越野探险车 (演示 setView)
  vehicle: {
    name: "西安 · 越野探险车",
    desc: "setView 演示",
    position: Cesium.Cartesian3.fromDegrees(108.9402, 34.2655, 0.0),
    url: `${import.meta.env.BASE_URL}SampleData/models/GroundVehicle/GroundVehicle.glb`,
    scale: 3.0,
    radius: 50.0,
    boundingSphere: null,
  },
  // 4. 广州 · 无人机 (演示 viewBoundingSphere)
  drone: {
    name: "广州 · 巡航无人机",
    desc: "viewBoundingSphere 演示",
    position: Cesium.Cartesian3.fromDegrees(113.3245, 23.1189, 260.0),
    url: `${import.meta.env.BASE_URL}SampleData/models/CesiumDrone/CesiumDrone.glb`,
    scale: 15.0,
    radius: 60.0,
    boundingSphere: null,
  },
  // 5. 成都 · 物流卡车 (演示 lookAt)
  truck: {
    name: "成都 · 物流卡车",
    desc: "lookAt 演示",
    position: Cesium.Cartesian3.fromDegrees(104.0657, 30.6595, 0.0),
    url: `${import.meta.env.BASE_URL}SampleData/models/CesiumMilkTruck/CesiumMilkTruck.glb`,
    scale: 5.0,
    radius: 40.0,
    boundingSphere: null,
  },
  // 6. 杭州 · 古木塔 (演示 lookAtTransform)
  tower: {
    name: "杭州 · 古木塔",
    desc: "lookAtTransform 演示",
    position: Cesium.Cartesian3.fromDegrees(120.1536, 30.2458, 0.0),
    url: `${import.meta.env.BASE_URL}SampleData/models/WoodTower/Wood_Tower.glb`,
    scale: 2.0,
    radius: 60.0,
    boundingSphere: null,
  },
};

// 动画参数配置
const params = {
  duration: 2.5,
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

  // 3. 批量在全国不同城市加载多位置 3D 模型
  initModels();

  // 4. 初始化默认视角（飞行至北京热气球）
  flyToBoundingSphere();

  // 5. 初始化 lil-gui 控制面板
  initGUI();
}

/**
 * 批量在不同经纬度位置加载三维模型实体与指示标牌
 */
function initModels() {
  Object.keys(targets).forEach((key) => {
    const item = targets[key];
    // 计算各模型的包围球（供 boundingSphere 方法使用）
    item.boundingSphere = new Cesium.BoundingSphere(item.position, item.radius);

    const heading = Cesium.Math.toRadians(45.0);
    const hpr = new Cesium.HeadingPitchRoll(heading, 0.0, 0.0);
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(
      item.position,
      hpr,
    );

    const entity = viewer.entities.add({
      name: item.name,
      position: item.position,
      orientation: orientation,
      model: {
        uri: item.url,
        scale: item.scale,
        minimumPixelSize: 64,
        maximumScale: 20000,
      },
      label: {
        text: `${item.name}\n[${item.desc}]`,
        font: "13px 'Microsoft YaHei', sans-serif",
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -40),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 50000),
      },
    });

    entities.push(entity);
  });
}

/**
 * 解除相机可能存在的变换矩阵锁定（lookAt / viewBoundingSphere 会锁定相机参考系）
 */
function unlockTransform() {
  if (!viewer) return;
  viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
}

/**
 * 1. flyHome: 飞回默认的主视角（全球视角，带飞行过渡动画）
 */
function flyHome() {
  if (!viewer) return;
  unlockTransform();
  viewer.camera.flyHome(params.duration);
}

/**
 * 2. flyTo: 平滑飞行到上海上空的【民航客机】，呈现高空巡航视角
 */
function flyTo() {
  if (!viewer) return;
  unlockTransform();
  const target = targets.airplane;
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(121.505, 31.228, 1600.0),
    orientation: {
      heading: Cesium.Math.toRadians(0.0),
      pitch: Cesium.Math.toRadians(-22.0),
      roll: 0.0,
    },
    duration: params.duration,
  });
}

/**
 * 3. flyToBoundingSphere: 自动根据北京【热气球】包围球大小飞行到最佳视距
 */
function flyToBoundingSphere() {
  if (!viewer) return;
  unlockTransform();
  const target = targets.balloon;
  viewer.camera.flyToBoundingSphere(target.boundingSphere, {
    offset: new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(45.0),
      Cesium.Math.toRadians(-20.0),
      360.0,
    ),
    duration: params.duration,
  });
}

/**
 * 4. setView: 瞬间切换视角到西安【越野探险车】正上方（无过渡动画，瞬移）
 */
function setView() {
  if (!viewer) return;
  unlockTransform();
  const target = targets.vehicle;
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(108.9402, 34.2655, 600.0),
    orientation: {
      heading: Cesium.Math.toRadians(0.0),
      pitch: Cesium.Math.toRadians(-90.0), // 正俯视
      roll: 0.0,
    },
  });
}

/**
 * 5. viewBoundingSphere: 瞬间定位到广州【无人机】包围球（无过渡动画）
 */
function viewBoundingSphere() {
  if (!viewer) return;
  const target = targets.drone;
  viewer.camera.viewBoundingSphere(
    target.boundingSphere,
    new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(30.0),
      Cesium.Math.toRadians(-20.0),
      180.0,
    ),
  );
}

/**
 * 6. lookAt: 将相机锁定在成都【物流卡车】，拖拽鼠标可围绕目标点进行 360° 环绕旋转
 */
function lookAt() {
  if (!viewer) return;
  const target = targets.truck;
  viewer.camera.lookAt(
    target.position,
    new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(45.0),
      Cesium.Math.toRadians(-25.0),
      160.0,
    ),
  );
}

/**
 * 7. lookAtTransform: 基于杭州【古木塔】的局部东-北-天（ENU）坐标系矩阵锁定相机参考系
 */
function lookAtTransform() {
  if (!viewer) return;
  const target = targets.tower;
  // 计算目标位置的局部参考坐标系变换矩阵
  const transform = Cesium.Transforms.eastNorthUpToFixedFrame(target.position);
  viewer.camera.lookAtTransform(
    transform,
    new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(135.0),
      Cesium.Math.toRadians(-18.0),
      200.0,
    ),
  );
}

/**
 * 初始化 lil-gui 控制面板
 */
function initGUI() {
  gui = new CustomGUI({
    container: viewerDivRef.value,
    title: "相机控制",
  });

  // 相机控制的方法 Folder
  const methodFolder = gui.addFolder("相机控制的方法");
  methodFolder.add({ fn: flyHome }, "fn").name("flyHome (全球主视角)");
  methodFolder.add({ fn: flyTo }, "fn").name("flyTo (飞往上海·客机)");
  methodFolder
    .add({ fn: flyToBoundingSphere }, "fn")
    .name("flyToBoundingSphere (飞往北京·热气球)");
  methodFolder
    .add({ fn: setView }, "fn")
    .name("setView (瞬移至西安·越野车)");
  methodFolder
    .add({ fn: viewBoundingSphere }, "fn")
    .name("viewBoundingSphere (瞬移至广州·无人机)");
  methodFolder
    .add({ fn: lookAt }, "fn")
    .name("lookAt (环绕成都·卡车)");
  methodFolder
    .add({ fn: lookAtTransform }, "fn")
    .name("lookAtTransform (矩阵锁定杭州·木塔)");
  methodFolder
    .add({ fn: unlockTransform }, "fn")
    .name("解除锁定 (自由控制)");

  // 辅助参数调节
  const settingFolder = gui.addFolder("飞行参数设置");
  settingFolder.add(params, "duration", 0.5, 6.0, 0.5).name("飞行时长 (秒)");
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
  if (gui) {
    gui.destroy();
    gui = null;
  }
  if (viewer) {
    unlockTransform();
    entities.forEach((entity) => {
      viewer.entities.remove(entity);
    });
    entities.length = 0;
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
