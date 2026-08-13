<template>
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
       * 会沿着折线的方向（起点 $\rightarrow$ 终点）在末端或线段上自动绘制箭头图标，
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
   * 在 Cesium 中使用 `arcType: Cesium.ArcType.RHUMB` 来绘制。
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
</script>

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
