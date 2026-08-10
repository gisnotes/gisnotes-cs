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
import { createViewer } from "@/utils/cesium";
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
  viewer.resolutionScale = window.devicePixelRatio || 1.0;
  if (viewer.scene.msaaSamples !== undefined) {
    viewer.scene.msaaSamples = 4;
  }
  if (viewer.scene.postProcessStages && viewer.scene.postProcessStages.fxaa) {
    viewer.scene.postProcessStages.fxaa.enabled = true;
  }

  // ------------------------------Box-------------------------------------
  const blueBox = viewer.entities.add({
    name: "蓝色盒子",
    position: Cesium.Cartesian3.fromDegrees(-114.0, 40.0, 300000.0),
    box: {
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
      fill: false,
      outline: true,
      outlineColor: Cesium.Color.YELLOW,
    },
  });

  // ------------------------------Cirle and Ellipse----------------------------------
  const greenCircle = viewer.entities.add({
    name: "带外边框的高空绿色圆",
    show: false,
    position: Cesium.Cartesian3.fromDegrees(-111.0, 40.0, 150000.0),
    ellipse: {
      semiMinorAxis: 300000.0,
      semiMajorAxis: 300000.0,
      height: 200000.0,
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
      extrudedHeight: 200000.0,
      rotation: Cesium.Math.toRadians(45),
      material: Cesium.Color.BLUE.withAlpha(0.5),
      outline: true,
    },
  });

  /**
   * 在 GIS（地理信息系统）和三维可视化中，“Corridor” 本身就是一个专业术语（如：无人机航线走廊、电力巡检走廊、交通廊道）。
   * 在 Cesium 中，它指的是沿着一条折线（Polyline），向两侧按指定宽度（Width）拉伸/扩展形成的带状多边形。
   */
  // ------------------------------Corridor----------------------------------
  const redCorridor = viewer.entities.add({
    name: "地表圆角红色半透明走廊",
    show: false,
    corridor: {
      positions: Cesium.Cartesian3.fromDegreesArray([
        -100.0, 40.0, -105.0, 40.0, -105.0, 35.0,
      ]),
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
    position: Cesium.Cartesian3.fromDegrees(-100.0, 40.0, 200000.0),
    cylinder: {
      length: 400000.0,
      topRadius: 200000.0,
      bottomRadius: 200000.0,
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
      radii: new Cesium.Cartesian3(400000.0, 400000.0, 400000.0),
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
    name: "契形结构",
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
    position: Cesium.Cartesian3.fromDegrees(-114.0, 40.0, 300000.0),
    plane: {
      plane: new Cesium.Plane(Cesium.Cartesian3.UNIT_X, 0.0),
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

  //-------------------------------------polygon----------------------------------------

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

  // 设置 45 度视角与适中视距 2000000 米
  const defaultOffset = new Cesium.HeadingPitchRange(
    0.0,
    Cesium.Math.toRadians(-45.0),
    2000000.0,
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
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
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
