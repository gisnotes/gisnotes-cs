import{C as e,c as Se,o as _e,D as Ve}from"./cesium-B_-gO5iw.js";import{C as Ye}from"./cesium-pNEfRpPT.js";import{M as Ke}from"./datGUI-BQnuHFxa.js";import{_ as je,r as Ze,T as qe,F as $e,M as Qe,o as Xe,m as Je,f as en,h as nn,i as on,H as an}from"./index-qO0rllNq.js";import"./index-DH7NPNu1.js";const rn=`<template>
  <demo-box :codeBlocks>
    <div class="box" ref="viewerRef"></div>
  </demo-box>
</template>

<script setup name="GeometriesDraw">
import DemoBox from "@/components/DemoBox/index.vue";
import IndexSourceCode from "./index.vue?raw";
import UtilsSourceCode from "./utils.js?raw";
import CesiumSourceCode from "@/utils/cesium.js?raw";
const cesiumLogoUrl = \`\${import.meta.env.BASE_URL}Sandcastle2/images/Cesium_Logo_Color.jpg\`;

import Cesium from "cesium";
import "cesium/Build/CesiumUnminified/Widgets/widgets.css";
import { createViewer, optimizeViewerQuality } from "@/utils/cesium";
import {
  supportsPolylinesOnTerrain,
  supportsMaterialsForEntitiesOnTerrain,
  calculateAntipode,
  createRhumbParallel,
  createRhumbMeridian,
  createCoordinateLabel,
  createRhumbGrid,
} from "./utils.js";
import MyDatGUI from "@/utils/datGUI";

const codeBlocks = ref([
  {
    fileName: "@/views/geometries/geometriesDraw/index.vue",
    rawCode: IndexSourceCode,
    language: "html",
  },
  {
    fileName: "@/views/geometries/geometriesDraw/utils.js",
    rawCode: UtilsSourceCode,
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
let handler = null;

onMounted(() => {
  timer = setTimeout(() => {
    init();
  }, 0);
});

function init() {
  viewer = createViewer(viewerDivRef.value);

  /**
   * 开启高清晰度渲染与抗锯齿优化，解决几何体边框线锯齿感与粗糙感：
   * 1. resolutionScale: 根据高分屏设备像素比 (devicePixelRatio) 提升画质点对点清晰度
   * 2. msaaSamples: 开启 WebGL2 硬件级多重采样抗锯齿 (MSAA 4x)
   * 3. fxaa: 开启屏幕后处理快速近似抗锯齿，极大平滑实体边缘与折线
   */
  optimizeViewerQuality(viewer, { msaaSamples: 4, enableFxaa: true });

  // ------------------------------Box-------------------------------------
  const blueBox = viewer.entities.add({
    name: "蓝色盒子",
    //position 指定的是 Box 的几何中心点（Center）
    position: Cesium.Cartesian3.fromDegrees(-114.0, 40.0, 300000.0),
    box: {
      /**
       * dimensions:指定立方体在局部坐标系（Local Coordinate System）下的长、宽、高（单位：米）。
       */
      dimensions: new Cesium.Cartesian3(400000.0, 300000.0, 500000.0),
      material: Cesium.Color.BLUE,
    },
  });

  const redBox = viewer.entities.add({
    name: "黑边红色半透明盒子",
    show: false,
    position: Cesium.Cartesian3.fromDegrees(-107.0, 40.0, 300000.0),
    box: {
      dimensions: new Cesium.Cartesian3(400000.0, 300000.0, 500000.0),
      material: Cesium.Color.RED.withAlpha(0.5),
      outline: true,
      outlineColor: Cesium.Color.BLACK,
    },
  });

  const yellowOutlineOnlyBox = viewer.entities.add({
    name: "黄色线框盒子",
    show: false,
    position: Cesium.Cartesian3.fromDegrees(-100.0, 40.0, 300000.0),
    box: {
      dimensions: new Cesium.Cartesian3(400000.0, 300000.0, 500000.0),
      fill: false,//填充开关 fill:表示是否渲染立方体的表面填充色
      outline: true,//是否显示边框
      outlineColor: Cesium.Color.YELLOW,
    },
  });

  //---------------------------Circle and Ellipse----------------------------------
  /**
   * Cesium 中使用 ellipse（椭圆/圆 Graphics） 绘制平面的圆、贴地椭圆以及三维柱体（椭圆柱）
   */
  const greenCircle = viewer.entities.add({
    name: "带外边框的高空绿色圆",
    show: false,
    position: Cesium.Cartesian3.fromDegrees(-111.0, 40.0, 150000.0),
    ellipse: {
      semiMinorAxis: 300000.0,//短半轴长度
      semiMajorAxis: 300000.0,//长半轴长度
      height: 200000.0,//高度
      material: Cesium.Color.GREEN,
      outline: true, // 必须设置 height 才能显示外边框
    },
  });

  const redEllipse = viewer.entities.add({
    name: "地表红色半透明椭圆",
    show: false,
    position: Cesium.Cartesian3.fromDegrees(-103.0, 40.0),
    ellipse: {
      semiMinorAxis: 250000.0,
      semiMajorAxis: 400000.0,
      material: Cesium.Color.RED.withAlpha(0.5),
    },
  });

  const blueEllipse = viewer.entities.add({
    name: "蓝色半透明旋转拉伸柱体椭圆",
    show: false,
    position: Cesium.Cartesian3.fromDegrees(-95.0, 40.0, 100000.0),
    ellipse: {
      semiMinorAxis: 150000.0,
      semiMajorAxis: 300000.0,
      extrudedHeight: 200000.0,//通过拉伸绘制一个三维椭圆柱体
      rotation: Cesium.Math.toRadians(45),//指定椭圆从正北方向逆时针旋转的角度
      material: Cesium.Color.BLUE.withAlpha(0.5),
      outline: true,
    },
  });

  /**
   * 在 GIS（地理信息系统）和三维可视化中，
   * “Corridor” 本身就是一个专业术语（如：无人机航线走廊、电力巡检走廊、交通廊道）。
   * 在 Cesium 中，它指的是沿着一条折线（Polyline），向两侧按指定宽度（Width）拉伸/扩展形成的带状多边形。
   * Corridor 适合用来表现道路、航线、管廊等具有实际物理宽度的带状要素。
   */
  // ------------------------------Corridor----------------------------------
  const redCorridor = viewer.entities.add({
    name: "地表圆角红色半透明走廊",
    show: false,
    corridor: {
      positions: Cesium.Cartesian3.fromDegreesArray([
        -100.0, 40.0, -105.0, 40.0, -105.0, 35.0,
      ]),
      /**
       * width：与polyline的width属性的区别是，polyline的width单位是像素，
       * 而corridor的 width 是真实的地理空间尺寸,单位为米。
       */ 
      width: 200000.0,
      material: Cesium.Color.RED.withAlpha(0.5),
    },
  });

  const greenCorridor = viewer.entities.add({
    name: "高空尖角带边框绿色走廊",
    show: false,
    corridor: {
      positions: Cesium.Cartesian3.fromDegreesArray([
        -90.0, 40.0, -95.0, 40.0, -95.0, 35.0,
      ]),
      height: 100000.0,
      width: 200000.0,
      /**
       * Cesium.CornerType:
       * ROUNDED（默认）：圆角过渡，拐弯处平滑。
       * MITERED：尖角/直角过渡，拐弯处保持锐利延伸。
       * BEVELED：斜角/切角过渡，拐弯处切掉尖角形成平面。
       */
      cornerType: Cesium.CornerType.MITERED,
      material: Cesium.Color.GREEN,
      outline: true, // 必须设置 height 才能显示外边框
    },
  });

  const blueCorridor = viewer.entities.add({
    name: "白边斜角蓝色立体走廊",
    show: false,
    corridor: {
      positions: Cesium.Cartesian3.fromDegreesArray([
        -80.0, 40.0, -85.0, 40.0, -85.0, 35.0,
      ]),
      height: 200000.0,
      extrudedHeight: 100000.0,
      width: 200000.0,
      cornerType: Cesium.CornerType.BEVELED,
      material: Cesium.Color.BLUE.withAlpha(0.5),
      outline: true, // 必须设置 height 或 extrudedHeight 才能显示外边框
      outlineColor: Cesium.Color.WHITE,
    },
  });

  // ------------------------------Cylinder and cone----------------------------------
  const greenCylinder = viewer.entities.add({
    name: "黑边绿色半透明圆柱体",
    show: false,
    //这里的position指的是圆柱/圆锥几何体的中心点
    position: Cesium.Cartesian3.fromDegrees(-100.0, 40.0, 200000.0),
    cylinder: {
      //length（柱体总高度/长度）： 指圆柱/圆锥从底面到顶面的垂直高度
      length: 400000.0,
      topRadius: 200000.0,//顶面半径
      bottomRadius: 200000.0,//底面半径
      material: Cesium.Color.GREEN.withAlpha(0.5),
      outline: true,
      outlineColor: Cesium.Color.BLACK,
    },
  });

  const redCone = viewer.entities.add({
    name: "红色圆锥体",
    show: false,
    position: Cesium.Cartesian3.fromDegrees(-105.0, 40.0, 200000.0),
    cylinder: {
      length: 400000.0,
      topRadius: 0.0,
      bottomRadius: 200000.0,
      material: Cesium.Color.RED,
    },
  });

  // --------------------------------partial ellipsoid------------------------------
  /**
   * 展示了 Cesium 中 ellipsoid（椭球体 Graphics） 的高级裁剪与形态控制。
   * Cesium 中的 ellipsoid 远不止用来画普通的球体，通过组合内外半径以及纬向/经向裁剪角，
   * 它可以构建出环状体、半球圆顶、碗状体、扇形/楔形结构、传感器视场（Sensor Dome）等极具复杂的 3D 几何形态。
   * 
   * 关于本小节可以参考我的公众号文章讲解：https://mp.weixin.qq.com/s/_FtU8rdS40hvwksS-o-eaA
   */
  const saturnPosition = Cesium.Cartesian3.fromDegrees(-95.0, 45.0, 300000.0);
  const saturn = viewer.entities.add({
    name: "土星本体",
    show: false,
    position: saturnPosition,
    ellipsoid: {
      radii: new Cesium.Cartesian3(200000.0, 200000.0, 200000.0),
      material: new Cesium.Color(0.95, 0.82, 0.49),
    },
  });

  const saturnInnerRing = viewer.entities.add({
    name: "土星内环",
    show: false,
    position: saturnPosition,
    orientation: Cesium.Transforms.headingPitchRollQuaternion(
      saturnPosition,
      new Cesium.HeadingPitchRoll(
        Cesium.Math.toRadians(30.0),
        Cesium.Math.toRadians(30.0),
        0.0,
      ),
    ),
    ellipsoid: {
      //radii:控制椭球体在 X、Y、Z 三个轴向上的外半径
      radii: new Cesium.Cartesian3(400000.0, 400000.0, 400000.0),
      /**
       * 定义内壁的半径。当设置了 innerRadii 时，
       * Cesium 会在椭球内部挖掉一个洞，将其变成有厚度的空心壳体（如球壳、碗、管道环等）。
       */
      innerRadii: new Cesium.Cartesian3(300000.0, 300000.0, 300000.0),
      minimumCone: Cesium.Math.toRadians(89.8),
      maximumCone: Cesium.Math.toRadians(90.2),
      material: new Cesium.Color(0.95, 0.82, 0.49, 0.5),
    },
  });

  const saturnOuterRing = viewer.entities.add({
    name: "土星外环",
    show: false,
    position: saturnPosition,
    orientation: Cesium.Transforms.headingPitchRollQuaternion(
      saturnPosition,
      new Cesium.HeadingPitchRoll(
        Cesium.Math.toRadians(30.0),
        Cesium.Math.toRadians(30.0),
        0.0,
      ),
    ),
    ellipsoid: {
      radii: new Cesium.Cartesian3(460000.0, 460000.0, 460000.0),
      innerRadii: new Cesium.Cartesian3(415000.0, 415000.0, 415000.0),
      minimumCone: Cesium.Math.toRadians(89.8),
      maximumCone: Cesium.Math.toRadians(90.2),
      material: new Cesium.Color(0.95, 0.82, 0.49, 0.5),
    },
  });

  const dome = viewer.entities.add({
    name: "圆顶球壳",
    show: false,
    position: Cesium.Cartesian3.fromDegrees(-120.0, 40.0),
    ellipsoid: {
      radii: new Cesium.Cartesian3(200000.0, 200000.0, 200000.0),
      maximumCone: Cesium.Math.PI_OVER_TWO,
      material: Cesium.Color.BLUE.withAlpha(0.3),
      outline: true,
    },
  });

  const domeInner = viewer.entities.add({
    name: "带内半径的圆顶",
    show: false,
    position: Cesium.Cartesian3.fromDegrees(-114.0, 40.0),
    ellipsoid: {
      radii: new Cesium.Cartesian3(250000.0, 200000.0, 150000.0),
      innerRadii: new Cesium.Cartesian3(100000.0, 80000.0, 60000.0),
      maximumCone: Cesium.Math.PI_OVER_TWO,
      material: Cesium.Color.RED.withAlpha(0.3),
      outline: true,
    },
  });

  const domeTopCut = viewer.entities.add({
    name: "顶部裁剪圆顶",
    show: false,
    position: Cesium.Cartesian3.fromDegrees(-108.0, 40.0),
    ellipsoid: {
      radii: new Cesium.Cartesian3(200000.0, 200000.0, 200000.0),
      innerRadii: new Cesium.Cartesian3(100000.0, 100000.0, 100000.0),
      minimumCone: Cesium.Math.toRadians(20.0),
      maximumCone: Cesium.Math.PI_OVER_TWO,
      material: Cesium.Color.YELLOW.withAlpha(0.3),
      outline: true,
    },
  });

  const topBottomCut = viewer.entities.add({
    name: "上下裁剪球壳",
    show: false,
    position: Cesium.Cartesian3.fromDegrees(-102.0, 40.0, 140000.0),
    ellipsoid: {
      radii: new Cesium.Cartesian3(200000.0, 200000.0, 200000.0),
      innerRadii: new Cesium.Cartesian3(100000.0, 100000.0, 100000.0),
      minimumCone: Cesium.Math.toRadians(60.0),
      maximumCone: Cesium.Math.toRadians(140.0),
      material: Cesium.Color.DARKCYAN.withAlpha(0.3),
      outline: true,
    },
  });

  const bowl = viewer.entities.add({
    name: "碗状结构",
    show: false,
    position: Cesium.Cartesian3.fromDegrees(-96.0, 39.5, 200000.0),
    ellipsoid: {
      radii: new Cesium.Cartesian3(200000.0, 200000.0, 200000.0),
      innerRadii: new Cesium.Cartesian3(180000.0, 180000.0, 180000.0),
      minimumCone: Cesium.Math.toRadians(110.0),
      material: Cesium.Color.GREEN.withAlpha(0.3),
      outline: true,
    },
  });

  const clockCutout = viewer.entities.add({
    name: "时钟角度裁剪",
    show: false,
    position: Cesium.Cartesian3.fromDegrees(-90.0, 39.0),
    ellipsoid: {
      radii: new Cesium.Cartesian3(200000.0, 200000.0, 200000.0),
      innerRadii: new Cesium.Cartesian3(150000.0, 150000.0, 150000.0),
      minimumClock: Cesium.Math.toRadians(-90.0),
      maximumClock: Cesium.Math.toRadians(180.0),
      minimumCone: Cesium.Math.toRadians(20.0),
      maximumCone: Cesium.Math.toRadians(70.0),
      material: Cesium.Color.BLUE.withAlpha(0.3),
      outline: true,
    },
  });

  const partialDome = viewer.entities.add({
    name: "局部半球圆顶",
    show: false,
    position: Cesium.Cartesian3.fromDegrees(-84.0, 38.5),
    ellipsoid: {
      radii: new Cesium.Cartesian3(200000.0, 200000.0, 200000.0),
      minimumClock: Cesium.Math.toRadians(-90.0),
      maximumClock: Cesium.Math.toRadians(180.0),
      maximumCone: Cesium.Math.toRadians(90.0),
      material: Cesium.Color.RED.withAlpha(0.3),
      outline: true,
    },
  });

  const wedgePosition = Cesium.Cartesian3.fromDegrees(-102.0, 35.0, 20000.0);
  const wedge = viewer.entities.add({
    name: "楔形结构",
    show: false,
    position: wedgePosition,
    orientation: Cesium.Transforms.headingPitchRollQuaternion(
      wedgePosition,
      new Cesium.HeadingPitchRoll(Cesium.Math.PI / 1.5, 0, 0.0),
    ),
    ellipsoid: {
      radii: new Cesium.Cartesian3(500000.0, 500000.0, 500000.0),
      innerRadii: new Cesium.Cartesian3(10000.0, 10000.0, 10000.0),
      minimumClock: Cesium.Math.toRadians(-15.0),
      maximumClock: Cesium.Math.toRadians(15.0),
      minimumCone: Cesium.Math.toRadians(75.0),
      maximumCone: Cesium.Math.toRadians(105.0),
      material: Cesium.Color.DARKCYAN.withAlpha(0.3),
      outline: true,
    },
  });

  const partialEllipsoid = viewer.entities.add({
    name: "局部椭球体",
    show: false,
    position: Cesium.Cartesian3.fromDegrees(-95.0, 34.0),
    ellipsoid: {
      radii: new Cesium.Cartesian3(300000.0, 300000.0, 300000.0),
      innerRadii: new Cesium.Cartesian3(70000.0, 70000.0, 70000.0),
      minimumClock: Cesium.Math.toRadians(180.0),
      maximumClock: Cesium.Math.toRadians(400.0),
      maximumCone: Cesium.Math.toRadians(90.0),
      material: Cesium.Color.DARKCYAN.withAlpha(0.3),
      outline: true,
    },
  });

  /**
   * 以下三个plane-平面的通过指定平面的位置和平面的在当前位置的法线和偏移距离来绘制平面。
   */

  // --------------------------plane--------------------------------------------

  /**
   * UNIT_X 方向法线平面
   */
  const bluePlane = viewer.entities.add({
    name: "蓝色平面",
    show: false,
    // position即为平面的几何中心点
    position: Cesium.Cartesian3.fromDegrees(-114.0, 40.0, 300000.0),
    plane: {
      /**
       * Cesium.Plane(normal, distance)
       * normal (Cartesian3): 平面的法向量（必须是单位向量）。
       * distance (Number): 平面到原点的距离（如果法向量是单位向量，这个就是平面在法线方向上的偏移距离）。
       * 形象理解： 法向量像“光源”的方向，distance 决定了这个平面在光源方向上被“推”了多远。
       */
      plane: new Cesium.Plane(Cesium.Cartesian3.UNIT_X, 0.0),
      /**
       * 平面尺寸:dimensions: new Cesium.Cartesian2(width, height)
       */
      dimensions: new Cesium.Cartesian2(400000.0, 300000.0),
      material: Cesium.Color.BLUE,
    },
  });

  /**
   * UNIT_Y 方向法线平面
   */
  const redPlane = viewer.entities.add({
    name: "黑边红色半透明平面",
    show: false,
    position: Cesium.Cartesian3.fromDegrees(-107.0, 40.0, 300000.0),
    plane: {
      plane: new Cesium.Plane(Cesium.Cartesian3.UNIT_Y, 0.0),
      dimensions: new Cesium.Cartesian2(400000.0, 300000.0),
      material: Cesium.Color.RED.withAlpha(0.5),
      outline: true,
      outlineColor: Cesium.Color.BLACK,
    },
  });

  /**
   * UNIT_Z 方向法线空心线框平面
   */
  const yellowPlaneOutline = viewer.entities.add({
    name: "黄色线框平面",
    show: false,
    position: Cesium.Cartesian3.fromDegrees(-100.0, 40.0, 300000.0),
    plane: {
      plane: new Cesium.Plane(Cesium.Cartesian3.UNIT_Z, 0.0), //指定平面法线和偏移距离
      dimensions: new Cesium.Cartesian2(400000.0, 300000.0),
      fill: false,
      outline: true,
      outlineColor: Cesium.Color.YELLOW,
    },
  });

  // -------------------------------------Rectangle----------------------------------------
  const redRectangle = viewer.entities.add({
    name: "红色半透明矩形",
    show: false,
    rectangle: {
      /**
       * Cesium.Rectangle.fromDegrees(west, south, east, north)
       * 记忆要点： 顺序是 “西、南、东、北”（西经、南纬、东经、北纬），
       * 即 (最小经度, 最小纬度, 最大经度, 最大纬度)。
       */
      coordinates: Cesium.Rectangle.fromDegrees(-110.0, 20.0, -80.0, 25.0),
      material: Cesium.Color.RED.withAlpha(0.5),
    },
  });

  const greenRectangle = viewer.entities.add({
    name: "黑边高空旋转拉伸绿色矩形",
    show: false,
    rectangle: {
      coordinates: Cesium.Rectangle.fromDegrees(-110.0, 30.0, -100.0, 40.0),
      material: Cesium.Color.GREEN.withAlpha(0.5),
      rotation: Cesium.Math.toRadians(45),
      extrudedHeight: 300000.0,//拉伸高度
      height: 100000.0,//高度
      outline: true, // 必须设置 height 才能显示外边框
      outlineColor: Cesium.Color.BLACK,
    },
  });

  let rotation = Cesium.Math.toRadians(30);

  function getRotationValue() {
    rotation += 0.005;
    return rotation;
  }

  const rotatingRectangle = viewer.entities.add({
    name: "动态旋转纹理矩形",
    show: false,
    rectangle: {
      coordinates: Cesium.Rectangle.fromDegrees(-92.0, 30.0, -76.0, 40.0),
      material: cesiumLogoUrl, //这里使用一张图片作为纹理材质
      /**
       * 动态属性/动画：Cesium.CallbackProperty
       * 用法： new Cesium.CallbackProperty(callbackFunction, isConstant)
       * 记忆要点：
       * 这是 Cesium 中实现每一帧平滑动画/实时数据更新最常用的 API。
       * 第一个参数是回调函数，返回最新的值（如改变后的弧度）；
       * 第二个参数 isConstant 传 false，告诉 Cesium 这个属性是动态变化的，需要逐帧重新计算渲染。
       */
      rotation: new Cesium.CallbackProperty(getRotationValue, false),//控制几何体旋转
      stRotation: new Cesium.CallbackProperty(getRotationValue, false),//控制纹理（材质）旋转
      /**
       * Cesium.ClassificationType:
       *  TERRAIN：仅贴合在地形（Terrain）表面。
       *  CESIUM_3D_TILE：仅贴合在 3D Tiles 模型（如倾斜摄影、城市建筑模型）表面。
       *  BOTH：同时贴合地形和 3D Tiles。
       */
      classificationType: Cesium.ClassificationType.BOTH,
    },
  });

  //-------------------------------------polygon----------------------------------------
  /**
   * - fromDegreesArray([lon1, lat1, lon2, lat2, ...])： 仅包含经纬度，
   *  适用于贴地多边形或统一抬升高度的多边形。
   * 
   * - fromDegreesArrayHeights([lon1, lat1, h1, lon2, lat2, h2, ...])： 
   *    依次传入[经度, 纬度, 高度]。每个顶点可以指定不同的独立高度，
   *    是实现倾斜面、起伏墙体、垂直多边形的基础。
   */

  const redPolygon = viewer.entities.add({
    name: "地表红色多边形",
    show: false,
    polygon: {
      hierarchy: Cesium.Cartesian3.fromDegreesArray([
        -115.0, 37.0, -115.0, 32.0, -107.0, 33.0, -102.0, 31.0, -102.0, 35.0,
      ]),
      material: Cesium.Color.RED,
    },
  });

  const greenPolygon = viewer.entities.add({
    name: "绿色拉伸多边形",
    show: false,
    polygon: {
      hierarchy: Cesium.Cartesian3.fromDegreesArray([
        -108.0, 42.0, -100.0, 42.0, -104.0, 40.0,
      ]),
      extrudedHeight: 500000.0,
      material: Cesium.Color.GREEN,
      closeTop: false, // 不显示顶部，即显示为镂空
      closeBottom: false, // 不显示底部，即显示为镂空
    },
  });

  const texturedPolygon = viewer.entities.add({
    name: "纹理拉伸多边形",
    show: false,
    polygon: {
      /**
       * 当使用 fromDegreesArrayHeights 传入了每个顶点的独立高度后，
       * 必须将 perPositionHeight 设为 true，Cesium 才会使用顶点自身的高度渲染；
       * 否则所有顶点会被拉平到同一高度。
       */
      hierarchy: Cesium.Cartesian3.fromDegreesArrayHeights([
        -118.4, 40.4, 50000, -118.4, 37, 30000, -114.2, 38.0, 35000, -108.0, 37,
        30000, -108.0, 40.4, 50000,
      ]),
      textureCoordinates: {
        positions: [
          new Cesium.Cartesian2(0, 1),
          new Cesium.Cartesian2(0, 0),
          new Cesium.Cartesian2(0.5, 0),
          new Cesium.Cartesian2(1, 0),
          new Cesium.Cartesian2(1, 1),
        ],
      },
      perPositionHeight: true,
      extrudedHeight: 0,
      material: cesiumLogoUrl,
    },
  });

  const texturedPolygonWithHoles = viewer.entities.add({
    name: "带孔纹理多边形",
    show: false,
    polygon: {
      hierarchy: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([
          -130, 40.0, 50000, -130, 36.0, 30000, -125, 37, 35000, -120, 36.0,
          30000, -120, 40.0, 50000,
        ]),
        holes: [
          {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights([
              -128, 39.2, 46000, -128, 38.6, 42000, -127, 38.6, 42000, -127,
              39.2, 46000,
            ]),
          },
        ],
      },
      textureCoordinates: {
        positions: [
          new Cesium.Cartesian2(0, 1),
          new Cesium.Cartesian2(0, 0),
          new Cesium.Cartesian2(0.5, 0),
          new Cesium.Cartesian2(1, 0),
          new Cesium.Cartesian2(1, 1),
        ],
        holes: [
          {
            positions: [
              new Cesium.Cartesian2(0.2, 0.8),
              new Cesium.Cartesian2(0.2, 0.6),
              new Cesium.Cartesian2(0.4, 0.6),
              new Cesium.Cartesian2(0.4, 0.8),
            ],
          },
        ],
      },
      perPositionHeight: true,
      material: cesiumLogoUrl,
    },
  });

  const orangePolygon = viewer.entities.add({
    name: "带点高度橙色多边形",
    show: false,
    polygon: {
      hierarchy: Cesium.Cartesian3.fromDegreesArrayHeights([
        -108.0, 25.0, 100000, -100.0, 25.0, 100000, -100.0, 30.0, 100000,
        -108.0, 30.0, 300000,
      ]),
      extrudedHeight: 0,
      perPositionHeight: true,
      material: Cesium.Color.ORANGE.withAlpha(0.5),
      outline: true,
      outlineColor: Cesium.Color.BLACK,
    },
  });

  /**
   * 在 Cesium 中，通过构造 hierarchy 对象来实现图形打孔（岛屿/湖泊效果）：
   * 对象结构： { positions: [...], holes: [...] }
   * 嵌套镂空： holes 内部还可以继续递归嵌套 holes（如 bluePolygon）。
   *    - 外层（实心） → 第1层 hole（镂空） → 第2层 hole（实心“回字形”岛屿） → 第3层 hole（镂空），
   *      Cesium 会自动按奇偶规则计算内外填充区域。
   */
  const bluePolygon = viewer.entities.add({
    name: "带多孔嵌套蓝色多边形",
    show: false,
    polygon: {
      hierarchy: {
        positions: Cesium.Cartesian3.fromDegreesArray([
          -99.0, 30.0, -85.0, 30.0, -85.0, 40.0, -99.0, 40.0,
        ]),
        holes: [
          {
            positions: Cesium.Cartesian3.fromDegreesArray([
              -97.0, 31.0, -97.0, 39.0, -87.0, 39.0, -87.0, 31.0,
            ]),
            holes: [
              {
                positions: Cesium.Cartesian3.fromDegreesArray([
                  -95.0, 33.0, -89.0, 33.0, -89.0, 37.0, -95.0, 37.0,
                ]),
                holes: [
                  {
                    positions: Cesium.Cartesian3.fromDegreesArray([
                      -93.0, 34.0, -91.0, 34.0, -91.0, 36.0, -93.0, 36.0,
                    ]),
                  },
                ],
              },
            ],
          },
        ],
      },
      material: Cesium.Color.BLUE.withAlpha(0.5),
      height: 0,
      outline: true,
    },
  });

  const cyanPolygon = viewer.entities.add({
    name: "青色垂直多边形",
    show: false,
    polygon: {
      hierarchy: Cesium.Cartesian3.fromDegreesArrayHeights([
        -90.0, 41.0, 0.0, -85.0, 41.0, 500000.0, -80.0, 41.0, 0.0,
      ]),
      perPositionHeight: true,
      material: Cesium.Color.CYAN.withAlpha(0.5),
      outline: true,
      outlineColor: Cesium.Color.BLACK,
    },
  });

  const purplePolygonUsingRhumbLines = viewer.entities.add({
    name: "等角航线紫色多边形",
    show: false,
    polygon: {
      hierarchy: Cesium.Cartesian3.fromDegreesArray([
        -120.0, 45.0, -80.0, 45.0, -80.0, 55.0, -120.0, 55.0,
      ]),
      extrudedHeight: 50000,
      material: Cesium.Color.PURPLE,
      outline: true,
      outlineColor: Cesium.Color.MAGENTA,
      /**
       * Cesium.ArcType:
       *  - GEODESIC（默认）：测地线/大圆航线。在地球曲面上两点间的最短弧线。
       *  - RHUMB：等角航线（Rhumb Line）。沿着固定罗盘方位角延伸的线。
       *  - NONE：不沿曲面弯曲，直接用空间直线连接顶点。
       */
      arcType: Cesium.ArcType.RHUMB,
    },
  });

  // -------------------------------------polyline----------------------------------------

  const redLine = viewer.entities.add({
    name: "贴地红色折线",
    show: false,
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray([-75, 35, -125, 35]),
      width: 5,
      material: Cesium.Color.RED,
      //clampToGround:开启后，折线会自动贴合地形与三维建筑（3D Tiles）。
      clampToGround: true,
    },
  });

  const greenRhumbLine = viewer.entities.add({
    name: "绿色等角航线",
    show: false,
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray([-75, 35, -125, 35]),
      width: 5,
      arcType: Cesium.ArcType.RHUMB,
      material: Cesium.Color.GREEN,
    },
  });

  const glowingLine = viewer.entities.add({
    name: "地表发光蓝色折线",
    show: false,
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray([-75, 37, -125, 37]),
      width: 10,
      /**
       * PolylineGlowMaterialProperty:发光材质：
       * glowPower（发光强度）： 控制中心发光核心的亮度和发散范围（范围 0.0~1.0）。
       * taperPower（渐变/收拢系数）： 控制线条从起点到终点宽度或发光的渐变收拢效果。
       * 常用场景： 科幻风路线、夜间道路、轨迹流光。
       */
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.2,
        taperPower: 0.5,
        color: Cesium.Color.CORNFLOWERBLUE,
      }),
    },
  });

  const orangeOutlined = viewer.entities.add({
    name: "高空黑边橙色双色折线",
    show: false,
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights([
        -75, 39, 250000, -125, 39, 250000,
      ]),
      width: 5,
      /**
       * PolylineOutlineMaterialProperty:描边/双色线材质
       * outlineWidth & outlineColor： 专门给线条本身再加一层独立宽度的外边框，实现高对比度的双色高空折线。
       */
      material: new Cesium.PolylineOutlineMaterialProperty({
        color: Cesium.Color.ORANGE,
        outlineWidth: 2,
        outlineColor: Cesium.Color.BLACK,
      }),
    },
  });

  const purpleArrow = viewer.entities.add({
    name: "高空紫光箭头折线",
    show: false,
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights([
        -75, 43, 500000, -125, 43, 500000,
      ]),
      width: 10,
      arcType: Cesium.ArcType.NONE,
      /**
       * PolylineArrowMaterialProperty:方向箭头材质
       * 会沿着折线的方向（起点 $\\rightarrow$ 终点）在末端或线段上自动绘制箭头图标，
       * 极适合做航线、单行道、矢量流向指示。
       */
      material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.PURPLE),
    },
  });

  const dashedLine = viewer.entities.add({
    name: "高空虚线折线",
    show: false,
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights([
        -75, 45, 500000, -125, 45, 500000,
      ]),
      width: 4,
      /**
       * PolylineDashMaterialProperty:虚线材质
       */
      material: new Cesium.PolylineDashMaterialProperty({
        color: Cesium.Color.CYAN,
      }),
    },
  });

  const redDashedLine = viewer.entities.add({
    name: "红色高空虚线",
    show: false,
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights([
        -75, 38, 250000, -125, 38, 250000,
      ]),
      width: 5,
      material: new Cesium.PolylineDashMaterialProperty({
        color: Cesium.Color.RED,
      }),
    },
  });

  const blueGapDashedLine = viewer.entities.add({
    name: "双色带间隙蓝黄虚线",
    show: false,
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights([
        -75, 40, 250000, -125, 40, 250000,
      ]),
      width: 30,
      material: new Cesium.PolylineDashMaterialProperty({
        color: Cesium.Color.BLUE,
        gapColor: Cesium.Color.YELLOW,
      }),
    },
  });

  const orangeShortDashLine = viewer.entities.add({
    name: "短段节橙色虚线",
    show: false,
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights([
        -75, 42, 250000, -125, 42, 250000,
      ]),
      width: 5,
      material: new Cesium.PolylineDashMaterialProperty({
        color: Cesium.Color.ORANGE,
        dashLength: 8.0,
      }),
    },
  });

  const cyanPatternDashedLine = viewer.entities.add({
    name: "自定模式青色虚线",
    show: false,
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights([
        -75, 44, 250000, -125, 44, 250000,
      ]),
      width: 10,
      material: new Cesium.PolylineDashMaterialProperty({
        color: Cesium.Color.CYAN,
        dashPattern: parseInt("110000001111", 2), // 结果为：12287
      }),
    },
  });

  /**
   * 点划交替线（黄色虚线）,
   * 图形呈现：实-空-实-空-实-空-实-空-实-空-实-空-实-空-实-空
   * 最终效果：极致均匀细密的密集点划线
   */
  const yellowPatternDashedLine = viewer.entities.add({
    name: "自定点划模式黄色虚线",
    show: false,
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights([
        -75, 46, 250000, -125, 46, 250000,
      ]),
      width: 10,
      material: new Cesium.PolylineDashMaterialProperty({
        color: Cesium.Color.YELLOW,
        dashPattern: parseInt("1010101010101010", 2), // 结果为：43690
        // dashPattern: parseInt("1111000011110000", 2),//改变 dashPattern 连续 1 的比例
        // dashLength: 64.0, //拉长虚线间距就会显的明显
      }),
    },
  });

  // ------------------------------PolylineVolume----------------------------------
  /**
   * polylineVolume 是 Cesium 中极具特色且功能强大的一种几何体，
   * 它的核心思想是：定义一个二维截面（shape），沿着一条三维折线路径（positions）进行“扫掠（Sweep/Extrude）”，
   * 从而拉伸出三维管道或异形梁柱。
   */

  /**
   * 计算圆形截面
   * 通过三角函数 (radius * cos(θ), radius * sin(θ)) 生成 360 个点的环形数组，
   * 扫掠后得到标准三维圆形管道/水管（如 redTube）。
   */
  function computeCircle(radius) {
    const positions = [];
    for (let i = 0; i < 360; i++) {
      const radians = Cesium.Math.toRadians(i);
      positions.push(
        new Cesium.Cartesian2(
          radius * Math.cos(radians),
          radius * Math.sin(radians),
        ),
      );
    }
    return positions;
  }

  /**
   * 计算星形截面
   * 通过交替半径（内外圆半径 rOuter / rInner）计算多角星形顶点，
   * 扫掠后得到星形截面的复杂异形柱体（如 blueStar）。
   */
  function computeStar(arms, rOuter, rInner) {
    const angle = Math.PI / arms;
    const length = 2 * arms;
    const positions = new Array(length);
    for (let i = 0; i < length; i++) {
      const r = i % 2 === 0 ? rOuter : rInner;
      positions[i] = new Cesium.Cartesian2(
        Math.cos(i * angle) * r,
        Math.sin(i * angle) * r,
      );
    }
    return positions;
  }

  const redTube = viewer.entities.add({
    name: "红色管道圆角柱体",
    show: false,
    polylineVolume: {
      //positions:决定管道/体的走向路线
      positions: Cesium.Cartesian3.fromDegreesArray([
        -85.0, 32.0, -85.0, 36.0, -89.0, 36.0,
      ]),
      // shape:决定管道切面的形状,它是一个二维截面数组
      shape: computeCircle(60000.0),
      material: Cesium.Color.RED,
    },
  });

  const greenBox = viewer.entities.add({
    name: "绿色方形斜角带边框柱体",
    show: false,
    polylineVolume: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights([
        -90.0, 32.0, 0.0, -90.0, 36.0, 100000.0, -94.0, 36.0, 0.0,
      ]),
      shape: [
        new Cesium.Cartesian2(-50000, -50000),
        new Cesium.Cartesian2(50000, -50000),
        new Cesium.Cartesian2(50000, 50000),
        new Cesium.Cartesian2(-50000, 50000),
      ],
      cornerType: Cesium.CornerType.BEVELED,
      material: Cesium.Color.GREEN.withAlpha(0.5),
      outline: true,
      outlineColor: Cesium.Color.BLACK,
    },
  });

  const blueStar = viewer.entities.add({
    name: "蓝色星形尖角柱体",
    show: false,
    polylineVolume: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights([
        -95.0, 32.0, 0.0, -95.0, 36.0, 100000.0, -99.0, 36.0, 200000.0,
      ]),
      shape: computeStar(7, 70000, 50000),
      cornerType: Cesium.CornerType.MITERED,
      material: Cesium.Color.BLUE,
    },
  });

  // -------------------------------------Wall----------------------------------------
  /**
   * wall 在 Cesium 中专门用于沿一条折线路径在垂直方向上拉伸出一条“三维墙面/垂直幕墙”，
   * 非常适合用来制作城墙、围栏、垂直切割面、高空边界屏障、动态流动墙特效等。
   * 
   * 墙体在垂直方向上的形态由两个数组共同决定，这两个数组必须与路径顶点（positions）的数量一一对应：
   * maximumHeights（顶部高度数组）： 定义每个控制点处墙体顶边缘的绝对高程（单位：米）。
   * minimumHeights（底部高度数组）： 定义每个控制点处墙体底边缘的绝对高程（单位：米）。
   * 如果不设置，底部默认紧贴地表（高程为 0）。
   * 
   * 假设你沿着地面画了 3 个点（A、B、C），这 3 个点连成一条折线：
   *   - maximumHeights: [Max[0], Max[1], Max[2]]：依次指定 A、B、C 三个点上方墙顶的高度。
   *   - minimumHeights: [Min[0], Min[1], Min[2]]：依次指定 A、B、C 三个点上方墙底的高度。
   *   - 墙体立面 = 在同一个经纬度点上，由minimumHeights[i]向上拉伸到maximumHeights[i]。
   *   - 数组长度必须等于坐标点个数。
   *   - maximumHeights[i] 必须大于 minimumHeights[i]，否则墙体高度为 0，就会无法显示。
   * 
   *   
   *  
   * 【顶部】  Max[0] ───★──────────────★ Max[1]─────────────★ Max[2]
   *              │              │                     │
   *              │  墙 体 面 积 │    墙 体 面 积      │  (渲染出颜色的区域)
   *              │              │                     │
   * 【底部】  Min[0] ───★──────────────★ Min[1]─────────────★ Min[2]
   *              │              │                     │
   *              │  (下方是空的)│    (下方是空的)     │
   * 地表 ────────┴──────────────┴─────────────────────┴──── (海平面 0 米)
   *            点 A            点 B                  点 C
   */
  const redWall = viewer.entities.add({
    name: "高空红色墙体",
    show: false,
    wall: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights([
        -115.0, 44.0, 200000.0, -90.0, 44.0, 200000.0,
      ]),
      minimumHeights: [100000.0, 100000.0],
      material: Cesium.Color.RED,
    },
  });

  const greenWall = viewer.entities.add({
    name: "带边框地表绿色墙体",
    show: false,
    wall: {
      //坐标点首尾相连:闭合墙体与环形围栏
      positions: Cesium.Cartesian3.fromDegreesArrayHeights([
        -107.0, 43.0, 100000.0, -97.0, 43.0, 100000.0, -97.0, 40.0, 100000.0,
        -107.0, 40.0, 100000.0, -107.0, 43.0, 100000.0,
      ]),
      material: Cesium.Color.GREEN,
      outline: true,
    },
  });

  const blueWall = viewer.entities.add({
    name: "锯齿起伏黑边蓝色半透明墙体",
    show: false,
    wall: {
      positions: Cesium.Cartesian3.fromDegreesArray([
        -115.0, 50.0, -112.5, 50.0, -110.0, 50.0, -107.5, 50.0, -105.0, 50.0,
        -102.5, 50.0, -100.0, 50.0, -97.5, 50.0, -95.0, 50.0, -92.5, 50.0, -90.0,
        50.0,
      ]),
      maximumHeights: [
        100000, 200000, 100000, 200000, 100000, 200000, 100000, 200000, 100000,
        200000, 100000,
      ],
      minimumHeights: [0, 100000, 0, 100000, 0, 100000, 0, 100000, 0, 100000, 0],
      material: Cesium.Color.BLUE.withAlpha(0.5),
      outline: true,
      outlineColor: Cesium.Color.BLACK,
    },
  });

  // ------------------------------Z-Index (贴地形图元层级顺序)----------------------------------
  /**
   * Z-Index (层级控制示例):
   * Cesium 支持为贴地 Entity (如 Rectangle, Polygon) 和贴地折线 (Polyline clampToGround: true) 指定 zIndex。
   * zIndex 决定了当多个贴地图元在同一地表位置相互重叠时的渲染层级顺序（值越大越靠上覆盖）。
   * 
   * 下面的代码展示了在 Cesium 中使用 zIndex 属性控制贴地矢量要素（Clamped / Ground Entities）之间
   * 渲染叠加层级（层叠顺序）的核心用法。
   * 
   * 有效对象：
   * - 没有设置 height 和 extrudedHeight 的贴地多边形/矩形（如代码中的 rectangle）。
   * - 显式开启了 clampToGround: true 的贴地折线（如代码中的 polyline）。
   * 
   * 失效情况：
   * - 如果给 rectangle 设置了 height: 100（变成了悬空 3D 实体），
   *   Cesium 会转为基于深度缓冲区（Z-Buffer / Depth Test）的真实 3D 空间遮挡计算，
   *   此时 zIndex 属性将被直接忽略。
   */
  if (!supportsPolylinesOnTerrain(viewer.scene)) {
    //检测当前设备的 WebGL 是否支持在地形上绘制贴地折线
    console.warn(
      "当前平台不支持地表贴地折线 Z-Index，该属性将被忽略",
    );
  }

  if (!supportsMaterialsForEntitiesOnTerrain(viewer.scene)) {
    //检测当前设备是否支持在地形多边形上渲染材质贴图/纹理
    console.warn(
      "当前平台不支持地表贴图多边形材质 Z-Index，该属性将被忽略",
    );
  }

  const zIndexRedRect1 = viewer.entities.add({
    name: "红色矩形 (zIndex 1)",
    show: false,
    rectangle: {
      coordinates: Cesium.Rectangle.fromDegrees(-110.0, 20.0, -100.5, 30.0),
      material: Cesium.Color.RED,
      zIndex: 1,
    },
  });

  const zIndexTexturedRect2 = viewer.entities.add({
    name: "纹理矩形 (zIndex 2)",
    show: false,
    rectangle: {
      coordinates: Cesium.Rectangle.fromDegrees(-112.0, 25.0, -102.5, 35.0),
      material: cesiumLogoUrl,
      zIndex: 2,
    },
  });

  const zIndexBlueRect3 = viewer.entities.add({
    name: "蓝色矩形 (zIndex 3)",
    show: false,
    rectangle: {
      coordinates: Cesium.Rectangle.fromDegrees(-110.0, 31.0, -100.5, 41.0),
      material: Cesium.Color.BLUE,
      zIndex: 3,
    },
  });

  const zIndexTexturedRect3 = viewer.entities.add({
    name: "右侧纹理矩形 (zIndex 3)",
    show: false,
    rectangle: {
      coordinates: Cesium.Rectangle.fromDegrees(-99.5, 20.0, -90.0, 30.0),
      material: cesiumLogoUrl,
      zIndex: 3,
    },
  });

  const zIndexGreenRect2 = viewer.entities.add({
    name: "右侧绿色矩形 (zIndex 2)",
    show: false,
    rectangle: {
      coordinates: Cesium.Rectangle.fromDegrees(-97.5, 25.0, -88.0, 35.0),
      material: Cesium.Color.GREEN,
      zIndex: 2,
    },
  });

  const zIndexBlueRect1 = viewer.entities.add({
    name: "右侧蓝色矩形 (zIndex 1)",
    show: false,
    rectangle: {
      coordinates: Cesium.Rectangle.fromDegrees(-99.5, 31.0, -90.0, 41.0),
      material: Cesium.Color.BLUE,
      zIndex: 1,
    },
  });

  const zIndexPolyline2 = viewer.entities.add({
    name: "贴地发光蓝色折线 (zIndex 2)",
    show: false,
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray([-120.0, 22.0, -80.0, 22.0]),
      width: 8.0,
      material: new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.2,
        color: Cesium.Color.BLUE,
      }),
      zIndex: 2,
      clampToGround: true,
    },
  });

  // ------------------------------Rhumb Lines & Crosshairs Grid (等角航线与经纬网)----------------------------------
  /**
   * 等角航线 (Rhumb Line / Loxodrome):
   * 沿着固定罗盘方位角（Heading）延伸的线。
   * 在 Cesium 中使用 \`arcType: Cesium.ArcType.RHUMB\` 来绘制。
   * 通用提取函数来自于 @/utils/cesium。
   */
  let showAntipodalPoint = false;
  let enableCrosshairClick = false;

  const rhumbGridPrimitives = {
    equator: createRhumbParallel(viewer, 0, { color: Cesium.Color.BLUE }),
    primeMeridian: createRhumbMeridian(viewer, 0, { color: Cesium.Color.BLUE }),
    selectedPoint: {
      meridian: undefined,
      parallel: undefined,
      label: undefined,
    },
    antipodalPoint: {
      meridian: undefined,
      parallel: undefined,
      label: undefined,
    },
    lowResolutionGrid: createRhumbGrid(viewer, 2, Cesium.Color.PALEGREEN, false),
    higherResolutionGrid: createRhumbGrid(viewer, 5, Cesium.Color.DARKORANGE, false),
  };

  function updateCrosshairs(cartographic) {
    const selectedPoint = rhumbGridPrimitives.selectedPoint;
    const antipodalPoint = rhumbGridPrimitives.antipodalPoint;
    if (Cesium.defined(selectedPoint.parallel)) {
      viewer.entities.remove(selectedPoint.parallel);
      viewer.entities.remove(selectedPoint.meridian);
      viewer.entities.remove(selectedPoint.label);
      viewer.entities.remove(antipodalPoint.parallel);
      viewer.entities.remove(antipodalPoint.meridian);
      viewer.entities.remove(antipodalPoint.label);
    }

    const pointLatitude = Cesium.Math.toDegrees(cartographic.latitude);
    const pointLongitude = Cesium.Math.toDegrees(cartographic.longitude);
    const finerGranularity = 0.001;

    selectedPoint.parallel = createRhumbParallel(viewer, pointLatitude, {
      color: Cesium.Color.RED,
      granularity: finerGranularity,
      show: true,
    });
    selectedPoint.meridian = createRhumbMeridian(viewer, pointLongitude, {
      color: Cesium.Color.RED,
      granularity: finerGranularity,
      show: true,
    });
    selectedPoint.label = createCoordinateLabel(viewer, cartographic);

    const antipodeCartographic = calculateAntipode(cartographic);
    const antipodeLatitude = Cesium.Math.toDegrees(antipodeCartographic.latitude);
    const antipodeLongitude = Cesium.Math.toDegrees(antipodeCartographic.longitude);

    antipodalPoint.parallel = createRhumbParallel(viewer, antipodeLatitude, {
      color: Cesium.Color.CYAN,
      granularity: finerGranularity,
      show: showAntipodalPoint,
    });
    antipodalPoint.meridian = createRhumbMeridian(viewer, antipodeLongitude, {
      color: Cesium.Color.CYAN,
      granularity: finerGranularity,
      show: showAntipodalPoint,
    });
    antipodalPoint.label = createCoordinateLabel(viewer, antipodeCartographic);
    antipodalPoint.label.show = showAntipodalPoint;
  }

  // 鼠标左键点击地球拾取并更新等角航线十字线
  handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction(function (click) {
    if (!enableCrosshairClick) return;
    const ray = viewer.camera.getPickRay(click.position);
    const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
    if (!Cesium.defined(cartesian)) return;

    const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
    updateCrosshairs(cartographic);
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  // 设置 45 度视角与适中视距 3000000 米
  const defaultOffset = new Cesium.HeadingPitchRange(
    Cesium.Math.toRadians(30.0),
    Cesium.Math.toRadians(-45.0),
    3000000.0,
  );

  blueBox.show = true;
  viewer.zoomTo(blueBox, defaultOffset);

  // 初始化 dat.GUI 控制控制实体的显示与隐藏
  initGUI(
    {
      blueBox,
      redBox,
      yellowOutlineOnlyBox,
      greenCircle,
      redEllipse,
      blueEllipse,
      redCorridor,
      greenCorridor,
      blueCorridor,
      greenCylinder,
      redCone,
      saturn,
      saturnInnerRing,
      saturnOuterRing,
      dome,
      domeInner,
      domeTopCut,
      topBottomCut,
      bowl,
      clockCutout,
      partialDome,
      wedge,
      partialEllipsoid,
      bluePlane,
      redPlane,
      yellowPlaneOutline,
      redRectangle,
      greenRectangle,
      rotatingRectangle,
      redPolygon,
      greenPolygon,
      texturedPolygon,
      texturedPolygonWithHoles,
      orangePolygon,
      bluePolygon,
      cyanPolygon,
      purplePolygonUsingRhumbLines,
      redLine,
      greenRhumbLine,
      glowingLine,
      orangeOutlined,
      purpleArrow,
      dashedLine,
      redDashedLine,
      blueGapDashedLine,
      orangeShortDashLine,
      cyanPatternDashedLine,
      yellowPatternDashedLine,
      redTube,
      greenBox,
      blueStar,
      redWall,
      greenWall,
      blueWall,
      zIndexRedRect1,
      zIndexTexturedRect2,
      zIndexBlueRect3,
      zIndexTexturedRect3,
      zIndexGreenRect2,
      zIndexBlueRect1,
      zIndexPolyline2,
      rhumbGridPrimitives,
      onToggleCrosshairClick: (val) => {
        enableCrosshairClick = val;
      },
      onToggleAntipodalPoint: (val) => {
        showAntipodalPoint = val;
        const antipodalPoint = rhumbGridPrimitives.antipodalPoint;
        if (Cesium.defined(antipodalPoint.parallel)) {
          antipodalPoint.parallel.show = showAntipodalPoint;
          antipodalPoint.meridian.show = showAntipodalPoint;
          antipodalPoint.label.show = showAntipodalPoint;
        }
      },
    },
    defaultOffset,
  );
}

function initGUI(entities, defaultOffset) {
  gui = new MyDatGUI({width: 230, labelWidth: 0.7});
  gui.modifyPosition(viewerDivRef.value, {
    position: "absolute",
    top: "6px",
    left: "6px",
  });

  const controls = {
    // 立方体
    blueBox: true,
    redBox: false,
    yellowOutlineOnlyBox: false,
    // 椭圆
    greenCircle: false,
    redEllipse: false,
    blueEllipse: false,
    // 走廊
    redCorridor: false,
    greenCorridor: false,
    blueCorridor: false,
    // 圆柱 / 圆锥
    greenCylinder: false,
    redCone: false,
    // 椭球 / 局部椭球
    saturn: false,
    saturnInnerRing: false,
    saturnOuterRing: false,
    dome: false,
    domeInner: false,
    domeTopCut: false,
    topBottomCut: false,
    bowl: false,
    clockCutout: false,
    partialDome: false,
    wedge: false,
    partialEllipsoid: false,
    // 平面
    bluePlane: false,
    redPlane: false,
    yellowPlaneOutline: false,
    // 矩形
    redRectangle: false,
    greenRectangle: false,
    rotatingRectangle: false,
    // 多边形
    redPolygon: false,
    greenPolygon: false,
    texturedPolygon: false,
    texturedPolygonWithHoles: false,
    orangePolygon: false,
    bluePolygon: false,
    cyanPolygon: false,
    purplePolygonUsingRhumbLines: false,
    // 折线
    redLine: false,
    greenRhumbLine: false,
    glowingLine: false,
    orangeOutlined: false,
    purpleArrow: false,
    dashedLine: false,
    redDashedLine: false,
    blueGapDashedLine: false,
    orangeShortDashLine: false,
    cyanPatternDashedLine: false,
    yellowPatternDashedLine: false,
    // 管道体积体
    redTube: false,
    greenBox: false,
    blueStar: false,
    // 墙体
    redWall: false,
    greenWall: false,
    blueWall: false,
    // 贴地层级 Z-Index
    zIndexAll: false,
    zIndexRedRect1: false,
    zIndexTexturedRect2: false,
    zIndexBlueRect3: false,
    zIndexTexturedRect3: false,
    zIndexGreenRect2: false,
    zIndexBlueRect1: false,
    zIndexPolyline2: false,
    // 等角航线与经纬网
    equator: false,
    primeMeridian: false,
    lowResolutionGrid: false,
    higherResolutionGrid: false,
    enableCrosshairClick: false,
    showAntipodalPoint: false,
  };

  const handleToggle = (entity, val) => {
    entity.show = val;
    if (val) {
      viewer.zoomTo(entity, defaultOffset);
    }
  };

  const boxFolder = gui.addFolder("立方体 (Box)");
  boxFolder
    .add(controls, "blueBox")
    .name("蓝色盒子")
    .onChange((val) => handleToggle(entities.blueBox, val));
  boxFolder
    .add(controls, "redBox")
    .name("黑边红色盒子")
    .onChange((val) => handleToggle(entities.redBox, val));
  boxFolder
    .add(controls, "yellowOutlineOnlyBox")
    .name("黄色线框盒子")
    .onChange((val) => handleToggle(entities.yellowOutlineOnlyBox, val));
  boxFolder.open();

  const ellipseFolder = gui.addFolder("椭圆 / 圆 (Ellipse)");
  ellipseFolder
    .add(controls, "greenCircle")
    .name("高空绿色圆")
    .onChange((val) => handleToggle(entities.greenCircle, val));
  ellipseFolder
    .add(controls, "redEllipse")
    .name("地表红色椭圆")
    .onChange((val) => handleToggle(entities.redEllipse, val));
  ellipseFolder
    .add(controls, "blueEllipse")
    .name("蓝色柱体椭圆")
    .onChange((val) => handleToggle(entities.blueEllipse, val));

  const corridorFolder = gui.addFolder("走廊 (Corridor)");
  corridorFolder
    .add(controls, "redCorridor")
    .name("地表圆角红色走廊")
    .onChange((val) => handleToggle(entities.redCorridor, val));
  corridorFolder
    .add(controls, "greenCorridor")
    .name("高空尖角绿色走廊")
    .onChange((val) => handleToggle(entities.greenCorridor, val));
  corridorFolder
    .add(controls, "blueCorridor")
    .name("白边斜角蓝色走廊")
    .onChange((val) => handleToggle(entities.blueCorridor, val));

  const cylinderFolder = gui.addFolder("圆柱 / 圆锥 (Cylinder)");
  cylinderFolder
    .add(controls, "greenCylinder")
    .name("绿色圆柱体")
    .onChange((val) => handleToggle(entities.greenCylinder, val));
  cylinderFolder
    .add(controls, "redCone")
    .name("红色圆锥体")
    .onChange((val) => handleToggle(entities.redCone, val));

  const ellipsoidFolder = gui.addFolder("椭球体 / 局部椭球 (Ellipsoid)");
  ellipsoidFolder
    .add(controls, "saturn")
    .name("土星本体")
    .onChange((val) => handleToggle(entities.saturn, val));
  ellipsoidFolder
    .add(controls, "saturnInnerRing")
    .name("土星内环")
    .onChange((val) => handleToggle(entities.saturnInnerRing, val));
  ellipsoidFolder
    .add(controls, "saturnOuterRing")
    .name("土星外环")
    .onChange((val) => handleToggle(entities.saturnOuterRing, val));
  ellipsoidFolder
    .add(controls, "dome")
    .name("圆顶球壳")
    .onChange((val) => handleToggle(entities.dome, val));
  ellipsoidFolder
    .add(controls, "domeInner")
    .name("带内半径的圆顶")
    .onChange((val) => handleToggle(entities.domeInner, val));
  ellipsoidFolder
    .add(controls, "domeTopCut")
    .name("顶部裁剪圆顶")
    .onChange((val) => handleToggle(entities.domeTopCut, val));
  ellipsoidFolder
    .add(controls, "topBottomCut")
    .name("上下裁剪球壳")
    .onChange((val) => handleToggle(entities.topBottomCut, val));
  ellipsoidFolder
    .add(controls, "bowl")
    .name("碗状结构")
    .onChange((val) => handleToggle(entities.bowl, val));
  ellipsoidFolder
    .add(controls, "clockCutout")
    .name("时钟角度裁剪")
    .onChange((val) => handleToggle(entities.clockCutout, val));
  ellipsoidFolder
    .add(controls, "partialDome")
    .name("局部半球圆顶")
    .onChange((val) => handleToggle(entities.partialDome, val));
  ellipsoidFolder
    .add(controls, "wedge")
    .name("契形结构")
    .onChange((val) => handleToggle(entities.wedge, val));
  ellipsoidFolder
    .add(controls, "partialEllipsoid")
    .name("局部椭球体")
    .onChange((val) => handleToggle(entities.partialEllipsoid, val));

  const planeFolder = gui.addFolder("平面 (Plane)");
  planeFolder
    .add(controls, "bluePlane")
    .name("蓝色平面")
    .onChange((val) => handleToggle(entities.bluePlane, val));
  planeFolder
    .add(controls, "redPlane")
    .name("黑边红色平面")
    .onChange((val) => handleToggle(entities.redPlane, val));
  planeFolder
    .add(controls, "yellowPlaneOutline")
    .name("黄色线框平面")
    .onChange((val) => handleToggle(entities.yellowPlaneOutline, val));

  const rectangleFolder = gui.addFolder("矩形 (Rectangle)");
  rectangleFolder
    .add(controls, "redRectangle")
    .name("红色半透明矩形")
    .onChange((val) => handleToggle(entities.redRectangle, val));
  rectangleFolder
    .add(controls, "greenRectangle")
    .name("高空旋转拉伸绿色矩形")
    .onChange((val) => handleToggle(entities.greenRectangle, val));
  rectangleFolder
    .add(controls, "rotatingRectangle")
    .name("动态旋转纹理矩形")
    .onChange((val) => handleToggle(entities.rotatingRectangle, val));

  const polygonFolder = gui.addFolder("多边形 (Polygon)");
  polygonFolder
    .add(controls, "redPolygon")
    .name("地表红色多边形")
    .onChange((val) => handleToggle(entities.redPolygon, val));
  polygonFolder
    .add(controls, "greenPolygon")
    .name("绿色拉伸多边形")
    .onChange((val) => handleToggle(entities.greenPolygon, val));
  polygonFolder
    .add(controls, "texturedPolygon")
    .name("纹理拉伸多边形")
    .onChange((val) => handleToggle(entities.texturedPolygon, val));
  polygonFolder
    .add(controls, "texturedPolygonWithHoles")
    .name("带孔纹理多边形")
    .onChange((val) => handleToggle(entities.texturedPolygonWithHoles, val));
  polygonFolder
    .add(controls, "orangePolygon")
    .name("带点高度橙色多边形")
    .onChange((val) => handleToggle(entities.orangePolygon, val));
  polygonFolder
    .add(controls, "bluePolygon")
    .name("带多孔嵌套蓝色多边形")
    .onChange((val) => handleToggle(entities.bluePolygon, val));
  polygonFolder
    .add(controls, "cyanPolygon")
    .name("青色垂直多边形")
    .onChange((val) => handleToggle(entities.cyanPolygon, val));
  polygonFolder
    .add(controls, "purplePolygonUsingRhumbLines")
    .name("等角航线紫色多边形")
    .onChange((val) =>
      handleToggle(entities.purplePolygonUsingRhumbLines, val),
    );

  const polylineFolder = gui.addFolder("折线 (Polyline)");
  polylineFolder
    .add(controls, "redLine")
    .name("贴地红色折线")
    .onChange((val) => handleToggle(entities.redLine, val));
  polylineFolder
    .add(controls, "greenRhumbLine")
    .name("绿色等角航线")
    .onChange((val) => handleToggle(entities.greenRhumbLine, val));
  polylineFolder
    .add(controls, "glowingLine")
    .name("地表发光蓝色折线")
    .onChange((val) => handleToggle(entities.glowingLine, val));
  polylineFolder
    .add(controls, "orangeOutlined")
    .name("高空黑边橙色折线")
    .onChange((val) => handleToggle(entities.orangeOutlined, val));
  polylineFolder
    .add(controls, "purpleArrow")
    .name("高空紫光箭头折线")
    .onChange((val) => handleToggle(entities.purpleArrow, val));
  polylineFolder
    .add(controls, "dashedLine")
    .name("高空虚线折线")
    .onChange((val) => handleToggle(entities.dashedLine, val));
  polylineFolder
    .add(controls, "redDashedLine")
    .name("红色高空虚线")
    .onChange((val) => handleToggle(entities.redDashedLine, val));
  polylineFolder
    .add(controls, "blueGapDashedLine")
    .name("双色带间隙蓝黄虚线")
    .onChange((val) => handleToggle(entities.blueGapDashedLine, val));
  polylineFolder
    .add(controls, "orangeShortDashLine")
    .name("短段节橙色虚线")
    .onChange((val) => handleToggle(entities.orangeShortDashLine, val));
  polylineFolder
    .add(controls, "cyanPatternDashedLine")
    .name("自定模式青色虚线")
    .onChange((val) => handleToggle(entities.cyanPatternDashedLine, val));
  polylineFolder
    .add(controls, "yellowPatternDashedLine")
    .name("自定点划模式黄色虚线")
    .onChange((val) => handleToggle(entities.yellowPatternDashedLine, val));

  const polylineVolumeFolder = gui.addFolder("管道体积体 (PolylineVolume)");
  polylineVolumeFolder
    .add(controls, "redTube")
    .name("红色管道圆角柱体")
    .onChange((val) => handleToggle(entities.redTube, val));
  polylineVolumeFolder
    .add(controls, "greenBox")
    .name("绿色方形斜角柱体")
    .onChange((val) => handleToggle(entities.greenBox, val));
  polylineVolumeFolder
    .add(controls, "blueStar")
    .name("蓝色星形尖角柱体")
    .onChange((val) => handleToggle(entities.blueStar, val));

  const wallFolder = gui.addFolder("墙体 (Wall)");
  wallFolder
    .add(controls, "redWall")
    .name("高空红色墙体")
    .onChange((val) => handleToggle(entities.redWall, val));
  wallFolder
    .add(controls, "greenWall")
    .name("带边框绿色墙体")
    .onChange((val) => handleToggle(entities.greenWall, val));
  wallFolder
    .add(controls, "blueWall")
    .name("锯齿起伏蓝色墙体")
    .onChange((val) => handleToggle(entities.blueWall, val));

  const zIndexFolder = gui.addFolder("贴地层级 (Z-Index)");
  const zIndexEntitiesList = [
    entities.zIndexRedRect1,
    entities.zIndexTexturedRect2,
    entities.zIndexBlueRect3,
    entities.zIndexTexturedRect3,
    entities.zIndexGreenRect2,
    entities.zIndexBlueRect1,
    entities.zIndexPolyline2,
  ];

  zIndexFolder
    .add(controls, "zIndexAll")
    .name("一键展示全部 Z-Index 示例")
    .onChange((val) => {
      zIndexEntitiesList.forEach((e) => (e.show = val));
      controls.zIndexRedRect1 = val;
      controls.zIndexTexturedRect2 = val;
      controls.zIndexBlueRect3 = val;
      controls.zIndexTexturedRect3 = val;
      controls.zIndexGreenRect2 = val;
      controls.zIndexBlueRect1 = val;
      controls.zIndexPolyline2 = val;
      gui.updateDisplay();
      if (val) {
        viewer.zoomTo(zIndexEntitiesList, defaultOffset);
      }
    });

  zIndexFolder
    .add(controls, "zIndexRedRect1")
    .name("红色矩形 (zIndex 1)")
    .onChange((val) => handleToggle(entities.zIndexRedRect1, val));
  zIndexFolder
    .add(controls, "zIndexTexturedRect2")
    .name("纹理矩形 (zIndex 2)")
    .onChange((val) => handleToggle(entities.zIndexTexturedRect2, val));
  zIndexFolder
    .add(controls, "zIndexBlueRect3")
    .name("蓝色矩形 (zIndex 3)")
    .onChange((val) => handleToggle(entities.zIndexBlueRect3, val));
  zIndexFolder
    .add(controls, "zIndexTexturedRect3")
    .name("右侧纹理矩形 (zIndex 3)")
    .onChange((val) => handleToggle(entities.zIndexTexturedRect3, val));
  zIndexFolder
    .add(controls, "zIndexGreenRect2")
    .name("右侧绿色矩形 (zIndex 2)")
    .onChange((val) => handleToggle(entities.zIndexGreenRect2, val));
  zIndexFolder
    .add(controls, "zIndexBlueRect1")
    .name("右侧蓝色矩形 (zIndex 1)")
    .onChange((val) => handleToggle(entities.zIndexBlueRect1, val));
  zIndexFolder
    .add(controls, "zIndexPolyline2")
    .name("贴地发光蓝色折线 (zIndex 2)")
    .onChange((val) => handleToggle(entities.zIndexPolyline2, val));

  const rhumbGridFolder = gui.addFolder("等角航线与经纬网 (Rhumb Lines & Grid)");
  rhumbGridFolder
    .add(controls, "equator")
    .name("赤道 (Equator)")
    .onChange((val) => {
      if (entities.rhumbGridPrimitives) {
        entities.rhumbGridPrimitives.equator.show = val;
      }
    });
  rhumbGridFolder
    .add(controls, "primeMeridian")
    .name("本初子午线 (Prime Meridian)")
    .onChange((val) => {
      if (entities.rhumbGridPrimitives) {
        entities.rhumbGridPrimitives.primeMeridian.show = val;
      }
    });
  rhumbGridFolder
    .add(controls, "lowResolutionGrid")
    .name("低分辨率经纬网 (Low Res)")
    .onChange((val) => {
      if (entities.rhumbGridPrimitives) {
        entities.rhumbGridPrimitives.lowResolutionGrid.forEach(
          (line) => (line.show = val),
        );
      }
    });
  rhumbGridFolder
    .add(controls, "higherResolutionGrid")
    .name("高分辨率经纬网 (High Res)")
    .onChange((val) => {
      if (entities.rhumbGridPrimitives) {
        entities.rhumbGridPrimitives.higherResolutionGrid.forEach(
          (line) => (line.show = val),
        );
      }
    });
  rhumbGridFolder
    .add(controls, "enableCrosshairClick")
    .name("开启点击生成十字线")
    .onChange((val) => {
      if (entities.onToggleCrosshairClick) {
        entities.onToggleCrosshairClick(val);
      }
    });
  rhumbGridFolder
    .add(controls, "showAntipodalPoint")
    .name("显示点选对跖点 (Antipodal)")
    .onChange((val) => {
      if (entities.onToggleAntipodalPoint) {
        entities.onToggleAntipodalPoint(val);
      }
    });
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
  if (handler) handler.destroy();
  if (gui) gui.destroy();
  if (viewer) viewer.destroy();
});
<\/script>

<style lang="scss" scoped>
.box {
  height: 100%;
  position: absolute;
  inset: 0;
}
</style>
`,tn=`import Cesium from "cesium";

/**
 * 检测当前设备/平台是否支持地表贴地折线 Z-Index
 * @param {Cesium.Scene} scene - Scene 实例
 * @returns {boolean}
 */
export function supportsPolylinesOnTerrain(scene) {
  return Cesium.Entity.supportsPolylinesOnTerrain(scene);
}

/**
 * 检测当前设备/平台是否支持在地形多边形上渲染材质贴图 Z-Index
 * @param {Cesium.Scene} scene - Scene 实例
 * @returns {boolean}
 */
export function supportsMaterialsForEntitiesOnTerrain(scene) {
  return Cesium.Entity.supportsMaterialsforEntitiesOnTerrain(scene);
}

/**
 * 计算已知地理坐标的对跖(zhí)点（Antipodal Point，地心对称点）
 * @param {Cesium.Cartographic} cartographic - 输入位置（弧度）
 * @returns {Cesium.Cartographic} 对跖点地理坐标
 */
export function calculateAntipode(cartographic) {
  const latitudeDeg = Cesium.Math.toDegrees(cartographic.latitude);
  const longitudeDeg = Cesium.Math.toDegrees(cartographic.longitude);

  const antipodeLatitudeDeg = -latitudeDeg;
  const antipodeLongitudeDeg = (longitudeDeg + 180) % 360;

  return Cesium.Cartographic.fromDegrees(
    antipodeLongitudeDeg,
    antipodeLatitudeDeg,
    cartographic.height || 0,
  );
}

/**
 * 创建纬线实体（基于等角航线 Rhumb Line）
 * @param {Cesium.Viewer} viewer - Viewer 实例
 * @param {number} latitude - 纬度（度）
 * @param {Object} [options={}] - 配置选项（color, width, granularity, name, show）
 * @returns {Cesium.Entity} 纬线实体
 */
export function createRhumbParallel(viewer, latitude, options = {}) {
  const {
    color = Cesium.Color.BLUE,
    width = 2,
    granularity = undefined,
    name = \`纬线 \${latitude}°\`,
    show = false,
  } = options;

  return viewer.entities.add({
    name,
    show,
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray([
        -180, latitude,
        -90, latitude,
        0, latitude,
        90, latitude,
        180, latitude,
      ]),
      width,
      arcType: Cesium.ArcType.RHUMB,
      material: color,
      granularity,
    },
  });
}

/**
 * 创建子午经线实体（基于等角航线 Rhumb Line）
 * @param {Cesium.Viewer} viewer - Viewer 实例
 * @param {number} longitude - 经度（度）
 * @param {Object} [options={}] - 配置选项（color, width, granularity, name, show）
 * @returns {Cesium.Entity} 经线实体
 */
export function createRhumbMeridian(viewer, longitude, options = {}) {
  const {
    color = Cesium.Color.BLUE,
    width = 2,
    granularity = undefined,
    name = \`经线 \${longitude}°\`,
    show = false,
  } = options;

  return viewer.entities.add({
    name,
    show,
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray([
        longitude, 90,
        longitude, 0,
        longitude, -90,
      ]),
      width,
      arcType: Cesium.ArcType.RHUMB,
      material: color,
      granularity,
    },
  });
}

/**
 * 创建经纬度文本坐标标注实体
 * @param {Cesium.Viewer} viewer - Viewer 实例
 * @param {Cesium.Cartographic} cartographic - 地理坐标
 * @param {Object} [options={}] - 标注样式配置项
 * @returns {Cesium.Entity} 文本 Label 实体
 */
export function createCoordinateLabel(viewer, cartographic, options = {}) {
  const position = Cesium.Cartographic.toCartesian(cartographic);
  const latitude = Cesium.Math.toDegrees(cartographic.latitude).toFixed(4);
  const longitude = Cesium.Math.toDegrees(cartographic.longitude).toFixed(4);
  const labelText = options.text || \`纬度: \${latitude}°\\n经度: \${longitude}°\`;

  return viewer.entities.add({
    position,
    label: {
      text: labelText,
      showBackground: true,
      font: options.font || "14px monospace",
      backgroundColor: options.backgroundColor || new Cesium.Color(0.1, 0.1, 0.1, 0.85),
      ...options.labelOptions,
    },
  });
}

/**
 * 递归生成全球经纬度网格（基于等角航线）
 * @param {Cesium.Viewer} viewer - Viewer 实例
 * @param {number} numberOfDivisions - 递归二分深度
 * @param {Cesium.Color} color - 网格颜色
 * @param {boolean} [show=false] - 初始显隐状态
 * @returns {Cesium.Entity[]} 包含所有网格折线实体的数组
 */
export function createRhumbGrid(viewer, numberOfDivisions, color, show = false) {
  function makeParallelsRecursive(minLat, maxLat, depth) {
    let result = [];
    const midpoint = (minLat + maxLat) / 2;
    result.push(createRhumbParallel(viewer, midpoint, { color, show }));

    if (depth > 0) {
      const southern = makeParallelsRecursive(minLat, midpoint, depth - 1);
      const northern = makeParallelsRecursive(midpoint, maxLat, depth - 1);
      result = southern.concat(result, northern);
    }
    return result;
  }

  function makeMeridiansRecursive(minLon, maxLon, depth) {
    let result = [];
    const midpoint = (minLon + maxLon) / 2;
    result.push(createRhumbMeridian(viewer, midpoint, { color, show }));

    if (depth > 0) {
      const western = makeMeridiansRecursive(minLon, midpoint, depth - 1);
      const eastern = makeMeridiansRecursive(midpoint, maxLon, depth - 1);
      result = western.concat(result, eastern);
    }
    return result;
  }

  const parallels = makeParallelsRecursive(-90, 90, numberOfDivisions);
  const meridians = makeMeridiansRecursive(-180, 180, numberOfDivisions);
  meridians.push(createRhumbMeridian(viewer, 180, { color, show }));

  return parallels.concat(meridians);
}
`;function ln(d){return e.Entity.supportsPolylinesOnTerrain(d)}function sn(d){return e.Entity.supportsMaterialsforEntitiesOnTerrain(d)}function dn(d){const t=e.Math.toDegrees(d.latitude),m=e.Math.toDegrees(d.longitude),g=-t,o=(m+180)%360;return e.Cartographic.fromDegrees(o,g,d.height||0)}function S(d,t,m={}){const{color:g=e.Color.BLUE,width:o=2,granularity:w=void 0,name:l=`纬线 ${t}°`,show:y=!1}=m;return d.entities.add({name:l,show:y,polyline:{positions:e.Cartesian3.fromDegreesArray([-180,t,-90,t,0,t,90,t,180,t]),width:o,arcType:e.ArcType.RHUMB,material:g,granularity:w}})}function O(d,t,m={}){const{color:g=e.Color.BLUE,width:o=2,granularity:w=void 0,name:l=`经线 ${t}°`,show:y=!1}=m;return d.entities.add({name:l,show:y,polyline:{positions:e.Cartesian3.fromDegreesArray([t,90,t,0,t,-90]),width:o,arcType:e.ArcType.RHUMB,material:g,granularity:w}})}function Z(d,t,m={}){const g=e.Cartographic.toCartesian(t),o=e.Math.toDegrees(t.latitude).toFixed(4),w=e.Math.toDegrees(t.longitude).toFixed(4),l=m.text||`纬度: ${o}°
经度: ${w}°`;return d.entities.add({position:g,label:{text:l,showBackground:!0,font:m.font||"14px monospace",backgroundColor:m.backgroundColor||new e.Color(.1,.1,.1,.85),...m.labelOptions}})}function q(d,t,m,g=!1){function o(A,E,a){let h=[];const i=(A+E)/2;if(h.push(S(d,i,{color:m,show:g})),a>0){const r=o(A,i,a-1),R=o(i,E,a-1);h=r.concat(h,R)}return h}function w(A,E,a){let h=[];const i=(A+E)/2;if(h.push(O(d,i,{color:m,show:g})),a>0){const r=w(A,i,a-1),R=w(i,E,a-1);h=r.concat(h,R)}return h}const l=o(-90,90,t),y=w(-180,180,t);return y.push(O(d,180,{color:m,show:g})),l.concat(y)}const mn={class:"box",ref:"viewerRef"},un=an({name:"GeometriesDraw"}),Cn=Object.assign(un,{setup(d){const t="/gisnotes-cs/Sandcastle2/images/Cesium_Logo_Color.jpg",m=Ze([{fileName:"@/views/geometries/geometriesDraw/index.vue",rawCode:rn,language:"html"},{fileName:"@/views/geometries/geometriesDraw/utils.js",rawCode:tn,language:"javascript"},{fileName:"@/utils/cesium.js",rawCode:Ye,language:"javascript"}]),g=qe("viewerRef");let o=null,w=null,l=null,y=null;$e(()=>{w=setTimeout(()=>{A()},0)});function A(){o=Se(g.value),_e(o,{msaaSamples:4,enableFxaa:!0});const a=o.entities.add({name:"蓝色盒子",position:e.Cartesian3.fromDegrees(-114,40,3e5),box:{dimensions:new e.Cartesian3(4e5,3e5,5e5),material:e.Color.BLUE}}),h=o.entities.add({name:"黑边红色半透明盒子",show:!1,position:e.Cartesian3.fromDegrees(-107,40,3e5),box:{dimensions:new e.Cartesian3(4e5,3e5,5e5),material:e.Color.RED.withAlpha(.5),outline:!0,outlineColor:e.Color.BLACK}}),i=o.entities.add({name:"黄色线框盒子",show:!1,position:e.Cartesian3.fromDegrees(-100,40,3e5),box:{dimensions:new e.Cartesian3(4e5,3e5,5e5),fill:!1,outline:!0,outlineColor:e.Color.YELLOW}}),r=o.entities.add({name:"带外边框的高空绿色圆",show:!1,position:e.Cartesian3.fromDegrees(-111,40,15e4),ellipse:{semiMinorAxis:3e5,semiMajorAxis:3e5,height:2e5,material:e.Color.GREEN,outline:!0}}),R=o.entities.add({name:"地表红色半透明椭圆",show:!1,position:e.Cartesian3.fromDegrees(-103,40),ellipse:{semiMinorAxis:25e4,semiMajorAxis:4e5,material:e.Color.RED.withAlpha(.5)}}),I=o.entities.add({name:"蓝色半透明旋转拉伸柱体椭圆",show:!1,position:e.Cartesian3.fromDegrees(-95,40,1e5),ellipse:{semiMinorAxis:15e4,semiMajorAxis:3e5,extrudedHeight:2e5,rotation:e.Math.toRadians(45),material:e.Color.BLUE.withAlpha(.5),outline:!0}}),M=o.entities.add({name:"地表圆角红色半透明走廊",show:!1,corridor:{positions:e.Cartesian3.fromDegreesArray([-100,40,-105,40,-105,35]),width:2e5,material:e.Color.RED.withAlpha(.5)}}),H=o.entities.add({name:"高空尖角带边框绿色走廊",show:!1,corridor:{positions:e.Cartesian3.fromDegreesArray([-90,40,-95,40,-95,35]),height:1e5,width:2e5,cornerType:e.CornerType.MITERED,material:e.Color.GREEN,outline:!0}}),c=o.entities.add({name:"白边斜角蓝色立体走廊",show:!1,corridor:{positions:e.Cartesian3.fromDegreesArray([-80,40,-85,40,-85,35]),height:2e5,extrudedHeight:1e5,width:2e5,cornerType:e.CornerType.BEVELED,material:e.Color.BLUE.withAlpha(.5),outline:!0,outlineColor:e.Color.WHITE}}),B=o.entities.add({name:"黑边绿色半透明圆柱体",show:!1,position:e.Cartesian3.fromDegrees(-100,40,2e5),cylinder:{length:4e5,topRadius:2e5,bottomRadius:2e5,material:e.Color.GREEN.withAlpha(.5),outline:!0,outlineColor:e.Color.BLACK}}),z=o.entities.add({name:"红色圆锥体",show:!1,position:e.Cartesian3.fromDegrees(-105,40,2e5),cylinder:{length:4e5,topRadius:0,bottomRadius:2e5,material:e.Color.RED}}),p=e.Cartesian3.fromDegrees(-95,45,3e5),f=o.entities.add({name:"土星本体",show:!1,position:p,ellipsoid:{radii:new e.Cartesian3(2e5,2e5,2e5),material:new e.Color(.95,.82,.49)}}),G=o.entities.add({name:"土星内环",show:!1,position:p,orientation:e.Transforms.headingPitchRollQuaternion(p,new e.HeadingPitchRoll(e.Math.toRadians(30),e.Math.toRadians(30),0)),ellipsoid:{radii:new e.Cartesian3(4e5,4e5,4e5),innerRadii:new e.Cartesian3(3e5,3e5,3e5),minimumCone:e.Math.toRadians(89.8),maximumCone:e.Math.toRadians(90.2),material:new e.Color(.95,.82,.49,.5)}}),F=o.entities.add({name:"土星外环",show:!1,position:p,orientation:e.Transforms.headingPitchRollQuaternion(p,new e.HeadingPitchRoll(e.Math.toRadians(30),e.Math.toRadians(30),0)),ellipsoid:{radii:new e.Cartesian3(46e4,46e4,46e4),innerRadii:new e.Cartesian3(415e3,415e3,415e3),minimumCone:e.Math.toRadians(89.8),maximumCone:e.Math.toRadians(90.2),material:new e.Color(.95,.82,.49,.5)}}),x=o.entities.add({name:"圆顶球壳",show:!1,position:e.Cartesian3.fromDegrees(-120,40),ellipsoid:{radii:new e.Cartesian3(2e5,2e5,2e5),maximumCone:e.Math.PI_OVER_TWO,material:e.Color.BLUE.withAlpha(.3),outline:!0}}),U=o.entities.add({name:"带内半径的圆顶",show:!1,position:e.Cartesian3.fromDegrees(-114,40),ellipsoid:{radii:new e.Cartesian3(25e4,2e5,15e4),innerRadii:new e.Cartesian3(1e5,8e4,6e4),maximumCone:e.Math.PI_OVER_TWO,material:e.Color.RED.withAlpha(.3),outline:!0}}),b=o.entities.add({name:"顶部裁剪圆顶",show:!1,position:e.Cartesian3.fromDegrees(-108,40),ellipsoid:{radii:new e.Cartesian3(2e5,2e5,2e5),innerRadii:new e.Cartesian3(1e5,1e5,1e5),minimumCone:e.Math.toRadians(20),maximumCone:e.Math.PI_OVER_TWO,material:e.Color.YELLOW.withAlpha(.3),outline:!0}}),n=o.entities.add({name:"上下裁剪球壳",show:!1,position:e.Cartesian3.fromDegrees(-102,40,14e4),ellipsoid:{radii:new e.Cartesian3(2e5,2e5,2e5),innerRadii:new e.Cartesian3(1e5,1e5,1e5),minimumCone:e.Math.toRadians(60),maximumCone:e.Math.toRadians(140),material:e.Color.DARKCYAN.withAlpha(.3),outline:!0}}),P=o.entities.add({name:"碗状结构",show:!1,position:e.Cartesian3.fromDegrees(-96,39.5,2e5),ellipsoid:{radii:new e.Cartesian3(2e5,2e5,2e5),innerRadii:new e.Cartesian3(18e4,18e4,18e4),minimumCone:e.Math.toRadians(110),material:e.Color.GREEN.withAlpha(.3),outline:!0}}),$=o.entities.add({name:"时钟角度裁剪",show:!1,position:e.Cartesian3.fromDegrees(-90,39),ellipsoid:{radii:new e.Cartesian3(2e5,2e5,2e5),innerRadii:new e.Cartesian3(15e4,15e4,15e4),minimumClock:e.Math.toRadians(-90),maximumClock:e.Math.toRadians(180),minimumCone:e.Math.toRadians(20),maximumCone:e.Math.toRadians(70),material:e.Color.BLUE.withAlpha(.3),outline:!0}}),Q=o.entities.add({name:"局部半球圆顶",show:!1,position:e.Cartesian3.fromDegrees(-84,38.5),ellipsoid:{radii:new e.Cartesian3(2e5,2e5,2e5),minimumClock:e.Math.toRadians(-90),maximumClock:e.Math.toRadians(180),maximumCone:e.Math.toRadians(90),material:e.Color.RED.withAlpha(.3),outline:!0}}),_=e.Cartesian3.fromDegrees(-102,35,2e4),X=o.entities.add({name:"楔形结构",show:!1,position:_,orientation:e.Transforms.headingPitchRollQuaternion(_,new e.HeadingPitchRoll(e.Math.PI/1.5,0,0)),ellipsoid:{radii:new e.Cartesian3(5e5,5e5,5e5),innerRadii:new e.Cartesian3(1e4,1e4,1e4),minimumClock:e.Math.toRadians(-15),maximumClock:e.Math.toRadians(15),minimumCone:e.Math.toRadians(75),maximumCone:e.Math.toRadians(105),material:e.Color.DARKCYAN.withAlpha(.3),outline:!0}}),J=o.entities.add({name:"局部椭球体",show:!1,position:e.Cartesian3.fromDegrees(-95,34),ellipsoid:{radii:new e.Cartesian3(3e5,3e5,3e5),innerRadii:new e.Cartesian3(7e4,7e4,7e4),minimumClock:e.Math.toRadians(180),maximumClock:e.Math.toRadians(400),maximumCone:e.Math.toRadians(90),material:e.Color.DARKCYAN.withAlpha(.3),outline:!0}}),ee=o.entities.add({name:"蓝色平面",show:!1,position:e.Cartesian3.fromDegrees(-114,40,3e5),plane:{plane:new e.Plane(e.Cartesian3.UNIT_X,0),dimensions:new e.Cartesian2(4e5,3e5),material:e.Color.BLUE}}),ne=o.entities.add({name:"黑边红色半透明平面",show:!1,position:e.Cartesian3.fromDegrees(-107,40,3e5),plane:{plane:new e.Plane(e.Cartesian3.UNIT_Y,0),dimensions:new e.Cartesian2(4e5,3e5),material:e.Color.RED.withAlpha(.5),outline:!0,outlineColor:e.Color.BLACK}}),oe=o.entities.add({name:"黄色线框平面",show:!1,position:e.Cartesian3.fromDegrees(-100,40,3e5),plane:{plane:new e.Plane(e.Cartesian3.UNIT_Z,0),dimensions:new e.Cartesian2(4e5,3e5),fill:!1,outline:!0,outlineColor:e.Color.YELLOW}}),ae=o.entities.add({name:"红色半透明矩形",show:!1,rectangle:{coordinates:e.Rectangle.fromDegrees(-110,20,-80,25),material:e.Color.RED.withAlpha(.5)}}),ie=o.entities.add({name:"黑边高空旋转拉伸绿色矩形",show:!1,rectangle:{coordinates:e.Rectangle.fromDegrees(-110,30,-100,40),material:e.Color.GREEN.withAlpha(.5),rotation:e.Math.toRadians(45),extrudedHeight:3e5,height:1e5,outline:!0,outlineColor:e.Color.BLACK}});let V=e.Math.toRadians(30);function Y(){return V+=.005,V}const re=o.entities.add({name:"动态旋转纹理矩形",show:!1,rectangle:{coordinates:e.Rectangle.fromDegrees(-92,30,-76,40),material:t,rotation:new e.CallbackProperty(Y,!1),stRotation:new e.CallbackProperty(Y,!1),classificationType:e.ClassificationType.BOTH}}),te=o.entities.add({name:"地表红色多边形",show:!1,polygon:{hierarchy:e.Cartesian3.fromDegreesArray([-115,37,-115,32,-107,33,-102,31,-102,35]),material:e.Color.RED}}),le=o.entities.add({name:"绿色拉伸多边形",show:!1,polygon:{hierarchy:e.Cartesian3.fromDegreesArray([-108,42,-100,42,-104,40]),extrudedHeight:5e5,material:e.Color.GREEN,closeTop:!1,closeBottom:!1}}),se=o.entities.add({name:"纹理拉伸多边形",show:!1,polygon:{hierarchy:e.Cartesian3.fromDegreesArrayHeights([-118.4,40.4,5e4,-118.4,37,3e4,-114.2,38,35e3,-108,37,3e4,-108,40.4,5e4]),textureCoordinates:{positions:[new e.Cartesian2(0,1),new e.Cartesian2(0,0),new e.Cartesian2(.5,0),new e.Cartesian2(1,0),new e.Cartesian2(1,1)]},perPositionHeight:!0,extrudedHeight:0,material:t}}),de=o.entities.add({name:"带孔纹理多边形",show:!1,polygon:{hierarchy:{positions:e.Cartesian3.fromDegreesArrayHeights([-130,40,5e4,-130,36,3e4,-125,37,35e3,-120,36,3e4,-120,40,5e4]),holes:[{positions:e.Cartesian3.fromDegreesArrayHeights([-128,39.2,46e3,-128,38.6,42e3,-127,38.6,42e3,-127,39.2,46e3])}]},textureCoordinates:{positions:[new e.Cartesian2(0,1),new e.Cartesian2(0,0),new e.Cartesian2(.5,0),new e.Cartesian2(1,0),new e.Cartesian2(1,1)],holes:[{positions:[new e.Cartesian2(.2,.8),new e.Cartesian2(.2,.6),new e.Cartesian2(.4,.6),new e.Cartesian2(.4,.8)]}]},perPositionHeight:!0,material:t}}),me=o.entities.add({name:"带点高度橙色多边形",show:!1,polygon:{hierarchy:e.Cartesian3.fromDegreesArrayHeights([-108,25,1e5,-100,25,1e5,-100,30,1e5,-108,30,3e5]),extrudedHeight:0,perPositionHeight:!0,material:e.Color.ORANGE.withAlpha(.5),outline:!0,outlineColor:e.Color.BLACK}}),ue=o.entities.add({name:"带多孔嵌套蓝色多边形",show:!1,polygon:{hierarchy:{positions:e.Cartesian3.fromDegreesArray([-99,30,-85,30,-85,40,-99,40]),holes:[{positions:e.Cartesian3.fromDegreesArray([-97,31,-97,39,-87,39,-87,31]),holes:[{positions:e.Cartesian3.fromDegreesArray([-95,33,-89,33,-89,37,-95,37]),holes:[{positions:e.Cartesian3.fromDegreesArray([-93,34,-91,34,-91,36,-93,36])}]}]}]},material:e.Color.BLUE.withAlpha(.5),height:0,outline:!0}}),Ce=o.entities.add({name:"青色垂直多边形",show:!1,polygon:{hierarchy:e.Cartesian3.fromDegreesArrayHeights([-90,41,0,-85,41,5e5,-80,41,0]),perPositionHeight:!0,material:e.Color.CYAN.withAlpha(.5),outline:!0,outlineColor:e.Color.BLACK}}),he=o.entities.add({name:"等角航线紫色多边形",show:!1,polygon:{hierarchy:e.Cartesian3.fromDegreesArray([-120,45,-80,45,-80,55,-120,55]),extrudedHeight:5e4,material:e.Color.PURPLE,outline:!0,outlineColor:e.Color.MAGENTA,arcType:e.ArcType.RHUMB}}),ge=o.entities.add({name:"贴地红色折线",show:!1,polyline:{positions:e.Cartesian3.fromDegreesArray([-75,35,-125,35]),width:5,material:e.Color.RED,clampToGround:!0}}),ce=o.entities.add({name:"绿色等角航线",show:!1,polyline:{positions:e.Cartesian3.fromDegreesArray([-75,35,-125,35]),width:5,arcType:e.ArcType.RHUMB,material:e.Color.GREEN}}),pe=o.entities.add({name:"地表发光蓝色折线",show:!1,polyline:{positions:e.Cartesian3.fromDegreesArray([-75,37,-125,37]),width:10,material:new e.PolylineGlowMaterialProperty({glowPower:.2,taperPower:.5,color:e.Color.CORNFLOWERBLUE})}}),we=o.entities.add({name:"高空黑边橙色双色折线",show:!1,polyline:{positions:e.Cartesian3.fromDegreesArrayHeights([-75,39,25e4,-125,39,25e4]),width:5,material:new e.PolylineOutlineMaterialProperty({color:e.Color.ORANGE,outlineWidth:2,outlineColor:e.Color.BLACK})}}),fe=o.entities.add({name:"高空紫光箭头折线",show:!1,polyline:{positions:e.Cartesian3.fromDegreesArrayHeights([-75,43,5e5,-125,43,5e5]),width:10,arcType:e.ArcType.NONE,material:new e.PolylineArrowMaterialProperty(e.Color.PURPLE)}}),ye=o.entities.add({name:"高空虚线折线",show:!1,polyline:{positions:e.Cartesian3.fromDegreesArrayHeights([-75,45,5e5,-125,45,5e5]),width:4,material:new e.PolylineDashMaterialProperty({color:e.Color.CYAN})}}),Re=o.entities.add({name:"红色高空虚线",show:!1,polyline:{positions:e.Cartesian3.fromDegreesArrayHeights([-75,38,25e4,-125,38,25e4]),width:5,material:new e.PolylineDashMaterialProperty({color:e.Color.RED})}}),xe=o.entities.add({name:"双色带间隙蓝黄虚线",show:!1,polyline:{positions:e.Cartesian3.fromDegreesArrayHeights([-75,40,25e4,-125,40,25e4]),width:30,material:new e.PolylineDashMaterialProperty({color:e.Color.BLUE,gapColor:e.Color.YELLOW})}}),Pe=o.entities.add({name:"短段节橙色虚线",show:!1,polyline:{positions:e.Cartesian3.fromDegreesArrayHeights([-75,42,25e4,-125,42,25e4]),width:5,material:new e.PolylineDashMaterialProperty({color:e.Color.ORANGE,dashLength:8})}}),ve=o.entities.add({name:"自定模式青色虚线",show:!1,polyline:{positions:e.Cartesian3.fromDegreesArrayHeights([-75,44,25e4,-125,44,25e4]),width:10,material:new e.PolylineDashMaterialProperty({color:e.Color.CYAN,dashPattern:parseInt("110000001111",2)})}}),De=o.entities.add({name:"自定点划模式黄色虚线",show:!1,polyline:{positions:e.Cartesian3.fromDegreesArrayHeights([-75,46,25e4,-125,46,25e4]),width:10,material:new e.PolylineDashMaterialProperty({color:e.Color.YELLOW,dashPattern:parseInt("1010101010101010",2)})}});function be(u){const s=[];for(let C=0;C<360;C++){const D=e.Math.toRadians(C);s.push(new e.Cartesian2(u*Math.cos(D),u*Math.sin(D)))}return s}function Ae(u,s,C){const D=Math.PI/u,N=2*u,L=new Array(N);for(let v=0;v<N;v++){const W=v%2===0?s:C;L[v]=new e.Cartesian2(Math.cos(v*D)*W,Math.sin(v*D)*W)}return L}const Ee=o.entities.add({name:"红色管道圆角柱体",show:!1,polylineVolume:{positions:e.Cartesian3.fromDegreesArray([-85,32,-85,36,-89,36]),shape:be(6e4),material:e.Color.RED}}),Te=o.entities.add({name:"绿色方形斜角带边框柱体",show:!1,polylineVolume:{positions:e.Cartesian3.fromDegreesArrayHeights([-90,32,0,-90,36,1e5,-94,36,0]),shape:[new e.Cartesian2(-5e4,-5e4),new e.Cartesian2(5e4,-5e4),new e.Cartesian2(5e4,5e4),new e.Cartesian2(-5e4,5e4)],cornerType:e.CornerType.BEVELED,material:e.Color.GREEN.withAlpha(.5),outline:!0,outlineColor:e.Color.BLACK}}),Le=o.entities.add({name:"蓝色星形尖角柱体",show:!1,polylineVolume:{positions:e.Cartesian3.fromDegreesArrayHeights([-95,32,0,-95,36,1e5,-99,36,2e5]),shape:Ae(7,7e4,5e4),cornerType:e.CornerType.MITERED,material:e.Color.BLUE}}),Ie=o.entities.add({name:"高空红色墙体",show:!1,wall:{positions:e.Cartesian3.fromDegreesArrayHeights([-115,44,2e5,-90,44,2e5]),minimumHeights:[1e5,1e5],material:e.Color.RED}}),Me=o.entities.add({name:"带边框地表绿色墙体",show:!1,wall:{positions:e.Cartesian3.fromDegreesArrayHeights([-107,43,1e5,-97,43,1e5,-97,40,1e5,-107,40,1e5,-107,43,1e5]),material:e.Color.GREEN,outline:!0}}),Be=o.entities.add({name:"锯齿起伏黑边蓝色半透明墙体",show:!1,wall:{positions:e.Cartesian3.fromDegreesArray([-115,50,-112.5,50,-110,50,-107.5,50,-105,50,-102.5,50,-100,50,-97.5,50,-95,50,-92.5,50,-90,50]),maximumHeights:[1e5,2e5,1e5,2e5,1e5,2e5,1e5,2e5,1e5,2e5,1e5],minimumHeights:[0,1e5,0,1e5,0,1e5,0,1e5,0,1e5,0],material:e.Color.BLUE.withAlpha(.5),outline:!0,outlineColor:e.Color.BLACK}});ln(o.scene)||console.warn("当前平台不支持地表贴地折线 Z-Index，该属性将被忽略"),sn(o.scene)||console.warn("当前平台不支持地表贴图多边形材质 Z-Index，该属性将被忽略");const ze=o.entities.add({name:"红色矩形 (zIndex 1)",show:!1,rectangle:{coordinates:e.Rectangle.fromDegrees(-110,20,-100.5,30),material:e.Color.RED,zIndex:1}}),Ge=o.entities.add({name:"纹理矩形 (zIndex 2)",show:!1,rectangle:{coordinates:e.Rectangle.fromDegrees(-112,25,-102.5,35),material:t,zIndex:2}}),Fe=o.entities.add({name:"蓝色矩形 (zIndex 3)",show:!1,rectangle:{coordinates:e.Rectangle.fromDegrees(-110,31,-100.5,41),material:e.Color.BLUE,zIndex:3}}),Oe=o.entities.add({name:"右侧纹理矩形 (zIndex 3)",show:!1,rectangle:{coordinates:e.Rectangle.fromDegrees(-99.5,20,-90,30),material:t,zIndex:3}}),He=o.entities.add({name:"右侧绿色矩形 (zIndex 2)",show:!1,rectangle:{coordinates:e.Rectangle.fromDegrees(-97.5,25,-88,35),material:e.Color.GREEN,zIndex:2}}),Ue=o.entities.add({name:"右侧蓝色矩形 (zIndex 1)",show:!1,rectangle:{coordinates:e.Rectangle.fromDegrees(-99.5,31,-90,41),material:e.Color.BLUE,zIndex:1}}),ke=o.entities.add({name:"贴地发光蓝色折线 (zIndex 2)",show:!1,polyline:{positions:e.Cartesian3.fromDegreesArray([-120,22,-80,22]),width:8,material:new e.PolylineGlowMaterialProperty({glowPower:.2,color:e.Color.BLUE}),zIndex:2,clampToGround:!0}});let T=!1,K=!1;const k={equator:S(o,0,{color:e.Color.BLUE}),primeMeridian:O(o,0,{color:e.Color.BLUE}),selectedPoint:{meridian:void 0,parallel:void 0,label:void 0},antipodalPoint:{meridian:void 0,parallel:void 0,label:void 0},lowResolutionGrid:q(o,2,e.Color.PALEGREEN,!1),higherResolutionGrid:q(o,5,e.Color.DARKORANGE,!1)};function Ne(u){const s=k.selectedPoint,C=k.antipodalPoint;e.defined(s.parallel)&&(o.entities.remove(s.parallel),o.entities.remove(s.meridian),o.entities.remove(s.label),o.entities.remove(C.parallel),o.entities.remove(C.meridian),o.entities.remove(C.label));const D=e.Math.toDegrees(u.latitude),N=e.Math.toDegrees(u.longitude),L=.001;s.parallel=S(o,D,{color:e.Color.RED,granularity:L,show:!0}),s.meridian=O(o,N,{color:e.Color.RED,granularity:L,show:!0}),s.label=Z(o,u);const v=dn(u),W=e.Math.toDegrees(v.latitude),We=e.Math.toDegrees(v.longitude);C.parallel=S(o,W,{color:e.Color.CYAN,granularity:L,show:T}),C.meridian=O(o,We,{color:e.Color.CYAN,granularity:L,show:T}),C.label=Z(o,v),C.label.show=T}y=new e.ScreenSpaceEventHandler(o.scene.canvas),y.setInputAction(function(u){if(!K)return;const s=o.camera.getPickRay(u.position),C=o.scene.globe.pick(s,o.scene);if(!e.defined(C))return;const D=e.Cartographic.fromCartesian(C);Ne(D)},e.ScreenSpaceEventType.LEFT_CLICK);const j=new e.HeadingPitchRange(e.Math.toRadians(30),e.Math.toRadians(-45),3e6);a.show=!0,o.zoomTo(a,j),E({blueBox:a,redBox:h,yellowOutlineOnlyBox:i,greenCircle:r,redEllipse:R,blueEllipse:I,redCorridor:M,greenCorridor:H,blueCorridor:c,greenCylinder:B,redCone:z,saturn:f,saturnInnerRing:G,saturnOuterRing:F,dome:x,domeInner:U,domeTopCut:b,topBottomCut:n,bowl:P,clockCutout:$,partialDome:Q,wedge:X,partialEllipsoid:J,bluePlane:ee,redPlane:ne,yellowPlaneOutline:oe,redRectangle:ae,greenRectangle:ie,rotatingRectangle:re,redPolygon:te,greenPolygon:le,texturedPolygon:se,texturedPolygonWithHoles:de,orangePolygon:me,bluePolygon:ue,cyanPolygon:Ce,purplePolygonUsingRhumbLines:he,redLine:ge,greenRhumbLine:ce,glowingLine:pe,orangeOutlined:we,purpleArrow:fe,dashedLine:ye,redDashedLine:Re,blueGapDashedLine:xe,orangeShortDashLine:Pe,cyanPatternDashedLine:ve,yellowPatternDashedLine:De,redTube:Ee,greenBox:Te,blueStar:Le,redWall:Ie,greenWall:Me,blueWall:Be,zIndexRedRect1:ze,zIndexTexturedRect2:Ge,zIndexBlueRect3:Fe,zIndexTexturedRect3:Oe,zIndexGreenRect2:He,zIndexBlueRect1:Ue,zIndexPolyline2:ke,rhumbGridPrimitives:k,onToggleCrosshairClick:u=>{K=u},onToggleAntipodalPoint:u=>{T=u;const s=k.antipodalPoint;e.defined(s.parallel)&&(s.parallel.show=T,s.meridian.show=T,s.label.show=T)}},j)}function E(a,h){l=new Ke({width:230,labelWidth:.7}),l.modifyPosition(g.value,{position:"absolute",top:"6px",left:"6px"});const i={blueBox:!0,redBox:!1,yellowOutlineOnlyBox:!1,greenCircle:!1,redEllipse:!1,blueEllipse:!1,redCorridor:!1,greenCorridor:!1,blueCorridor:!1,greenCylinder:!1,redCone:!1,saturn:!1,saturnInnerRing:!1,saturnOuterRing:!1,dome:!1,domeInner:!1,domeTopCut:!1,topBottomCut:!1,bowl:!1,clockCutout:!1,partialDome:!1,wedge:!1,partialEllipsoid:!1,bluePlane:!1,redPlane:!1,yellowPlaneOutline:!1,redRectangle:!1,greenRectangle:!1,rotatingRectangle:!1,redPolygon:!1,greenPolygon:!1,texturedPolygon:!1,texturedPolygonWithHoles:!1,orangePolygon:!1,bluePolygon:!1,cyanPolygon:!1,purplePolygonUsingRhumbLines:!1,redLine:!1,greenRhumbLine:!1,glowingLine:!1,orangeOutlined:!1,purpleArrow:!1,dashedLine:!1,redDashedLine:!1,blueGapDashedLine:!1,orangeShortDashLine:!1,cyanPatternDashedLine:!1,yellowPatternDashedLine:!1,redTube:!1,greenBox:!1,blueStar:!1,redWall:!1,greenWall:!1,blueWall:!1,zIndexAll:!1,zIndexRedRect1:!1,zIndexTexturedRect2:!1,zIndexBlueRect3:!1,zIndexTexturedRect3:!1,zIndexGreenRect2:!1,zIndexBlueRect1:!1,zIndexPolyline2:!1,equator:!1,primeMeridian:!1,lowResolutionGrid:!1,higherResolutionGrid:!1,enableCrosshairClick:!1,showAntipodalPoint:!1},r=(n,P)=>{n.show=P,P&&o.zoomTo(n,h)},R=l.addFolder("立方体 (Box)");R.add(i,"blueBox").name("蓝色盒子").onChange(n=>r(a.blueBox,n)),R.add(i,"redBox").name("黑边红色盒子").onChange(n=>r(a.redBox,n)),R.add(i,"yellowOutlineOnlyBox").name("黄色线框盒子").onChange(n=>r(a.yellowOutlineOnlyBox,n)),R.open();const I=l.addFolder("椭圆 / 圆 (Ellipse)");I.add(i,"greenCircle").name("高空绿色圆").onChange(n=>r(a.greenCircle,n)),I.add(i,"redEllipse").name("地表红色椭圆").onChange(n=>r(a.redEllipse,n)),I.add(i,"blueEllipse").name("蓝色柱体椭圆").onChange(n=>r(a.blueEllipse,n));const M=l.addFolder("走廊 (Corridor)");M.add(i,"redCorridor").name("地表圆角红色走廊").onChange(n=>r(a.redCorridor,n)),M.add(i,"greenCorridor").name("高空尖角绿色走廊").onChange(n=>r(a.greenCorridor,n)),M.add(i,"blueCorridor").name("白边斜角蓝色走廊").onChange(n=>r(a.blueCorridor,n));const H=l.addFolder("圆柱 / 圆锥 (Cylinder)");H.add(i,"greenCylinder").name("绿色圆柱体").onChange(n=>r(a.greenCylinder,n)),H.add(i,"redCone").name("红色圆锥体").onChange(n=>r(a.redCone,n));const c=l.addFolder("椭球体 / 局部椭球 (Ellipsoid)");c.add(i,"saturn").name("土星本体").onChange(n=>r(a.saturn,n)),c.add(i,"saturnInnerRing").name("土星内环").onChange(n=>r(a.saturnInnerRing,n)),c.add(i,"saturnOuterRing").name("土星外环").onChange(n=>r(a.saturnOuterRing,n)),c.add(i,"dome").name("圆顶球壳").onChange(n=>r(a.dome,n)),c.add(i,"domeInner").name("带内半径的圆顶").onChange(n=>r(a.domeInner,n)),c.add(i,"domeTopCut").name("顶部裁剪圆顶").onChange(n=>r(a.domeTopCut,n)),c.add(i,"topBottomCut").name("上下裁剪球壳").onChange(n=>r(a.topBottomCut,n)),c.add(i,"bowl").name("碗状结构").onChange(n=>r(a.bowl,n)),c.add(i,"clockCutout").name("时钟角度裁剪").onChange(n=>r(a.clockCutout,n)),c.add(i,"partialDome").name("局部半球圆顶").onChange(n=>r(a.partialDome,n)),c.add(i,"wedge").name("契形结构").onChange(n=>r(a.wedge,n)),c.add(i,"partialEllipsoid").name("局部椭球体").onChange(n=>r(a.partialEllipsoid,n));const B=l.addFolder("平面 (Plane)");B.add(i,"bluePlane").name("蓝色平面").onChange(n=>r(a.bluePlane,n)),B.add(i,"redPlane").name("黑边红色平面").onChange(n=>r(a.redPlane,n)),B.add(i,"yellowPlaneOutline").name("黄色线框平面").onChange(n=>r(a.yellowPlaneOutline,n));const z=l.addFolder("矩形 (Rectangle)");z.add(i,"redRectangle").name("红色半透明矩形").onChange(n=>r(a.redRectangle,n)),z.add(i,"greenRectangle").name("高空旋转拉伸绿色矩形").onChange(n=>r(a.greenRectangle,n)),z.add(i,"rotatingRectangle").name("动态旋转纹理矩形").onChange(n=>r(a.rotatingRectangle,n));const p=l.addFolder("多边形 (Polygon)");p.add(i,"redPolygon").name("地表红色多边形").onChange(n=>r(a.redPolygon,n)),p.add(i,"greenPolygon").name("绿色拉伸多边形").onChange(n=>r(a.greenPolygon,n)),p.add(i,"texturedPolygon").name("纹理拉伸多边形").onChange(n=>r(a.texturedPolygon,n)),p.add(i,"texturedPolygonWithHoles").name("带孔纹理多边形").onChange(n=>r(a.texturedPolygonWithHoles,n)),p.add(i,"orangePolygon").name("带点高度橙色多边形").onChange(n=>r(a.orangePolygon,n)),p.add(i,"bluePolygon").name("带多孔嵌套蓝色多边形").onChange(n=>r(a.bluePolygon,n)),p.add(i,"cyanPolygon").name("青色垂直多边形").onChange(n=>r(a.cyanPolygon,n)),p.add(i,"purplePolygonUsingRhumbLines").name("等角航线紫色多边形").onChange(n=>r(a.purplePolygonUsingRhumbLines,n));const f=l.addFolder("折线 (Polyline)");f.add(i,"redLine").name("贴地红色折线").onChange(n=>r(a.redLine,n)),f.add(i,"greenRhumbLine").name("绿色等角航线").onChange(n=>r(a.greenRhumbLine,n)),f.add(i,"glowingLine").name("地表发光蓝色折线").onChange(n=>r(a.glowingLine,n)),f.add(i,"orangeOutlined").name("高空黑边橙色折线").onChange(n=>r(a.orangeOutlined,n)),f.add(i,"purpleArrow").name("高空紫光箭头折线").onChange(n=>r(a.purpleArrow,n)),f.add(i,"dashedLine").name("高空虚线折线").onChange(n=>r(a.dashedLine,n)),f.add(i,"redDashedLine").name("红色高空虚线").onChange(n=>r(a.redDashedLine,n)),f.add(i,"blueGapDashedLine").name("双色带间隙蓝黄虚线").onChange(n=>r(a.blueGapDashedLine,n)),f.add(i,"orangeShortDashLine").name("短段节橙色虚线").onChange(n=>r(a.orangeShortDashLine,n)),f.add(i,"cyanPatternDashedLine").name("自定模式青色虚线").onChange(n=>r(a.cyanPatternDashedLine,n)),f.add(i,"yellowPatternDashedLine").name("自定点划模式黄色虚线").onChange(n=>r(a.yellowPatternDashedLine,n));const G=l.addFolder("管道体积体 (PolylineVolume)");G.add(i,"redTube").name("红色管道圆角柱体").onChange(n=>r(a.redTube,n)),G.add(i,"greenBox").name("绿色方形斜角柱体").onChange(n=>r(a.greenBox,n)),G.add(i,"blueStar").name("蓝色星形尖角柱体").onChange(n=>r(a.blueStar,n));const F=l.addFolder("墙体 (Wall)");F.add(i,"redWall").name("高空红色墙体").onChange(n=>r(a.redWall,n)),F.add(i,"greenWall").name("带边框绿色墙体").onChange(n=>r(a.greenWall,n)),F.add(i,"blueWall").name("锯齿起伏蓝色墙体").onChange(n=>r(a.blueWall,n));const x=l.addFolder("贴地层级 (Z-Index)"),U=[a.zIndexRedRect1,a.zIndexTexturedRect2,a.zIndexBlueRect3,a.zIndexTexturedRect3,a.zIndexGreenRect2,a.zIndexBlueRect1,a.zIndexPolyline2];x.add(i,"zIndexAll").name("一键展示全部 Z-Index 示例").onChange(n=>{U.forEach(P=>P.show=n),i.zIndexRedRect1=n,i.zIndexTexturedRect2=n,i.zIndexBlueRect3=n,i.zIndexTexturedRect3=n,i.zIndexGreenRect2=n,i.zIndexBlueRect1=n,i.zIndexPolyline2=n,l.updateDisplay(),n&&o.zoomTo(U,h)}),x.add(i,"zIndexRedRect1").name("红色矩形 (zIndex 1)").onChange(n=>r(a.zIndexRedRect1,n)),x.add(i,"zIndexTexturedRect2").name("纹理矩形 (zIndex 2)").onChange(n=>r(a.zIndexTexturedRect2,n)),x.add(i,"zIndexBlueRect3").name("蓝色矩形 (zIndex 3)").onChange(n=>r(a.zIndexBlueRect3,n)),x.add(i,"zIndexTexturedRect3").name("右侧纹理矩形 (zIndex 3)").onChange(n=>r(a.zIndexTexturedRect3,n)),x.add(i,"zIndexGreenRect2").name("右侧绿色矩形 (zIndex 2)").onChange(n=>r(a.zIndexGreenRect2,n)),x.add(i,"zIndexBlueRect1").name("右侧蓝色矩形 (zIndex 1)").onChange(n=>r(a.zIndexBlueRect1,n)),x.add(i,"zIndexPolyline2").name("贴地发光蓝色折线 (zIndex 2)").onChange(n=>r(a.zIndexPolyline2,n));const b=l.addFolder("等角航线与经纬网 (Rhumb Lines & Grid)");b.add(i,"equator").name("赤道 (Equator)").onChange(n=>{a.rhumbGridPrimitives&&(a.rhumbGridPrimitives.equator.show=n)}),b.add(i,"primeMeridian").name("本初子午线 (Prime Meridian)").onChange(n=>{a.rhumbGridPrimitives&&(a.rhumbGridPrimitives.primeMeridian.show=n)}),b.add(i,"lowResolutionGrid").name("低分辨率经纬网 (Low Res)").onChange(n=>{a.rhumbGridPrimitives&&a.rhumbGridPrimitives.lowResolutionGrid.forEach(P=>P.show=n)}),b.add(i,"higherResolutionGrid").name("高分辨率经纬网 (High Res)").onChange(n=>{a.rhumbGridPrimitives&&a.rhumbGridPrimitives.higherResolutionGrid.forEach(P=>P.show=n)}),b.add(i,"enableCrosshairClick").name("开启点击生成十字线").onChange(n=>{a.onToggleCrosshairClick&&a.onToggleCrosshairClick(n)}),b.add(i,"showAntipodalPoint").name("显示点选对跖点 (Antipodal)").onChange(n=>{a.onToggleAntipodalPoint&&a.onToggleAntipodalPoint(n)})}return Qe(()=>{w&&clearTimeout(w),y&&y.destroy(),l&&l.destroy(),o&&o.destroy()}),(a,h)=>(Xe(),Je(Ve,{codeBlocks:on(m)},{default:en(()=>[nn("div",mn,null,512)]),_:1},8,["codeBlocks"]))}}),fn=je(Cn,[["__scopeId","data-v-0956b56b"]]);export{fn as default};
