import{c as E,C as e,o as x,D as M}from"./cesium-C9YchW2n.js";import{C as S}from"./cesium-pNEfRpPT.js";import{C as F}from"./gui-lg9F6Ebh.js";import{_ as N,r as _,T as B,F as O,M as b,o as V,m as W,f as k,h as U,i as Y,H}from"./index-BLRlUmbJ.js";import"./index-BG8w9IPt.js";const j=`<template>
  <demo-box :codeBlocks>
    <div class="box" ref="viewerRef"></div>
  </demo-box>
</template>

<script setup name="GroundPolylineDraw">
import DemoBox from "@/components/DemoBox/index.vue";
import IndexSourceCode from "./index.vue?raw";
import CesiumSourceCode from "@/utils/cesium.js?raw";

import Cesium from "cesium";
import "cesium/Build/CesiumUnminified/Widgets/widgets.css";
import { createViewer, optimizeViewerQuality } from "@/utils/cesium";
import { CustomGUI } from "@/utils/gui";

const codeBlocks = ref([
  {
    fileName: "@/views/geometries/groundPolylineDraw/index.vue",
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
let yellowLine = null;
let corridorLine = null;
let redClampedLine = null;
let corridorPrimitive = null;
let everestSampledLine = null;

onMounted(() => {
  timer = setTimeout(() => {
    init();
  }, 0);
});

function init() {
  // 1. 创建通用 Cesium Viewer，直接配置默认世界地形
  viewer = createViewer(viewerDivRef.value, {
    shadows: true,
    terrain: Cesium.Terrain.fromWorldTerrain(),
  });

  // 2. 开启抗锯齿与高品质渲染
  optimizeViewerQuality(viewer, { msaaSamples: 4, enableFxaa: false });

  // 3. 开启深度检测（地形贴地必需）
  viewer.scene.globe.depthTestAgainstTerrain = true;

  // 4. 添加未贴地的黄色直线（基准对比项：穿透山脊被遮挡）
  addYellowLine();

  // 5. 添加向北平移 +300m 的青色走廊（Entity API 面状贴地）
  addCorridorLine();

  // 6. 添加向南平移 -300m 的红色贴地折线（Entity API + clampToGround: true）
  addRedClampedLine();

  // 7. 添加向北平移 +600m 的绿色走廊（Primitive API + GroundPrimitive）
  addCorridorPrimitive();

  // 8. 异步加载珠穆朗玛峰高密高程采样透视折线（CPU 采样方案 + depthFailMaterial）
  addEverestSampledLine();

  // 9. 默认视角定位到圣海伦斯火山对比区域
  locateHelensView();

  // 10. 初始化控制面板
  initGUI();
}

/**
 * 添加直线实体（未开启贴地，两端位于山坡表面，中间直穿山脊内部被地形遮挡）
 */
function addYellowLine() {
  yellowLine = viewer.entities.add({
    name: "普通折线 (未贴地)",
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights([
        -122.19, 46.1914, 2305, -122.21, 46.21, 1792, -122.23, 46.21, 1355,
      ]),
      width: 4,
      material: Cesium.Color.YELLOW,
    },
  });
}

/**
 * 添加平移到折线旁边的走廊（Corridor）几何体
 * Corridor 本质是带宽度的面状图元，未显式指定高度时默认自动贴合地形表面（GroundGeometry）
 * 
 * 走廊（Corridor）会把上方的悬空点云（如树木、电线）染色，
 * 根本原因是走廊的默认分类模式通常是 ClassificationType.BOTH
 */
function addCorridorLine() {
  corridorLine = viewer.entities.add({
    name: "走廊 (贴合地表)",
    corridor: {
      positions: Cesium.Cartesian3.fromDegreesArray([
        -122.19, 46.1944,
        -122.21, 46.213,
        -122.23, 46.213,
      ]),
      width: 40.0, // 走廊宽度（米），在当前视距下约呈现为一条清晰的色带
      material: Cesium.Color.CYAN,
      classificationType: Cesium.ClassificationType.TERRAIN,
    },
  });
}

/**
 * 添加平移到折线旁边的贴地折线（Polyline + clampToGround: true）
 * 官方标准贴地线方案：底层由 GroundPolyline 渲染，线宽按像素恒定，自动贴合地表
 */
function addRedClampedLine() {
  redClampedLine = viewer.entities.add({
    name: "贴地折线 (clampToGround)",
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray([
        -122.19, 46.1884,
        -122.21, 46.207,
        -122.23, 46.207,
      ]),
      width: 4,
      material: Cesium.Color.RED,
      clampToGround: true, // 核心属性：启用贴地
    },
  });
}

/**
 * 添加通过底层 Primitive API 绘制的贴地走廊
 * 使用 GroundPrimitive + CorridorGeometry + classificationType: TERRAIN
 * 采用阴影体贴地多边形技术，只作用于地表，绝不污染悬空点云
 */
function addCorridorPrimitive() {
  corridorPrimitive = viewer.scene.primitives.add(
    new Cesium.GroundPrimitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry: new Cesium.CorridorGeometry({
          vertexFormat: Cesium.VertexFormat.POSITION_ONLY,
          positions: Cesium.Cartesian3.fromDegreesArray([
            -122.19, 46.1974,
            -122.21, 46.216,
            -122.23, 46.216,
          ]),
          width: 40.0,
        }),
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(
            new Cesium.Color(0.0, 1.0, 0.0, 0.8), // 亮绿色，高对比度
          ),
        },
      }),
      classificationType: Cesium.ClassificationType.TERRAIN,
    }),
  );
}

/**
 * 添加珠峰高密地形高程采样透视折线（CPU 异步采样方案）
 * 采用 sampleTerrainMostDetailed 采样 1000 个真实地形点，并加上 10 米离地偏移
 * 使用 depthFailMaterial：未遮挡部分为橙色黑边，被山体遮挡部分为红色黑边
 */
async function addEverestSampledLine() {
  const length = 1000;
  const startLon = Cesium.Math.toRadians(86.953793);
  const endLon = Cesium.Math.toRadians(86.896497);
  const lat = Cesium.Math.toRadians(27.988257);

  const terrainSamplePositions = [];
  for (let i = 0; i < length; ++i) {
    const lon = Cesium.Math.lerp(endLon, startLon, i / (length - 1));
    terrainSamplePositions.push(new Cesium.Cartographic(lon, lat));
  }

  try {
    // 异步获取具有切片查询能力的 WorldTerrainProvider
    const terrainProvider = await Cesium.createWorldTerrainAsync();
    const samples = await Cesium.sampleTerrainMostDetailed(
      terrainProvider,
      terrainSamplePositions,
    );

    const offset = 10.0;
    for (let i = 0; i < samples.length; ++i) {
      samples[i].height += offset;
    }

    everestSampledLine = viewer.entities.add({
      name: "珠峰透视采样线 (sampleTerrain)",
      polyline: {
        positions: Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray(samples),
        arcType: Cesium.ArcType.NONE,
        width: 5,
        material: new Cesium.PolylineOutlineMaterialProperty({
          color: Cesium.Color.ORANGE,
          outlineWidth: 2,
          outlineColor: Cesium.Color.BLACK,
        }),
        depthFailMaterial: new Cesium.PolylineOutlineMaterialProperty({
          color: Cesium.Color.RED,
          outlineWidth: 2,
          outlineColor: Cesium.Color.BLACK,
        }),
      },
    });
  } catch (err) {
    console.error("珠峰地形高程采样失败:", err);
  }
}

/**
 * 视角定位至圣海伦斯火山（斜俯视观察贴地对比）
 */
function locateHelensView() {
  if (yellowLine) {
    viewer.zoomTo(
      yellowLine,
      new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(-30),
        Cesium.Math.toRadians(-28),
        9500,
      ),
    );
  }
}

/**
 * 视角定位至珠穆朗玛峰（使用精准的 lookAt 矩阵定位）
 */
function locateEverestView() {
  const target = new Cesium.Cartesian3(
    300770.50872389384,
    5634912.131394585,
    2978152.2865545116,
  );
  const offset = new Cesium.Cartesian3(
    6344.974098678562,
    -793.3419798081741,
    2499.9508860763162,
  );
  viewer.camera.lookAt(target, offset);
  viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
}

function initGUI() {
  gui = new CustomGUI({
    container: viewerDivRef.value,
    title: "贴地线多方案对比",
  });

  const viewFolder = gui.addFolder("场景切换与视角");
  viewFolder.add({ fn: locateHelensView }, "fn").name("视角：圣海伦斯火山 (贴地对比)");
  viewFolder.add({ fn: locateEverestView }, "fn").name("视角：珠穆朗玛峰 (透视采样线)");

  const layerFolder = gui.addFolder("图层显隐对比");
  layerFolder.add(yellowLine, "show").name("普通折线 (黄色/被遮挡)");
  layerFolder.add(redClampedLine, "show").name("贴地折线 (红色/clampToGround)");
  layerFolder.add(corridorLine, "show").name("走廊实体 (青色/Entity)");
  layerFolder.add(corridorPrimitive, "show").name("走廊图元 (绿色/GroundPrimitive)");
  
  // 珠峰采样线异步生成，通过包装响应式控制显隐
  const everestCtrl = { show: true };
  layerFolder.add(everestCtrl, "show").name("珠峰透视线 (橙红/sampleTerrain)").onChange((val) => {
    if (everestSampledLine) {
      everestSampledLine.show = val;
    }
  });
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
  if (gui) {
    gui.destroy();
    gui = null;
  }
  if (viewer) {
    if (yellowLine) {
      viewer.entities.remove(yellowLine);
      yellowLine = null;
    }
    if (corridorLine) {
      viewer.entities.remove(corridorLine);
      corridorLine = null;
    }
    if (redClampedLine) {
      viewer.entities.remove(redClampedLine);
      redClampedLine = null;
    }
    if (corridorPrimitive) {
      viewer.scene.primitives.remove(corridorPrimitive);
      corridorPrimitive = null;
    }
    if (everestSampledLine) {
      viewer.entities.remove(everestSampledLine);
      everestSampledLine = null;
    }
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
`,z={class:"box",ref:"viewerRef"},K=H({name:"GroundPolylineDraw"}),Q=Object.assign(K,{setup(q){const h=_([{fileName:"@/views/geometries/groundPolylineDraw/index.vue",rawCode:j,language:"html"},{fileName:"@/utils/cesium.js",rawCode:S,language:"javascript"}]),w=B("viewerRef");let n=null,c=null,t=null,r=null,s=null,d=null,m=null,a=null;O(()=>{c=setTimeout(()=>{g()},0)});function g(){n=E(w.value,{shadows:!0,terrain:e.Terrain.fromWorldTerrain()}),x(n,{msaaSamples:4,enableFxaa:!1}),n.scene.globe.depthTestAgainstTerrain=!0,T(),L(),P(),A(),R(),v(),I()}function T(){r=n.entities.add({name:"普通折线 (未贴地)",polyline:{positions:e.Cartesian3.fromDegreesArrayHeights([-122.19,46.1914,2305,-122.21,46.21,1792,-122.23,46.21,1355]),width:4,material:e.Color.YELLOW}})}function L(){s=n.entities.add({name:"走廊 (贴合地表)",corridor:{positions:e.Cartesian3.fromDegreesArray([-122.19,46.1944,-122.21,46.213,-122.23,46.213]),width:40,material:e.Color.CYAN,classificationType:e.ClassificationType.TERRAIN}})}function P(){d=n.entities.add({name:"贴地折线 (clampToGround)",polyline:{positions:e.Cartesian3.fromDegreesArray([-122.19,46.1884,-122.21,46.207,-122.23,46.207]),width:4,material:e.Color.RED,clampToGround:!0}})}function A(){m=n.scene.primitives.add(new e.GroundPrimitive({geometryInstances:new e.GeometryInstance({geometry:new e.CorridorGeometry({vertexFormat:e.VertexFormat.POSITION_ONLY,positions:e.Cartesian3.fromDegreesArray([-122.19,46.1974,-122.21,46.216,-122.23,46.216]),width:40}),attributes:{color:e.ColorGeometryInstanceAttribute.fromColor(new e.Color(0,1,0,.8))}}),classificationType:e.ClassificationType.TERRAIN}))}async function R(){const i=e.Math.toRadians(86.953793),C=e.Math.toRadians(86.896497),p=e.Math.toRadians(27.988257),y=[];for(let o=0;o<1e3;++o){const u=e.Math.lerp(C,i,o/999);y.push(new e.Cartographic(u,p))}try{const o=await e.createWorldTerrainAsync(),u=await e.sampleTerrainMostDetailed(o,y),D=10;for(let f=0;f<u.length;++f)u[f].height+=D;a=n.entities.add({name:"珠峰透视采样线 (sampleTerrain)",polyline:{positions:e.Ellipsoid.WGS84.cartographicArrayToCartesianArray(u),arcType:e.ArcType.NONE,width:5,material:new e.PolylineOutlineMaterialProperty({color:e.Color.ORANGE,outlineWidth:2,outlineColor:e.Color.BLACK}),depthFailMaterial:new e.PolylineOutlineMaterialProperty({color:e.Color.RED,outlineWidth:2,outlineColor:e.Color.BLACK})}})}catch(o){console.error("珠峰地形高程采样失败:",o)}}function v(){r&&n.zoomTo(r,new e.HeadingPitchRange(e.Math.toRadians(-30),e.Math.toRadians(-28),9500))}function G(){const l=new e.Cartesian3(300770.50872389384,5634912131394585e-9,2.9781522865545116e6),i=new e.Cartesian3(6344.974098678562,-793.3419798081741,2499.9508860763162);n.camera.lookAt(l,i),n.camera.lookAtTransform(e.Matrix4.IDENTITY)}function I(){t=new F({container:w.value,title:"贴地线多方案对比"});const l=t.addFolder("场景切换与视角");l.add({fn:v},"fn").name("视角：圣海伦斯火山 (贴地对比)"),l.add({fn:G},"fn").name("视角：珠穆朗玛峰 (透视采样线)");const i=t.addFolder("图层显隐对比");i.add(r,"show").name("普通折线 (黄色/被遮挡)"),i.add(d,"show").name("贴地折线 (红色/clampToGround)"),i.add(s,"show").name("走廊实体 (青色/Entity)"),i.add(m,"show").name("走廊图元 (绿色/GroundPrimitive)");const C={show:!0};i.add(C,"show").name("珠峰透视线 (橙红/sampleTerrain)").onChange(p=>{a&&(a.show=p)})}return b(()=>{c&&clearTimeout(c),t&&(t.destroy(),t=null),n&&(r&&(n.entities.remove(r),r=null),s&&(n.entities.remove(s),s=null),d&&(n.entities.remove(d),d=null),m&&(n.scene.primitives.remove(m),m=null),a&&(n.entities.remove(a),a=null),n.destroy(),n=null)}),(l,i)=>(V(),W(M,{codeBlocks:Y(h)},{default:k(()=>[U("div",z,null,512)]),_:1},8,["codeBlocks"]))}}),ne=N(Q,[["__scopeId","data-v-2f2bf54b"]]);export{ne as default};
