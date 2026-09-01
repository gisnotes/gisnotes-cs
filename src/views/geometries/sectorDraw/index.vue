<template>
  <demo-box :codeBlocks>
    <div class="box" ref="viewerRef"></div>
  </demo-box>
</template>

<script setup name="SectorDraw">
import DemoBox from "@/components/DemoBox/index.vue";
import IndexSourceCode from "./index.vue?raw";
import CesiumSourceCode from "@/utils/cesium.js?raw";

import Cesium from "cesium";
import "cesium/Build/CesiumUnminified/Widgets/widgets.css";
import { createViewer, optimizeViewerQuality } from "@/utils/cesium";
import GUI from "lil-gui";

const codeBlocks = ref([
  {
    fileName: "@/views/geometries/sectorDraw/index.vue",
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
let sectorPolygonEntity = null;
let pointEntities = [];

// 控制面板参数
const controls = {
  longitude: -112.210693,
  latitude: 36.0994841,
  radius: 3000,
  startAngle: 0,
  endAngle: 90,
  height: 0.0,
  extrudedHeight: 1000.0,
  showPoints: true,
  color: "#ffffff",
  alpha: 0.5,
  resetView: () => {
    if (viewer && viewer.entities.values.length > 0) {
      viewer.zoomTo(viewer.entities);
    }
  },
};

onMounted(() => {
  timer = setTimeout(() => {
    init();
  }, 0);
});

/**
 * 根据中心点、半径与起止角度计算扇形多边形的顶点坐标数组（经纬度形式）
 *
 * 【大地测量学与几何解算原理】：
 *  1. 椭球常数：采用 WGS84 椭球体参数，赤道长半轴 Ea = 6378137m，极地短半轴 Eb = 6356725m。
 *  2. 极坐标转局部切平面位移：以正北方向为 0°、顺时针旋转，计算每个角度对应的东向位移 dx (米) 与北向位移 dy (米)。
 *  3. 南北向位移换算【纬度差】：沿经线方向移动，地球半径随纬度变化 (ec)，dy / ec 换算为纬度增量。
 *  4. 东西向位移换算【经度差】：沿纬线圈移动，纬线圈半径随纬度余弦收缩 (ed = ec * cos(lat))，dx / ed 换算为经度增量。
 *  5. 首尾闭合：首点推入扇形圆心 (lon, lat)，与后续圆弧采样点顺次连接，自动形成闭合扇形面。
 *  6. 跨越正北支持：自动处理顺时针跨越 0°/360° 的扇区扫描。
 *
 * @param {number} lon - 扇形圆心经度 (°)
 * @param {number} lat - 扇形圆心纬度 (°)
 * @param {number} radius - 扇形半径 (米)
 * @param {number} [startAngle=0] - 起始方位角 (以正北为 0°，顺时针为正)
 * @param {number} [endAngle=90] - 终止方位角 (以正北为 0°，顺时针为正)
 * @param {number} [step=1] - 角度采样步长 (°)
 * @returns {number[]} 一维经纬度坐标数组 [lon0, lat0, lon1, lat1, ...]
 */
function computeCirclularFlight(
  lon,
  lat,
  radius,
  startAngle = 0,
  endAngle = 90,
  step = 1,
) {
  const Ea = 6378137; // WGS84 赤道半径 / 长半轴 (米)
  const Eb = 6356725; // WGS84 极地半径 / 短半轴 (米)
  const positionArr = [];

  // 第 1 步：首先存入扇形圆心坐标，使整个多边形能够从圆心出发，最终闭合回圆心
  positionArr.push(lon);
  positionArr.push(lat);

  // 跨 360° 顺时针角跨度解算（如 330° 到 30° 顺时针跨越 60°）
  let sweepAngle = endAngle - startAngle;
  if (sweepAngle < 0) {
    sweepAngle += 360;
  }
  if (sweepAngle === 0 && startAngle !== endAngle) {
    sweepAngle = 360;
  }

  // 第 2 步：按角度步长顺时针遍历扇形圆弧上的每一个采样点
  for (let offset = 0; offset <= sweepAngle; offset += step) {
    const angle = (startAngle + offset) % 360;
    const rad = (angle * Math.PI) / 180.0;

    // 2.1 以正北为 0°、顺时针方向：分解出东向水平位移 dx 和北向垂直位移 dy (单位：米)
    const dx = radius * Math.sin(rad); // 东西方向位移 (东为正，西为负)
    const dy = radius * Math.cos(rad); // 南北方向位移 (北为正，南为负)

    // 2.2 计算当前纬度下的子午圈曲率半径近似值 ec (南北经线方向的地球半径)
    const ec = Eb + ((Ea - Eb) * (90.0 - lat)) / 90.0;

    // 2.3 计算当前纬度圈的实际截面半径 ed (东西纬线方向的半径)
    const ed = ec * Math.cos((lat * Math.PI) / 180.0);

    // 2.4 将【东西米级位移 dx】除以纬圈半径 ed，换算为【经度增量 (度)】
    const BJD = lon + ((dx / ed) * 180.0) / Math.PI;

    // 2.5 将【南北米级位移 dy】除以经线半径 ec，换算为【纬度增量 (度)】
    const BWD = lat + ((dy / ec) * 180.0) / Math.PI;

    // 2.6 存入当前圆弧采样点的经纬度
    positionArr.push(BJD);
    positionArr.push(BWD);
  }

  return positionArr;
}

/**
 * 重新渲染三维拉伸扇形几何体与采样顶点标记
 */
function renderSector() {
  if (!viewer) return;

  // 1. 清理已有实体
  if (sectorPolygonEntity) {
    viewer.entities.remove(sectorPolygonEntity);
    sectorPolygonEntity = null;
  }
  pointEntities.forEach((entity) => viewer.entities.remove(entity));
  pointEntities = [];

  // 2. 计算扇形顶点数组
  const positionArr = computeCirclularFlight(
    controls.longitude,
    controls.latitude,
    controls.radius,
    controls.startAngle,
    controls.endAngle,
  );

  const sectorColor = Cesium.Color.fromCssColorString(controls.color).withAlpha(
    controls.alpha,
  );

  // 3. 添加立体拉伸扇形实体 (Polygon)
  sectorPolygonEntity = viewer.entities.add({
    name: "三维立体拉伸扇形",
    description: `
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td><b>圆心经度:</b></td><td>${controls.longitude.toFixed(6)}°</td></tr>
        <tr><td><b>圆心纬度:</b></td><td>${controls.latitude.toFixed(6)}°</td></tr>
        <tr><td><b>扇形半径:</b></td><td>${controls.radius} 米</td></tr>
        <tr><td><b>起始方位:</b></td><td>${controls.startAngle}°</td></tr>
        <tr><td><b>终止方位:</b></td><td>${controls.endAngle}°</td></tr>
        <tr><td><b>拉伸高度:</b></td><td>${controls.extrudedHeight} 米</td></tr>
      </table>
    `,
    polygon: {
      hierarchy: new Cesium.PolygonHierarchy(
        Cesium.Cartesian3.fromDegreesArray(positionArr),
      ),
      height: controls.height,
      extrudedHeight: controls.height + controls.extrudedHeight,
      outline: true,
      outlineColor: Cesium.Color.WHITE.withAlpha(0.6),
      outlineWidth: 2,
      /**
       * 使用 CallbackProperty 动态绑定材质颜色：
       * 避免直接重新赋值 material 导致 Cesium 底层 WebGL 几何体与着色器流水线被标记为 Dirty 异步重建而出现的忽闪现象
       */
      material: new Cesium.ColorMaterialProperty(
        new Cesium.CallbackProperty(() => {
          return Cesium.Color.fromCssColorString(controls.color).withAlpha(
            controls.alpha,
          );
        }, false),
      ),
    },
  });

  // 4. 添加圆弧边界采样点标记
  for (let i = 0; i < positionArr.length; i += 2) {
    const isCenter = i === 0;
    const pointEntity = viewer.entities.add({
      name: isCenter ? "扇形圆心点" : `弧段采样点_${i / 2}`,
      show: controls.showPoints,
      position: Cesium.Cartesian3.fromDegrees(
        positionArr[i],
        positionArr[i + 1],
        controls.height + controls.extrudedHeight,
      ),
      point: {
        color: isCenter ? Cesium.Color.RED : Cesium.Color.SKYBLUE,
        pixelSize: isCenter ? 12 : 8,
        outlineColor: isCenter ? Cesium.Color.WHITE : Cesium.Color.YELLOW,
        outlineWidth: 2,
      },
    });
    pointEntities.push(pointEntity);
  }
}

/**
 * 控制所有采样点实体的显示与隐藏
 * @param {boolean} visible - 是否显示采样点
 */
function updatePointsVisibility(visible) {
  pointEntities.forEach((entity) => {
    entity.show = visible;
  });
}

function init() {
  // 1. 创建 Cesium Viewer
  viewer = createViewer(viewerDivRef.value, {
    shadows: true,
  });

  // 2. 开启抗锯齿优化
  optimizeViewerQuality(viewer, { msaaSamples: 4, enableFxaa: true });

  // 3. 开启深度检测，避免几何体与地表穿模
  viewer.scene.globe.depthTestAgainstTerrain = true;

  // 4. 绘制扇形实体
  renderSector();

  // 5. 相机聚焦至实体
  viewer.zoomTo(viewer.entities);

  // 6. 初始化 lil-gui 面板
  initGUI();
}

function initGUI() {
  gui = new GUI({
    container: viewerDivRef.value,
    title: "三维立体扇形控制",
    width: 300,
  });
  gui.domElement.style.position = "absolute";
  gui.domElement.style.top = "10px";
  gui.domElement.style.right = "10px";
  gui.domElement.style.zIndex = "5";

  const posFolder = gui.addFolder("位置与尺寸");
  posFolder
    .add(controls, "radius", 500, 20000, 100)
    .name("扇形半径 (米)")
    .onChange(() => renderSector());

  posFolder
    .add(controls, "startAngle", 0, 360, 1)
    .name("起始方位角 (°)")
    .onChange(() => renderSector());

  posFolder
    .add(controls, "endAngle", 0, 360, 1)
    .name("终止方位角 (°)")
    .onChange(() => renderSector());

  posFolder
    .add(controls, "extrudedHeight", 0, 5000, 100)
    .name("拉伸高度 (米)")
    .onChange(() => renderSector());

  const styleFolder = gui.addFolder("样式与显隐");
  // 颜色与不透明度由 material 中的 CallbackProperty 自动逐帧响应，修改数值即时生效且绝对无闪烁
  styleFolder.addColor(controls, "color").name("扇形颜色");

  styleFolder.add(controls, "alpha", 0.0, 1.0, 0.05).name("不透明度");

  styleFolder
    .add(controls, "showPoints")
    .name("显示采样点")
    .onChange((val) => updatePointsVisibility(val));

  gui.add(controls, "resetView").name("重置聚焦视角");
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
  if (gui) {
    gui.destroy();
    gui = null;
  }
  if (viewer) {
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
