import{c as Un,o as Vn,C as o,s as Wn,a as Yn,b as Te,d as ce,e as he,D as $n,f as Le,g as Kn}from"./cesium-t67yP2Ok.js";import{_ as Xn,r as jn,T as Qn,F as qn,M as Zn,o as Jn,m as et,f as nt,h as tt,i as it,H as ot}from"./index-BcjpzwbO.js";import"./index-BKIpIwrX.js";const at=`<template>
  <demo-box :codeBlocks>
    <div class="box" ref="viewerRef"></div>
  </demo-box>
</template>

<script setup name="GeometriesDraw">
import DemoBox from "@/components/DemoBox/index.vue";
import IndexSourceCode from "./index.vue?raw";
import cesiumLogoUrl from "@/assets/images/demo/images/Cesium_Logo_Color.jpg";

import Cesium from "cesium";
import "cesium/Build/CesiumUnminified/Widgets/widgets.css";
import {
  createViewer,
  optimizeViewerQuality,
  supportsPolylinesOnTerrain,
  supportsMaterialsForEntitiesOnTerrain,
  calculateAntipode,
  createRhumbParallel,
  createRhumbMeridian,
  createCoordinateLabel,
  createRhumbGrid,
} from "@/utils/cesium";
import MyDatGUI from "@/utils/datGUI";

const codeBlocks = ref([
  {
    fileName: "@/views/geometries/geometriesDraw/index.vue",
    rawCode: IndexSourceCode,
    language: "html",
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
  gui = new MyDatGUI();
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

/** 隐藏底部版权 */
:deep(.cesium-viewer-bottom) {
  display: none;
}
</style>
`,Q="/gisnotes-cs/static/jpg/Cesium_Logo_Color-4X-4t0Xg.jpg";function rt(i){if(!(typeof window>"u")){var e=document.createElement("style");return e.setAttribute("type","text/css"),e.innerHTML=i,document.head.appendChild(e),i}}function K(i,e){var n=i.__state.conversionName.toString(),t=Math.round(i.r),a=Math.round(i.g),r=Math.round(i.b),c=i.a,f=Math.round(i.h),g=i.s.toFixed(1),u=i.v.toFixed(1);if(e||n==="THREE_CHAR_HEX"||n==="SIX_CHAR_HEX"){for(var C=i.hex.toString(16);C.length<6;)C="0"+C;return"#"+C}else{if(n==="CSS_RGB")return"rgb("+t+","+a+","+r+")";if(n==="CSS_RGBA")return"rgba("+t+","+a+","+r+","+c+")";if(n==="HEX")return"0x"+i.hex.toString(16);if(n==="RGB_ARRAY")return"["+t+","+a+","+r+"]";if(n==="RGBA_ARRAY")return"["+t+","+a+","+r+","+c+"]";if(n==="RGB_OBJ")return"{r:"+t+",g:"+a+",b:"+r+"}";if(n==="RGBA_OBJ")return"{r:"+t+",g:"+a+",b:"+r+",a:"+c+"}";if(n==="HSV_OBJ")return"{h:"+f+",s:"+g+",v:"+u+"}";if(n==="HSVA_OBJ")return"{h:"+f+",s:"+g+",v:"+u+",a:"+c+"}"}return"unknown format"}var Ie=Array.prototype.forEach,q=Array.prototype.slice,m={BREAK:{},extend:function(e){return this.each(q.call(arguments,1),function(n){var t=this.isObject(n)?Object.keys(n):[];t.forEach((function(a){this.isUndefined(n[a])||(e[a]=n[a])}).bind(this))},this),e},defaults:function(e){return this.each(q.call(arguments,1),function(n){var t=this.isObject(n)?Object.keys(n):[];t.forEach((function(a){this.isUndefined(e[a])&&(e[a]=n[a])}).bind(this))},this),e},compose:function(){var e=q.call(arguments);return function(){for(var n=q.call(arguments),t=e.length-1;t>=0;t--)n=[e[t].apply(this,n)];return n[0]}},each:function(e,n,t){if(e){if(Ie&&e.forEach&&e.forEach===Ie)e.forEach(n,t);else if(e.length===e.length+0){var a=void 0,r=void 0;for(a=0,r=e.length;a<r;a++)if(a in e&&n.call(t,e[a],a)===this.BREAK)return}else for(var c in e)if(n.call(t,e[c],c)===this.BREAK)return}},defer:function(e){setTimeout(e,0)},debounce:function(e,n,t){var a=void 0;return function(){var r=this,c=arguments;function f(){a=null,t||e.apply(r,c)}var g=t||!a;clearTimeout(a),a=setTimeout(f,n),g&&e.apply(r,c)}},toArray:function(e){return e.toArray?e.toArray():q.call(e)},isUndefined:function(e){return e===void 0},isNull:function(e){return e===null},isNaN:(function(i){function e(n){return i.apply(this,arguments)}return e.toString=function(){return i.toString()},e})(function(i){return isNaN(i)}),isArray:Array.isArray||function(i){return i.constructor===Array},isObject:function(e){return e===Object(e)},isNumber:function(e){return e===e+0},isString:function(e){return e===e+""},isBoolean:function(e){return e===!1||e===!0},isFunction:function(e){return e instanceof Function}},st=[{litmus:m.isString,conversions:{THREE_CHAR_HEX:{read:function(e){var n=e.match(/^#([A-F0-9])([A-F0-9])([A-F0-9])$/i);return n===null?!1:{space:"HEX",hex:parseInt("0x"+n[1].toString()+n[1].toString()+n[2].toString()+n[2].toString()+n[3].toString()+n[3].toString(),0)}},write:K},SIX_CHAR_HEX:{read:function(e){var n=e.match(/^#([A-F0-9]{6})$/i);return n===null?!1:{space:"HEX",hex:parseInt("0x"+n[1].toString(),0)}},write:K},CSS_RGB:{read:function(e){var n=e.match(/^rgb\(\s*(\S+)\s*,\s*(\S+)\s*,\s*(\S+)\s*\)/);return n===null?!1:{space:"RGB",r:parseFloat(n[1]),g:parseFloat(n[2]),b:parseFloat(n[3])}},write:K},CSS_RGBA:{read:function(e){var n=e.match(/^rgba\(\s*(\S+)\s*,\s*(\S+)\s*,\s*(\S+)\s*,\s*(\S+)\s*\)/);return n===null?!1:{space:"RGB",r:parseFloat(n[1]),g:parseFloat(n[2]),b:parseFloat(n[3]),a:parseFloat(n[4])}},write:K}}},{litmus:m.isNumber,conversions:{HEX:{read:function(e){return{space:"HEX",hex:e,conversionName:"HEX"}},write:function(e){return e.hex}}}},{litmus:m.isArray,conversions:{RGB_ARRAY:{read:function(e){return e.length!==3?!1:{space:"RGB",r:e[0],g:e[1],b:e[2]}},write:function(e){return[e.r,e.g,e.b]}},RGBA_ARRAY:{read:function(e){return e.length!==4?!1:{space:"RGB",r:e[0],g:e[1],b:e[2],a:e[3]}},write:function(e){return[e.r,e.g,e.b,e.a]}}}},{litmus:m.isObject,conversions:{RGBA_OBJ:{read:function(e){return m.isNumber(e.r)&&m.isNumber(e.g)&&m.isNumber(e.b)&&m.isNumber(e.a)?{space:"RGB",r:e.r,g:e.g,b:e.b,a:e.a}:!1},write:function(e){return{r:e.r,g:e.g,b:e.b,a:e.a}}},RGB_OBJ:{read:function(e){return m.isNumber(e.r)&&m.isNumber(e.g)&&m.isNumber(e.b)?{space:"RGB",r:e.r,g:e.g,b:e.b}:!1},write:function(e){return{r:e.r,g:e.g,b:e.b}}},HSVA_OBJ:{read:function(e){return m.isNumber(e.h)&&m.isNumber(e.s)&&m.isNumber(e.v)&&m.isNumber(e.a)?{space:"HSV",h:e.h,s:e.s,v:e.v,a:e.a}:!1},write:function(e){return{h:e.h,s:e.s,v:e.v,a:e.a}}},HSV_OBJ:{read:function(e){return m.isNumber(e.h)&&m.isNumber(e.s)&&m.isNumber(e.v)?{space:"HSV",h:e.h,s:e.s,v:e.v}:!1},write:function(e){return{h:e.h,s:e.s,v:e.v}}}}}],Z=void 0,le=void 0,ge=function(){le=!1;var e=arguments.length>1?m.toArray(arguments):arguments[0];return m.each(st,function(n){if(n.litmus(e))return m.each(n.conversions,function(t,a){if(Z=t.read(e),le===!1&&Z!==!1)return le=Z,Z.conversionName=a,Z.conversion=t,m.BREAK}),m.BREAK}),le},Oe=void 0,ue={hsv_to_rgb:function(e,n,t){var a=Math.floor(e/60)%6,r=e/60-Math.floor(e/60),c=t*(1-n),f=t*(1-r*n),g=t*(1-(1-r)*n),u=[[t,g,c],[f,t,c],[c,t,g],[c,f,t],[g,c,t],[t,c,f]][a];return{r:u[0]*255,g:u[1]*255,b:u[2]*255}},rgb_to_hsv:function(e,n,t){var a=Math.min(e,n,t),r=Math.max(e,n,t),c=r-a,f=void 0,g=void 0;if(r!==0)g=c/r;else return{h:NaN,s:0,v:0};return e===r?f=(n-t)/c:n===r?f=2+(t-e)/c:f=4+(e-n)/c,f/=6,f<0&&(f+=1),{h:f*360,s:g,v:r/255}},rgb_to_hex:function(e,n,t){var a=this.hex_with_component(0,2,e);return a=this.hex_with_component(a,1,n),a=this.hex_with_component(a,0,t),a},component_from_hex:function(e,n){return e>>n*8&255},hex_with_component:function(e,n,t){return t<<(Oe=n*8)|e&~(255<<Oe)}},lt=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(i){return typeof i}:function(i){return i&&typeof Symbol=="function"&&i.constructor===Symbol&&i!==Symbol.prototype?"symbol":typeof i},L=function(i,e){if(!(i instanceof e))throw new TypeError("Cannot call a class as a function")},I=(function(){function i(e,n){for(var t=0;t<n.length;t++){var a=n[t];a.enumerable=a.enumerable||!1,a.configurable=!0,"value"in a&&(a.writable=!0),Object.defineProperty(e,a.key,a)}}return function(e,n,t){return n&&i(e.prototype,n),t&&i(e,t),e}})(),H=function i(e,n,t){e===null&&(e=Function.prototype);var a=Object.getOwnPropertyDescriptor(e,n);if(a===void 0){var r=Object.getPrototypeOf(e);return r===null?void 0:i(r,n,t)}else{if("value"in a)return a.value;var c=a.get;return c===void 0?void 0:c.call(t)}},G=function(i,e){if(typeof e!="function"&&e!==null)throw new TypeError("Super expression must either be null or a function, not "+typeof e);i.prototype=Object.create(e&&e.prototype,{constructor:{value:i,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(i,e):i.__proto__=e)},N=function(i,e){if(!i)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e&&(typeof e=="object"||typeof e=="function")?e:i},A=(function(){function i(){if(L(this,i),this.__state=ge.apply(this,arguments),this.__state===!1)throw new Error("Failed to interpret color arguments");this.__state.a=this.__state.a||1}return I(i,[{key:"toString",value:function(){return K(this)}},{key:"toHexString",value:function(){return K(this,!0)}},{key:"toOriginal",value:function(){return this.__state.conversion.write(this)}}]),i})();function ve(i,e,n){Object.defineProperty(i,e,{get:function(){return this.__state.space==="RGB"?this.__state[e]:(A.recalculateRGB(this,e,n),this.__state[e])},set:function(a){this.__state.space!=="RGB"&&(A.recalculateRGB(this,e,n),this.__state.space="RGB"),this.__state[e]=a}})}function be(i,e){Object.defineProperty(i,e,{get:function(){return this.__state.space==="HSV"?this.__state[e]:(A.recalculateHSV(this),this.__state[e])},set:function(t){this.__state.space!=="HSV"&&(A.recalculateHSV(this),this.__state.space="HSV"),this.__state[e]=t}})}A.recalculateRGB=function(i,e,n){if(i.__state.space==="HEX")i.__state[e]=ue.component_from_hex(i.__state.hex,n);else if(i.__state.space==="HSV")m.extend(i.__state,ue.hsv_to_rgb(i.__state.h,i.__state.s,i.__state.v));else throw new Error("Corrupted color state")};A.recalculateHSV=function(i){var e=ue.rgb_to_hsv(i.r,i.g,i.b);m.extend(i.__state,{s:e.s,v:e.v}),m.isNaN(e.h)?m.isUndefined(i.__state.h)&&(i.__state.h=0):i.__state.h=e.h};A.COMPONENTS=["r","g","b","h","s","v","hex","a"];ve(A.prototype,"r",2);ve(A.prototype,"g",1);ve(A.prototype,"b",0);be(A.prototype,"h");be(A.prototype,"s");be(A.prototype,"v");Object.defineProperty(A.prototype,"a",{get:function(){return this.__state.a},set:function(e){this.__state.a=e}});Object.defineProperty(A.prototype,"hex",{get:function(){return this.__state.space!=="HEX"&&(this.__state.hex=ue.rgb_to_hex(this.r,this.g,this.b),this.__state.space="HEX"),this.__state.hex},set:function(e){this.__state.space="HEX",this.__state.hex=e}});var W=(function(){function i(e,n){L(this,i),this.initialValue=e[n],this.domElement=document.createElement("div"),this.object=e,this.property=n,this.__onChange=void 0,this.__onFinishChange=void 0}return I(i,[{key:"onChange",value:function(n){return this.__onChange=n,this}},{key:"onFinishChange",value:function(n){return this.__onFinishChange=n,this}},{key:"setValue",value:function(n){return this.object[this.property]=n,this.__onChange&&this.__onChange.call(this,n),this.updateDisplay(),this}},{key:"getValue",value:function(){return this.object[this.property]}},{key:"updateDisplay",value:function(){return this}},{key:"isModified",value:function(){return this.initialValue!==this.getValue()}}]),i})(),dt={HTMLEvents:["change"],MouseEvents:["click","mousemove","mousedown","mouseup","mouseover"],KeyboardEvents:["keydown"]},Ue={};m.each(dt,function(i,e){m.each(i,function(n){Ue[n]=e})});var ut=/(\d+(\.\d+)?)px/;function k(i){if(i==="0"||m.isUndefined(i))return 0;var e=i.match(ut);return m.isNull(e)?0:parseFloat(e[1])}var l={makeSelectable:function(e,n){e===void 0||e.style===void 0||(e.onselectstart=n?function(){return!1}:function(){},e.style.MozUserSelect=n?"auto":"none",e.style.KhtmlUserSelect=n?"auto":"none",e.unselectable=n?"on":"off")},makeFullscreen:function(e,n,t){var a=t,r=n;m.isUndefined(r)&&(r=!0),m.isUndefined(a)&&(a=!0),e.style.position="absolute",r&&(e.style.left=0,e.style.right=0),a&&(e.style.top=0,e.style.bottom=0)},fakeEvent:function(e,n,t,a){var r=t||{},c=Ue[n];if(!c)throw new Error("Event type "+n+" not supported.");var f=document.createEvent(c);switch(c){case"MouseEvents":{var g=r.x||r.clientX||0,u=r.y||r.clientY||0;f.initMouseEvent(n,r.bubbles||!1,r.cancelable||!0,window,r.clickCount||1,0,0,g,u,!1,!1,!1,!1,0,null);break}case"KeyboardEvents":{var C=f.initKeyboardEvent||f.initKeyEvent;m.defaults(r,{cancelable:!0,ctrlKey:!1,altKey:!1,shiftKey:!1,metaKey:!1,keyCode:void 0,charCode:void 0}),C(n,r.bubbles||!1,r.cancelable,window,r.ctrlKey,r.altKey,r.shiftKey,r.metaKey,r.keyCode,r.charCode);break}default:{f.initEvent(n,r.bubbles||!1,r.cancelable||!0);break}}m.defaults(f,a),e.dispatchEvent(f)},bind:function(e,n,t,a){var r=a||!1;return e.addEventListener?e.addEventListener(n,t,r):e.attachEvent&&e.attachEvent("on"+n,t),l},unbind:function(e,n,t,a){var r=a||!1;return e.removeEventListener?e.removeEventListener(n,t,r):e.detachEvent&&e.detachEvent("on"+n,t),l},addClass:function(e,n){if(e.className===void 0)e.className=n;else if(e.className!==n){var t=e.className.split(/ +/);t.indexOf(n)===-1&&(t.push(n),e.className=t.join(" ").replace(/^\s+/,"").replace(/\s+$/,""))}return l},removeClass:function(e,n){if(n)if(e.className===n)e.removeAttribute("class");else{var t=e.className.split(/ +/),a=t.indexOf(n);a!==-1&&(t.splice(a,1),e.className=t.join(" "))}else e.className=void 0;return l},hasClass:function(e,n){return new RegExp("(?:^|\\s+)"+n+"(?:\\s+|$)").test(e.className)||!1},getWidth:function(e){var n=getComputedStyle(e);return k(n["border-left-width"])+k(n["border-right-width"])+k(n["padding-left"])+k(n["padding-right"])+k(n.width)},getHeight:function(e){var n=getComputedStyle(e);return k(n["border-top-width"])+k(n["border-bottom-width"])+k(n["padding-top"])+k(n["padding-bottom"])+k(n.height)},getOffset:function(e){var n=e,t={left:0,top:0};if(n.offsetParent)do t.left+=n.offsetLeft,t.top+=n.offsetTop,n=n.offsetParent;while(n);return t},isActive:function(e){return e===document.activeElement&&(e.type||e.href)}},Ve=(function(i){G(e,i);function e(n,t){L(this,e);var a=N(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,n,t)),r=a;a.__prev=a.getValue(),a.__checkbox=document.createElement("input"),a.__checkbox.setAttribute("type","checkbox");function c(){r.setValue(!r.__prev)}return l.bind(a.__checkbox,"change",c,!1),a.domElement.appendChild(a.__checkbox),a.updateDisplay(),a}return I(e,[{key:"setValue",value:function(t){var a=H(e.prototype.__proto__||Object.getPrototypeOf(e.prototype),"setValue",this).call(this,t);return this.__onFinishChange&&this.__onFinishChange.call(this,this.getValue()),this.__prev=this.getValue(),a}},{key:"updateDisplay",value:function(){return this.getValue()===!0?(this.__checkbox.setAttribute("checked","checked"),this.__checkbox.checked=!0,this.__prev=!0):(this.__checkbox.checked=!1,this.__prev=!1),H(e.prototype.__proto__||Object.getPrototypeOf(e.prototype),"updateDisplay",this).call(this)}}]),e})(W),mt=(function(i){G(e,i);function e(n,t,a){L(this,e);var r=N(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,n,t)),c=a,f=r;if(r.__select=document.createElement("select"),m.isArray(c)){var g={};m.each(c,function(u){g[u]=u}),c=g}return m.each(c,function(u,C){var d=document.createElement("option");d.innerHTML=C,d.setAttribute("value",u),f.__select.appendChild(d)}),r.updateDisplay(),l.bind(r.__select,"change",function(){var u=this.options[this.selectedIndex].value;f.setValue(u)}),r.domElement.appendChild(r.__select),r}return I(e,[{key:"setValue",value:function(t){var a=H(e.prototype.__proto__||Object.getPrototypeOf(e.prototype),"setValue",this).call(this,t);return this.__onFinishChange&&this.__onFinishChange.call(this,this.getValue()),a}},{key:"updateDisplay",value:function(){return l.isActive(this.__select)?this:(this.__select.value=this.getValue(),H(e.prototype.__proto__||Object.getPrototypeOf(e.prototype),"updateDisplay",this).call(this))}}]),e})(W),ct=(function(i){G(e,i);function e(n,t){L(this,e);var a=N(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,n,t)),r=a;function c(){r.setValue(r.__input.value)}function f(){r.__onFinishChange&&r.__onFinishChange.call(r,r.getValue())}return a.__input=document.createElement("input"),a.__input.setAttribute("type","text"),l.bind(a.__input,"keyup",c),l.bind(a.__input,"change",c),l.bind(a.__input,"blur",f),l.bind(a.__input,"keydown",function(g){g.keyCode===13&&this.blur()}),a.updateDisplay(),a.domElement.appendChild(a.__input),a}return I(e,[{key:"updateDisplay",value:function(){return l.isActive(this.__input)||(this.__input.value=this.getValue()),H(e.prototype.__proto__||Object.getPrototypeOf(e.prototype),"updateDisplay",this).call(this)}}]),e})(W);function Se(i){var e=i.toString();return e.indexOf(".")>-1?e.length-e.indexOf(".")-1:0}var We=(function(i){G(e,i);function e(n,t,a){L(this,e);var r=N(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,n,t)),c=a||{};return r.__min=c.min,r.__max=c.max,r.__step=c.step,m.isUndefined(r.__step)?r.initialValue===0?r.__impliedStep=1:r.__impliedStep=Math.pow(10,Math.floor(Math.log(Math.abs(r.initialValue))/Math.LN10))/10:r.__impliedStep=r.__step,r.__precision=Se(r.__impliedStep),r}return I(e,[{key:"setValue",value:function(t){var a=t;return this.__min!==void 0&&a<this.__min?a=this.__min:this.__max!==void 0&&a>this.__max&&(a=this.__max),this.__step!==void 0&&a%this.__step!==0&&(a=Math.round(a/this.__step)*this.__step),H(e.prototype.__proto__||Object.getPrototypeOf(e.prototype),"setValue",this).call(this,a)}},{key:"min",value:function(t){return this.__min=t,this}},{key:"max",value:function(t){return this.__max=t,this}},{key:"step",value:function(t){return this.__step=t,this.__impliedStep=t,this.__precision=Se(t),this}}]),e})(W);function ht(i,e){var n=Math.pow(10,e);return Math.round(i*n)/n}var me=(function(i){G(e,i);function e(n,t,a){L(this,e);var r=N(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,n,t,a));r.__truncationSuspended=!1;var c=r,f=void 0;function g(){var w=parseFloat(c.__input.value);m.isNaN(w)||c.setValue(w)}function u(){c.__onFinishChange&&c.__onFinishChange.call(c,c.getValue())}function C(){u()}function d(w){var p=f-w.clientY;c.setValue(c.getValue()+p*c.__impliedStep),f=w.clientY}function h(){l.unbind(window,"mousemove",d),l.unbind(window,"mouseup",h),u()}function E(w){l.bind(window,"mousemove",d),l.bind(window,"mouseup",h),f=w.clientY}return r.__input=document.createElement("input"),r.__input.setAttribute("type","text"),l.bind(r.__input,"change",g),l.bind(r.__input,"blur",C),l.bind(r.__input,"mousedown",E),l.bind(r.__input,"keydown",function(w){w.keyCode===13&&(c.__truncationSuspended=!0,this.blur(),c.__truncationSuspended=!1,u())}),r.updateDisplay(),r.domElement.appendChild(r.__input),r}return I(e,[{key:"updateDisplay",value:function(){return this.__input.value=this.__truncationSuspended?this.getValue():ht(this.getValue(),this.__precision),H(e.prototype.__proto__||Object.getPrototypeOf(e.prototype),"updateDisplay",this).call(this)}}]),e})(We);function Be(i,e,n,t,a){return t+(a-t)*((i-e)/(n-e))}var pe=(function(i){G(e,i);function e(n,t,a,r,c){L(this,e);var f=N(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,n,t,{min:a,max:r,step:c})),g=f;f.__background=document.createElement("div"),f.__foreground=document.createElement("div"),l.bind(f.__background,"mousedown",u),l.bind(f.__background,"touchstart",h),l.addClass(f.__background,"slider"),l.addClass(f.__foreground,"slider-fg");function u(p){document.activeElement.blur(),l.bind(window,"mousemove",C),l.bind(window,"mouseup",d),C(p)}function C(p){p.preventDefault();var v=g.__background.getBoundingClientRect();return g.setValue(Be(p.clientX,v.left,v.right,g.__min,g.__max)),!1}function d(){l.unbind(window,"mousemove",C),l.unbind(window,"mouseup",d),g.__onFinishChange&&g.__onFinishChange.call(g,g.getValue())}function h(p){p.touches.length===1&&(l.bind(window,"touchmove",E),l.bind(window,"touchend",w),E(p))}function E(p){var v=p.touches[0].clientX,y=g.__background.getBoundingClientRect();g.setValue(Be(v,y.left,y.right,g.__min,g.__max))}function w(){l.unbind(window,"touchmove",E),l.unbind(window,"touchend",w),g.__onFinishChange&&g.__onFinishChange.call(g,g.getValue())}return f.updateDisplay(),f.__background.appendChild(f.__foreground),f.domElement.appendChild(f.__background),f}return I(e,[{key:"updateDisplay",value:function(){var t=(this.getValue()-this.__min)/(this.__max-this.__min);return this.__foreground.style.width=t*100+"%",H(e.prototype.__proto__||Object.getPrototypeOf(e.prototype),"updateDisplay",this).call(this)}}]),e})(We),Ye=(function(i){G(e,i);function e(n,t,a){L(this,e);var r=N(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,n,t)),c=r;return r.__button=document.createElement("div"),r.__button.innerHTML=a===void 0?"Fire":a,l.bind(r.__button,"click",function(f){return f.preventDefault(),c.fire(),!1}),l.addClass(r.__button,"button"),r.domElement.appendChild(r.__button),r}return I(e,[{key:"fire",value:function(){this.__onChange&&this.__onChange.call(this),this.getValue().call(this.object),this.__onFinishChange&&this.__onFinishChange.call(this,this.getValue())}}]),e})(W),Ce=(function(i){G(e,i);function e(n,t){L(this,e);var a=N(this,(e.__proto__||Object.getPrototypeOf(e)).call(this,n,t));a.__color=new A(a.getValue()),a.__temp=new A(0);var r=a;a.domElement=document.createElement("div"),l.makeSelectable(a.domElement,!1),a.__selector=document.createElement("div"),a.__selector.className="selector",a.__saturation_field=document.createElement("div"),a.__saturation_field.className="saturation-field",a.__field_knob=document.createElement("div"),a.__field_knob.className="field-knob",a.__field_knob_border="2px solid ",a.__hue_knob=document.createElement("div"),a.__hue_knob.className="hue-knob",a.__hue_field=document.createElement("div"),a.__hue_field.className="hue-field",a.__input=document.createElement("input"),a.__input.type="text",a.__input_textShadow="0 1px 1px ",l.bind(a.__input,"keydown",function(p){p.keyCode===13&&d.call(this)}),l.bind(a.__input,"blur",d),l.bind(a.__selector,"mousedown",function(){l.addClass(this,"drag").bind(window,"mouseup",function(){l.removeClass(r.__selector,"drag")})}),l.bind(a.__selector,"touchstart",function(){l.addClass(this,"drag").bind(window,"touchend",function(){l.removeClass(r.__selector,"drag")})});var c=document.createElement("div");m.extend(a.__selector.style,{width:"122px",height:"102px",padding:"3px",backgroundColor:"#222",boxShadow:"0px 1px 3px rgba(0,0,0,0.3)"}),m.extend(a.__field_knob.style,{position:"absolute",width:"12px",height:"12px",border:a.__field_knob_border+(a.__color.v<.5?"#fff":"#000"),boxShadow:"0px 1px 3px rgba(0,0,0,0.5)",borderRadius:"12px",zIndex:1}),m.extend(a.__hue_knob.style,{position:"absolute",width:"15px",height:"2px",borderRight:"4px solid #fff",zIndex:1}),m.extend(a.__saturation_field.style,{width:"100px",height:"100px",border:"1px solid #555",marginRight:"3px",display:"inline-block",cursor:"pointer"}),m.extend(c.style,{width:"100%",height:"100%",background:"none"}),ke(c,"top","rgba(0,0,0,0)","#000"),m.extend(a.__hue_field.style,{width:"15px",height:"100px",border:"1px solid #555",cursor:"ns-resize",position:"absolute",top:"3px",right:"3px"}),gt(a.__hue_field),m.extend(a.__input.style,{outline:"none",textAlign:"center",color:"#fff",border:0,fontWeight:"bold",textShadow:a.__input_textShadow+"rgba(0,0,0,0.7)"}),l.bind(a.__saturation_field,"mousedown",f),l.bind(a.__saturation_field,"touchstart",f),l.bind(a.__field_knob,"mousedown",f),l.bind(a.__field_knob,"touchstart",f),l.bind(a.__hue_field,"mousedown",g),l.bind(a.__hue_field,"touchstart",g);function f(p){E(p),l.bind(window,"mousemove",E),l.bind(window,"touchmove",E),l.bind(window,"mouseup",u),l.bind(window,"touchend",u)}function g(p){w(p),l.bind(window,"mousemove",w),l.bind(window,"touchmove",w),l.bind(window,"mouseup",C),l.bind(window,"touchend",C)}function u(){l.unbind(window,"mousemove",E),l.unbind(window,"touchmove",E),l.unbind(window,"mouseup",u),l.unbind(window,"touchend",u),h()}function C(){l.unbind(window,"mousemove",w),l.unbind(window,"touchmove",w),l.unbind(window,"mouseup",C),l.unbind(window,"touchend",C),h()}function d(){var p=ge(this.value);p!==!1?(r.__color.__state=p,r.setValue(r.__color.toOriginal())):this.value=r.__color.toString()}function h(){r.__onFinishChange&&r.__onFinishChange.call(r,r.__color.toOriginal())}a.__saturation_field.appendChild(c),a.__selector.appendChild(a.__field_knob),a.__selector.appendChild(a.__saturation_field),a.__selector.appendChild(a.__hue_field),a.__hue_field.appendChild(a.__hue_knob),a.domElement.appendChild(a.__input),a.domElement.appendChild(a.__selector),a.updateDisplay();function E(p){p.type.indexOf("touch")===-1&&p.preventDefault();var v=r.__saturation_field.getBoundingClientRect(),y=p.touches&&p.touches[0]||p,M=y.clientX,T=y.clientY,b=(M-v.left)/(v.right-v.left),x=1-(T-v.top)/(v.bottom-v.top);return x>1?x=1:x<0&&(x=0),b>1?b=1:b<0&&(b=0),r.__color.v=x,r.__color.s=b,r.setValue(r.__color.toOriginal()),!1}function w(p){p.type.indexOf("touch")===-1&&p.preventDefault();var v=r.__hue_field.getBoundingClientRect(),y=p.touches&&p.touches[0]||p,M=y.clientY,T=1-(M-v.top)/(v.bottom-v.top);return T>1?T=1:T<0&&(T=0),r.__color.h=T*360,r.setValue(r.__color.toOriginal()),!1}return a}return I(e,[{key:"updateDisplay",value:function(){var t=ge(this.getValue());if(t!==!1){var a=!1;m.each(A.COMPONENTS,function(f){if(!m.isUndefined(t[f])&&!m.isUndefined(this.__color.__state[f])&&t[f]!==this.__color.__state[f])return a=!0,{}},this),a&&m.extend(this.__color.__state,t)}m.extend(this.__temp.__state,this.__color.__state),this.__temp.a=1;var r=this.__color.v<.5||this.__color.s>.5?255:0,c=255-r;m.extend(this.__field_knob.style,{marginLeft:100*this.__color.s-7+"px",marginTop:100*(1-this.__color.v)-7+"px",backgroundColor:this.__temp.toHexString(),border:this.__field_knob_border+"rgb("+r+","+r+","+r+")"}),this.__hue_knob.style.marginTop=(1-this.__color.h/360)*100+"px",this.__temp.s=1,this.__temp.v=1,ke(this.__saturation_field,"left","#fff",this.__temp.toHexString()),this.__input.value=this.__color.toString(),m.extend(this.__input.style,{backgroundColor:this.__color.toHexString(),color:"rgb("+r+","+r+","+r+")",textShadow:this.__input_textShadow+"rgba("+c+","+c+","+c+",.7)"})}}]),e})(W),ft=["-moz-","-o-","-webkit-","-ms-",""];function ke(i,e,n,t){i.style.background="",m.each(ft,function(a){i.style.cssText+="background: "+a+"linear-gradient("+e+", "+n+" 0%, "+t+" 100%); "})}function gt(i){i.style.background="",i.style.cssText+="background: -moz-linear-gradient(top,  #ff0000 0%, #ff00ff 17%, #0000ff 34%, #00ffff 50%, #00ff00 67%, #ffff00 84%, #ff0000 100%);",i.style.cssText+="background: -webkit-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);",i.style.cssText+="background: -o-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);",i.style.cssText+="background: -ms-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);",i.style.cssText+="background: linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);"}var pt={load:function(e,n){var t=n||document,a=t.createElement("link");a.type="text/css",a.rel="stylesheet",a.href=e,t.getElementsByTagName("head")[0].appendChild(a)},inject:function(e,n){var t=n||document,a=document.createElement("style");a.type="text/css",a.innerHTML=e;var r=t.getElementsByTagName("head")[0];try{r.appendChild(a)}catch{}}},Ct=`<div id="dg-save" class="dg dialogue">

  Here's the new load parameter for your <code>GUI</code>'s constructor:

  <textarea id="dg-new-constructor"></textarea>

  <div id="dg-save-locally">

    <input id="dg-local-storage" type="checkbox"/> Automatically save
    values to <code>localStorage</code> on exit.

    <div id="dg-local-explain">The values saved to <code>localStorage</code> will
      override those passed to <code>dat.GUI</code>'s constructor. This makes it
      easier to work incrementally, but <code>localStorage</code> is fragile,
      and your friends may not see the same values you do.

    </div>

  </div>

</div>`,_t=function(e,n){var t=e[n];return m.isArray(arguments[2])||m.isObject(arguments[2])?new mt(e,n,arguments[2]):m.isNumber(t)?m.isNumber(arguments[2])&&m.isNumber(arguments[3])?m.isNumber(arguments[4])?new pe(e,n,arguments[2],arguments[3],arguments[4]):new pe(e,n,arguments[2],arguments[3]):m.isNumber(arguments[4])?new me(e,n,{min:arguments[2],max:arguments[3],step:arguments[4]}):new me(e,n,{min:arguments[2],max:arguments[3]}):m.isString(t)?new ct(e,n):m.isFunction(t)?new Ye(e,n,""):m.isBoolean(t)?new Ve(e,n):null};function wt(i){setTimeout(i,1e3/60)}var yt=window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||window.oRequestAnimationFrame||window.msRequestAnimationFrame||wt,vt=(function(){function i(){L(this,i),this.backgroundElement=document.createElement("div"),m.extend(this.backgroundElement.style,{backgroundColor:"rgba(0,0,0,0.8)",top:0,left:0,display:"none",zIndex:"1000",opacity:0,WebkitTransition:"opacity 0.2s linear",transition:"opacity 0.2s linear"}),l.makeFullscreen(this.backgroundElement),this.backgroundElement.style.position="fixed",this.domElement=document.createElement("div"),m.extend(this.domElement.style,{position:"fixed",display:"none",zIndex:"1001",opacity:0,WebkitTransition:"-webkit-transform 0.2s ease-out, opacity 0.2s linear",transition:"transform 0.2s ease-out, opacity 0.2s linear"}),document.body.appendChild(this.backgroundElement),document.body.appendChild(this.domElement);var e=this;l.bind(this.backgroundElement,"click",function(){e.hide()})}return I(i,[{key:"show",value:function(){var n=this;this.backgroundElement.style.display="block",this.domElement.style.display="block",this.domElement.style.opacity=0,this.domElement.style.webkitTransform="scale(1.1)",this.layout(),m.defer(function(){n.backgroundElement.style.opacity=1,n.domElement.style.opacity=1,n.domElement.style.webkitTransform="scale(1)"})}},{key:"hide",value:function(){var n=this,t=function a(){n.domElement.style.display="none",n.backgroundElement.style.display="none",l.unbind(n.domElement,"webkitTransitionEnd",a),l.unbind(n.domElement,"transitionend",a),l.unbind(n.domElement,"oTransitionEnd",a)};l.bind(this.domElement,"webkitTransitionEnd",t),l.bind(this.domElement,"transitionend",t),l.bind(this.domElement,"oTransitionEnd",t),this.backgroundElement.style.opacity=0,this.domElement.style.opacity=0,this.domElement.style.webkitTransform="scale(1.1)"}},{key:"layout",value:function(){this.domElement.style.left=window.innerWidth/2-l.getWidth(this.domElement)/2+"px",this.domElement.style.top=window.innerHeight/2-l.getHeight(this.domElement)/2+"px"}}]),i})(),bt=rt(`.dg ul{list-style:none;margin:0;padding:0;width:100%;clear:both}.dg.ac{position:fixed;top:0;left:0;right:0;height:0;z-index:0}.dg:not(.ac) .main{overflow:hidden}.dg.main{-webkit-transition:opacity .1s linear;-o-transition:opacity .1s linear;-moz-transition:opacity .1s linear;transition:opacity .1s linear}.dg.main.taller-than-window{overflow-y:auto}.dg.main.taller-than-window .close-button{opacity:1;margin-top:-1px;border-top:1px solid #2c2c2c}.dg.main ul.closed .close-button{opacity:1 !important}.dg.main:hover .close-button,.dg.main .close-button.drag{opacity:1}.dg.main .close-button{-webkit-transition:opacity .1s linear;-o-transition:opacity .1s linear;-moz-transition:opacity .1s linear;transition:opacity .1s linear;border:0;line-height:19px;height:20px;cursor:pointer;text-align:center;background-color:#000}.dg.main .close-button.close-top{position:relative}.dg.main .close-button.close-bottom{position:absolute}.dg.main .close-button:hover{background-color:#111}.dg.a{float:right;margin-right:15px;overflow-y:visible}.dg.a.has-save>ul.close-top{margin-top:0}.dg.a.has-save>ul.close-bottom{margin-top:27px}.dg.a.has-save>ul.closed{margin-top:0}.dg.a .save-row{top:0;z-index:1002}.dg.a .save-row.close-top{position:relative}.dg.a .save-row.close-bottom{position:fixed}.dg li{-webkit-transition:height .1s ease-out;-o-transition:height .1s ease-out;-moz-transition:height .1s ease-out;transition:height .1s ease-out;-webkit-transition:overflow .1s linear;-o-transition:overflow .1s linear;-moz-transition:overflow .1s linear;transition:overflow .1s linear}.dg li:not(.folder){cursor:auto;height:27px;line-height:27px;padding:0 4px 0 5px}.dg li.folder{padding:0;border-left:4px solid rgba(0,0,0,0)}.dg li.title{cursor:pointer;margin-left:-4px}.dg .closed li:not(.title),.dg .closed ul li,.dg .closed ul li>*{height:0;overflow:hidden;border:0}.dg .cr{clear:both;padding-left:3px;height:27px;overflow:hidden}.dg .property-name{cursor:default;float:left;clear:left;width:40%;overflow:hidden;text-overflow:ellipsis}.dg .cr.function .property-name{width:100%}.dg .c{float:left;width:60%;position:relative}.dg .c input[type=text]{border:0;margin-top:4px;padding:3px;width:100%;float:right}.dg .has-slider input[type=text]{width:30%;margin-left:0}.dg .slider{float:left;width:66%;margin-left:-5px;margin-right:0;height:19px;margin-top:4px}.dg .slider-fg{height:100%}.dg .c input[type=checkbox]{margin-top:7px}.dg .c select{margin-top:5px}.dg .cr.function,.dg .cr.function .property-name,.dg .cr.function *,.dg .cr.boolean,.dg .cr.boolean *{cursor:pointer}.dg .cr.color{overflow:visible}.dg .selector{display:none;position:absolute;margin-left:-9px;margin-top:23px;z-index:10}.dg .c:hover .selector,.dg .selector.drag{display:block}.dg li.save-row{padding:0}.dg li.save-row .button{display:inline-block;padding:0px 6px}.dg.dialogue{background-color:#222;width:460px;padding:15px;font-size:13px;line-height:15px}#dg-new-constructor{padding:10px;color:#222;font-family:Monaco, monospace;font-size:10px;border:0;resize:none;box-shadow:inset 1px 1px 1px #888;word-wrap:break-word;margin:12px 0;display:block;width:440px;overflow-y:scroll;height:100px;position:relative}#dg-local-explain{display:none;font-size:11px;line-height:17px;border-radius:3px;background-color:#333;padding:8px;margin-top:10px}#dg-local-explain code{font-size:10px}#dat-gui-save-locally{display:none}.dg{color:#eee;font:11px 'Lucida Grande', sans-serif;text-shadow:0 -1px 0 #111}.dg.main::-webkit-scrollbar{width:5px;background:#1a1a1a}.dg.main::-webkit-scrollbar-corner{height:0;display:none}.dg.main::-webkit-scrollbar-thumb{border-radius:5px;background:#676767}.dg li:not(.folder){background:#1a1a1a;border-bottom:1px solid #2c2c2c}.dg li.save-row{line-height:25px;background:#dad5cb;border:0}.dg li.save-row select{margin-left:5px;width:108px}.dg li.save-row .button{margin-left:5px;margin-top:1px;border-radius:2px;font-size:9px;line-height:7px;padding:4px 4px 5px 4px;background:#c5bdad;color:#fff;text-shadow:0 1px 0 #b0a58f;box-shadow:0 -1px 0 #b0a58f;cursor:pointer}.dg li.save-row .button.gears{background:#c5bdad url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAANCAYAAAB/9ZQ7AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAQJJREFUeNpiYKAU/P//PwGIC/ApCABiBSAW+I8AClAcgKxQ4T9hoMAEUrxx2QSGN6+egDX+/vWT4e7N82AMYoPAx/evwWoYoSYbACX2s7KxCxzcsezDh3evFoDEBYTEEqycggWAzA9AuUSQQgeYPa9fPv6/YWm/Acx5IPb7ty/fw+QZblw67vDs8R0YHyQhgObx+yAJkBqmG5dPPDh1aPOGR/eugW0G4vlIoTIfyFcA+QekhhHJhPdQxbiAIguMBTQZrPD7108M6roWYDFQiIAAv6Aow/1bFwXgis+f2LUAynwoIaNcz8XNx3Dl7MEJUDGQpx9gtQ8YCueB+D26OECAAQDadt7e46D42QAAAABJRU5ErkJggg==) 2px 1px no-repeat;height:7px;width:8px}.dg li.save-row .button:hover{background-color:#bab19e;box-shadow:0 -1px 0 #b0a58f}.dg li.folder{border-bottom:0}.dg li.title{padding-left:16px;background:#000 url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlI+hKgFxoCgAOw==) 6px 10px no-repeat;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.2)}.dg .closed li.title{background-image:url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlGIWqMCbWAEAOw==)}.dg .cr.boolean{border-left:3px solid #806787}.dg .cr.color{border-left:3px solid}.dg .cr.function{border-left:3px solid #e61d5f}.dg .cr.number{border-left:3px solid #2FA1D6}.dg .cr.number input[type=text]{color:#2FA1D6}.dg .cr.string{border-left:3px solid #1ed36f}.dg .cr.string input[type=text]{color:#1ed36f}.dg .cr.function:hover,.dg .cr.boolean:hover{background:#111}.dg .c input[type=text]{background:#303030;outline:none}.dg .c input[type=text]:hover{background:#3c3c3c}.dg .c input[type=text]:focus{background:#494949;color:#fff}.dg .c .slider{background:#303030;cursor:ew-resize}.dg .c .slider-fg{background:#2FA1D6;max-width:100%}.dg .c .slider:hover{background:#3c3c3c}.dg .c .slider:hover .slider-fg{background:#44abda}
`);pt.inject(bt);var Me="dg",Fe=72,ze=20,ie="Default",J=(function(){try{return!!window.localStorage}catch{return!1}})(),ee=void 0,He=!0,Y=void 0,fe=!1,$e=[],_=function i(e){var n=this,t=e||{};this.domElement=document.createElement("div"),this.__ul=document.createElement("ul"),this.domElement.appendChild(this.__ul),l.addClass(this.domElement,Me),this.__folders={},this.__controllers=[],this.__rememberedObjects=[],this.__rememberedObjectIndecesToControllers=[],this.__listening=[],t=m.defaults(t,{closeOnTop:!1,autoPlace:!0,width:i.DEFAULT_WIDTH}),t=m.defaults(t,{resizable:t.autoPlace,hideable:t.autoPlace}),m.isUndefined(t.load)?t.load={preset:ie}:t.preset&&(t.load.preset=t.preset),m.isUndefined(t.parent)&&t.hideable&&$e.push(this),t.resizable=m.isUndefined(t.parent)&&t.resizable,t.autoPlace&&m.isUndefined(t.scrollable)&&(t.scrollable=!0);var a=J&&localStorage.getItem($(this,"isLocal"))==="true",r=void 0,c=void 0;if(Object.defineProperties(this,{parent:{get:function(){return t.parent}},scrollable:{get:function(){return t.scrollable}},autoPlace:{get:function(){return t.autoPlace}},closeOnTop:{get:function(){return t.closeOnTop}},preset:{get:function(){return n.parent?n.getRoot().preset:t.load.preset},set:function(h){n.parent?n.getRoot().preset=h:t.load.preset=h,At(this),n.revert()}},width:{get:function(){return t.width},set:function(h){t.width=h,ye(n,h)}},name:{get:function(){return t.name},set:function(h){t.name=h,c&&(c.innerHTML=t.name)}},closed:{get:function(){return t.closed},set:function(h){t.closed=h,t.closed?l.addClass(n.__ul,i.CLASS_CLOSED):l.removeClass(n.__ul,i.CLASS_CLOSED),this.onResize(),n.__closeButton&&(n.__closeButton.innerHTML=h?i.TEXT_OPEN:i.TEXT_CLOSED)}},load:{get:function(){return t.load}},useLocalStorage:{get:function(){return a},set:function(h){J&&(a=h,h?l.bind(window,"unload",r):l.unbind(window,"unload",r),localStorage.setItem($(n,"isLocal"),h))}}}),m.isUndefined(t.parent)){if(this.closed=t.closed||!1,l.addClass(this.domElement,i.CLASS_MAIN),l.makeSelectable(this.domElement,!1),J&&a){n.useLocalStorage=!0;var f=localStorage.getItem($(this,"gui"));f&&(t.load=JSON.parse(f))}this.__closeButton=document.createElement("div"),this.__closeButton.innerHTML=i.TEXT_CLOSED,l.addClass(this.__closeButton,i.CLASS_CLOSE_BUTTON),t.closeOnTop?(l.addClass(this.__closeButton,i.CLASS_CLOSE_TOP),this.domElement.insertBefore(this.__closeButton,this.domElement.childNodes[0])):(l.addClass(this.__closeButton,i.CLASS_CLOSE_BOTTOM),this.domElement.appendChild(this.__closeButton)),l.bind(this.__closeButton,"click",function(){n.closed=!n.closed})}else{t.closed===void 0&&(t.closed=!0);var g=document.createTextNode(t.name);l.addClass(g,"controller-name"),c=xe(n,g);var u=function(h){return h.preventDefault(),n.closed=!n.closed,!1};l.addClass(this.__ul,i.CLASS_CLOSED),l.addClass(c,"title"),l.bind(c,"click",u),t.closed||(this.closed=!1)}t.autoPlace&&(m.isUndefined(t.parent)&&(He&&(Y=document.createElement("div"),l.addClass(Y,Me),l.addClass(Y,i.CLASS_AUTO_PLACE_CONTAINER),document.body.appendChild(Y),He=!1),Y.appendChild(this.domElement),l.addClass(this.domElement,i.CLASS_AUTO_PLACE)),this.parent||ye(n,t.width)),this.__resizeHandler=function(){n.onResizeDebounced()},l.bind(window,"resize",this.__resizeHandler),l.bind(this.__ul,"webkitTransitionEnd",this.__resizeHandler),l.bind(this.__ul,"transitionend",this.__resizeHandler),l.bind(this.__ul,"oTransitionEnd",this.__resizeHandler),this.onResize(),t.resizable&&Et(this),r=function(){J&&localStorage.getItem($(n,"isLocal"))==="true"&&localStorage.setItem($(n,"gui"),JSON.stringify(n.getSaveObject()))},this.saveToLocalStorageIfPossible=r;function C(){var d=n.getRoot();d.width+=1,m.defer(function(){d.width-=1})}t.parent||C()};_.toggleHide=function(){fe=!fe,m.each($e,function(i){i.domElement.style.display=fe?"none":""})};_.CLASS_AUTO_PLACE="a";_.CLASS_AUTO_PLACE_CONTAINER="ac";_.CLASS_MAIN="main";_.CLASS_CONTROLLER_ROW="cr";_.CLASS_TOO_TALL="taller-than-window";_.CLASS_CLOSED="closed";_.CLASS_CLOSE_BUTTON="close-button";_.CLASS_CLOSE_TOP="close-top";_.CLASS_CLOSE_BOTTOM="close-bottom";_.CLASS_DRAG="drag";_.DEFAULT_WIDTH=245;_.TEXT_CLOSED="Close Controls";_.TEXT_OPEN="Open Controls";_._keydownHandler=function(i){document.activeElement.type!=="text"&&(i.which===Fe||i.keyCode===Fe)&&_.toggleHide()};l.bind(window,"keydown",_._keydownHandler,!1);m.extend(_.prototype,{add:function(e,n){return ne(this,e,n,{factoryArgs:Array.prototype.slice.call(arguments,2)})},addColor:function(e,n){return ne(this,e,n,{color:!0})},remove:function(e){this.__ul.removeChild(e.__li),this.__controllers.splice(this.__controllers.indexOf(e),1);var n=this;m.defer(function(){n.onResize()})},destroy:function(){if(this.parent)throw new Error("Only the root GUI should be removed with .destroy(). For subfolders, use gui.removeFolder(folder) instead.");this.autoPlace&&Y.removeChild(this.domElement);var e=this;m.each(this.__folders,function(n){e.removeFolder(n)}),l.unbind(window,"keydown",_._keydownHandler,!1),Ge(this)},addFolder:function(e){if(this.__folders[e]!==void 0)throw new Error('You already have a folder in this GUI by the name "'+e+'"');var n={name:e,parent:this};n.autoPlace=this.autoPlace,this.load&&this.load.folders&&this.load.folders[e]&&(n.closed=this.load.folders[e].closed,n.load=this.load.folders[e]);var t=new _(n);this.__folders[e]=t;var a=xe(this,t.domElement);return l.addClass(a,"folder"),t},removeFolder:function(e){this.__ul.removeChild(e.domElement.parentElement),delete this.__folders[e.name],this.load&&this.load.folders&&this.load.folders[e.name]&&delete this.load.folders[e.name],Ge(e);var n=this;m.each(e.__folders,function(t){e.removeFolder(t)}),m.defer(function(){n.onResize()})},open:function(){this.closed=!1},close:function(){this.closed=!0},hide:function(){this.domElement.style.display="none"},show:function(){this.domElement.style.display=""},onResize:function(){var e=this.getRoot();if(e.scrollable){var n=l.getOffset(e.__ul).top,t=0;m.each(e.__ul.childNodes,function(a){e.autoPlace&&a===e.__save_row||(t+=l.getHeight(a))}),window.innerHeight-n-ze<t?(l.addClass(e.domElement,_.CLASS_TOO_TALL),e.__ul.style.height=window.innerHeight-n-ze+"px"):(l.removeClass(e.domElement,_.CLASS_TOO_TALL),e.__ul.style.height="auto")}e.__resize_handle&&m.defer(function(){e.__resize_handle.style.height=e.__ul.offsetHeight+"px"}),e.__closeButton&&(e.__closeButton.style.width=e.width+"px")},onResizeDebounced:m.debounce(function(){this.onResize()},50),remember:function(){if(m.isUndefined(ee)&&(ee=new vt,ee.domElement.innerHTML=Ct),this.parent)throw new Error("You can only call remember on a top level GUI.");var e=this;m.each(Array.prototype.slice.call(arguments),function(n){e.__rememberedObjects.length===0&&Rt(e),e.__rememberedObjects.indexOf(n)===-1&&e.__rememberedObjects.push(n)}),this.autoPlace&&ye(this,this.width)},getRoot:function(){for(var e=this;e.parent;)e=e.parent;return e},getSaveObject:function(){var e=this.load;return e.closed=this.closed,this.__rememberedObjects.length>0&&(e.preset=this.preset,e.remembered||(e.remembered={}),e.remembered[this.preset]=de(this)),e.folders={},m.each(this.__folders,function(n,t){e.folders[t]=n.getSaveObject()}),e},save:function(){this.load.remembered||(this.load.remembered={}),this.load.remembered[this.preset]=de(this),_e(this,!1),this.saveToLocalStorageIfPossible()},saveAs:function(e){this.load.remembered||(this.load.remembered={},this.load.remembered[ie]=de(this,!0)),this.load.remembered[e]=de(this),this.preset=e,we(this,e,!0),this.saveToLocalStorageIfPossible()},revert:function(e){m.each(this.__controllers,function(n){this.getRoot().load.remembered?Ke(e||this.getRoot(),n):n.setValue(n.initialValue),n.__onFinishChange&&n.__onFinishChange.call(n,n.getValue())},this),m.each(this.__folders,function(n){n.revert(n)}),e||_e(this.getRoot(),!1)},listen:function(e){var n=this.__listening.length===0;this.__listening.push(e),n&&Xe(this.__listening)},updateDisplay:function(){m.each(this.__controllers,function(e){e.updateDisplay()}),m.each(this.__folders,function(e){e.updateDisplay()})}});function xe(i,e,n){var t=document.createElement("li");return e&&t.appendChild(e),n?i.__ul.insertBefore(t,n):i.__ul.appendChild(t),i.onResize(),t}function Ge(i){l.unbind(window,"resize",i.__resizeHandler),i.saveToLocalStorageIfPossible&&l.unbind(window,"unload",i.saveToLocalStorageIfPossible)}function _e(i,e){var n=i.__preset_select[i.__preset_select.selectedIndex];e?n.innerHTML=n.value+"*":n.innerHTML=n.value}function xt(i,e,n){if(n.__li=e,n.__gui=i,m.extend(n,{options:function(c){if(arguments.length>1){var f=n.__li.nextElementSibling;return n.remove(),ne(i,n.object,n.property,{before:f,factoryArgs:[m.toArray(arguments)]})}if(m.isArray(c)||m.isObject(c)){var g=n.__li.nextElementSibling;return n.remove(),ne(i,n.object,n.property,{before:g,factoryArgs:[c]})}},name:function(c){return n.__li.firstElementChild.firstElementChild.innerHTML=c,n},listen:function(){return n.__gui.listen(n),n},remove:function(){return n.__gui.remove(n),n}}),n instanceof pe){var t=new me(n.object,n.property,{min:n.__min,max:n.__max,step:n.__step});m.each(["updateDisplay","onChange","onFinishChange","step","min","max"],function(r){var c=n[r],f=t[r];n[r]=t[r]=function(){var g=Array.prototype.slice.call(arguments);return f.apply(t,g),c.apply(n,g)}}),l.addClass(e,"has-slider"),n.domElement.insertBefore(t.domElement,n.domElement.firstElementChild)}else if(n instanceof me){var a=function(c){if(m.isNumber(n.__min)&&m.isNumber(n.__max)){var f=n.__li.firstElementChild.firstElementChild.innerHTML,g=n.__gui.__listening.indexOf(n)>-1;n.remove();var u=ne(i,n.object,n.property,{before:n.__li.nextElementSibling,factoryArgs:[n.__min,n.__max,n.__step]});return u.name(f),g&&u.listen(),u}return c};n.min=m.compose(a,n.min),n.max=m.compose(a,n.max)}else n instanceof Ve?(l.bind(e,"click",function(){l.fakeEvent(n.__checkbox,"click")}),l.bind(n.__checkbox,"click",function(r){r.stopPropagation()})):n instanceof Ye?(l.bind(e,"click",function(){l.fakeEvent(n.__button,"click")}),l.bind(e,"mouseover",function(){l.addClass(n.__button,"hover")}),l.bind(e,"mouseout",function(){l.removeClass(n.__button,"hover")})):n instanceof Ce&&(l.addClass(e,"color"),n.updateDisplay=m.compose(function(r){return e.style.borderLeftColor=n.__color.toString(),r},n.updateDisplay),n.updateDisplay());n.setValue=m.compose(function(r){return i.getRoot().__preset_select&&n.isModified()&&_e(i.getRoot(),!0),r},n.setValue)}function Ke(i,e){var n=i.getRoot(),t=n.__rememberedObjects.indexOf(e.object);if(t!==-1){var a=n.__rememberedObjectIndecesToControllers[t];if(a===void 0&&(a={},n.__rememberedObjectIndecesToControllers[t]=a),a[e.property]=e,n.load&&n.load.remembered){var r=n.load.remembered,c=void 0;if(r[i.preset])c=r[i.preset];else if(r[ie])c=r[ie];else return;if(c[t]&&c[t][e.property]!==void 0){var f=c[t][e.property];e.initialValue=f,e.setValue(f)}}}}function ne(i,e,n,t){if(e[n]===void 0)throw new Error('Object "'+e+'" has no property "'+n+'"');var a=void 0;if(t.color)a=new Ce(e,n);else{var r=[e,n].concat(t.factoryArgs);a=_t.apply(i,r)}t.before instanceof W&&(t.before=t.before.__li),Ke(i,a),l.addClass(a.domElement,"c");var c=document.createElement("span");l.addClass(c,"property-name"),c.innerHTML=a.property;var f=document.createElement("div");f.appendChild(c),f.appendChild(a.domElement);var g=xe(i,f,t.before);return l.addClass(g,_.CLASS_CONTROLLER_ROW),a instanceof Ce?l.addClass(g,"color"):l.addClass(g,lt(a.getValue())),xt(i,g,a),i.__controllers.push(a),a}function $(i,e){return document.location.href+"."+e}function we(i,e,n){var t=document.createElement("option");t.innerHTML=e,t.value=e,i.__preset_select.appendChild(t),n&&(i.__preset_select.selectedIndex=i.__preset_select.length-1)}function Ne(i,e){e.style.display=i.useLocalStorage?"block":"none"}function Rt(i){var e=i.__save_row=document.createElement("li");l.addClass(i.domElement,"has-save"),i.__ul.insertBefore(e,i.__ul.firstChild),l.addClass(e,"save-row");var n=document.createElement("span");n.innerHTML="&nbsp;",l.addClass(n,"button gears");var t=document.createElement("span");t.innerHTML="Save",l.addClass(t,"button"),l.addClass(t,"save");var a=document.createElement("span");a.innerHTML="New",l.addClass(a,"button"),l.addClass(a,"save-as");var r=document.createElement("span");r.innerHTML="Revert",l.addClass(r,"button"),l.addClass(r,"revert");var c=i.__preset_select=document.createElement("select");if(i.load&&i.load.remembered?m.each(i.load.remembered,function(d,h){we(i,h,h===i.preset)}):we(i,ie,!1),l.bind(c,"change",function(){for(var d=0;d<i.__preset_select.length;d++)i.__preset_select[d].innerHTML=i.__preset_select[d].value;i.preset=this.value}),e.appendChild(c),e.appendChild(n),e.appendChild(t),e.appendChild(a),e.appendChild(r),J){var f=document.getElementById("dg-local-explain"),g=document.getElementById("dg-local-storage"),u=document.getElementById("dg-save-locally");u.style.display="block",localStorage.getItem($(i,"isLocal"))==="true"&&g.setAttribute("checked","checked"),Ne(i,f),l.bind(g,"change",function(){i.useLocalStorage=!i.useLocalStorage,Ne(i,f)})}var C=document.getElementById("dg-new-constructor");l.bind(C,"keydown",function(d){d.metaKey&&(d.which===67||d.keyCode===67)&&ee.hide()}),l.bind(n,"click",function(){C.innerHTML=JSON.stringify(i.getSaveObject(),void 0,2),ee.show(),C.focus(),C.select()}),l.bind(t,"click",function(){i.save()}),l.bind(a,"click",function(){var d=prompt("Enter a new preset name.");d&&i.saveAs(d)}),l.bind(r,"click",function(){i.revert()})}function Et(i){var e=void 0;i.__resize_handle=document.createElement("div"),m.extend(i.__resize_handle.style,{width:"6px",marginLeft:"-3px",height:"200px",cursor:"ew-resize",position:"absolute"});function n(r){return r.preventDefault(),i.width+=e-r.clientX,i.onResize(),e=r.clientX,!1}function t(){l.removeClass(i.__closeButton,_.CLASS_DRAG),l.unbind(window,"mousemove",n),l.unbind(window,"mouseup",t)}function a(r){return r.preventDefault(),e=r.clientX,l.addClass(i.__closeButton,_.CLASS_DRAG),l.bind(window,"mousemove",n),l.bind(window,"mouseup",t),!1}l.bind(i.__resize_handle,"mousedown",a),l.bind(i.__closeButton,"mousedown",a),i.domElement.insertBefore(i.__resize_handle,i.domElement.firstElementChild)}function ye(i,e){i.domElement.style.width=e+"px",i.__save_row&&i.autoPlace&&(i.__save_row.style.width=e+"px"),i.__closeButton&&(i.__closeButton.style.width=e+"px")}function de(i,e){var n={};return m.each(i.__rememberedObjects,function(t,a){var r={},c=i.__rememberedObjectIndecesToControllers[a];m.each(c,function(f,g){r[g]=e?f.initialValue:f.getValue()}),n[a]=r}),n}function At(i){for(var e=0;e<i.__preset_select.length;e++)i.__preset_select[e].value===i.preset&&(i.__preset_select.selectedIndex=e)}function Xe(i){i.length!==0&&yt.call(window,function(){Xe(i)}),m.each(i,function(e){e.updateDisplay()})}var te=_;te.TEXT_CLOSED="收起控件";te.TEXT_OPEN="展开控件";class Pt extends te{constructor(e={}){const n={autoPlace:!1,width:275,...e};super(n),this.setLocale(),this.injectCustomStyles(),this.enableTooltips()}injectCustomStyles(){if(document.getElementById("my-dat-gui-custom-style"))return;const e=document.createElement("style");e.id="my-dat-gui-custom-style",e.textContent=`
      /* 优化 dat.GUI 标签与复选框间距 */
      .dg .cr .property-name {
        width: 60% !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      .dg .cr.boolean .property-name {
        width: 65% !important;
      }
      .dg .cr.boolean .c {
        width: 35% !important;
      }
      .dg .cr.number .property-name,
      .dg .cr.string .property-name,
      .dg .cr.color .property-name {
        width: 50% !important;
      }
      .dg .cr.number .c,
      .dg .cr.string .c,
      .dg .cr.color .c {
        width: 50% !important;
      }
    `,document.head.appendChild(e)}enableTooltips(){if(!this.domElement)return;const e=()=>{this.domElement.querySelectorAll(".property-name").forEach(t=>{const a=t.textContent.trim();a&&t.getAttribute("title")!==a&&t.setAttribute("title",a)})};e(),window.MutationObserver&&(this._observer=new MutationObserver(()=>e()),this._observer.observe(this.domElement,{childList:!0,subtree:!0}))}setLocale(){const e=this.domElement.querySelector(".close-button");e&&(e.textContent=this.closed?te.TEXT_OPEN:te.TEXT_CLOSED)}modifyPosition(e,n={}){e&&!(e instanceof HTMLElement)&&(n=e,e=document.body),(e||document.body).appendChild(this.domElement);const a={position:"absolute",top:"10px",right:"10px",zIndex:"5"};Object.assign(this.domElement.style,a,n)}destroy(){this._observer&&(this._observer.disconnect(),this._observer=null),this.domElement&&this.domElement.parentNode&&this.domElement.parentNode.removeChild(this.domElement),super.destroy()}}const Dt={class:"box",ref:"viewerRef"},Tt=ot({name:"GeometriesDraw"}),Lt=Object.assign(Tt,{setup(i){const e=jn([{fileName:"@/views/geometries/geometriesDraw/index.vue",rawCode:at,language:"html"}]),n=Qn("viewerRef");let t=null,a=null,r=null,c=null;qn(()=>{a=setTimeout(()=>{f()},0)});function f(){t=Un(n.value),Vn(t,{msaaSamples:4,enableFxaa:!0});const u=t.entities.add({name:"蓝色盒子",position:o.Cartesian3.fromDegrees(-114,40,3e5),box:{dimensions:new o.Cartesian3(4e5,3e5,5e5),material:o.Color.BLUE}}),C=t.entities.add({name:"黑边红色半透明盒子",show:!1,position:o.Cartesian3.fromDegrees(-107,40,3e5),box:{dimensions:new o.Cartesian3(4e5,3e5,5e5),material:o.Color.RED.withAlpha(.5),outline:!0,outlineColor:o.Color.BLACK}}),d=t.entities.add({name:"黄色线框盒子",show:!1,position:o.Cartesian3.fromDegrees(-100,40,3e5),box:{dimensions:new o.Cartesian3(4e5,3e5,5e5),fill:!1,outline:!0,outlineColor:o.Color.YELLOW}}),h=t.entities.add({name:"带外边框的高空绿色圆",show:!1,position:o.Cartesian3.fromDegrees(-111,40,15e4),ellipse:{semiMinorAxis:3e5,semiMajorAxis:3e5,height:2e5,material:o.Color.GREEN,outline:!0}}),E=t.entities.add({name:"地表红色半透明椭圆",show:!1,position:o.Cartesian3.fromDegrees(-103,40),ellipse:{semiMinorAxis:25e4,semiMajorAxis:4e5,material:o.Color.RED.withAlpha(.5)}}),w=t.entities.add({name:"蓝色半透明旋转拉伸柱体椭圆",show:!1,position:o.Cartesian3.fromDegrees(-95,40,1e5),ellipse:{semiMinorAxis:15e4,semiMajorAxis:3e5,extrudedHeight:2e5,rotation:o.Math.toRadians(45),material:o.Color.BLUE.withAlpha(.5),outline:!0}}),p=t.entities.add({name:"地表圆角红色半透明走廊",show:!1,corridor:{positions:o.Cartesian3.fromDegreesArray([-100,40,-105,40,-105,35]),width:2e5,material:o.Color.RED.withAlpha(.5)}}),v=t.entities.add({name:"高空尖角带边框绿色走廊",show:!1,corridor:{positions:o.Cartesian3.fromDegreesArray([-90,40,-95,40,-95,35]),height:1e5,width:2e5,cornerType:o.CornerType.MITERED,material:o.Color.GREEN,outline:!0}}),y=t.entities.add({name:"白边斜角蓝色立体走廊",show:!1,corridor:{positions:o.Cartesian3.fromDegreesArray([-80,40,-85,40,-85,35]),height:2e5,extrudedHeight:1e5,width:2e5,cornerType:o.CornerType.BEVELED,material:o.Color.BLUE.withAlpha(.5),outline:!0,outlineColor:o.Color.WHITE}}),M=t.entities.add({name:"黑边绿色半透明圆柱体",show:!1,position:o.Cartesian3.fromDegrees(-100,40,2e5),cylinder:{length:4e5,topRadius:2e5,bottomRadius:2e5,material:o.Color.GREEN.withAlpha(.5),outline:!0,outlineColor:o.Color.BLACK}}),T=t.entities.add({name:"红色圆锥体",show:!1,position:o.Cartesian3.fromDegrees(-105,40,2e5),cylinder:{length:4e5,topRadius:0,bottomRadius:2e5,material:o.Color.RED}}),b=o.Cartesian3.fromDegrees(-95,45,3e5),x=t.entities.add({name:"土星本体",show:!1,position:b,ellipsoid:{radii:new o.Cartesian3(2e5,2e5,2e5),material:new o.Color(.95,.82,.49)}}),X=t.entities.add({name:"土星内环",show:!1,position:b,orientation:o.Transforms.headingPitchRollQuaternion(b,new o.HeadingPitchRoll(o.Math.toRadians(30),o.Math.toRadians(30),0)),ellipsoid:{radii:new o.Cartesian3(4e5,4e5,4e5),innerRadii:new o.Cartesian3(3e5,3e5,3e5),minimumCone:o.Math.toRadians(89.8),maximumCone:o.Math.toRadians(90.2),material:new o.Color(.95,.82,.49,.5)}}),j=t.entities.add({name:"土星外环",show:!1,position:b,orientation:o.Transforms.headingPitchRollQuaternion(b,new o.HeadingPitchRoll(o.Math.toRadians(30),o.Math.toRadians(30),0)),ellipsoid:{radii:new o.Cartesian3(46e4,46e4,46e4),innerRadii:new o.Cartesian3(415e3,415e3,415e3),minimumCone:o.Math.toRadians(89.8),maximumCone:o.Math.toRadians(90.2),material:new o.Color(.95,.82,.49,.5)}}),O=t.entities.add({name:"圆顶球壳",show:!1,position:o.Cartesian3.fromDegrees(-120,40),ellipsoid:{radii:new o.Cartesian3(2e5,2e5,2e5),maximumCone:o.Math.PI_OVER_TWO,material:o.Color.BLUE.withAlpha(.3),outline:!0}}),oe=t.entities.add({name:"带内半径的圆顶",show:!1,position:o.Cartesian3.fromDegrees(-114,40),ellipsoid:{radii:new o.Cartesian3(25e4,2e5,15e4),innerRadii:new o.Cartesian3(1e5,8e4,6e4),maximumCone:o.Math.PI_OVER_TWO,material:o.Color.RED.withAlpha(.3),outline:!0}}),z=t.entities.add({name:"顶部裁剪圆顶",show:!1,position:o.Cartesian3.fromDegrees(-108,40),ellipsoid:{radii:new o.Cartesian3(2e5,2e5,2e5),innerRadii:new o.Cartesian3(1e5,1e5,1e5),minimumCone:o.Math.toRadians(20),maximumCone:o.Math.PI_OVER_TWO,material:o.Color.YELLOW.withAlpha(.3),outline:!0}}),s=t.entities.add({name:"上下裁剪球壳",show:!1,position:o.Cartesian3.fromDegrees(-102,40,14e4),ellipsoid:{radii:new o.Cartesian3(2e5,2e5,2e5),innerRadii:new o.Cartesian3(1e5,1e5,1e5),minimumCone:o.Math.toRadians(60),maximumCone:o.Math.toRadians(140),material:o.Color.DARKCYAN.withAlpha(.3),outline:!0}}),S=t.entities.add({name:"碗状结构",show:!1,position:o.Cartesian3.fromDegrees(-96,39.5,2e5),ellipsoid:{radii:new o.Cartesian3(2e5,2e5,2e5),innerRadii:new o.Cartesian3(18e4,18e4,18e4),minimumCone:o.Math.toRadians(110),material:o.Color.GREEN.withAlpha(.3),outline:!0}}),je=t.entities.add({name:"时钟角度裁剪",show:!1,position:o.Cartesian3.fromDegrees(-90,39),ellipsoid:{radii:new o.Cartesian3(2e5,2e5,2e5),innerRadii:new o.Cartesian3(15e4,15e4,15e4),minimumClock:o.Math.toRadians(-90),maximumClock:o.Math.toRadians(180),minimumCone:o.Math.toRadians(20),maximumCone:o.Math.toRadians(70),material:o.Color.BLUE.withAlpha(.3),outline:!0}}),Qe=t.entities.add({name:"局部半球圆顶",show:!1,position:o.Cartesian3.fromDegrees(-84,38.5),ellipsoid:{radii:new o.Cartesian3(2e5,2e5,2e5),minimumClock:o.Math.toRadians(-90),maximumClock:o.Math.toRadians(180),maximumCone:o.Math.toRadians(90),material:o.Color.RED.withAlpha(.3),outline:!0}}),Re=o.Cartesian3.fromDegrees(-102,35,2e4),qe=t.entities.add({name:"楔形结构",show:!1,position:Re,orientation:o.Transforms.headingPitchRollQuaternion(Re,new o.HeadingPitchRoll(o.Math.PI/1.5,0,0)),ellipsoid:{radii:new o.Cartesian3(5e5,5e5,5e5),innerRadii:new o.Cartesian3(1e4,1e4,1e4),minimumClock:o.Math.toRadians(-15),maximumClock:o.Math.toRadians(15),minimumCone:o.Math.toRadians(75),maximumCone:o.Math.toRadians(105),material:o.Color.DARKCYAN.withAlpha(.3),outline:!0}}),Ze=t.entities.add({name:"局部椭球体",show:!1,position:o.Cartesian3.fromDegrees(-95,34),ellipsoid:{radii:new o.Cartesian3(3e5,3e5,3e5),innerRadii:new o.Cartesian3(7e4,7e4,7e4),minimumClock:o.Math.toRadians(180),maximumClock:o.Math.toRadians(400),maximumCone:o.Math.toRadians(90),material:o.Color.DARKCYAN.withAlpha(.3),outline:!0}}),Je=t.entities.add({name:"蓝色平面",show:!1,position:o.Cartesian3.fromDegrees(-114,40,3e5),plane:{plane:new o.Plane(o.Cartesian3.UNIT_X,0),dimensions:new o.Cartesian2(4e5,3e5),material:o.Color.BLUE}}),en=t.entities.add({name:"黑边红色半透明平面",show:!1,position:o.Cartesian3.fromDegrees(-107,40,3e5),plane:{plane:new o.Plane(o.Cartesian3.UNIT_Y,0),dimensions:new o.Cartesian2(4e5,3e5),material:o.Color.RED.withAlpha(.5),outline:!0,outlineColor:o.Color.BLACK}}),nn=t.entities.add({name:"黄色线框平面",show:!1,position:o.Cartesian3.fromDegrees(-100,40,3e5),plane:{plane:new o.Plane(o.Cartesian3.UNIT_Z,0),dimensions:new o.Cartesian2(4e5,3e5),fill:!1,outline:!0,outlineColor:o.Color.YELLOW}}),tn=t.entities.add({name:"红色半透明矩形",show:!1,rectangle:{coordinates:o.Rectangle.fromDegrees(-110,20,-80,25),material:o.Color.RED.withAlpha(.5)}}),on=t.entities.add({name:"黑边高空旋转拉伸绿色矩形",show:!1,rectangle:{coordinates:o.Rectangle.fromDegrees(-110,30,-100,40),material:o.Color.GREEN.withAlpha(.5),rotation:o.Math.toRadians(45),extrudedHeight:3e5,height:1e5,outline:!0,outlineColor:o.Color.BLACK}});let Ee=o.Math.toRadians(30);function Ae(){return Ee+=.005,Ee}const an=t.entities.add({name:"动态旋转纹理矩形",show:!1,rectangle:{coordinates:o.Rectangle.fromDegrees(-92,30,-76,40),material:Q,rotation:new o.CallbackProperty(Ae,!1),stRotation:new o.CallbackProperty(Ae,!1),classificationType:o.ClassificationType.BOTH}}),rn=t.entities.add({name:"地表红色多边形",show:!1,polygon:{hierarchy:o.Cartesian3.fromDegreesArray([-115,37,-115,32,-107,33,-102,31,-102,35]),material:o.Color.RED}}),sn=t.entities.add({name:"绿色拉伸多边形",show:!1,polygon:{hierarchy:o.Cartesian3.fromDegreesArray([-108,42,-100,42,-104,40]),extrudedHeight:5e5,material:o.Color.GREEN,closeTop:!1,closeBottom:!1}}),ln=t.entities.add({name:"纹理拉伸多边形",show:!1,polygon:{hierarchy:o.Cartesian3.fromDegreesArrayHeights([-118.4,40.4,5e4,-118.4,37,3e4,-114.2,38,35e3,-108,37,3e4,-108,40.4,5e4]),textureCoordinates:{positions:[new o.Cartesian2(0,1),new o.Cartesian2(0,0),new o.Cartesian2(.5,0),new o.Cartesian2(1,0),new o.Cartesian2(1,1)]},perPositionHeight:!0,extrudedHeight:0,material:Q}}),dn=t.entities.add({name:"带孔纹理多边形",show:!1,polygon:{hierarchy:{positions:o.Cartesian3.fromDegreesArrayHeights([-130,40,5e4,-130,36,3e4,-125,37,35e3,-120,36,3e4,-120,40,5e4]),holes:[{positions:o.Cartesian3.fromDegreesArrayHeights([-128,39.2,46e3,-128,38.6,42e3,-127,38.6,42e3,-127,39.2,46e3])}]},textureCoordinates:{positions:[new o.Cartesian2(0,1),new o.Cartesian2(0,0),new o.Cartesian2(.5,0),new o.Cartesian2(1,0),new o.Cartesian2(1,1)],holes:[{positions:[new o.Cartesian2(.2,.8),new o.Cartesian2(.2,.6),new o.Cartesian2(.4,.6),new o.Cartesian2(.4,.8)]}]},perPositionHeight:!0,material:Q}}),un=t.entities.add({name:"带点高度橙色多边形",show:!1,polygon:{hierarchy:o.Cartesian3.fromDegreesArrayHeights([-108,25,1e5,-100,25,1e5,-100,30,1e5,-108,30,3e5]),extrudedHeight:0,perPositionHeight:!0,material:o.Color.ORANGE.withAlpha(.5),outline:!0,outlineColor:o.Color.BLACK}}),mn=t.entities.add({name:"带多孔嵌套蓝色多边形",show:!1,polygon:{hierarchy:{positions:o.Cartesian3.fromDegreesArray([-99,30,-85,30,-85,40,-99,40]),holes:[{positions:o.Cartesian3.fromDegreesArray([-97,31,-97,39,-87,39,-87,31]),holes:[{positions:o.Cartesian3.fromDegreesArray([-95,33,-89,33,-89,37,-95,37]),holes:[{positions:o.Cartesian3.fromDegreesArray([-93,34,-91,34,-91,36,-93,36])}]}]}]},material:o.Color.BLUE.withAlpha(.5),height:0,outline:!0}}),cn=t.entities.add({name:"青色垂直多边形",show:!1,polygon:{hierarchy:o.Cartesian3.fromDegreesArrayHeights([-90,41,0,-85,41,5e5,-80,41,0]),perPositionHeight:!0,material:o.Color.CYAN.withAlpha(.5),outline:!0,outlineColor:o.Color.BLACK}}),hn=t.entities.add({name:"等角航线紫色多边形",show:!1,polygon:{hierarchy:o.Cartesian3.fromDegreesArray([-120,45,-80,45,-80,55,-120,55]),extrudedHeight:5e4,material:o.Color.PURPLE,outline:!0,outlineColor:o.Color.MAGENTA,arcType:o.ArcType.RHUMB}}),fn=t.entities.add({name:"贴地红色折线",show:!1,polyline:{positions:o.Cartesian3.fromDegreesArray([-75,35,-125,35]),width:5,material:o.Color.RED,clampToGround:!0}}),gn=t.entities.add({name:"绿色等角航线",show:!1,polyline:{positions:o.Cartesian3.fromDegreesArray([-75,35,-125,35]),width:5,arcType:o.ArcType.RHUMB,material:o.Color.GREEN}}),pn=t.entities.add({name:"地表发光蓝色折线",show:!1,polyline:{positions:o.Cartesian3.fromDegreesArray([-75,37,-125,37]),width:10,material:new o.PolylineGlowMaterialProperty({glowPower:.2,taperPower:.5,color:o.Color.CORNFLOWERBLUE})}}),Cn=t.entities.add({name:"高空黑边橙色双色折线",show:!1,polyline:{positions:o.Cartesian3.fromDegreesArrayHeights([-75,39,25e4,-125,39,25e4]),width:5,material:new o.PolylineOutlineMaterialProperty({color:o.Color.ORANGE,outlineWidth:2,outlineColor:o.Color.BLACK})}}),_n=t.entities.add({name:"高空紫光箭头折线",show:!1,polyline:{positions:o.Cartesian3.fromDegreesArrayHeights([-75,43,5e5,-125,43,5e5]),width:10,arcType:o.ArcType.NONE,material:new o.PolylineArrowMaterialProperty(o.Color.PURPLE)}}),wn=t.entities.add({name:"高空虚线折线",show:!1,polyline:{positions:o.Cartesian3.fromDegreesArrayHeights([-75,45,5e5,-125,45,5e5]),width:4,material:new o.PolylineDashMaterialProperty({color:o.Color.CYAN})}}),yn=t.entities.add({name:"红色高空虚线",show:!1,polyline:{positions:o.Cartesian3.fromDegreesArrayHeights([-75,38,25e4,-125,38,25e4]),width:5,material:new o.PolylineDashMaterialProperty({color:o.Color.RED})}}),vn=t.entities.add({name:"双色带间隙蓝黄虚线",show:!1,polyline:{positions:o.Cartesian3.fromDegreesArrayHeights([-75,40,25e4,-125,40,25e4]),width:30,material:new o.PolylineDashMaterialProperty({color:o.Color.BLUE,gapColor:o.Color.YELLOW})}}),bn=t.entities.add({name:"短段节橙色虚线",show:!1,polyline:{positions:o.Cartesian3.fromDegreesArrayHeights([-75,42,25e4,-125,42,25e4]),width:5,material:new o.PolylineDashMaterialProperty({color:o.Color.ORANGE,dashLength:8})}}),xn=t.entities.add({name:"自定模式青色虚线",show:!1,polyline:{positions:o.Cartesian3.fromDegreesArrayHeights([-75,44,25e4,-125,44,25e4]),width:10,material:new o.PolylineDashMaterialProperty({color:o.Color.CYAN,dashPattern:parseInt("110000001111",2)})}}),Rn=t.entities.add({name:"自定点划模式黄色虚线",show:!1,polyline:{positions:o.Cartesian3.fromDegreesArrayHeights([-75,46,25e4,-125,46,25e4]),width:10,material:new o.PolylineDashMaterialProperty({color:o.Color.YELLOW,dashPattern:parseInt("1010101010101010",2)})}});function En(P){const R=[];for(let D=0;D<360;D++){const F=o.Math.toRadians(D);R.push(new o.Cartesian2(P*Math.cos(F),P*Math.sin(F)))}return R}function An(P,R,D){const F=Math.PI/P,re=2*P,V=new Array(re);for(let B=0;B<re;B++){const se=B%2===0?R:D;V[B]=new o.Cartesian2(Math.cos(B*F)*se,Math.sin(B*F)*se)}return V}const Pn=t.entities.add({name:"红色管道圆角柱体",show:!1,polylineVolume:{positions:o.Cartesian3.fromDegreesArray([-85,32,-85,36,-89,36]),shape:En(6e4),material:o.Color.RED}}),Dn=t.entities.add({name:"绿色方形斜角带边框柱体",show:!1,polylineVolume:{positions:o.Cartesian3.fromDegreesArrayHeights([-90,32,0,-90,36,1e5,-94,36,0]),shape:[new o.Cartesian2(-5e4,-5e4),new o.Cartesian2(5e4,-5e4),new o.Cartesian2(5e4,5e4),new o.Cartesian2(-5e4,5e4)],cornerType:o.CornerType.BEVELED,material:o.Color.GREEN.withAlpha(.5),outline:!0,outlineColor:o.Color.BLACK}}),Tn=t.entities.add({name:"蓝色星形尖角柱体",show:!1,polylineVolume:{positions:o.Cartesian3.fromDegreesArrayHeights([-95,32,0,-95,36,1e5,-99,36,2e5]),shape:An(7,7e4,5e4),cornerType:o.CornerType.MITERED,material:o.Color.BLUE}}),Ln=t.entities.add({name:"高空红色墙体",show:!1,wall:{positions:o.Cartesian3.fromDegreesArrayHeights([-115,44,2e5,-90,44,2e5]),minimumHeights:[1e5,1e5],material:o.Color.RED}}),In=t.entities.add({name:"带边框地表绿色墙体",show:!1,wall:{positions:o.Cartesian3.fromDegreesArrayHeights([-107,43,1e5,-97,43,1e5,-97,40,1e5,-107,40,1e5,-107,43,1e5]),material:o.Color.GREEN,outline:!0}}),On=t.entities.add({name:"锯齿起伏黑边蓝色半透明墙体",show:!1,wall:{positions:o.Cartesian3.fromDegreesArray([-115,50,-112.5,50,-110,50,-107.5,50,-105,50,-102.5,50,-100,50,-97.5,50,-95,50,-92.5,50,-90,50]),maximumHeights:[1e5,2e5,1e5,2e5,1e5,2e5,1e5,2e5,1e5,2e5,1e5],minimumHeights:[0,1e5,0,1e5,0,1e5,0,1e5,0,1e5,0],material:o.Color.BLUE.withAlpha(.5),outline:!0,outlineColor:o.Color.BLACK}});Wn(t.scene)||console.warn("当前平台不支持地表贴地折线 Z-Index，该属性将被忽略"),Yn(t.scene)||console.warn("当前平台不支持地表贴图多边形材质 Z-Index，该属性将被忽略");const Sn=t.entities.add({name:"红色矩形 (zIndex 1)",show:!1,rectangle:{coordinates:o.Rectangle.fromDegrees(-110,20,-100.5,30),material:o.Color.RED,zIndex:1}}),Bn=t.entities.add({name:"纹理矩形 (zIndex 2)",show:!1,rectangle:{coordinates:o.Rectangle.fromDegrees(-112,25,-102.5,35),material:Q,zIndex:2}}),kn=t.entities.add({name:"蓝色矩形 (zIndex 3)",show:!1,rectangle:{coordinates:o.Rectangle.fromDegrees(-110,31,-100.5,41),material:o.Color.BLUE,zIndex:3}}),Mn=t.entities.add({name:"右侧纹理矩形 (zIndex 3)",show:!1,rectangle:{coordinates:o.Rectangle.fromDegrees(-99.5,20,-90,30),material:Q,zIndex:3}}),Fn=t.entities.add({name:"右侧绿色矩形 (zIndex 2)",show:!1,rectangle:{coordinates:o.Rectangle.fromDegrees(-97.5,25,-88,35),material:o.Color.GREEN,zIndex:2}}),zn=t.entities.add({name:"右侧蓝色矩形 (zIndex 1)",show:!1,rectangle:{coordinates:o.Rectangle.fromDegrees(-99.5,31,-90,41),material:o.Color.BLUE,zIndex:1}}),Hn=t.entities.add({name:"贴地发光蓝色折线 (zIndex 2)",show:!1,polyline:{positions:o.Cartesian3.fromDegreesArray([-120,22,-80,22]),width:8,material:new o.PolylineGlowMaterialProperty({glowPower:.2,color:o.Color.BLUE}),zIndex:2,clampToGround:!0}});let U=!1,Pe=!1;const ae={equator:he(t,0,{color:o.Color.BLUE}),primeMeridian:ce(t,0,{color:o.Color.BLUE}),selectedPoint:{meridian:void 0,parallel:void 0,label:void 0},antipodalPoint:{meridian:void 0,parallel:void 0,label:void 0},lowResolutionGrid:Te(t,2,o.Color.PALEGREEN,!1),higherResolutionGrid:Te(t,5,o.Color.DARKORANGE,!1)};function Gn(P){const R=ae.selectedPoint,D=ae.antipodalPoint;o.defined(R.parallel)&&(t.entities.remove(R.parallel),t.entities.remove(R.meridian),t.entities.remove(R.label),t.entities.remove(D.parallel),t.entities.remove(D.meridian),t.entities.remove(D.label));const F=o.Math.toDegrees(P.latitude),re=o.Math.toDegrees(P.longitude),V=.001;R.parallel=he(t,F,{color:o.Color.RED,granularity:V,show:!0}),R.meridian=ce(t,re,{color:o.Color.RED,granularity:V,show:!0}),R.label=Le(t,P);const B=Kn(P),se=o.Math.toDegrees(B.latitude),Nn=o.Math.toDegrees(B.longitude);D.parallel=he(t,se,{color:o.Color.CYAN,granularity:V,show:U}),D.meridian=ce(t,Nn,{color:o.Color.CYAN,granularity:V,show:U}),D.label=Le(t,B),D.label.show=U}c=new o.ScreenSpaceEventHandler(t.scene.canvas),c.setInputAction(function(P){if(!Pe)return;const R=t.camera.getPickRay(P.position),D=t.scene.globe.pick(R,t.scene);if(!o.defined(D))return;const F=o.Cartographic.fromCartesian(D);Gn(F)},o.ScreenSpaceEventType.LEFT_CLICK);const De=new o.HeadingPitchRange(o.Math.toRadians(30),o.Math.toRadians(-45),3e6);u.show=!0,t.zoomTo(u,De),g({blueBox:u,redBox:C,yellowOutlineOnlyBox:d,greenCircle:h,redEllipse:E,blueEllipse:w,redCorridor:p,greenCorridor:v,blueCorridor:y,greenCylinder:M,redCone:T,saturn:x,saturnInnerRing:X,saturnOuterRing:j,dome:O,domeInner:oe,domeTopCut:z,topBottomCut:s,bowl:S,clockCutout:je,partialDome:Qe,wedge:qe,partialEllipsoid:Ze,bluePlane:Je,redPlane:en,yellowPlaneOutline:nn,redRectangle:tn,greenRectangle:on,rotatingRectangle:an,redPolygon:rn,greenPolygon:sn,texturedPolygon:ln,texturedPolygonWithHoles:dn,orangePolygon:un,bluePolygon:mn,cyanPolygon:cn,purplePolygonUsingRhumbLines:hn,redLine:fn,greenRhumbLine:gn,glowingLine:pn,orangeOutlined:Cn,purpleArrow:_n,dashedLine:wn,redDashedLine:yn,blueGapDashedLine:vn,orangeShortDashLine:bn,cyanPatternDashedLine:xn,yellowPatternDashedLine:Rn,redTube:Pn,greenBox:Dn,blueStar:Tn,redWall:Ln,greenWall:In,blueWall:On,zIndexRedRect1:Sn,zIndexTexturedRect2:Bn,zIndexBlueRect3:kn,zIndexTexturedRect3:Mn,zIndexGreenRect2:Fn,zIndexBlueRect1:zn,zIndexPolyline2:Hn,rhumbGridPrimitives:ae,onToggleCrosshairClick:P=>{Pe=P},onToggleAntipodalPoint:P=>{U=P;const R=ae.antipodalPoint;o.defined(R.parallel)&&(R.parallel.show=U,R.meridian.show=U,R.label.show=U)}},De)}function g(u,C){r=new Pt,r.modifyPosition(n.value,{position:"absolute",top:"6px",left:"6px"});const d={blueBox:!0,redBox:!1,yellowOutlineOnlyBox:!1,greenCircle:!1,redEllipse:!1,blueEllipse:!1,redCorridor:!1,greenCorridor:!1,blueCorridor:!1,greenCylinder:!1,redCone:!1,saturn:!1,saturnInnerRing:!1,saturnOuterRing:!1,dome:!1,domeInner:!1,domeTopCut:!1,topBottomCut:!1,bowl:!1,clockCutout:!1,partialDome:!1,wedge:!1,partialEllipsoid:!1,bluePlane:!1,redPlane:!1,yellowPlaneOutline:!1,redRectangle:!1,greenRectangle:!1,rotatingRectangle:!1,redPolygon:!1,greenPolygon:!1,texturedPolygon:!1,texturedPolygonWithHoles:!1,orangePolygon:!1,bluePolygon:!1,cyanPolygon:!1,purplePolygonUsingRhumbLines:!1,redLine:!1,greenRhumbLine:!1,glowingLine:!1,orangeOutlined:!1,purpleArrow:!1,dashedLine:!1,redDashedLine:!1,blueGapDashedLine:!1,orangeShortDashLine:!1,cyanPatternDashedLine:!1,yellowPatternDashedLine:!1,redTube:!1,greenBox:!1,blueStar:!1,redWall:!1,greenWall:!1,blueWall:!1,zIndexAll:!1,zIndexRedRect1:!1,zIndexTexturedRect2:!1,zIndexBlueRect3:!1,zIndexTexturedRect3:!1,zIndexGreenRect2:!1,zIndexBlueRect1:!1,zIndexPolyline2:!1,equator:!1,primeMeridian:!1,lowResolutionGrid:!1,higherResolutionGrid:!1,enableCrosshairClick:!1,showAntipodalPoint:!1},h=(s,S)=>{s.show=S,S&&t.zoomTo(s,C)},E=r.addFolder("立方体 (Box)");E.add(d,"blueBox").name("蓝色盒子").onChange(s=>h(u.blueBox,s)),E.add(d,"redBox").name("黑边红色盒子").onChange(s=>h(u.redBox,s)),E.add(d,"yellowOutlineOnlyBox").name("黄色线框盒子").onChange(s=>h(u.yellowOutlineOnlyBox,s)),E.open();const w=r.addFolder("椭圆 / 圆 (Ellipse)");w.add(d,"greenCircle").name("高空绿色圆").onChange(s=>h(u.greenCircle,s)),w.add(d,"redEllipse").name("地表红色椭圆").onChange(s=>h(u.redEllipse,s)),w.add(d,"blueEllipse").name("蓝色柱体椭圆").onChange(s=>h(u.blueEllipse,s));const p=r.addFolder("走廊 (Corridor)");p.add(d,"redCorridor").name("地表圆角红色走廊").onChange(s=>h(u.redCorridor,s)),p.add(d,"greenCorridor").name("高空尖角绿色走廊").onChange(s=>h(u.greenCorridor,s)),p.add(d,"blueCorridor").name("白边斜角蓝色走廊").onChange(s=>h(u.blueCorridor,s));const v=r.addFolder("圆柱 / 圆锥 (Cylinder)");v.add(d,"greenCylinder").name("绿色圆柱体").onChange(s=>h(u.greenCylinder,s)),v.add(d,"redCone").name("红色圆锥体").onChange(s=>h(u.redCone,s));const y=r.addFolder("椭球体 / 局部椭球 (Ellipsoid)");y.add(d,"saturn").name("土星本体").onChange(s=>h(u.saturn,s)),y.add(d,"saturnInnerRing").name("土星内环").onChange(s=>h(u.saturnInnerRing,s)),y.add(d,"saturnOuterRing").name("土星外环").onChange(s=>h(u.saturnOuterRing,s)),y.add(d,"dome").name("圆顶球壳").onChange(s=>h(u.dome,s)),y.add(d,"domeInner").name("带内半径的圆顶").onChange(s=>h(u.domeInner,s)),y.add(d,"domeTopCut").name("顶部裁剪圆顶").onChange(s=>h(u.domeTopCut,s)),y.add(d,"topBottomCut").name("上下裁剪球壳").onChange(s=>h(u.topBottomCut,s)),y.add(d,"bowl").name("碗状结构").onChange(s=>h(u.bowl,s)),y.add(d,"clockCutout").name("时钟角度裁剪").onChange(s=>h(u.clockCutout,s)),y.add(d,"partialDome").name("局部半球圆顶").onChange(s=>h(u.partialDome,s)),y.add(d,"wedge").name("契形结构").onChange(s=>h(u.wedge,s)),y.add(d,"partialEllipsoid").name("局部椭球体").onChange(s=>h(u.partialEllipsoid,s));const M=r.addFolder("平面 (Plane)");M.add(d,"bluePlane").name("蓝色平面").onChange(s=>h(u.bluePlane,s)),M.add(d,"redPlane").name("黑边红色平面").onChange(s=>h(u.redPlane,s)),M.add(d,"yellowPlaneOutline").name("黄色线框平面").onChange(s=>h(u.yellowPlaneOutline,s));const T=r.addFolder("矩形 (Rectangle)");T.add(d,"redRectangle").name("红色半透明矩形").onChange(s=>h(u.redRectangle,s)),T.add(d,"greenRectangle").name("高空旋转拉伸绿色矩形").onChange(s=>h(u.greenRectangle,s)),T.add(d,"rotatingRectangle").name("动态旋转纹理矩形").onChange(s=>h(u.rotatingRectangle,s));const b=r.addFolder("多边形 (Polygon)");b.add(d,"redPolygon").name("地表红色多边形").onChange(s=>h(u.redPolygon,s)),b.add(d,"greenPolygon").name("绿色拉伸多边形").onChange(s=>h(u.greenPolygon,s)),b.add(d,"texturedPolygon").name("纹理拉伸多边形").onChange(s=>h(u.texturedPolygon,s)),b.add(d,"texturedPolygonWithHoles").name("带孔纹理多边形").onChange(s=>h(u.texturedPolygonWithHoles,s)),b.add(d,"orangePolygon").name("带点高度橙色多边形").onChange(s=>h(u.orangePolygon,s)),b.add(d,"bluePolygon").name("带多孔嵌套蓝色多边形").onChange(s=>h(u.bluePolygon,s)),b.add(d,"cyanPolygon").name("青色垂直多边形").onChange(s=>h(u.cyanPolygon,s)),b.add(d,"purplePolygonUsingRhumbLines").name("等角航线紫色多边形").onChange(s=>h(u.purplePolygonUsingRhumbLines,s));const x=r.addFolder("折线 (Polyline)");x.add(d,"redLine").name("贴地红色折线").onChange(s=>h(u.redLine,s)),x.add(d,"greenRhumbLine").name("绿色等角航线").onChange(s=>h(u.greenRhumbLine,s)),x.add(d,"glowingLine").name("地表发光蓝色折线").onChange(s=>h(u.glowingLine,s)),x.add(d,"orangeOutlined").name("高空黑边橙色折线").onChange(s=>h(u.orangeOutlined,s)),x.add(d,"purpleArrow").name("高空紫光箭头折线").onChange(s=>h(u.purpleArrow,s)),x.add(d,"dashedLine").name("高空虚线折线").onChange(s=>h(u.dashedLine,s)),x.add(d,"redDashedLine").name("红色高空虚线").onChange(s=>h(u.redDashedLine,s)),x.add(d,"blueGapDashedLine").name("双色带间隙蓝黄虚线").onChange(s=>h(u.blueGapDashedLine,s)),x.add(d,"orangeShortDashLine").name("短段节橙色虚线").onChange(s=>h(u.orangeShortDashLine,s)),x.add(d,"cyanPatternDashedLine").name("自定模式青色虚线").onChange(s=>h(u.cyanPatternDashedLine,s)),x.add(d,"yellowPatternDashedLine").name("自定点划模式黄色虚线").onChange(s=>h(u.yellowPatternDashedLine,s));const X=r.addFolder("管道体积体 (PolylineVolume)");X.add(d,"redTube").name("红色管道圆角柱体").onChange(s=>h(u.redTube,s)),X.add(d,"greenBox").name("绿色方形斜角柱体").onChange(s=>h(u.greenBox,s)),X.add(d,"blueStar").name("蓝色星形尖角柱体").onChange(s=>h(u.blueStar,s));const j=r.addFolder("墙体 (Wall)");j.add(d,"redWall").name("高空红色墙体").onChange(s=>h(u.redWall,s)),j.add(d,"greenWall").name("带边框绿色墙体").onChange(s=>h(u.greenWall,s)),j.add(d,"blueWall").name("锯齿起伏蓝色墙体").onChange(s=>h(u.blueWall,s));const O=r.addFolder("贴地层级 (Z-Index)"),oe=[u.zIndexRedRect1,u.zIndexTexturedRect2,u.zIndexBlueRect3,u.zIndexTexturedRect3,u.zIndexGreenRect2,u.zIndexBlueRect1,u.zIndexPolyline2];O.add(d,"zIndexAll").name("一键展示全部 Z-Index 示例").onChange(s=>{oe.forEach(S=>S.show=s),d.zIndexRedRect1=s,d.zIndexTexturedRect2=s,d.zIndexBlueRect3=s,d.zIndexTexturedRect3=s,d.zIndexGreenRect2=s,d.zIndexBlueRect1=s,d.zIndexPolyline2=s,r.updateDisplay(),s&&t.zoomTo(oe,C)}),O.add(d,"zIndexRedRect1").name("红色矩形 (zIndex 1)").onChange(s=>h(u.zIndexRedRect1,s)),O.add(d,"zIndexTexturedRect2").name("纹理矩形 (zIndex 2)").onChange(s=>h(u.zIndexTexturedRect2,s)),O.add(d,"zIndexBlueRect3").name("蓝色矩形 (zIndex 3)").onChange(s=>h(u.zIndexBlueRect3,s)),O.add(d,"zIndexTexturedRect3").name("右侧纹理矩形 (zIndex 3)").onChange(s=>h(u.zIndexTexturedRect3,s)),O.add(d,"zIndexGreenRect2").name("右侧绿色矩形 (zIndex 2)").onChange(s=>h(u.zIndexGreenRect2,s)),O.add(d,"zIndexBlueRect1").name("右侧蓝色矩形 (zIndex 1)").onChange(s=>h(u.zIndexBlueRect1,s)),O.add(d,"zIndexPolyline2").name("贴地发光蓝色折线 (zIndex 2)").onChange(s=>h(u.zIndexPolyline2,s));const z=r.addFolder("等角航线与经纬网 (Rhumb Lines & Grid)");z.add(d,"equator").name("赤道 (Equator)").onChange(s=>{u.rhumbGridPrimitives&&(u.rhumbGridPrimitives.equator.show=s)}),z.add(d,"primeMeridian").name("本初子午线 (Prime Meridian)").onChange(s=>{u.rhumbGridPrimitives&&(u.rhumbGridPrimitives.primeMeridian.show=s)}),z.add(d,"lowResolutionGrid").name("低分辨率经纬网 (Low Res)").onChange(s=>{u.rhumbGridPrimitives&&u.rhumbGridPrimitives.lowResolutionGrid.forEach(S=>S.show=s)}),z.add(d,"higherResolutionGrid").name("高分辨率经纬网 (High Res)").onChange(s=>{u.rhumbGridPrimitives&&u.rhumbGridPrimitives.higherResolutionGrid.forEach(S=>S.show=s)}),z.add(d,"enableCrosshairClick").name("开启点击生成十字线").onChange(s=>{u.onToggleCrosshairClick&&u.onToggleCrosshairClick(s)}),z.add(d,"showAntipodalPoint").name("显示点选对跖点 (Antipodal)").onChange(s=>{u.onToggleAntipodalPoint&&u.onToggleAntipodalPoint(s)})}return Zn(()=>{a&&clearTimeout(a),c&&c.destroy(),r&&r.destroy(),t&&t.destroy()}),(u,C)=>(Jn(),et($n,{codeBlocks:it(e)},{default:nt(()=>[tt("div",Dt,null,512)]),_:1},8,["codeBlocks"]))}}),Bt=Xn(Lt,[["__scopeId","data-v-48b62481"]]);export{Bt as default};
