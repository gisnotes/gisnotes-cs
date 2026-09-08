var Ot=Object.defineProperty;var Lt=(n,t,e)=>t in n?Ot(n,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):n[t]=e;var A=(n,t,e)=>Lt(n,typeof t!="symbol"?t+"":t,e);import{c as Rt,o as It,C as V,D as _t}from"./cesium-C9YchW2n.js";import{C as At}from"./cesium-pNEfRpPT.js";import{C as Mt}from"./gui-lg9F6Ebh.js";import{_ as Nt,r as Xe,T as Bt,U as Ft,F as Gt,M as kt,o as qt,m as Dt,f as Ut,h as Ze,t as zt,i as Qe,H as Vt}from"./index-BLRlUmbJ.js";import"./index-BG8w9IPt.js";const Wt=`<template>
  <demo-box :codeBlocks>
    <div class="box" ref="viewerRef"></div>
    <div class="status-panel">{{ statusText }}</div>
  </demo-box>
</template>

<script setup name="OverlayAnalysis">
import DemoBox from "@/components/DemoBox/index.vue";
import IndexSourceCode from "./index.vue?raw";
import CesiumSourceCode from "@/utils/cesium.js?raw";

import Cesium from "cesium";
import "cesium/Build/CesiumUnminified/Widgets/widgets.css";
import { createViewer, optimizeViewerQuality } from "@/utils/cesium";
import { CustomGUI } from "@/utils/gui";

// 按需导入 Turf 核心函数
import {
  polygon as turfPolygon,
  featureCollection as turfFeatureCollection,
  intersect as turfIntersect,
  area as turfArea,
  pointOnFeature as turfPointOnFeature,
} from "@turf/turf";

const codeBlocks = ref([
  {
    fileName: "@/views/spaceAnalysis/overlayAnalysis/index.vue",
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

// 两个待叠加分析的面，坐标顺序为 [经度, 纬度]
const POLYGON_1 = [
  [117.182288, 31.854164],
  [117.210254, 31.878324],
  [117.238229, 31.855796],
  [117.242307, 31.826109],
  [117.177277, 31.821475],
  [117.182288, 31.854164],
];
const POLYGON_2 = [
  [117.267046, 31.842971],
  [117.20963, 31.840323],
  [117.230646, 31.787122],
  [117.28833, 31.799624],
  [117.267046, 31.842971],
];

let viewer = null;
let imageryLayer = null;
let terrainProvider = null;
let myLilGui = null;
let polygon1Entity = null;
let polygon2Entity = null;
let intersectionEntity = null; // 相交区域多边形实体
let areaLabelEntity = null;
let intersectionFeature = null;

const statusText = ref("正在初始化叠加分析…");

const params = reactive({
  polygon1Color: "#ff3b30",
  polygon1Opacity: 0.5,
  polygon2Color: "#34c759",
  polygon2Opacity: 0.5,
  intersectionColor: "#2979ff",
  intersectionOpacity: 0.78,
  showPolygon1: true,
  showPolygon2: true,
  showIntersection: true,
  showLabel: true,
  calculate: () => calculateIntersection(),
  clear: () => clearIntersection(),
  resetCamera: () => resetCamera(),
});

onMounted(async () => {
  initMap();
  addBasePolygons();
  addlilgui();
  await initTerrain();
  await calculateIntersection();
});

onBeforeUnmount(() => {
  if (myLilGui) {
    myLilGui.destroy();
    myLilGui = null;
  }
  clearIntersection();
  if (viewer) {
    viewer.destroy();
    viewer = null;
  }
});

/**
 * 辅助方法：按需请求渲染一帧（当开启 requestRenderMode 时）
 */
function requestRender() {
  if (viewer?.scene) {
    viewer.scene.requestRender();
  }
}

function initMap() {
  viewer = createViewer(viewerDivRef.value, {
    baseLayer: false,
  });

  // 开启原生 WebGL2 4x MSAA 抗锯齿
  optimizeViewerQuality(viewer, { msaaSamples: 4, enableFxaa: false });

  viewer.scene.debugShowFramesPerSecond = true;
  viewer.scene.globe.depthTestAgainstTerrain = true;
  viewer.scene.globe.enableLighting = false;
  viewer.scene.fog.enabled = true;
  viewer.scene.fog.density = 0.00008;
  viewer.scene.skyAtmosphere.show = true;
  if (viewer._cesiumWidget?._creditContainer) {
    viewer._cesiumWidget._creditContainer.style.display = "none";
  }

  imageryLayer = viewer.imageryLayers.addImageryProvider(
    new Cesium.UrlTemplateImageryProvider({
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      maximumLevel: 18,
    }),
  );
  resetCamera();
}

async function initTerrain() {
  try {
    statusText.value = "正在加载地形…";
    terrainProvider =
      await Cesium.ArcGISTiledElevationTerrainProvider.fromUrl(
        "https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer",
      );
    viewer.terrainProvider = terrainProvider;
    statusText.value = "地形加载完成，正在计算相交区域…";
  } catch (error) {
    console.warn("地形加载失败，将使用椭球面显示：", error);
    statusText.value = "地形加载失败，正在使用椭球面计算…";
  }
  requestRender();
}

function addBasePolygons() {
  polygon1Entity = viewer.entities.add({
    id: "overlay-polygon-1",
    polygon: {
      hierarchy: Cesium.Cartesian3.fromDegreesArray(POLYGON_1.flat()),
      material: getColorMaterial(
        params.polygon1Color,
        params.polygon1Opacity,
      ),
      outline: true,
      outlineColor: Cesium.Color.WHITE.withAlpha(0.9),
      outlineWidth: 2,
      classificationType: Cesium.ClassificationType.TERRAIN,
    },
  });

  polygon2Entity = viewer.entities.add({
    id: "overlay-polygon-2",
    polygon: {
      hierarchy: Cesium.Cartesian3.fromDegreesArray(POLYGON_2.flat()),
      material: getColorMaterial(
        params.polygon2Color,
        params.polygon2Opacity,
      ),
      outline: true,
      outlineColor: Cesium.Color.WHITE.withAlpha(0.9),
      outlineWidth: 2,
      classificationType: Cesium.ClassificationType.TERRAIN,
    },
  });
  requestRender();
}

function addlilgui() {
  const gui = new CustomGUI({
    container: viewerDivRef.value,
    title: "叠加分析",
  });
  myLilGui = gui;

  const operationFolder = gui.addFolder("分析操作");
  operationFolder.add(params, "calculate").name("重新分析");
  operationFolder.add(params, "clear").name("清除相交结果");
  operationFolder.add(params, "resetCamera").name("重置视角");

  const styleFolder = gui.addFolder("图层样式");
  styleFolder
    .addColor(params, "polygon1Color")
    .name("区域一颜色")
    .onChange(() => updateBasePolygonStyle());
  styleFolder
    .add(params, "polygon1Opacity", 0, 1, 0.01)
    .name("区域一透明度")
    .onChange(() => updateBasePolygonStyle());
  styleFolder
    .addColor(params, "polygon2Color")
    .name("区域二颜色")
    .onChange(() => updateBasePolygonStyle());
  styleFolder
    .add(params, "polygon2Opacity", 0, 1, 0.01)
    .name("区域二透明度")
    .onChange(() => updateBasePolygonStyle());
  styleFolder
    .addColor(params, "intersectionColor")
    .name("相交区域颜色")
    .onChange(() => updateIntersectionStyle());
  styleFolder
    .add(params, "intersectionOpacity", 0, 1, 0.01)
    .name("相交区域透明度")
    .onChange(() => updateIntersectionStyle());

  const visibilityFolder = gui.addFolder("显示控制");
  visibilityFolder
    .add(params, "showPolygon1")
    .name("显示区域一")
    .onChange((value) => {
      if (polygon1Entity) {
        polygon1Entity.show = value;
        requestRender();
      }
    });
  visibilityFolder
    .add(params, "showPolygon2")
    .name("显示区域二")
    .onChange((value) => {
      if (polygon2Entity) {
        polygon2Entity.show = value;
        requestRender();
      }
    });
  visibilityFolder
    .add(params, "showIntersection")
    .name("显示相交区域")
    .onChange((value) => {
      if (intersectionEntity) {
        intersectionEntity.show = value;
        requestRender();
      }
    });
  visibilityFolder
    .add(params, "showLabel")
    .name("显示面积标签")
    .onChange((value) => {
      if (areaLabelEntity) {
        areaLabelEntity.show = value;
        requestRender();
      }
    });

  const layerFolder = gui.addFolder("影像图层");
  layerFolder
    .add(imageryLayer, "show")
    .name("显示影像")
    .onChange(() => requestRender());
  layerFolder
    .add(imageryLayer, "alpha", 0, 1, 0.01)
    .name("影像透明度")
    .onChange(() => requestRender());
}

function getColorMaterial(color, alpha) {
  return Cesium.Color.fromCssColorString(color).withAlpha(alpha);
}

function updateBasePolygonStyle() {
  if (polygon1Entity) {
    polygon1Entity.polygon.material = getColorMaterial(
      params.polygon1Color,
      params.polygon1Opacity,
    );
  }
  if (polygon2Entity) {
    polygon2Entity.polygon.material = getColorMaterial(
      params.polygon2Color,
      params.polygon2Opacity,
    );
  }
  requestRender();
}

function updateIntersectionStyle() {
  if (!intersectionEntity) return;
  intersectionEntity.polygon.material = getColorMaterial(
    params.intersectionColor,
    params.intersectionOpacity,
  );
  requestRender();
}

async function calculateIntersection() {
  if (!viewer) return;
  clearIntersection();
  statusText.value = "正在计算两个多边形的相交区域…";

  try {
    const p1 = turfPolygon([POLYGON_1]);
    const p2 = turfPolygon([POLYGON_2]);
    // Turf 7 使用 featureCollection 传入待求交要素
    const intersection = turfIntersect(turfFeatureCollection([p1, p2]));

    if (!intersection) {
      statusText.value = "两个区域没有相交部分。";
      requestRender();
      return;
    }

    intersectionFeature = intersection;

    // 解析相交面经纬度坐标序列
    const coords = [];
    if (intersection.geometry.type === "Polygon") {
      intersection.geometry.coordinates[0].forEach(([lon, lat]) => {
        coords.push(lon, lat);
      });
    } else if (intersection.geometry.type === "MultiPolygon") {
      intersection.geometry.coordinates.forEach((poly) => {
        poly[0].forEach(([lon, lat]) => coords.push(lon, lat));
      });
    }

    const hierarchy = Cesium.Cartesian3.fromDegreesArray(coords);
    const material = getColorMaterial(
      params.intersectionColor,
      params.intersectionOpacity,
    );

    // 复用已有 Entity 或添加贴地多边形
    if (intersectionEntity) {
      intersectionEntity.polygon.hierarchy = hierarchy;
      intersectionEntity.polygon.material = material;
      intersectionEntity.show = params.showIntersection;
    } else {
      intersectionEntity = viewer.entities.add({
        id: "overlay-intersection-result",
        polygon: {
          hierarchy: hierarchy,
          material: material,
          outline: true,
          outlineColor: Cesium.Color.WHITE.withAlpha(0.95),
          outlineWidth: 2,
          classificationType: Cesium.ClassificationType.TERRAIN,
        },
        show: params.showIntersection,
      });
    }

    const areaVal = turfArea(intersection);
    const center = turfPointOnFeature(intersection).geometry.coordinates;

    if (areaLabelEntity) {
      areaLabelEntity.position = Cesium.Cartesian3.fromDegrees(
        center[0],
        center[1],
      );
      areaLabelEntity.label.text = \`相交部分\\n\${formatArea(areaVal)}\`;
      areaLabelEntity.show = params.showLabel;
    } else {
      areaLabelEntity = viewer.entities.add({
        id: "overlay-intersection-area",
        position: Cesium.Cartesian3.fromDegrees(center[0], center[1]),
        label: {
          text: \`相交部分\\n\${formatArea(areaVal)}\`,
          fillColor: Cesium.Color.WHITE,
          font: "18px sans-serif",
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          showBackground: true,
          backgroundColor: Cesium.Color.BLACK.withAlpha(0.55),
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: Cesium.VerticalOrigin.TOP,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        show: params.showLabel,
      });
    }

    statusText.value = \`分析完成：相交面积 \${formatArea(areaVal)}。\`;
    requestRender();
  } catch (error) {
    console.error("叠加分析失败：", error);
    statusText.value = \`叠加分析失败：\${error.message}\`;
  }
}

function formatArea(areaVal) {
  return areaVal >= 10000
    ? \`\${(areaVal / 10000).toFixed(2)} 公顷\`
    : \`\${areaVal.toFixed(2)} 平方米\`;
}

function clearIntersection() {
  if (intersectionEntity && viewer) {
    viewer.entities.remove(intersectionEntity);
    intersectionEntity = null;
  }
  intersectionFeature = null;
  if (areaLabelEntity && viewer) {
    viewer.entities.remove(areaLabelEntity);
    areaLabelEntity = null;
  }
  requestRender();
}

function resetCamera() {
  if (!viewer) return;
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(
      117.225959,
      31.705235,
      18000,
    ),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-50),
      roll: 0,
    },
  });
  requestRender();
}
<\/script>

<style lang="scss" scoped>
.box {
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
}

.status-panel {
  position: absolute;
  left: 10px;
  bottom: 10px;
  z-index: 998;
  min-width: 300px;
  max-width: calc(100vw - 40px);
  padding: 10px 12px;
  border-radius: 6px;
  color: #e8f1ff;
  background: rgba(12, 18, 28, 0.78);
  font-size: 13px;
  line-height: 1.7;
  pointer-events: none;
  white-space: pre-line;
}
</style>
`;var W=63710088e-1,$t={centimeters:W*100,centimetres:W*100,cm:W*100,degrees:360/(2*Math.PI),deg:360/(2*Math.PI),feet:W*3.28084,ft:W*3.28084,inches:W*39.37,in:W*39.37,kilometers:W/1e3,kilometres:W/1e3,km:W/1e3,meters:W,metres:W,m:W,miles:W/1609.344,mi:W/1609.344,millimeters:W*1e3,millimetres:W*1e3,mm:W*1e3,nauticalmiles:W/1852,nmi:W/1852,radians:1,rad:1,yards:W*1.0936,yd:W*1.0936};function Me(n,t,e={}){const i={type:"Feature"};return(e.id===0||e.id)&&(i.id=e.id),e.bbox&&(i.bbox=e.bbox),i.properties=t||{},i.geometry=n,i}function xe(n,t,e={}){if(!n)throw new Error("coordinates is required");if(!Array.isArray(n))throw new Error("coordinates must be an Array");if(n.length<2)throw new Error("coordinates must be at least 2 numbers long");if(!Je(n[0])||!Je(n[1]))throw new Error("coordinates must contain numbers");return Me({type:"Point",coordinates:n},t,e)}function Ue(n,t,e={}){for(const r of n){if(r.length<4)throw new Error("Each LinearRing of a Polygon must have 4 or more Positions.");if(r[r.length-1].length!==r[0].length)throw new Error("First and last Position are not equivalent.");for(let s=0;s<r[r.length-1].length;s++)if(r[r.length-1][s]!==r[0][s])throw new Error("First and last Position are not equivalent.")}return Me({type:"Polygon",coordinates:n},t,e)}function Ce(n,t={}){const e={type:"FeatureCollection"};return t.id&&(e.id=t.id),t.bbox&&(e.bbox=t.bbox),e.features=n,e}function Ht(n,t,e={}){return Me({type:"MultiPolygon",coordinates:n},t,e)}function Yt(n,t="kilometers"){const e=$t[t];if(!e)throw new Error(t+" units is invalid");return n*e}function Te(n){return n%360*Math.PI/180}function Je(n){return!isNaN(n)&&n!==null&&!Array.isArray(n)}function ze(n){if(!n)throw new Error("coord is required");if(!Array.isArray(n)){if(n.type==="Feature"&&n.geometry!==null&&n.geometry.type==="Point")return[...n.geometry.coordinates];if(n.type==="Point")return[...n.coordinates]}if(Array.isArray(n)&&n.length>=2&&!Array.isArray(n[0])&&!Array.isArray(n[1]))return[...n];throw new Error("coord must be GeoJSON Point or an Array of numbers")}function Kt(n){return n.type==="Feature"?n.geometry:n}function Xt(n,t,e={}){var i=ze(n),r=ze(t),s=Te(r[1]-i[1]),f=Te(r[0]-i[0]),u=Te(i[1]),d=Te(r[1]),p=Math.pow(Math.sin(s/2),2)+Math.pow(Math.sin(f/2),2)*Math.cos(u)*Math.cos(d);return Yt(2*Math.atan2(Math.sqrt(p),Math.sqrt(1-p)),e.units)}function Ee(n,t,e){if(n!==null)for(var i,r,s,f,u,d,p,b=0,w=0,C,P=n.type,L=P==="FeatureCollection",O=P==="Feature",R=L?n.features.length:1,M=0;M<R;M++){p=L?n.features[M].geometry:O?n.geometry:n,C=p?p.type==="GeometryCollection":!1,u=C?p.geometries.length:1;for(var S=0;S<u;S++){var k=0,q=0;if(f=C?p.geometries[S]:p,f!==null){d=f.coordinates;var B=f.type;switch(b=0,B){case null:break;case"Point":if(t(d,w,M,k,q)===!1)return!1;w++,k++;break;case"LineString":case"MultiPoint":for(i=0;i<d.length;i++){if(t(d[i],w,M,k,q)===!1)return!1;w++,B==="MultiPoint"&&k++}B==="LineString"&&k++;break;case"Polygon":case"MultiLineString":for(i=0;i<d.length;i++){for(r=0;r<d[i].length-b;r++){if(t(d[i][r],w,M,k,q)===!1)return!1;w++}B==="MultiLineString"&&k++,B==="Polygon"&&q++}B==="Polygon"&&k++;break;case"MultiPolygon":for(i=0;i<d.length;i++){for(q=0,r=0;r<d[i].length;r++){for(s=0;s<d[i][r].length-b;s++){if(t(d[i][r][s],w,M,k,q)===!1)return!1;w++}q++}k++}break;case"GeometryCollection":for(i=0;i<f.geometries.length;i++)if(Ee(f.geometries[i],t)===!1)return!1;break;default:throw new Error("Unknown Geometry Type")}}}}}function mt(n,t){if(n.type==="Feature")t(n,0);else if(n.type==="FeatureCollection")for(var e=0;e<n.features.length&&t(n.features[e],e)!==!1;e++);}function wt(n,t){var e,i,r,s,f,u,d,p,b,w,C=0,P=n.type==="FeatureCollection",L=n.type==="Feature",O=P?n.features.length:1;for(e=0;e<O;e++){for(u=P?n.features[e].geometry:L?n.geometry:n,p=P?n.features[e].properties:L?n.properties:{},b=P?n.features[e].bbox:L?n.bbox:void 0,w=P?n.features[e].id:L?n.id:void 0,d=u?u.type==="GeometryCollection":!1,f=d?u.geometries.length:1,r=0;r<f;r++){if(s=d?u.geometries[r]:u,s===null){if(t(null,C,p,b,w)===!1)return!1;continue}switch(s.type){case"Point":case"LineString":case"MultiPoint":case"Polygon":case"MultiLineString":case"MultiPolygon":{if(t(s,C,p,b,w)===!1)return!1;break}case"GeometryCollection":{for(i=0;i<s.geometries.length;i++)if(t(s.geometries[i],C,p,b,w)===!1)return!1;break}default:throw new Error("Unknown Geometry Type")}}C++}}function Zt(n,t,e){var i=e;return wt(n,function(r,s,f,u,d){i=t(i,r,s,f,u,d)}),i}function Qt(n){return Zt(n,(t,e)=>t+Jt(e),0)}function Jt(n){let t=0,e;switch(n.type){case"Polygon":return je(n.coordinates);case"MultiPolygon":for(e=0;e<n.coordinates.length;e++)t+=je(n.coordinates[e]);return t;case"Point":case"MultiPoint":case"LineString":case"MultiLineString":return 0}return 0}function je(n){let t=0;if(n&&n.length>0){t+=Math.abs(et(n[0]));for(let e=1;e<n.length;e++)t-=Math.abs(et(n[e]))}return t}var jt=W*W/2,Fe=Math.PI/180;function et(n){const t=n.length-1;if(t<=2)return 0;let e=0,i=0;for(;i<t;){const r=n[i],s=n[i+1===t?0:i+1],f=n[i+2>=t?(i+2)%t:i+2],u=r[0]*Fe,d=s[1]*Fe,p=f[0]*Fe;e+=(p-u)*Math.sin(d),i++}return e*jt}function en(n,t={}){if(n.bbox!=null&&t.recompute!==!0)return n.bbox;const e=[1/0,1/0,-1/0,-1/0];return Ee(n,i=>{e[0]>i[0]&&(e[0]=i[0]),e[1]>i[1]&&(e[1]=i[1]),e[2]<i[0]&&(e[2]=i[0]),e[3]<i[1]&&(e[3]=i[1])}),e}const ce=11102230246251565e-32,Q=134217729,tn=(3+8*ce)*ce;function Ge(n,t,e,i,r){let s,f,u,d,p=t[0],b=i[0],w=0,C=0;b>p==b>-p?(s=p,p=t[++w]):(s=b,b=i[++C]);let P=0;if(w<n&&C<e)for(b>p==b>-p?(f=p+s,u=s-(f-p),p=t[++w]):(f=b+s,u=s-(f-b),b=i[++C]),s=f,u!==0&&(r[P++]=u);w<n&&C<e;)b>p==b>-p?(f=s+p,d=f-s,u=s-(f-d)+(p-d),p=t[++w]):(f=s+b,d=f-s,u=s-(f-d)+(b-d),b=i[++C]),s=f,u!==0&&(r[P++]=u);for(;w<n;)f=s+p,d=f-s,u=s-(f-d)+(p-d),p=t[++w],s=f,u!==0&&(r[P++]=u);for(;C<e;)f=s+b,d=f-s,u=s-(f-d)+(b-d),b=i[++C],s=f,u!==0&&(r[P++]=u);return(s!==0||P===0)&&(r[P++]=s),P}function nn(n,t){let e=t[0];for(let i=1;i<n;i++)e+=t[i];return e}function Se(n){return new Float64Array(n)}const rn=(3+16*ce)*ce,on=(2+12*ce)*ce,sn=(9+64*ce)*ce*ce,ge=Se(4),tt=Se(8),nt=Se(12),it=Se(16),j=Se(4);function ln(n,t,e,i,r,s,f){let u,d,p,b,w,C,P,L,O,R,M,S,k,q,B,F,z,o;const l=n-r,a=e-r,m=t-s,c=i-s;q=l*c,C=Q*l,P=C-(C-l),L=l-P,C=Q*c,O=C-(C-c),R=c-O,B=L*R-(q-P*O-L*O-P*R),F=m*a,C=Q*m,P=C-(C-m),L=m-P,C=Q*a,O=C-(C-a),R=a-O,z=L*R-(F-P*O-L*O-P*R),M=B-z,w=B-M,ge[0]=B-(M+w)+(w-z),S=q+M,w=S-q,k=q-(S-w)+(M-w),M=k-F,w=k-M,ge[1]=k-(M+w)+(w-F),o=S+M,w=o-S,ge[2]=S-(o-w)+(M-w),ge[3]=o;let g=nn(4,ge),v=on*f;if(g>=v||-g>=v||(w=n-l,u=n-(l+w)+(w-r),w=e-a,p=e-(a+w)+(w-r),w=t-m,d=t-(m+w)+(w-s),w=i-c,b=i-(c+w)+(w-s),u===0&&d===0&&p===0&&b===0)||(v=sn*f+tn*Math.abs(g),g+=l*b+c*u-(m*p+a*d),g>=v||-g>=v))return g;q=u*c,C=Q*u,P=C-(C-u),L=u-P,C=Q*c,O=C-(C-c),R=c-O,B=L*R-(q-P*O-L*O-P*R),F=d*a,C=Q*d,P=C-(C-d),L=d-P,C=Q*a,O=C-(C-a),R=a-O,z=L*R-(F-P*O-L*O-P*R),M=B-z,w=B-M,j[0]=B-(M+w)+(w-z),S=q+M,w=S-q,k=q-(S-w)+(M-w),M=k-F,w=k-M,j[1]=k-(M+w)+(w-F),o=S+M,w=o-S,j[2]=S-(o-w)+(M-w),j[3]=o;const h=Ge(4,ge,4,j,tt);q=l*b,C=Q*l,P=C-(C-l),L=l-P,C=Q*b,O=C-(C-b),R=b-O,B=L*R-(q-P*O-L*O-P*R),F=m*p,C=Q*m,P=C-(C-m),L=m-P,C=Q*p,O=C-(C-p),R=p-O,z=L*R-(F-P*O-L*O-P*R),M=B-z,w=B-M,j[0]=B-(M+w)+(w-z),S=q+M,w=S-q,k=q-(S-w)+(M-w),M=k-F,w=k-M,j[1]=k-(M+w)+(w-F),o=S+M,w=o-S,j[2]=S-(o-w)+(M-w),j[3]=o;const y=Ge(h,tt,4,j,nt);q=u*b,C=Q*u,P=C-(C-u),L=u-P,C=Q*b,O=C-(C-b),R=b-O,B=L*R-(q-P*O-L*O-P*R),F=d*p,C=Q*d,P=C-(C-d),L=d-P,C=Q*p,O=C-(C-p),R=p-O,z=L*R-(F-P*O-L*O-P*R),M=B-z,w=B-M,j[0]=B-(M+w)+(w-z),S=q+M,w=S-q,k=q-(S-w)+(M-w),M=k-F,w=k-M,j[1]=k-(M+w)+(w-F),o=S+M,w=o-S,j[2]=S-(o-w)+(M-w),j[3]=o;const x=Ge(y,nt,4,j,it);return it[x-1]}function an(n,t,e,i,r,s){const f=(t-s)*(e-r),u=(n-r)*(i-s),d=f-u,p=Math.abs(f+u);return Math.abs(d)>=rn*p?d:-ln(n,t,e,i,r,s,p)}function un(n,t){var e,i,r=0,s,f,u,d,p,b,w,C=n[0],P=n[1],L=t.length;for(e=0;e<L;e++){i=0;var O=t[e],R=O.length-1;if(b=O[0],b[0]!==O[R][0]&&b[1]!==O[R][1])throw new Error("First and last coordinates in a ring must be the same");for(f=b[0]-C,u=b[1]-P,i;i<R;i++){if(w=O[i+1],d=w[0]-C,p=w[1]-P,u===0&&p===0){if(d<=0&&f>=0||f<=0&&d>=0)return 0}else if(p>=0&&u<=0||p<=0&&u>=0){if(s=an(f,d,u,p,0,0),s===0)return 0;(s>0&&p>0&&u<=0||s<0&&p<=0&&u>0)&&r++}b=w,u=p,f=d}}return r%2!==0}function cn(n,t,e={}){if(!n)throw new Error("point is required");if(!t)throw new Error("polygon is required");const i=ze(n),r=Kt(t),s=r.type,f=t.bbox;let u=r.coordinates;if(f&&fn(i,f)===!1)return!1;s==="Polygon"&&(u=[u]);for(var d=0;d<u.length;++d){const p=un(i,u[d]);if(p===0&&!e.ignoreBoundary)return!0;if(p)return!0}return!1}function fn(n,t){return t[0]<=n[0]&&t[1]<=n[1]&&t[2]>=n[0]&&t[3]>=n[1]}function hn(n,t={}){const e=en(n),i=(e[0]+e[2])/2,r=(e[1]+e[3])/2;return xe([i,r],t.properties,t)}function pn(n){if(!n)throw new Error("geojson is required");switch(n.type){case"Feature":return vt(n);case"FeatureCollection":return gn(n);case"Point":case"LineString":case"Polygon":case"MultiPoint":case"MultiLineString":case"MultiPolygon":case"GeometryCollection":return Ke(n);default:throw new Error("unknown GeoJSON type")}}function vt(n){const t={type:"Feature"};return Object.keys(n).forEach(e=>{switch(e){case"type":case"properties":case"geometry":return;default:t[e]=n[e]}}),t.properties=xt(n.properties),n.geometry==null?t.geometry=null:t.geometry=Ke(n.geometry),t}function xt(n){const t={};return n&&Object.keys(n).forEach(e=>{const i=n[e];typeof i=="object"?i===null?t[e]=null:Array.isArray(i)?t[e]=i.map(r=>r):t[e]=xt(i):t[e]=i}),t}function gn(n){const t={type:"FeatureCollection"};return Object.keys(n).forEach(e=>{switch(e){case"type":case"features":return;default:t[e]=n[e]}}),t.features=n.features.map(e=>vt(e)),t}function Ke(n){const t={type:n.type};return n.bbox&&(t.bbox=n.bbox),n.type==="GeometryCollection"?(t.geometries=n.geometries.map(e=>Ke(e)),t):(t.coordinates=Et(n.coordinates),t)}function Et(n){const t=n;return typeof t[0]!="object"?t.slice():t.map(e=>Et(e))}var yn=/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i,ke=Math.ceil,ie=Math.floor,ee="[BigNumber Error] ",rt=ee+"Number primitive has more than 15 significant digits: ",oe=1e14,N=14,qe=9007199254740991,De=[1,10,100,1e3,1e4,1e5,1e6,1e7,1e8,1e9,1e10,1e11,1e12,1e13],he=1e7,X=1e9;function Ct(n){var t,e,i,r=S.prototype={constructor:S,toString:null,valueOf:null},s=new S(1),f=20,u=4,d=-7,p=21,b=-1e7,w=1e7,C=!1,P=1,L=0,O={prefix:"",groupSize:3,secondaryGroupSize:0,groupSeparator:",",decimalSeparator:".",fractionGroupSize:0,fractionGroupSeparator:" ",suffix:""},R="0123456789abcdefghijklmnopqrstuvwxyz",M=!0;function S(o,l){var a,m,c,g,v,h,y,x,E=this;if(!(E instanceof S))return new S(o,l);if(l==null){if(o&&o._isBigNumber===!0){E.s=o.s,!o.c||o.e>w?E.c=E.e=null:o.e<b?E.c=[E.e=0]:(E.e=o.e,E.c=o.c.slice());return}if((h=typeof o=="number")&&o*0==0){if(E.s=1/o<0?(o=-o,-1):1,o===~~o){for(g=0,v=o;v>=10;v/=10,g++);g>w?E.c=E.e=null:(E.e=g,E.c=[o]);return}x=String(o)}else{if(!yn.test(x=String(o)))return i(E,x,h);E.s=x.charCodeAt(0)==45?(x=x.slice(1),-1):1}(g=x.indexOf("."))>-1&&(x=x.replace(".","")),(v=x.search(/e/i))>0?(g<0&&(g=v),g+=+x.slice(v+1),x=x.substring(0,v)):g<0&&(g=x.length)}else{if($(l,2,R.length,"Base"),l==10&&M)return E=new S(o),F(E,f+E.e+1,u);if(x=String(o),h=typeof o=="number"){if(o*0!=0)return i(E,x,h,l);if(E.s=1/o<0?(x=x.slice(1),-1):1,S.DEBUG&&x.replace(/^0\.0*|\./,"").length>15)throw Error(rt+o)}else E.s=x.charCodeAt(0)===45?(x=x.slice(1),-1):1;for(a=R.slice(0,l),g=v=0,y=x.length;v<y;v++)if(a.indexOf(m=x.charAt(v))<0){if(m=="."){if(v>g){g=y;continue}}else if(!c&&(x==x.toUpperCase()&&(x=x.toLowerCase())||x==x.toLowerCase()&&(x=x.toUpperCase()))){c=!0,v=-1,g=0;continue}return i(E,String(o),h,l)}h=!1,x=e(x,l,10,E.s),(g=x.indexOf("."))>-1?x=x.replace(".",""):g=x.length}for(v=0;x.charCodeAt(v)===48;v++);for(y=x.length;x.charCodeAt(--y)===48;);if(x=x.slice(v,++y)){if(y-=v,h&&S.DEBUG&&y>15&&(o>qe||o!==ie(o)))throw Error(rt+E.s*o);if((g=g-v-1)>w)E.c=E.e=null;else if(g<b)E.c=[E.e=0];else{if(E.e=g,E.c=[],v=(g+1)%N,g<0&&(v+=N),v<y){for(v&&E.c.push(+x.slice(0,v)),y-=N;v<y;)E.c.push(+x.slice(v,v+=N));v=N-(x=x.slice(v)).length}else v-=y;for(;v--;x+="0");E.c.push(+x)}}else E.c=[E.e=0]}S.clone=Ct,S.ROUND_UP=0,S.ROUND_DOWN=1,S.ROUND_CEIL=2,S.ROUND_FLOOR=3,S.ROUND_HALF_UP=4,S.ROUND_HALF_DOWN=5,S.ROUND_HALF_EVEN=6,S.ROUND_HALF_CEIL=7,S.ROUND_HALF_FLOOR=8,S.EUCLID=9,S.config=S.set=function(o){var l,a;if(o!=null)if(typeof o=="object"){if(o.hasOwnProperty(l="DECIMAL_PLACES")&&(a=o[l],$(a,0,X,l),f=a),o.hasOwnProperty(l="ROUNDING_MODE")&&(a=o[l],$(a,0,8,l),u=a),o.hasOwnProperty(l="EXPONENTIAL_AT")&&(a=o[l],a&&a.pop?($(a[0],-X,0,l),$(a[1],0,X,l),d=a[0],p=a[1]):($(a,-X,X,l),d=-(p=a<0?-a:a))),o.hasOwnProperty(l="RANGE"))if(a=o[l],a&&a.pop)$(a[0],-X,-1,l),$(a[1],1,X,l),b=a[0],w=a[1];else if($(a,-X,X,l),a)b=-(w=a<0?-a:a);else throw Error(ee+l+" cannot be zero: "+a);if(o.hasOwnProperty(l="CRYPTO"))if(a=o[l],a===!!a)if(a)if(typeof crypto<"u"&&crypto&&(crypto.getRandomValues||crypto.randomBytes))C=a;else throw C=!a,Error(ee+"crypto unavailable");else C=a;else throw Error(ee+l+" not true or false: "+a);if(o.hasOwnProperty(l="MODULO_MODE")&&(a=o[l],$(a,0,9,l),P=a),o.hasOwnProperty(l="POW_PRECISION")&&(a=o[l],$(a,0,X,l),L=a),o.hasOwnProperty(l="FORMAT"))if(a=o[l],typeof a=="object")O=a;else throw Error(ee+l+" not an object: "+a);if(o.hasOwnProperty(l="ALPHABET"))if(a=o[l],typeof a=="string"&&!/^.?$|[+\-.\s]|(.).*\1/.test(a))M=a.slice(0,10)=="0123456789",R=a;else throw Error(ee+l+" invalid: "+a)}else throw Error(ee+"Object expected: "+o);return{DECIMAL_PLACES:f,ROUNDING_MODE:u,EXPONENTIAL_AT:[d,p],RANGE:[b,w],CRYPTO:C,MODULO_MODE:P,POW_PRECISION:L,FORMAT:O,ALPHABET:R}},S.isBigNumber=function(o){if(!o||o._isBigNumber!==!0)return!1;if(!S.DEBUG)return!0;var l,a,m=o.c,c=o.e,g=o.s;e:if({}.toString.call(m)=="[object Array]"){if((g===1||g===-1)&&c>=-X&&c<=X&&c===ie(c)){if(m[0]===0){if(c===0&&m.length===1)return!0;break e}if(l=(c+1)%N,l<1&&(l+=N),String(m[0]).length==l){for(l=0;l<m.length;l++)if(a=m[l],a<0||a>=oe||a!==ie(a))break e;if(a!==0)return!0}}}else if(m===null&&c===null&&(g===null||g===1||g===-1))return!0;throw Error(ee+"Invalid BigNumber: "+o)},S.maximum=S.max=function(){return q(arguments,-1)},S.minimum=S.min=function(){return q(arguments,1)},S.random=(function(){var o=9007199254740992,l=Math.random()*o&2097151?function(){return ie(Math.random()*o)}:function(){return(Math.random()*1073741824|0)*8388608+(Math.random()*8388608|0)};return function(a){var m,c,g,v,h,y=0,x=[],E=new S(s);if(a==null?a=f:$(a,0,X),v=ke(a/N),C)if(crypto.getRandomValues){for(m=crypto.getRandomValues(new Uint32Array(v*=2));y<v;)h=m[y]*131072+(m[y+1]>>>11),h>=9e15?(c=crypto.getRandomValues(new Uint32Array(2)),m[y]=c[0],m[y+1]=c[1]):(x.push(h%1e14),y+=2);y=v/2}else if(crypto.randomBytes){for(m=crypto.randomBytes(v*=7);y<v;)h=(m[y]&31)*281474976710656+m[y+1]*1099511627776+m[y+2]*4294967296+m[y+3]*16777216+(m[y+4]<<16)+(m[y+5]<<8)+m[y+6],h>=9e15?crypto.randomBytes(7).copy(m,y):(x.push(h%1e14),y+=7);y=v/7}else throw C=!1,Error(ee+"crypto unavailable");if(!C)for(;y<v;)h=l(),h<9e15&&(x[y++]=h%1e14);for(v=x[--y],a%=N,v&&a&&(h=De[N-a],x[y]=ie(v/h)*h);x[y]===0;x.pop(),y--);if(y<0)x=[g=0];else{for(g=-1;x[0]===0;x.splice(0,1),g-=N);for(y=1,h=x[0];h>=10;h/=10,y++);y<N&&(g-=N-y)}return E.e=g,E.c=x,E}})(),S.sum=function(){for(var o=1,l=arguments,a=new S(l[0]);o<l.length;)a=a.plus(l[o++]);return a},e=(function(){var o="0123456789";function l(a,m,c,g){for(var v,h=[0],y,x=0,E=a.length;x<E;){for(y=h.length;y--;h[y]*=m);for(h[0]+=g.indexOf(a.charAt(x++)),v=0;v<h.length;v++)h[v]>c-1&&(h[v+1]==null&&(h[v+1]=0),h[v+1]+=h[v]/c|0,h[v]%=c)}return h.reverse()}return function(a,m,c,g,v){var h,y,x,E,T,I,_,G,H=a.indexOf("."),K=f,D=u;for(H>=0&&(E=L,L=0,a=a.replace(".",""),G=new S(m),I=G.pow(a.length-H),L=E,G.c=l(ue(ne(I.c),I.e,"0"),10,c,o),G.e=G.c.length),_=l(a,m,c,v?(h=R,o):(h=o,R)),x=E=_.length;_[--E]==0;_.pop());if(!_[0])return h.charAt(0);if(H<0?--x:(I.c=_,I.e=x,I.s=g,I=t(I,G,K,D,c),_=I.c,T=I.r,x=I.e),y=x+K+1,H=_[y],E=c/2,T=T||y<0||_[y+1]!=null,T=D<4?(H!=null||T)&&(D==0||D==(I.s<0?3:2)):H>E||H==E&&(D==4||T||D==6&&_[y-1]&1||D==(I.s<0?8:7)),y<1||!_[0])a=T?ue(h.charAt(1),-K,h.charAt(0)):h.charAt(0);else{if(_.length=y,T)for(--c;++_[--y]>c;)_[y]=0,y||(++x,_=[1].concat(_));for(E=_.length;!_[--E];);for(H=0,a="";H<=E;a+=h.charAt(_[H++]));a=ue(a,x,h.charAt(0))}return a}})(),t=(function(){function o(m,c,g){var v,h,y,x,E=0,T=m.length,I=c%he,_=c/he|0;for(m=m.slice();T--;)y=m[T]%he,x=m[T]/he|0,v=_*y+x*I,h=I*y+v%he*he+E,E=(h/g|0)+(v/he|0)+_*x,m[T]=h%g;return E&&(m=[E].concat(m)),m}function l(m,c,g,v){var h,y;if(g!=v)y=g>v?1:-1;else for(h=y=0;h<g;h++)if(m[h]!=c[h]){y=m[h]>c[h]?1:-1;break}return y}function a(m,c,g,v){for(var h=0;g--;)m[g]-=h,h=m[g]<c[g]?1:0,m[g]=h*v+m[g]-c[g];for(;!m[0]&&m.length>1;m.splice(0,1));}return function(m,c,g,v,h){var y,x,E,T,I,_,G,H,K,D,U,Z,be,Ne,Be,se,ye,te=m.s==c.s?1:-1,J=m.c,Y=c.c;if(!J||!J[0]||!Y||!Y[0])return new S(!m.s||!c.s||(J?Y&&J[0]==Y[0]:!Y)?NaN:J&&J[0]==0||!Y?te*0:te/0);for(H=new S(te),K=H.c=[],x=m.e-c.e,te=g+x+1,h||(h=oe,x=re(m.e/N)-re(c.e/N),te=te/N|0),E=0;Y[E]==(J[E]||0);E++);if(Y[E]>(J[E]||0)&&x--,te<0)K.push(1),T=!0;else{for(Ne=J.length,se=Y.length,E=0,te+=2,I=ie(h/(Y[0]+1)),I>1&&(Y=o(Y,I,h),J=o(J,I,h),se=Y.length,Ne=J.length),be=se,D=J.slice(0,se),U=D.length;U<se;D[U++]=0);ye=Y.slice(),ye=[0].concat(ye),Be=Y[0],Y[1]>=h/2&&Be++;do{if(I=0,y=l(Y,D,se,U),y<0){if(Z=D[0],se!=U&&(Z=Z*h+(D[1]||0)),I=ie(Z/Be),I>1)for(I>=h&&(I=h-1),_=o(Y,I,h),G=_.length,U=D.length;l(_,D,G,U)==1;)I--,a(_,se<G?ye:Y,G,h),G=_.length,y=1;else I==0&&(y=I=1),_=Y.slice(),G=_.length;if(G<U&&(_=[0].concat(_)),a(D,_,U,h),U=D.length,y==-1)for(;l(Y,D,se,U)<1;)I++,a(D,se<U?ye:Y,U,h),U=D.length}else y===0&&(I++,D=[0]);K[E++]=I,D[0]?D[U++]=J[be]||0:(D=[J[be]],U=1)}while((be++<Ne||D[0]!=null)&&te--);T=D[0]!=null,K[0]||K.splice(0,1)}if(h==oe){for(E=1,te=K[0];te>=10;te/=10,E++);F(H,g+(H.e=E+x*N-1)+1,v,T)}else H.e=x,H.r=+T;return H}})();function k(o,l,a,m){var c,g,v,h,y;if(a==null?a=u:$(a,0,8),!o.c)return o.toString();if(c=o.c[0],v=o.e,l==null)y=ne(o.c),y=m==1||m==2&&(v<=d||v>=p)?Oe(y,v):ue(y,v,"0");else if(o=F(new S(o),l,a),g=o.e,y=ne(o.c),h=y.length,m==1||m==2&&(l<=g||g<=d)){for(;h<l;y+="0",h++);y=Oe(y,g)}else if(l-=v+(m===2&&g>v),y=ue(y,g,"0"),g+1>h){if(--l>0)for(y+=".";l--;y+="0");}else if(l+=g-h,l>0)for(g+1==h&&(y+=".");l--;y+="0");return o.s<0&&c?"-"+y:y}function q(o,l){for(var a,m,c=1,g=new S(o[0]);c<o.length;c++)m=new S(o[c]),(!m.s||(a=pe(g,m))===l||a===0&&g.s===l)&&(g=m);return g}function B(o,l,a){for(var m=1,c=l.length;!l[--c];l.pop());for(c=l[0];c>=10;c/=10,m++);return(a=m+a*N-1)>w?o.c=o.e=null:a<b?o.c=[o.e=0]:(o.e=a,o.c=l),o}i=(function(){var o=/^(-?)0([xbo])(?=\w[\w.]*$)/i,l=/^([^.]+)\.$/,a=/^\.([^.]+)$/,m=/^-?(Infinity|NaN)$/,c=/^\s*\+(?=[\w.])|^\s+|\s+$/g;return function(g,v,h,y){var x,E=h?v:v.replace(c,"");if(m.test(E))g.s=isNaN(E)?null:E<0?-1:1;else{if(!h&&(E=E.replace(o,function(T,I,_){return x=(_=_.toLowerCase())=="x"?16:_=="b"?2:8,!y||y==x?I:T}),y&&(x=y,E=E.replace(l,"$1").replace(a,"0.$1")),v!=E))return new S(E,x);if(S.DEBUG)throw Error(ee+"Not a"+(y?" base "+y:"")+" number: "+v);g.s=null}g.c=g.e=null}})();function F(o,l,a,m){var c,g,v,h,y,x,E,T=o.c,I=De;if(T){e:{for(c=1,h=T[0];h>=10;h/=10,c++);if(g=l-c,g<0)g+=N,v=l,y=T[x=0],E=ie(y/I[c-v-1]%10);else if(x=ke((g+1)/N),x>=T.length)if(m){for(;T.length<=x;T.push(0));y=E=0,c=1,g%=N,v=g-N+1}else break e;else{for(y=h=T[x],c=1;h>=10;h/=10,c++);g%=N,v=g-N+c,E=v<0?0:ie(y/I[c-v-1]%10)}if(m=m||l<0||T[x+1]!=null||(v<0?y:y%I[c-v-1]),m=a<4?(E||m)&&(a==0||a==(o.s<0?3:2)):E>5||E==5&&(a==4||m||a==6&&(g>0?v>0?y/I[c-v]:0:T[x-1])%10&1||a==(o.s<0?8:7)),l<1||!T[0])return T.length=0,m?(l-=o.e+1,T[0]=I[(N-l%N)%N],o.e=-l||0):T[0]=o.e=0,o;if(g==0?(T.length=x,h=1,x--):(T.length=x+1,h=I[N-g],T[x]=v>0?ie(y/I[c-v]%I[v])*h:0),m)for(;;)if(x==0){for(g=1,v=T[0];v>=10;v/=10,g++);for(v=T[0]+=h,h=1;v>=10;v/=10,h++);g!=h&&(o.e++,T[0]==oe&&(T[0]=1));break}else{if(T[x]+=h,T[x]!=oe)break;T[x--]=0,h=1}for(g=T.length;T[--g]===0;T.pop());}o.e>w?o.c=o.e=null:o.e<b&&(o.c=[o.e=0])}return o}function z(o){var l,a=o.e;return a===null?o.toString():(l=ne(o.c),l=a<=d||a>=p?Oe(l,a):ue(l,a,"0"),o.s<0?"-"+l:l)}return r.absoluteValue=r.abs=function(){var o=new S(this);return o.s<0&&(o.s=1),o},r.comparedTo=function(o,l){return pe(this,new S(o,l))},r.decimalPlaces=r.dp=function(o,l){var a,m,c,g=this;if(o!=null)return $(o,0,X),l==null?l=u:$(l,0,8),F(new S(g),o+g.e+1,l);if(!(a=g.c))return null;if(m=((c=a.length-1)-re(this.e/N))*N,c=a[c])for(;c%10==0;c/=10,m--);return m<0&&(m=0),m},r.dividedBy=r.div=function(o,l){return t(this,new S(o,l),f,u)},r.dividedToIntegerBy=r.idiv=function(o,l){return t(this,new S(o,l),0,1)},r.exponentiatedBy=r.pow=function(o,l){var a,m,c,g,v,h,y,x,E,T=this;if(o=new S(o),o.c&&!o.isInteger())throw Error(ee+"Exponent not an integer: "+z(o));if(l!=null&&(l=new S(l)),h=o.e>14,!T.c||!T.c[0]||T.c[0]==1&&!T.e&&T.c.length==1||!o.c||!o.c[0])return E=new S(Math.pow(+z(T),h?o.s*(2-Pe(o)):+z(o))),l?E.mod(l):E;if(y=o.s<0,l){if(l.c?!l.c[0]:!l.s)return new S(NaN);m=!y&&T.isInteger()&&l.isInteger(),m&&(T=T.mod(l))}else{if(o.e>9&&(T.e>0||T.e<-1||(T.e==0?T.c[0]>1||h&&T.c[1]>=24e7:T.c[0]<8e13||h&&T.c[0]<=9999975e7)))return g=T.s<0&&Pe(o)?-0:0,T.e>-1&&(g=1/g),new S(y?1/g:g);L&&(g=ke(L/N+2))}for(h?(a=new S(.5),y&&(o.s=1),x=Pe(o)):(c=Math.abs(+z(o)),x=c%2),E=new S(s);;){if(x){if(E=E.times(T),!E.c)break;g?E.c.length>g&&(E.c.length=g):m&&(E=E.mod(l))}if(c){if(c=ie(c/2),c===0)break;x=c%2}else if(o=o.times(a),F(o,o.e+1,1),o.e>14)x=Pe(o);else{if(c=+z(o),c===0)break;x=c%2}T=T.times(T),g?T.c&&T.c.length>g&&(T.c.length=g):m&&(T=T.mod(l))}return m?E:(y&&(E=s.div(E)),l?E.mod(l):g?F(E,L,u,v):E)},r.integerValue=function(o){var l=new S(this);return o==null?o=u:$(o,0,8),F(l,l.e+1,o)},r.isEqualTo=r.eq=function(o,l){return pe(this,new S(o,l))===0},r.isFinite=function(){return!!this.c},r.isGreaterThan=r.gt=function(o,l){return pe(this,new S(o,l))>0},r.isGreaterThanOrEqualTo=r.gte=function(o,l){return(l=pe(this,new S(o,l)))===1||l===0},r.isInteger=function(){return!!this.c&&re(this.e/N)>this.c.length-2},r.isLessThan=r.lt=function(o,l){return pe(this,new S(o,l))<0},r.isLessThanOrEqualTo=r.lte=function(o,l){return(l=pe(this,new S(o,l)))===-1||l===0},r.isNaN=function(){return!this.s},r.isNegative=function(){return this.s<0},r.isPositive=function(){return this.s>0},r.isZero=function(){return!!this.c&&this.c[0]==0},r.minus=function(o,l){var a,m,c,g,v=this,h=v.s;if(o=new S(o,l),l=o.s,!h||!l)return new S(NaN);if(h!=l)return o.s=-l,v.plus(o);var y=v.e/N,x=o.e/N,E=v.c,T=o.c;if(!y||!x){if(!E||!T)return E?(o.s=-l,o):new S(T?v:NaN);if(!E[0]||!T[0])return T[0]?(o.s=-l,o):new S(E[0]?v:u==3?-0:0)}if(y=re(y),x=re(x),E=E.slice(),h=y-x){for((g=h<0)?(h=-h,c=E):(x=y,c=T),c.reverse(),l=h;l--;c.push(0));c.reverse()}else for(m=(g=(h=E.length)<(l=T.length))?h:l,h=l=0;l<m;l++)if(E[l]!=T[l]){g=E[l]<T[l];break}if(g&&(c=E,E=T,T=c,o.s=-o.s),l=(m=T.length)-(a=E.length),l>0)for(;l--;E[a++]=0);for(l=oe-1;m>h;){if(E[--m]<T[m]){for(a=m;a&&!E[--a];E[a]=l);--E[a],E[m]+=oe}E[m]-=T[m]}for(;E[0]==0;E.splice(0,1),--x);return E[0]?B(o,E,x):(o.s=u==3?-1:1,o.c=[o.e=0],o)},r.modulo=r.mod=function(o,l){var a,m,c=this;return o=new S(o,l),!c.c||!o.s||o.c&&!o.c[0]?new S(NaN):!o.c||c.c&&!c.c[0]?new S(c):(P==9?(m=o.s,o.s=1,a=t(c,o,0,3),o.s=m,a.s*=m):a=t(c,o,0,P),o=c.minus(a.times(o)),!o.c[0]&&P==1&&(o.s=c.s),o)},r.multipliedBy=r.times=function(o,l){var a,m,c,g,v,h,y,x,E,T,I,_,G,H,K,D=this,U=D.c,Z=(o=new S(o,l)).c;if(!U||!Z||!U[0]||!Z[0])return!D.s||!o.s||U&&!U[0]&&!Z||Z&&!Z[0]&&!U?o.c=o.e=o.s=null:(o.s*=D.s,!U||!Z?o.c=o.e=null:(o.c=[0],o.e=0)),o;for(m=re(D.e/N)+re(o.e/N),o.s*=D.s,y=U.length,T=Z.length,y<T&&(G=U,U=Z,Z=G,c=y,y=T,T=c),c=y+T,G=[];c--;G.push(0));for(H=oe,K=he,c=T;--c>=0;){for(a=0,I=Z[c]%K,_=Z[c]/K|0,v=y,g=c+v;g>c;)x=U[--v]%K,E=U[v]/K|0,h=_*x+E*I,x=I*x+h%K*K+G[g]+a,a=(x/H|0)+(h/K|0)+_*E,G[g--]=x%H;G[g]=a}return a?++m:G.splice(0,1),B(o,G,m)},r.negated=function(){var o=new S(this);return o.s=-o.s||null,o},r.plus=function(o,l){var a,m=this,c=m.s;if(o=new S(o,l),l=o.s,!c||!l)return new S(NaN);if(c!=l)return o.s=-l,m.minus(o);var g=m.e/N,v=o.e/N,h=m.c,y=o.c;if(!g||!v){if(!h||!y)return new S(c/0);if(!h[0]||!y[0])return y[0]?o:new S(h[0]?m:c*0)}if(g=re(g),v=re(v),h=h.slice(),c=g-v){for(c>0?(v=g,a=y):(c=-c,a=h),a.reverse();c--;a.push(0));a.reverse()}for(c=h.length,l=y.length,c-l<0&&(a=y,y=h,h=a,l=c),c=0;l;)c=(h[--l]=h[l]+y[l]+c)/oe|0,h[l]=oe===h[l]?0:h[l]%oe;return c&&(h=[c].concat(h),++v),B(o,h,v)},r.precision=r.sd=function(o,l){var a,m,c,g=this;if(o!=null&&o!==!!o)return $(o,1,X),l==null?l=u:$(l,0,8),F(new S(g),o,l);if(!(a=g.c))return null;if(c=a.length-1,m=c*N+1,c=a[c]){for(;c%10==0;c/=10,m--);for(c=a[0];c>=10;c/=10,m++);}return o&&g.e+1>m&&(m=g.e+1),m},r.shiftedBy=function(o){return $(o,-qe,qe),this.times("1e"+o)},r.squareRoot=r.sqrt=function(){var o,l,a,m,c,g=this,v=g.c,h=g.s,y=g.e,x=f+4,E=new S("0.5");if(h!==1||!v||!v[0])return new S(!h||h<0&&(!v||v[0])?NaN:v?g:1/0);if(h=Math.sqrt(+z(g)),h==0||h==1/0?(l=ne(v),(l.length+y)%2==0&&(l+="0"),h=Math.sqrt(+l),y=re((y+1)/2)-(y<0||y%2),h==1/0?l="5e"+y:(l=h.toExponential(),l=l.slice(0,l.indexOf("e")+1)+y),a=new S(l)):a=new S(h+""),a.c[0]){for(y=a.e,h=y+x,h<3&&(h=0);;)if(c=a,a=E.times(c.plus(t(g,c,x,1))),ne(c.c).slice(0,h)===(l=ne(a.c)).slice(0,h))if(a.e<y&&--h,l=l.slice(h-3,h+1),l=="9999"||!m&&l=="4999"){if(!m&&(F(c,c.e+f+2,0),c.times(c).eq(g))){a=c;break}x+=4,h+=4,m=1}else{(!+l||!+l.slice(1)&&l.charAt(0)=="5")&&(F(a,a.e+f+2,1),o=!a.times(a).eq(g));break}}return F(a,a.e+f+1,u,o)},r.toExponential=function(o,l){return o!=null&&($(o,0,X),o++),k(this,o,l,1)},r.toFixed=function(o,l){return o!=null&&($(o,0,X),o=o+this.e+1),k(this,o,l)},r.toFormat=function(o,l,a){var m,c=this;if(a==null)o!=null&&l&&typeof l=="object"?(a=l,l=null):o&&typeof o=="object"?(a=o,o=l=null):a=O;else if(typeof a!="object")throw Error(ee+"Argument not an object: "+a);if(m=c.toFixed(o,l),c.c){var g,v=m.split("."),h=+a.groupSize,y=+a.secondaryGroupSize,x=a.groupSeparator||"",E=v[0],T=v[1],I=c.s<0,_=I?E.slice(1):E,G=_.length;if(y&&(g=h,h=y,y=g,G-=g),h>0&&G>0){for(g=G%h||h,E=_.substr(0,g);g<G;g+=h)E+=x+_.substr(g,h);y>0&&(E+=x+_.slice(g)),I&&(E="-"+E)}m=T?E+(a.decimalSeparator||"")+((y=+a.fractionGroupSize)?T.replace(new RegExp("\\d{"+y+"}\\B","g"),"$&"+(a.fractionGroupSeparator||"")):T):E}return(a.prefix||"")+m+(a.suffix||"")},r.toFraction=function(o){var l,a,m,c,g,v,h,y,x,E,T,I,_=this,G=_.c;if(o!=null&&(h=new S(o),!h.isInteger()&&(h.c||h.s!==1)||h.lt(s)))throw Error(ee+"Argument "+(h.isInteger()?"out of range: ":"not an integer: ")+z(h));if(!G)return new S(_);for(l=new S(s),x=a=new S(s),m=y=new S(s),I=ne(G),g=l.e=I.length-_.e-1,l.c[0]=De[(v=g%N)<0?N+v:v],o=!o||h.comparedTo(l)>0?g>0?l:x:h,v=w,w=1/0,h=new S(I),y.c[0]=0;E=t(h,l,0,1),c=a.plus(E.times(m)),c.comparedTo(o)!=1;)a=m,m=c,x=y.plus(E.times(c=x)),y=c,l=h.minus(E.times(c=l)),h=c;return c=t(o.minus(a),m,0,1),y=y.plus(c.times(x)),a=a.plus(c.times(m)),y.s=x.s=_.s,g=g*2,T=t(x,m,g,u).minus(_).abs().comparedTo(t(y,a,g,u).minus(_).abs())<1?[x,m]:[y,a],w=v,T},r.toNumber=function(){return+z(this)},r.toPrecision=function(o,l){return o!=null&&$(o,1,X),k(this,o,l,2)},r.toString=function(o){var l,a=this,m=a.s,c=a.e;return c===null?m?(l="Infinity",m<0&&(l="-"+l)):l="NaN":(o==null?l=c<=d||c>=p?Oe(ne(a.c),c):ue(ne(a.c),c,"0"):o===10&&M?(a=F(new S(a),f+c+1,u),l=ue(ne(a.c),a.e,"0")):($(o,2,R.length,"Base"),l=e(ue(ne(a.c),c,"0"),10,o,m,!0)),m<0&&a.c[0]&&(l="-"+l)),l},r.valueOf=r.toJSON=function(){return z(this)},r._isBigNumber=!0,r[Symbol.toStringTag]="BigNumber",r[Symbol.for("nodejs.util.inspect.custom")]=r.valueOf,n!=null&&S.set(n),S}function re(n){var t=n|0;return n>0||n===t?t:t-1}function ne(n){for(var t,e,i=1,r=n.length,s=n[0]+"";i<r;){for(t=n[i++]+"",e=N-t.length;e--;t="0"+t);s+=t}for(r=s.length;s.charCodeAt(--r)===48;);return s.slice(0,r+1||1)}function pe(n,t){var e,i,r=n.c,s=t.c,f=n.s,u=t.s,d=n.e,p=t.e;if(!f||!u)return null;if(e=r&&!r[0],i=s&&!s[0],e||i)return e?i?0:-u:f;if(f!=u)return f;if(e=f<0,i=d==p,!r||!s)return i?0:!r^e?1:-1;if(!i)return d>p^e?1:-1;for(u=(d=r.length)<(p=s.length)?d:p,f=0;f<u;f++)if(r[f]!=s[f])return r[f]>s[f]^e?1:-1;return d==p?0:d>p^e?1:-1}function $(n,t,e,i){if(n<t||n>e||n!==ie(n))throw Error(ee+(i||"Argument")+(typeof n=="number"?n<t||n>e?" out of range: ":" not an integer: ":" not a primitive number: ")+String(n))}function Pe(n){var t=n.c.length-1;return re(n.e/N)==t&&n.c[t]%2!=0}function Oe(n,t){return(n.length>1?n.charAt(0)+"."+n.slice(1):n)+(t<0?"e":"e+")+t}function ue(n,t,e){var i,r;if(t<0){for(r=e+".";++t;r+=e);n=r+n}else if(i=n.length,++t>i){for(r=e,t-=i;--t;r+=e);n+=r}else t<i&&(n=n.slice(0,t)+"."+n.slice(t));return n}var ae=Ct(),dn=class{constructor(n){A(this,"key");A(this,"left",null);A(this,"right",null);this.key=n}},de=class extends dn{constructor(n){super(n)}},mn=class{constructor(){A(this,"size",0);A(this,"modificationCount",0);A(this,"splayCount",0)}splay(n){const t=this.root;if(t==null)return this.compare(n,n),-1;let e=null,i=null,r=null,s=null,f=t;const u=this.compare;let d;for(;;)if(d=u(f.key,n),d>0){let p=f.left;if(p==null||(d=u(p.key,n),d>0&&(f.left=p.right,p.right=f,f=p,p=f.left,p==null)))break;e==null?i=f:e.left=f,e=f,f=p}else if(d<0){let p=f.right;if(p==null||(d=u(p.key,n),d<0&&(f.right=p.left,p.left=f,f=p,p=f.right,p==null)))break;r==null?s=f:r.right=f,r=f,f=p}else break;return r!=null&&(r.right=f.left,f.left=s),e!=null&&(e.left=f.right,f.right=i),this.root!==f&&(this.root=f,this.splayCount++),d}splayMin(n){let t=n,e=t.left;for(;e!=null;){const i=e;t.left=i.right,i.right=t,t=i,e=t.left}return t}splayMax(n){let t=n,e=t.right;for(;e!=null;){const i=e;t.right=i.left,i.left=t,t=i,e=t.right}return t}_delete(n){if(this.root==null||this.splay(n)!=0)return null;let e=this.root;const i=e,r=e.left;if(this.size--,r==null)this.root=e.right;else{const s=e.right;e=this.splayMax(r),e.right=s,this.root=e}return this.modificationCount++,i}addNewRoot(n,t){this.size++,this.modificationCount++;const e=this.root;if(e==null){this.root=n;return}t<0?(n.left=e,n.right=e.right,e.right=null):(n.right=e,n.left=e.left,e.left=null),this.root=n}_first(){const n=this.root;return n==null?null:(this.root=this.splayMin(n),this.root)}_last(){const n=this.root;return n==null?null:(this.root=this.splayMax(n),this.root)}clear(){this.root=null,this.size=0,this.modificationCount++}has(n){return this.validKey(n)&&this.splay(n)==0}defaultCompare(){return(n,t)=>n<t?-1:n>t?1:0}wrap(){return{getRoot:()=>this.root,setRoot:n=>{this.root=n},getSize:()=>this.size,getModificationCount:()=>this.modificationCount,getSplayCount:()=>this.splayCount,setSplayCount:n=>{this.splayCount=n},splay:n=>this.splay(n),has:n=>this.has(n)}}},yt,dt,Ie=class we extends mn{constructor(e,i){super();A(this,"root",null);A(this,"compare");A(this,"validKey");A(this,yt,"[object Set]");this.compare=e??this.defaultCompare(),this.validKey=i??(r=>r!=null&&r!=null)}delete(e){return this.validKey(e)?this._delete(e)!=null:!1}deleteAll(e){for(const i of e)this.delete(i)}forEach(e){const i=this[Symbol.iterator]();let r;for(;r=i.next(),!r.done;)e(r.value,r.value,this)}add(e){const i=this.splay(e);return i!=0&&this.addNewRoot(new de(e),i),this}addAndReturn(e){const i=this.splay(e);return i!=0&&this.addNewRoot(new de(e),i),this.root.key}addAll(e){for(const i of e)this.add(i)}isEmpty(){return this.root==null}isNotEmpty(){return this.root!=null}single(){if(this.size==0)throw"Bad state: No element";if(this.size>1)throw"Bad state: Too many element";return this.root.key}first(){if(this.size==0)throw"Bad state: No element";return this._first().key}last(){if(this.size==0)throw"Bad state: No element";return this._last().key}lastBefore(e){if(e==null)throw"Invalid arguments(s)";if(this.root==null)return null;if(this.splay(e)<0)return this.root.key;let r=this.root.left;if(r==null)return null;let s=r.right;for(;s!=null;)r=s,s=r.right;return r.key}firstAfter(e){if(e==null)throw"Invalid arguments(s)";if(this.root==null)return null;if(this.splay(e)>0)return this.root.key;let r=this.root.right;if(r==null)return null;let s=r.left;for(;s!=null;)r=s,s=r.left;return r.key}retainAll(e){const i=new we(this.compare,this.validKey),r=this.modificationCount;for(const s of e){if(r!=this.modificationCount)throw"Concurrent modification during iteration.";this.validKey(s)&&this.splay(s)==0&&i.add(this.root.key)}i.size!=this.size&&(this.root=i.root,this.size=i.size,this.modificationCount++)}lookup(e){return!this.validKey(e)||this.splay(e)!=0?null:this.root.key}intersection(e){const i=new we(this.compare,this.validKey);for(const r of this)e.has(r)&&i.add(r);return i}difference(e){const i=new we(this.compare,this.validKey);for(const r of this)e.has(r)||i.add(r);return i}union(e){const i=this.clone();return i.addAll(e),i}clone(){const e=new we(this.compare,this.validKey);return e.size=this.size,e.root=this.copyNode(this.root),e}copyNode(e){if(e==null)return null;function i(s,f){let u,d;do{if(u=s.left,d=s.right,u!=null){const p=new de(u.key);f.left=p,i(u,p)}if(d!=null){const p=new de(d.key);f.right=p,s=d,f=p}}while(d!=null)}const r=new de(e.key);return i(e,r),r}toSet(){return this.clone()}entries(){return new vn(this.wrap())}keys(){return this[Symbol.iterator]()}values(){return this[Symbol.iterator]()}[(dt=Symbol.iterator,yt=Symbol.toStringTag,dt)](){return new wn(this.wrap())}},St=class{constructor(n){A(this,"tree");A(this,"path",new Array);A(this,"modificationCount",null);A(this,"splayCount");this.tree=n,this.splayCount=n.getSplayCount()}[Symbol.iterator](){return this}next(){return this.moveNext()?{done:!1,value:this.current()}:{done:!0,value:null}}current(){if(!this.path.length)return null;const n=this.path[this.path.length-1];return this.getValue(n)}rebuildPath(n){this.path.splice(0,this.path.length),this.tree.splay(n),this.path.push(this.tree.getRoot()),this.splayCount=this.tree.getSplayCount()}findLeftMostDescendent(n){for(;n!=null;)this.path.push(n),n=n.left}moveNext(){if(this.modificationCount!=this.tree.getModificationCount()){if(this.modificationCount==null){this.modificationCount=this.tree.getModificationCount();let e=this.tree.getRoot();for(;e!=null;)this.path.push(e),e=e.left;return this.path.length>0}throw"Concurrent modification during iteration."}if(!this.path.length)return!1;this.splayCount!=this.tree.getSplayCount()&&this.rebuildPath(this.path[this.path.length-1].key);let n=this.path[this.path.length-1],t=n.right;if(t!=null){for(;t!=null;)this.path.push(t),t=t.left;return!0}for(this.path.pop();this.path.length&&this.path[this.path.length-1].right===n;)n=this.path.pop();return this.path.length>0}},wn=class extends St{getValue(n){return n.key}},vn=class extends St{getValue(n){return[n.key,n.key]}},bt=n=>()=>n,Ve=n=>{const t=n?(e,i)=>i.minus(e).abs().isLessThanOrEqualTo(n):bt(!1);return(e,i)=>t(e,i)?0:e.comparedTo(i)};function xn(n){const t=n?(e,i,r,s,f)=>e.exponentiatedBy(2).isLessThanOrEqualTo(s.minus(i).exponentiatedBy(2).plus(f.minus(r).exponentiatedBy(2)).times(n)):bt(!1);return(e,i,r)=>{const s=e.x,f=e.y,u=r.x,d=r.y,p=f.minus(d).times(i.x.minus(u)).minus(s.minus(u).times(i.y.minus(d)));return t(p,s,f,u,d)?0:p.comparedTo(0)}}var En=n=>n,Cn=n=>{if(n){const t=new Ie(Ve(n)),e=new Ie(Ve(n)),i=(s,f)=>f.addAndReturn(s),r=s=>({x:i(s.x,t),y:i(s.y,e)});return r({x:new ae(0),y:new ae(0)}),r}return En},We=n=>({set:t=>{fe=We(t)},reset:()=>We(n),compare:Ve(n),snap:Cn(n),orient:xn(n)}),fe=We(),me=(n,t)=>n.ll.x.isLessThanOrEqualTo(t.x)&&t.x.isLessThanOrEqualTo(n.ur.x)&&n.ll.y.isLessThanOrEqualTo(t.y)&&t.y.isLessThanOrEqualTo(n.ur.y),$e=(n,t)=>{if(t.ur.x.isLessThan(n.ll.x)||n.ur.x.isLessThan(t.ll.x)||t.ur.y.isLessThan(n.ll.y)||n.ur.y.isLessThan(t.ll.y))return null;const e=n.ll.x.isLessThan(t.ll.x)?t.ll.x:n.ll.x,i=n.ur.x.isLessThan(t.ur.x)?n.ur.x:t.ur.x,r=n.ll.y.isLessThan(t.ll.y)?t.ll.y:n.ll.y,s=n.ur.y.isLessThan(t.ur.y)?n.ur.y:t.ur.y;return{ll:{x:e,y:r},ur:{x:i,y:s}}},Le=(n,t)=>n.x.times(t.y).minus(n.y.times(t.x)),Tt=(n,t)=>n.x.times(t.x).plus(n.y.times(t.y)),_e=n=>Tt(n,n).sqrt(),Sn=(n,t,e)=>{const i={x:t.x.minus(n.x),y:t.y.minus(n.y)},r={x:e.x.minus(n.x),y:e.y.minus(n.y)};return Le(r,i).div(_e(r)).div(_e(i))},bn=(n,t,e)=>{const i={x:t.x.minus(n.x),y:t.y.minus(n.y)},r={x:e.x.minus(n.x),y:e.y.minus(n.y)};return Tt(r,i).div(_e(r)).div(_e(i))},ot=(n,t,e)=>t.y.isZero()?null:{x:n.x.plus(t.x.div(t.y).times(e.minus(n.y))),y:e},st=(n,t,e)=>t.x.isZero()?null:{x:e,y:n.y.plus(t.y.div(t.x).times(e.minus(n.x)))},Tn=(n,t,e,i)=>{if(t.x.isZero())return st(e,i,n.x);if(i.x.isZero())return st(n,t,e.x);if(t.y.isZero())return ot(e,i,n.y);if(i.y.isZero())return ot(n,t,e.y);const r=Le(t,i);if(r.isZero())return null;const s={x:e.x.minus(n.x),y:e.y.minus(n.y)},f=Le(s,t).div(r),u=Le(s,i).div(r),d=n.x.plus(u.times(t.x)),p=e.x.plus(f.times(i.x)),b=n.y.plus(u.times(t.y)),w=e.y.plus(f.times(i.y)),C=d.plus(p).div(2),P=b.plus(w).div(2);return{x:C,y:P}},le=class Pt{constructor(t,e){A(this,"point");A(this,"isLeft");A(this,"segment");A(this,"otherSE");A(this,"consumedBy");t.events===void 0?t.events=[this]:t.events.push(this),this.point=t,this.isLeft=e}static compare(t,e){const i=Pt.comparePoints(t.point,e.point);return i!==0?i:(t.point!==e.point&&t.link(e),t.isLeft!==e.isLeft?t.isLeft?1:-1:Ae.compare(t.segment,e.segment))}static comparePoints(t,e){return t.x.isLessThan(e.x)?-1:t.x.isGreaterThan(e.x)?1:t.y.isLessThan(e.y)?-1:t.y.isGreaterThan(e.y)?1:0}link(t){if(t.point===this.point)throw new Error("Tried to link already linked events");const e=t.point.events;for(let i=0,r=e.length;i<r;i++){const s=e[i];this.point.events.push(s),s.point=this.point}this.checkForConsuming()}checkForConsuming(){const t=this.point.events.length;for(let e=0;e<t;e++){const i=this.point.events[e];if(i.segment.consumedBy===void 0)for(let r=e+1;r<t;r++){const s=this.point.events[r];s.consumedBy===void 0&&i.otherSE.point.events===s.otherSE.point.events&&i.segment.consume(s.segment)}}}getAvailableLinkedEvents(){const t=[];for(let e=0,i=this.point.events.length;e<i;e++){const r=this.point.events[e];r!==this&&!r.segment.ringOut&&r.segment.isInResult()&&t.push(r)}return t}getLeftmostComparator(t){const e=new Map,i=r=>{const s=r.otherSE;e.set(r,{sine:Sn(this.point,t.point,s.point),cosine:bn(this.point,t.point,s.point)})};return(r,s)=>{e.has(r)||i(r),e.has(s)||i(s);const{sine:f,cosine:u}=e.get(r),{sine:d,cosine:p}=e.get(s);return f.isGreaterThanOrEqualTo(0)&&d.isGreaterThanOrEqualTo(0)?u.isLessThan(p)?1:u.isGreaterThan(p)?-1:0:f.isLessThan(0)&&d.isLessThan(0)?u.isLessThan(p)?-1:u.isGreaterThan(p)?1:0:d.isLessThan(f)?-1:d.isGreaterThan(f)?1:0}}},Pn=class He{constructor(t){A(this,"events");A(this,"poly");A(this,"_isExteriorRing");A(this,"_enclosingRing");this.events=t;for(let e=0,i=t.length;e<i;e++)t[e].segment.ringOut=this;this.poly=null}static factory(t){const e=[];for(let i=0,r=t.length;i<r;i++){const s=t[i];if(!s.isInResult()||s.ringOut)continue;let f=null,u=s.leftSE,d=s.rightSE;const p=[u],b=u.point,w=[];for(;f=u,u=d,p.push(u),u.point!==b;)for(;;){const C=u.getAvailableLinkedEvents();if(C.length===0){const O=p[0].point,R=p[p.length-1].point;throw new Error(`Unable to complete output ring starting at [${O.x}, ${O.y}]. Last matching segment found ends at [${R.x}, ${R.y}].`)}if(C.length===1){d=C[0].otherSE;break}let P=null;for(let O=0,R=w.length;O<R;O++)if(w[O].point===u.point){P=O;break}if(P!==null){const O=w.splice(P)[0],R=p.splice(O.index);R.unshift(R[0].otherSE),e.push(new He(R.reverse()));continue}w.push({index:p.length,point:u.point});const L=u.getLeftmostComparator(f);d=C.sort(L)[0].otherSE;break}e.push(new He(p))}return e}getGeom(){let t=this.events[0].point;const e=[t];for(let p=1,b=this.events.length-1;p<b;p++){const w=this.events[p].point,C=this.events[p+1].point;fe.orient(w,t,C)!==0&&(e.push(w),t=w)}if(e.length===1)return null;const i=e[0],r=e[1];fe.orient(i,t,r)===0&&e.shift(),e.push(e[0]);const s=this.isExteriorRing()?1:-1,f=this.isExteriorRing()?0:e.length-1,u=this.isExteriorRing()?e.length:-1,d=[];for(let p=f;p!=u;p+=s)d.push([e[p].x.toNumber(),e[p].y.toNumber()]);return d}isExteriorRing(){if(this._isExteriorRing===void 0){const t=this.enclosingRing();this._isExteriorRing=t?!t.isExteriorRing():!0}return this._isExteriorRing}enclosingRing(){return this._enclosingRing===void 0&&(this._enclosingRing=this._calcEnclosingRing()),this._enclosingRing}_calcEnclosingRing(){var r,s;let t=this.events[0];for(let f=1,u=this.events.length;f<u;f++){const d=this.events[f];le.compare(t,d)>0&&(t=d)}let e=t.segment.prevInResult(),i=e?e.prevInResult():null;for(;;){if(!e)return null;if(!i)return e.ringOut;if(i.ringOut!==e.ringOut)return((r=i.ringOut)==null?void 0:r.enclosingRing())!==e.ringOut?e.ringOut:(s=e.ringOut)==null?void 0:s.enclosingRing();e=i.prevInResult(),i=e?e.prevInResult():null}}},lt=class{constructor(n){A(this,"exteriorRing");A(this,"interiorRings");this.exteriorRing=n,n.poly=this,this.interiorRings=[]}addInterior(n){this.interiorRings.push(n),n.poly=this}getGeom(){const n=this.exteriorRing.getGeom();if(n===null)return null;const t=[n];for(let e=0,i=this.interiorRings.length;e<i;e++){const r=this.interiorRings[e].getGeom();r!==null&&t.push(r)}return t}},On=class{constructor(n){A(this,"rings");A(this,"polys");this.rings=n,this.polys=this._composePolys(n)}getGeom(){const n=[];for(let t=0,e=this.polys.length;t<e;t++){const i=this.polys[t].getGeom();i!==null&&n.push(i)}return n}_composePolys(n){var e;const t=[];for(let i=0,r=n.length;i<r;i++){const s=n[i];if(!s.poly)if(s.isExteriorRing())t.push(new lt(s));else{const f=s.enclosingRing();f!=null&&f.poly||t.push(new lt(f)),(e=f==null?void 0:f.poly)==null||e.addInterior(s)}}return t}},Ln=class{constructor(n,t=Ae.compare){A(this,"queue");A(this,"tree");A(this,"segments");this.queue=n,this.tree=new Ie(t),this.segments=[]}process(n){const t=n.segment,e=[];if(n.consumedBy)return n.isLeft?this.queue.delete(n.otherSE):this.tree.delete(t),e;n.isLeft&&this.tree.add(t);let i=t,r=t;do i=this.tree.lastBefore(i);while(i!=null&&i.consumedBy!=null);do r=this.tree.firstAfter(r);while(r!=null&&r.consumedBy!=null);if(n.isLeft){let s=null;if(i){const u=i.getIntersection(t);if(u!==null&&(t.isAnEndpoint(u)||(s=u),!i.isAnEndpoint(u))){const d=this._splitSafely(i,u);for(let p=0,b=d.length;p<b;p++)e.push(d[p])}}let f=null;if(r){const u=r.getIntersection(t);if(u!==null&&(t.isAnEndpoint(u)||(f=u),!r.isAnEndpoint(u))){const d=this._splitSafely(r,u);for(let p=0,b=d.length;p<b;p++)e.push(d[p])}}if(s!==null||f!==null){let u=null;s===null?u=f:f===null?u=s:u=le.comparePoints(s,f)<=0?s:f,this.queue.delete(t.rightSE),e.push(t.rightSE);const d=t.split(u);for(let p=0,b=d.length;p<b;p++)e.push(d[p])}e.length>0?(this.tree.delete(t),e.push(n)):(this.segments.push(t),t.prev=i)}else{if(i&&r){const s=i.getIntersection(r);if(s!==null){if(!i.isAnEndpoint(s)){const f=this._splitSafely(i,s);for(let u=0,d=f.length;u<d;u++)e.push(f[u])}if(!r.isAnEndpoint(s)){const f=this._splitSafely(r,s);for(let u=0,d=f.length;u<d;u++)e.push(f[u])}}}this.tree.delete(t)}return e}_splitSafely(n,t){this.tree.delete(n);const e=n.rightSE;this.queue.delete(e);const i=n.split(t);return i.push(e),n.consumedBy===void 0&&this.tree.add(n),i}},Rn=class{constructor(){A(this,"type");A(this,"numMultiPolys")}run(n,t,e){ve.type=n;const i=[new ut(t,!0)];for(let p=0,b=e.length;p<b;p++)i.push(new ut(e[p],!1));if(ve.numMultiPolys=i.length,ve.type==="difference"){const p=i[0];let b=1;for(;b<i.length;)$e(i[b].bbox,p.bbox)!==null?b++:i.splice(b,1)}if(ve.type==="intersection")for(let p=0,b=i.length;p<b;p++){const w=i[p];for(let C=p+1,P=i.length;C<P;C++)if($e(w.bbox,i[C].bbox)===null)return[]}const r=new Ie(le.compare);for(let p=0,b=i.length;p<b;p++){const w=i[p].getSweepEvents();for(let C=0,P=w.length;C<P;C++)r.add(w[C])}const s=new Ln(r);let f=null;for(r.size!=0&&(f=r.first(),r.delete(f));f;){const p=s.process(f);for(let b=0,w=p.length;b<w;b++){const C=p[b];C.consumedBy===void 0&&r.add(C)}r.size!=0?(f=r.first(),r.delete(f)):f=null}fe.reset();const u=Pn.factory(s.segments);return new On(u).getGeom()}},ve=new Rn,Ye=ve,In=0,Ae=class Re{constructor(t,e,i,r){A(this,"id");A(this,"leftSE");A(this,"rightSE");A(this,"rings");A(this,"windings");A(this,"ringOut");A(this,"consumedBy");A(this,"prev");A(this,"_prevInResult");A(this,"_beforeState");A(this,"_afterState");A(this,"_isInResult");this.id=++In,this.leftSE=t,t.segment=this,t.otherSE=e,this.rightSE=e,e.segment=this,e.otherSE=t,this.rings=i,this.windings=r}static compare(t,e){const i=t.leftSE.point.x,r=e.leftSE.point.x,s=t.rightSE.point.x,f=e.rightSE.point.x;if(f.isLessThan(i))return 1;if(s.isLessThan(r))return-1;const u=t.leftSE.point.y,d=e.leftSE.point.y,p=t.rightSE.point.y,b=e.rightSE.point.y;if(i.isLessThan(r)){if(d.isLessThan(u)&&d.isLessThan(p))return 1;if(d.isGreaterThan(u)&&d.isGreaterThan(p))return-1;const w=t.comparePoint(e.leftSE.point);if(w<0)return 1;if(w>0)return-1;const C=e.comparePoint(t.rightSE.point);return C!==0?C:-1}if(i.isGreaterThan(r)){if(u.isLessThan(d)&&u.isLessThan(b))return-1;if(u.isGreaterThan(d)&&u.isGreaterThan(b))return 1;const w=e.comparePoint(t.leftSE.point);if(w!==0)return w;const C=t.comparePoint(e.rightSE.point);return C<0?1:C>0?-1:1}if(u.isLessThan(d))return-1;if(u.isGreaterThan(d))return 1;if(s.isLessThan(f)){const w=e.comparePoint(t.rightSE.point);if(w!==0)return w}if(s.isGreaterThan(f)){const w=t.comparePoint(e.rightSE.point);if(w<0)return 1;if(w>0)return-1}if(!s.eq(f)){const w=p.minus(u),C=s.minus(i),P=b.minus(d),L=f.minus(r);if(w.isGreaterThan(C)&&P.isLessThan(L))return 1;if(w.isLessThan(C)&&P.isGreaterThan(L))return-1}return s.isGreaterThan(f)?1:s.isLessThan(f)||p.isLessThan(b)?-1:p.isGreaterThan(b)?1:t.id<e.id?-1:t.id>e.id?1:0}static fromRing(t,e,i){let r,s,f;const u=le.comparePoints(t,e);if(u<0)r=t,s=e,f=1;else if(u>0)r=e,s=t,f=-1;else throw new Error(`Tried to create degenerate segment at [${t.x}, ${t.y}]`);const d=new le(r,!0),p=new le(s,!1);return new Re(d,p,[i],[f])}replaceRightSE(t){this.rightSE=t,this.rightSE.segment=this,this.rightSE.otherSE=this.leftSE,this.leftSE.otherSE=this.rightSE}bbox(){const t=this.leftSE.point.y,e=this.rightSE.point.y;return{ll:{x:this.leftSE.point.x,y:t.isLessThan(e)?t:e},ur:{x:this.rightSE.point.x,y:t.isGreaterThan(e)?t:e}}}vector(){return{x:this.rightSE.point.x.minus(this.leftSE.point.x),y:this.rightSE.point.y.minus(this.leftSE.point.y)}}isAnEndpoint(t){return t.x.eq(this.leftSE.point.x)&&t.y.eq(this.leftSE.point.y)||t.x.eq(this.rightSE.point.x)&&t.y.eq(this.rightSE.point.y)}comparePoint(t){return fe.orient(this.leftSE.point,t,this.rightSE.point)}getIntersection(t){const e=this.bbox(),i=t.bbox(),r=$e(e,i);if(r===null)return null;const s=this.leftSE.point,f=this.rightSE.point,u=t.leftSE.point,d=t.rightSE.point,p=me(e,u)&&this.comparePoint(u)===0,b=me(i,s)&&t.comparePoint(s)===0,w=me(e,d)&&this.comparePoint(d)===0,C=me(i,f)&&t.comparePoint(f)===0;if(b&&p)return C&&!w?f:!C&&w?d:null;if(b)return w&&s.x.eq(d.x)&&s.y.eq(d.y)?null:s;if(p)return C&&f.x.eq(u.x)&&f.y.eq(u.y)?null:u;if(C&&w)return null;if(C)return f;if(w)return d;const P=Tn(s,this.vector(),u,t.vector());return P===null||!me(r,P)?null:fe.snap(P)}split(t){const e=[],i=t.events!==void 0,r=new le(t,!0),s=new le(t,!1),f=this.rightSE;this.replaceRightSE(s),e.push(s),e.push(r);const u=new Re(r,f,this.rings.slice(),this.windings.slice());return le.comparePoints(u.leftSE.point,u.rightSE.point)>0&&u.swapEvents(),le.comparePoints(this.leftSE.point,this.rightSE.point)>0&&this.swapEvents(),i&&(r.checkForConsuming(),s.checkForConsuming()),e}swapEvents(){const t=this.rightSE;this.rightSE=this.leftSE,this.leftSE=t,this.leftSE.isLeft=!0,this.rightSE.isLeft=!1;for(let e=0,i=this.windings.length;e<i;e++)this.windings[e]*=-1}consume(t){let e=this,i=t;for(;e.consumedBy;)e=e.consumedBy;for(;i.consumedBy;)i=i.consumedBy;const r=Re.compare(e,i);if(r!==0){if(r>0){const s=e;e=i,i=s}if(e.prev===i){const s=e;e=i,i=s}for(let s=0,f=i.rings.length;s<f;s++){const u=i.rings[s],d=i.windings[s],p=e.rings.indexOf(u);p===-1?(e.rings.push(u),e.windings.push(d)):e.windings[p]+=d}i.rings=null,i.windings=null,i.consumedBy=e,i.leftSE.consumedBy=e.leftSE,i.rightSE.consumedBy=e.rightSE}}prevInResult(){return this._prevInResult!==void 0?this._prevInResult:(this.prev?this.prev.isInResult()?this._prevInResult=this.prev:this._prevInResult=this.prev.prevInResult():this._prevInResult=null,this._prevInResult)}beforeState(){if(this._beforeState!==void 0)return this._beforeState;if(!this.prev)this._beforeState={rings:[],windings:[],multiPolys:[]};else{const t=this.prev.consumedBy||this.prev;this._beforeState=t.afterState()}return this._beforeState}afterState(){if(this._afterState!==void 0)return this._afterState;const t=this.beforeState();this._afterState={rings:t.rings.slice(0),windings:t.windings.slice(0),multiPolys:[]};const e=this._afterState.rings,i=this._afterState.windings,r=this._afterState.multiPolys;for(let u=0,d=this.rings.length;u<d;u++){const p=this.rings[u],b=this.windings[u],w=e.indexOf(p);w===-1?(e.push(p),i.push(b)):i[w]+=b}const s=[],f=[];for(let u=0,d=e.length;u<d;u++){if(i[u]===0)continue;const p=e[u],b=p.poly;if(f.indexOf(b)===-1)if(p.isExterior)s.push(b);else{f.indexOf(b)===-1&&f.push(b);const w=s.indexOf(p.poly);w!==-1&&s.splice(w,1)}}for(let u=0,d=s.length;u<d;u++){const p=s[u].multiPoly;r.indexOf(p)===-1&&r.push(p)}return this._afterState}isInResult(){if(this.consumedBy)return!1;if(this._isInResult!==void 0)return this._isInResult;const t=this.beforeState().multiPolys,e=this.afterState().multiPolys;switch(Ye.type){case"union":{const i=t.length===0,r=e.length===0;this._isInResult=i!==r;break}case"intersection":{let i,r;t.length<e.length?(i=t.length,r=e.length):(i=e.length,r=t.length),this._isInResult=r===Ye.numMultiPolys&&i<r;break}case"xor":{const i=Math.abs(t.length-e.length);this._isInResult=i%2===1;break}case"difference":{const i=r=>r.length===1&&r[0].isSubject;this._isInResult=i(t)!==i(e);break}}return this._isInResult}},at=class{constructor(n,t,e){A(this,"poly");A(this,"isExterior");A(this,"segments");A(this,"bbox");if(!Array.isArray(n)||n.length===0)throw new Error("Input geometry is not a valid Polygon or MultiPolygon");if(this.poly=t,this.isExterior=e,this.segments=[],typeof n[0][0]!="number"||typeof n[0][1]!="number")throw new Error("Input geometry is not a valid Polygon or MultiPolygon");const i=fe.snap({x:new ae(n[0][0]),y:new ae(n[0][1])});this.bbox={ll:{x:i.x,y:i.y},ur:{x:i.x,y:i.y}};let r=i;for(let s=1,f=n.length;s<f;s++){if(typeof n[s][0]!="number"||typeof n[s][1]!="number")throw new Error("Input geometry is not a valid Polygon or MultiPolygon");const u=fe.snap({x:new ae(n[s][0]),y:new ae(n[s][1])});u.x.eq(r.x)&&u.y.eq(r.y)||(this.segments.push(Ae.fromRing(r,u,this)),u.x.isLessThan(this.bbox.ll.x)&&(this.bbox.ll.x=u.x),u.y.isLessThan(this.bbox.ll.y)&&(this.bbox.ll.y=u.y),u.x.isGreaterThan(this.bbox.ur.x)&&(this.bbox.ur.x=u.x),u.y.isGreaterThan(this.bbox.ur.y)&&(this.bbox.ur.y=u.y),r=u)}(!i.x.eq(r.x)||!i.y.eq(r.y))&&this.segments.push(Ae.fromRing(r,i,this))}getSweepEvents(){const n=[];for(let t=0,e=this.segments.length;t<e;t++){const i=this.segments[t];n.push(i.leftSE),n.push(i.rightSE)}return n}},_n=class{constructor(n,t){A(this,"multiPoly");A(this,"exteriorRing");A(this,"interiorRings");A(this,"bbox");if(!Array.isArray(n))throw new Error("Input geometry is not a valid Polygon or MultiPolygon");this.exteriorRing=new at(n[0],this,!0),this.bbox={ll:{x:this.exteriorRing.bbox.ll.x,y:this.exteriorRing.bbox.ll.y},ur:{x:this.exteriorRing.bbox.ur.x,y:this.exteriorRing.bbox.ur.y}},this.interiorRings=[];for(let e=1,i=n.length;e<i;e++){const r=new at(n[e],this,!1);r.bbox.ll.x.isLessThan(this.bbox.ll.x)&&(this.bbox.ll.x=r.bbox.ll.x),r.bbox.ll.y.isLessThan(this.bbox.ll.y)&&(this.bbox.ll.y=r.bbox.ll.y),r.bbox.ur.x.isGreaterThan(this.bbox.ur.x)&&(this.bbox.ur.x=r.bbox.ur.x),r.bbox.ur.y.isGreaterThan(this.bbox.ur.y)&&(this.bbox.ur.y=r.bbox.ur.y),this.interiorRings.push(r)}this.multiPoly=t}getSweepEvents(){const n=this.exteriorRing.getSweepEvents();for(let t=0,e=this.interiorRings.length;t<e;t++){const i=this.interiorRings[t].getSweepEvents();for(let r=0,s=i.length;r<s;r++)n.push(i[r])}return n}},ut=class{constructor(n,t){A(this,"isSubject");A(this,"polys");A(this,"bbox");if(!Array.isArray(n))throw new Error("Input geometry is not a valid Polygon or MultiPolygon");try{typeof n[0][0][0]=="number"&&(n=[n])}catch{}this.polys=[],this.bbox={ll:{x:new ae(Number.POSITIVE_INFINITY),y:new ae(Number.POSITIVE_INFINITY)},ur:{x:new ae(Number.NEGATIVE_INFINITY),y:new ae(Number.NEGATIVE_INFINITY)}};for(let e=0,i=n.length;e<i;e++){const r=new _n(n[e],this);r.bbox.ll.x.isLessThan(this.bbox.ll.x)&&(this.bbox.ll.x=r.bbox.ll.x),r.bbox.ll.y.isLessThan(this.bbox.ll.y)&&(this.bbox.ll.y=r.bbox.ll.y),r.bbox.ur.x.isGreaterThan(this.bbox.ur.x)&&(this.bbox.ur.x=r.bbox.ur.x),r.bbox.ur.y.isGreaterThan(this.bbox.ur.y)&&(this.bbox.ur.y=r.bbox.ur.y),this.polys.push(r)}this.isSubject=t}getSweepEvents(){const n=[];for(let t=0,e=this.polys.length;t<e;t++){const i=this.polys[t].getSweepEvents();for(let r=0,s=i.length;r<s;r++)n.push(i[r])}return n}},An=(n,...t)=>Ye.run("intersection",n,t);fe.set;function Mn(n){const t=[];return n.type==="FeatureCollection"?mt(n,function(e){Ee(e,function(i){t.push(xe(i,e.properties))})}):n.type==="Feature"?Ee(n,function(e){t.push(xe(e,n.properties))}):Ee(n,function(e){t.push(xe(e))}),Ce(t)}function Nn(n,t={}){const e=[];if(wt(n,r=>{e.push(r.coordinates)}),e.length<2)throw new Error("Must specify at least 2 geometries");const i=An(e[0],...e.slice(1));return i.length===0?null:i.length===1?Ue(i[0],t.properties):Ht(i,t.properties)}var Bn=Object.defineProperty,Fn=Object.defineProperties,Gn=Object.getOwnPropertyDescriptors,ct=Object.getOwnPropertySymbols,kn=Object.prototype.hasOwnProperty,qn=Object.prototype.propertyIsEnumerable,ft=(n,t,e)=>t in n?Bn(n,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):n[t]=e,ht=(n,t)=>{for(var e in t||(t={}))kn.call(t,e)&&ft(n,e,t[e]);if(ct)for(var e of ct(t))qn.call(t,e)&&ft(n,e,t[e]);return n},pt=(n,t)=>Fn(n,Gn(t));function Dn(n,t,e={}){if(!n)throw new Error("targetPoint is required");if(!t)throw new Error("points is required");let i=1/0,r=0;mt(t,(f,u)=>{const d=Xt(n,f,e);d<i&&(r=u,i=d)});const s=pn(t.features[r]);return pt(ht({},s),{properties:pt(ht({},s.properties),{featureIndex:r,distanceToPoint:i})})}function Un(n){const t=zn(n),e=hn(t);let i=!1,r=0;for(;!i&&r<t.features.length;){const s=t.features[r].geometry;let f,u,d,p,b,w,C=!1;if(s.type==="Point")e.geometry.coordinates[0]===s.coordinates[0]&&e.geometry.coordinates[1]===s.coordinates[1]&&(i=!0);else if(s.type==="MultiPoint"){let P=!1,L=0;for(;!P&&L<s.coordinates.length;)e.geometry.coordinates[0]===s.coordinates[L][0]&&e.geometry.coordinates[1]===s.coordinates[L][1]&&(i=!0,P=!0),L++}else if(s.type==="LineString"){let P=0;for(;!C&&P<s.coordinates.length-1;)f=e.geometry.coordinates[0],u=e.geometry.coordinates[1],d=s.coordinates[P][0],p=s.coordinates[P][1],b=s.coordinates[P+1][0],w=s.coordinates[P+1][1],gt(f,u,d,p,b,w)&&(C=!0,i=!0),P++}else if(s.type==="MultiLineString"){let P=0;for(;P<s.coordinates.length;){C=!1;let L=0;const O=s.coordinates[P];for(;!C&&L<O.length-1;)f=e.geometry.coordinates[0],u=e.geometry.coordinates[1],d=O[L][0],p=O[L][1],b=O[L+1][0],w=O[L+1][1],gt(f,u,d,p,b,w)&&(C=!0,i=!0),L++;P++}}else(s.type==="Polygon"||s.type==="MultiPolygon")&&cn(e,s)&&(i=!0);r++}if(i)return e;{const s=Ce([]);for(let f=0;f<t.features.length;f++)s.features=s.features.concat(Mn(t.features[f]).features);return xe(Dn(e,s).geometry.coordinates)}}function zn(n){return n.type!=="FeatureCollection"?n.type!=="Feature"?Ce([Me(n)]):Ce([n]):n}function gt(n,t,e,i,r,s){const f=Math.sqrt((r-e)*(r-e)+(s-i)*(s-i)),u=Math.sqrt((n-e)*(n-e)+(t-i)*(t-i)),d=Math.sqrt((r-n)*(r-n)+(s-t)*(s-t));return f===u+d}const Vn={class:"box",ref:"viewerRef"},Wn={class:"status-panel"},$n=Vt({name:"OverlayAnalysis"}),Hn=Object.assign($n,{setup(n){const t=Xe([{fileName:"@/views/spaceAnalysis/overlayAnalysis/index.vue",rawCode:Wt,language:"html"},{fileName:"@/utils/cesium.js",rawCode:At,language:"javascript"}]),e=Bt("viewerRef"),i=[[117.182288,31.854164],[117.210254,31.878324],[117.238229,31.855796],[117.242307,31.826109],[117.177277,31.821475],[117.182288,31.854164]],r=[[117.267046,31.842971],[117.20963,31.840323],[117.230646,31.787122],[117.28833,31.799624],[117.267046,31.842971]];let s=null,f=null,u=null,d=null,p=null,b=null,w=null,C=null,P=null;const L=Xe("正在初始化叠加分析…"),O=Ft({polygon1Color:"#ff3b30",polygon1Opacity:.5,polygon2Color:"#34c759",polygon2Opacity:.5,intersectionColor:"#2979ff",intersectionOpacity:.78,showPolygon1:!0,showPolygon2:!0,showIntersection:!0,showLabel:!0,calculate:()=>o(),clear:()=>a(),resetCamera:()=>m()});Gt(async()=>{M(),k(),q(),await S(),await o()}),kt(()=>{d&&(d.destroy(),d=null),a(),s&&(s.destroy(),s=null)});function R(){s!=null&&s.scene&&s.scene.requestRender()}function M(){var c;s=Rt(e.value,{baseLayer:!1}),It(s,{msaaSamples:4,enableFxaa:!1}),s.scene.debugShowFramesPerSecond=!0,s.scene.globe.depthTestAgainstTerrain=!0,s.scene.globe.enableLighting=!1,s.scene.fog.enabled=!0,s.scene.fog.density=8e-5,s.scene.skyAtmosphere.show=!0,(c=s._cesiumWidget)!=null&&c._creditContainer&&(s._cesiumWidget._creditContainer.style.display="none"),f=s.imageryLayers.addImageryProvider(new V.UrlTemplateImageryProvider({url:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",maximumLevel:18})),m()}async function S(){try{L.value="正在加载地形…",u=await V.ArcGISTiledElevationTerrainProvider.fromUrl("https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer"),s.terrainProvider=u,L.value="地形加载完成，正在计算相交区域…"}catch(c){console.warn("地形加载失败，将使用椭球面显示：",c),L.value="地形加载失败，正在使用椭球面计算…"}R()}function k(){p=s.entities.add({id:"overlay-polygon-1",polygon:{hierarchy:V.Cartesian3.fromDegreesArray(i.flat()),material:B(O.polygon1Color,O.polygon1Opacity),outline:!0,outlineColor:V.Color.WHITE.withAlpha(.9),outlineWidth:2,classificationType:V.ClassificationType.TERRAIN}}),b=s.entities.add({id:"overlay-polygon-2",polygon:{hierarchy:V.Cartesian3.fromDegreesArray(r.flat()),material:B(O.polygon2Color,O.polygon2Opacity),outline:!0,outlineColor:V.Color.WHITE.withAlpha(.9),outlineWidth:2,classificationType:V.ClassificationType.TERRAIN}}),R()}function q(){const c=new Mt({container:e.value,title:"叠加分析"});d=c;const g=c.addFolder("分析操作");g.add(O,"calculate").name("重新分析"),g.add(O,"clear").name("清除相交结果"),g.add(O,"resetCamera").name("重置视角");const v=c.addFolder("图层样式");v.addColor(O,"polygon1Color").name("区域一颜色").onChange(()=>F()),v.add(O,"polygon1Opacity",0,1,.01).name("区域一透明度").onChange(()=>F()),v.addColor(O,"polygon2Color").name("区域二颜色").onChange(()=>F()),v.add(O,"polygon2Opacity",0,1,.01).name("区域二透明度").onChange(()=>F()),v.addColor(O,"intersectionColor").name("相交区域颜色").onChange(()=>z()),v.add(O,"intersectionOpacity",0,1,.01).name("相交区域透明度").onChange(()=>z());const h=c.addFolder("显示控制");h.add(O,"showPolygon1").name("显示区域一").onChange(x=>{p&&(p.show=x,R())}),h.add(O,"showPolygon2").name("显示区域二").onChange(x=>{b&&(b.show=x,R())}),h.add(O,"showIntersection").name("显示相交区域").onChange(x=>{w&&(w.show=x,R())}),h.add(O,"showLabel").name("显示面积标签").onChange(x=>{C&&(C.show=x,R())});const y=c.addFolder("影像图层");y.add(f,"show").name("显示影像").onChange(()=>R()),y.add(f,"alpha",0,1,.01).name("影像透明度").onChange(()=>R())}function B(c,g){return V.Color.fromCssColorString(c).withAlpha(g)}function F(){p&&(p.polygon.material=B(O.polygon1Color,O.polygon1Opacity)),b&&(b.polygon.material=B(O.polygon2Color,O.polygon2Opacity)),R()}function z(){w&&(w.polygon.material=B(O.intersectionColor,O.intersectionOpacity),R())}async function o(){if(s){a(),L.value="正在计算两个多边形的相交区域…";try{const c=Ue([i]),g=Ue([r]),v=Nn(Ce([c,g]));if(!v){L.value="两个区域没有相交部分。",R();return}P=v;const h=[];v.geometry.type==="Polygon"?v.geometry.coordinates[0].forEach(([I,_])=>{h.push(I,_)}):v.geometry.type==="MultiPolygon"&&v.geometry.coordinates.forEach(I=>{I[0].forEach(([_,G])=>h.push(_,G))});const y=V.Cartesian3.fromDegreesArray(h),x=B(O.intersectionColor,O.intersectionOpacity);w?(w.polygon.hierarchy=y,w.polygon.material=x,w.show=O.showIntersection):w=s.entities.add({id:"overlay-intersection-result",polygon:{hierarchy:y,material:x,outline:!0,outlineColor:V.Color.WHITE.withAlpha(.95),outlineWidth:2,classificationType:V.ClassificationType.TERRAIN},show:O.showIntersection});const E=Qt(v),T=Un(v).geometry.coordinates;C?(C.position=V.Cartesian3.fromDegrees(T[0],T[1]),C.label.text=`相交部分
${l(E)}`,C.show=O.showLabel):C=s.entities.add({id:"overlay-intersection-area",position:V.Cartesian3.fromDegrees(T[0],T[1]),label:{text:`相交部分
${l(E)}`,fillColor:V.Color.WHITE,font:"18px sans-serif",style:V.LabelStyle.FILL_AND_OUTLINE,outlineColor:V.Color.BLACK,outlineWidth:3,showBackground:!0,backgroundColor:V.Color.BLACK.withAlpha(.55),horizontalOrigin:V.HorizontalOrigin.CENTER,verticalOrigin:V.VerticalOrigin.TOP,heightReference:V.HeightReference.CLAMP_TO_GROUND,disableDepthTestDistance:Number.POSITIVE_INFINITY},show:O.showLabel}),L.value=`分析完成：相交面积 ${l(E)}。`,R()}catch(c){console.error("叠加分析失败：",c),L.value=`叠加分析失败：${c.message}`}}}function l(c){return c>=1e4?`${(c/1e4).toFixed(2)} 公顷`:`${c.toFixed(2)} 平方米`}function a(){w&&s&&(s.entities.remove(w),w=null),P=null,C&&s&&(s.entities.remove(C),C=null),R()}function m(){s&&(s.camera.setView({destination:V.Cartesian3.fromDegrees(117.225959,31.705235,18e3),orientation:{heading:V.Math.toRadians(0),pitch:V.Math.toRadians(-50),roll:0}}),R())}return(c,g)=>(qt(),Dt(_t,{codeBlocks:Qe(t)},{default:Ut(()=>[Ze("div",Vn,null,512),Ze("div",Wn,zt(Qe(L)),1)]),_:1},8,["codeBlocks"]))}}),jn=Nt(Hn,[["__scopeId","data-v-149179ab"]]);export{jn as default};
