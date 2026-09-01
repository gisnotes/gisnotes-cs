import{c as O,o as G,C as r,D as k}from"./cesium-RVgkKbYd.js";import{C as P}from"./cesium-pNEfRpPT.js";import{G as V}from"./lil-gui.esm-ItvJbUpV.js";import{_ as H,r as W,T as $,F as Q,M as q,o as J,m as K,f as rr,h as er,i as nr,H as tr}from"./index-CrInfhqG.js";import"./index-CIQDDkuh.js";const ir=`<template>\r
  <demo-box :codeBlocks>\r
    <div class="box" ref="viewerRef"></div>\r
  </demo-box>\r
</template>\r
\r
<script setup name="AdjustPositionAndScale">\r
import DemoBox from "@/components/DemoBox/index.vue";\r
import IndexSourceCode from "./index.vue?raw";\r
import CesiumSourceCode from "@/utils/cesium.js?raw";\r
\r
import Cesium from "cesium";\r
import "cesium/Build/CesiumUnminified/Widgets/widgets.css";\r
import { createViewer, optimizeViewerQuality } from "@/utils/cesium";\r
import GUI from "lil-gui";\r
\r
const codeBlocks = ref([\r
  {\r
    fileName: "@/views/3dtile/adjustPositionAndScale/index.vue",\r
    rawCode: IndexSourceCode,\r
    language: "html",\r
  },\r
  {\r
    fileName: "@/utils/cesium.js",\r
    rawCode: CesiumSourceCode,\r
    language: "javascript",\r
  },\r
]);\r
\r
/**\r
 * 整体思路：\r
 *  1. 首先将模型顶点从世界 ECEF 映射到局部 ENU（East-North-Up，东北天）坐标系，\r
 *  2. 在局部空间做旋转与缩放后，再映射到目标位置的新 ENU 坐标系中，\r
 *  3. 最终得到模型在世界坐标系下的 modelMatrix。\r
 */\r
\r
const viewerDivRef = useTemplateRef("viewerRef");\r
\r
let viewer = null;\r
let tileset = null;\r
let timer = null;\r
let gui = null;\r
let initialCenter = null;\r
\r
const controls = {\r
  longitude: 0,\r
  latitude: 0,\r
  height: 0,\r
  rotateX: 0,\r
  rotateY: 0,\r
  rotateZ: 0,\r
  scale: 1.0,\r
  reset: () => {\r
    if (initialCenter) {\r
      const carto = Cesium.Cartographic.fromCartesian(initialCenter);\r
      controls.longitude = Number(\r
        Cesium.Math.toDegrees(carto.longitude).toFixed(6),\r
      );\r
      controls.latitude = Number(\r
        Cesium.Math.toDegrees(carto.latitude).toFixed(6),\r
      );\r
    }\r
    controls.height = 0;\r
    controls.rotateX = 0;\r
    controls.rotateY = 0;\r
    controls.rotateZ = 0;\r
    controls.scale = 1.0;\r
    updateTilesetTransform();\r
    if (tileset && viewer) {\r
      viewer.zoomTo(\r
        tileset,\r
        new Cesium.HeadingPitchRange(\r
          0.0,\r
          -0.5,\r
          tileset.boundingSphere.radius * 2.0,\r
        ),\r
      );\r
    }\r
    // 同步更新 GUI 面板上的数值显示\r
    if (gui) {\r
      gui.controllersRecursive().forEach((c) => c.updateDisplay());\r
    }\r
  },\r
};\r
\r
onMounted(() => {\r
  timer = setTimeout(() => {\r
    init();\r
  }, 0);\r
});\r
\r
// =========================================================================\r
// 3D Tileset 空间几何变换工具函数（经纬度重定位、平移高度、局部三轴自转、等比缩放）\r
// =========================================================================\r
\r
/**\r
 * 纯函数：计算 3D Tileset / 模型在局部 ENU 坐标系下的复合变换矩阵 (Matrix4)\r
 *\r
 * 【底层数学与图形学原理】：\r
 *  1. 3D Tiles 顶点位于世界地心坐标系 (ECEF)，原点在地球中心 (距离地表约 6378 km)。\r
 *  2. 基于模型【初始中心点】建立原始 东北天 (ENU) 局部坐标系矩阵 M_origin 及其逆矩阵 M_origin^(-1)。\r
 *  3. 基于【目标经纬度与高度】计算目标中心点 targetCenter，并建立目标位置的 东北天 (ENU) 局部坐标系矩阵 M_target_enu (自动贴合新地表切平面)。\r
 *  4. 在局部空间中计算三轴自转矩阵 (Rz * Ry * Rx) 与等比缩放矩阵 (S)，构建局部矩阵 M_local。\r
 *  5. 最终世界模型变换矩阵：M_world = M_target_enu * M_local * M_origin^(-1)\r
 *\r
 * @param {Cesium.Cartesian3} initialCenter - 模型初始未变换的包围球中心\r
 * @param {Object} options - 变换参数对象\r
 * @param {number} [options.longitude] - 目标经度（度），不传则默认使用初始经度\r
 * @param {number} [options.latitude] - 目标纬度（度），不传则默认使用初始纬度\r
 * @param {number} [options.height=0] - 相对地表高度偏移量（米）\r
 * @param {number} [options.rotateX=0] - 绕东向 X 轴旋转角度（度）\r
 * @param {number} [options.rotateY=0] - 绕北向 Y 轴旋转角度（度）\r
 * @param {number} [options.rotateZ=0] - 绕天向 Z 轴旋转角度（度）\r
 * @param {number} [options.scale=1.0] - 等比缩放倍数\r
 * @returns {Cesium.Matrix4} 计算出的最终 modelMatrix 矩阵\r
 */\r
function computeTilesetMatrix(initialCenter, options = {}) {\r
  if (!initialCenter) return new Cesium.Matrix4();\r
\r
  const {\r
    longitude,\r
    latitude,\r
    height = 0,\r
    rotateX = 0,\r
    rotateY = 0,\r
    rotateZ = 0,\r
    scale = 1.0,\r
  } = options;\r
\r
  // 1. 获取初始中心点的地理坐标 (经度、纬度、高度)\r
  const initialCarto = Cesium.Cartographic.fromCartesian(initialCenter);\r
  const defaultLng = Cesium.Math.toDegrees(initialCarto.longitude);\r
  const defaultLat = Cesium.Math.toDegrees(initialCarto.latitude);\r
  const defaultAlt = initialCarto.height;\r
\r
  /**\r
   * 2. 计算目标位置的经纬度与高度:\r
   *  这里不是运行更改模型的经纬度，因此需要考虑下拖动控件后的模型的新经纬度及高度\r
   */\r
  const targetLng = longitude !== undefined ? Number(longitude) : defaultLng;\r
  const targetLat = latitude !== undefined ? Number(latitude) : defaultLat;\r
  const targetAlt = defaultAlt + (Number(height) || 0);\r
\r
  // 3. 计算目标空间位置：及将目标位置的经纬度和高度坐标转为三维笛卡尔坐标形式\r
  const targetCenter = Cesium.Cartesian3.fromDegrees(\r
    targetLng,\r
    targetLat,\r
    targetAlt,\r
  );\r
\r
  /**\r
   * 4. 它计算出了一个 4x4 矩阵，用于把“以 targetCenter 为中心、朝向东-北-天的局部坐标(ENU)”\r
   *    转换成“Cesium 的世界坐标（地心地固 ECEF）”\r
   */\r
  const targetOriginMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(\r
    targetCenter,\r
    Cesium.Ellipsoid.WGS84,\r
    new Cesium.Matrix4(),\r
  );\r
\r
  /**\r
   * 5. 同上，用于将“以 initialCenter 为中心、朝向东-北-天的局部坐标(ENU)”\r
   *    转换成“Cesium 的世界坐标（地心地固 ECEF）”\r
   *\r
   *  局部 ENU 坐标  ⟶ 世界 ECEF 坐标\r
   */\r
  const originMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(\r
    initialCenter,\r
    Cesium.Ellipsoid.WGS84,\r
    new Cesium.Matrix4(),\r
  );\r
\r
  /**\r
   * 6. 计算局部 ENU 坐标系下的逆矩阵 (M_origin^(-1))，用于将世界坐标转换回局部 ENU 坐标\r
   * 世界 ECEF 坐标 ⟶ 局部 ENU 坐标\r
   */\r
  const invOriginMatrix = Cesium.Matrix4.inverse(\r
    originMatrix,\r
    new Cesium.Matrix4(),\r
  );\r
\r
  // 7. 分别计算局部坐标系下的三轴旋转矩阵并复合 (R = Rz * Ry * Rx)\r
  const rx = Cesium.Matrix3.fromRotationX(\r
    Cesium.Math.toRadians(Number(rotateX) || 0),\r
  );\r
  const ry = Cesium.Matrix3.fromRotationY(\r
    Cesium.Math.toRadians(Number(rotateY) || 0),\r
  );\r
  const rz = Cesium.Matrix3.fromRotationZ(\r
    Cesium.Math.toRadians(Number(rotateZ) || 0),\r
  );\r
\r
  let rot = Cesium.Matrix3.multiply(rz, ry, new Cesium.Matrix3());\r
  rot = Cesium.Matrix3.multiply(rot, rx, new Cesium.Matrix3());\r
\r
  // 8. 计算 3x3 等比缩放矩阵并与旋转矩阵复合 (R_final = Rot * Scale)\r
  const s = Number(scale) || 1.0;\r
  const scaleMatrix = Cesium.Matrix3.fromScale(\r
    new Cesium.Cartesian3(s, s, s),\r
    new Cesium.Matrix3(),\r
  );\r
  rot = Cesium.Matrix3.multiply(rot, scaleMatrix, new Cesium.Matrix3());\r
\r
  /**\r
   * 9. Matrix4.fromRotationTranslation\r
   *  把 3x3 的旋转缩放矩阵和三维平移向量拼装成一个标准的 4x4 矩阵。\r
   * ┌                        ┐\r
   * │ rot00  rot01  rot02  0 │  <- 前 3 列为 3x3 旋转和缩放\r
   * │ rot10  rot11  rot12  0 │\r
   * │ rot20  rot21  rot22  0 │\r
   * │   0      0      0    1 │  <- 第 4 列平移为 (0, 0, 0)\r
   * └                        ┘\r
   */\r
  const localMatrix = Cesium.Matrix4.fromRotationTranslation(\r
    rot,\r
    Cesium.Cartesian3.ZERO,\r
    new Cesium.Matrix4(),\r
  );\r
\r
  /**\r
   * 10. 坐标基底转换：M_world = M_target_enu * M_local * M_origin^(-1)\r
   * 最终顶点坐标 = [targetOriginMatrix] × [localMatrix] × [invOriginMatrix] × 原始顶点\r
   *                └────────┬─────────┘   └─────┬─────┘   └────────┬──────┘\r
   *                     第 3 步                第 2 步            第 1 步\r
   *              放到新经纬度并贴平地面       原地自转与缩放     从地球表面拉回原点 (0,0,0)\r
   */\r
  const temp = Cesium.Matrix4.multiply(\r
    targetOriginMatrix,\r
    localMatrix,\r
    new Cesium.Matrix4(),\r
  );\r
  return Cesium.Matrix4.multiply(temp, invOriginMatrix, new Cesium.Matrix4());\r
}\r
\r
/**\r
 * 将变换参数应用到目标 3D Tileset 模型上\r
 * @param {Cesium.Cesium3DTileset} targetTileset - 目标 3D Tileset 实例\r
 * @param {Cesium.Cartesian3} center - 模型初始未变换的包围球中心\r
 * @param {Object} options - 变换参数对象 (longitude, latitude, height, rotateX, rotateY, rotateZ, scale)\r
 */\r
function applyTilesetTransform(targetTileset, center, options) {\r
  if (!targetTileset || !center) return;\r
  targetTileset.modelMatrix = computeTilesetMatrix(center, options);\r
}\r
\r
/**\r
 * 当前组件视图层的更新入口\r
 */\r
function updateTilesetTransform() {\r
  applyTilesetTransform(tileset, initialCenter, controls);\r
}\r
\r
async function init() {\r
  // 1. 创建 Cesium Viewer\r
  viewer = createViewer(viewerDivRef.value, {\r
    shadows: true,\r
  });\r
\r
  // 2. 抗锯齿与高分屏画质优化\r
  optimizeViewerQuality(viewer, { msaaSamples: 4, enableFxaa: true });\r
\r
  // 3. 开启地形深度检测，避免模型与地表穿模\r
  viewer.scene.globe.depthTestAgainstTerrain = true;\r
\r
  // 4. 异步加载 3D Tileset 模型\r
  try {\r
    tileset = await Cesium.Cesium3DTileset.fromUrl(\r
      \`\${import.meta.env.BASE_URL}SampleData/Cesium3DTiles/Tilesets/Tileset/tileset.json\`,\r
    );\r
\r
    viewer.scene.primitives.add(tileset);\r
\r
    // 记录模型最初的包围球中心点（必须保存 clone，避免 modelMatrix 改变后 boundingSphere.center 动态漂移导致累加发散）\r
    initialCenter = tileset.boundingSphere.center.clone();\r
\r
    // 初始化控件中的经纬度初始值\r
    const carto = Cesium.Cartographic.fromCartesian(initialCenter);\r
    controls.longitude = Number(\r
      Cesium.Math.toDegrees(carto.longitude).toFixed(6),\r
    );\r
    controls.latitude = Number(\r
      Cesium.Math.toDegrees(carto.latitude).toFixed(6),\r
    );\r
\r
    // 缩放聚焦到模型所在位置\r
    viewer.zoomTo(\r
      tileset,\r
      new Cesium.HeadingPitchRange(\r
        0.0,\r
        -0.5,\r
        tileset.boundingSphere.radius * 2.0,\r
      ),\r
    );\r
\r
    // 初始应用空间变换\r
    updateTilesetTransform();\r
  } catch (error) {\r
    console.error(\`tileset加载失败: \${error}\`);\r
  }\r
\r
  // 5. 初始化 lil-gui 控件面板\r
  initGUI();\r
}\r
\r
function initGUI() {\r
  gui = new GUI({\r
    container: viewerDivRef.value,\r
    title: "模型位姿与缩放调节",\r
    width: 320,\r
  });\r
  gui.domElement.style.position = "absolute";\r
  gui.domElement.style.top = "10px";\r
  gui.domElement.style.right = "10px";\r
  gui.domElement.style.zIndex = "5";\r
\r
  const carto = Cesium.Cartographic.fromCartesian(initialCenter);\r
  const initialLng = Cesium.Math.toDegrees(carto.longitude);\r
  const initialLat = Cesium.Math.toDegrees(carto.latitude);\r
\r
  gui\r
    .add(controls, "longitude", initialLng - 0.02, initialLng + 0.02, 0.00001)\r
    .name("经度 (°)")\r
    .onChange(() => updateTilesetTransform());\r
\r
  gui\r
    .add(controls, "latitude", initialLat - 0.02, initialLat + 0.02, 0.00001)\r
    .name("纬度 (°)")\r
    .onChange(() => updateTilesetTransform());\r
\r
  gui\r
    .add(controls, "height", -100, 100, 1)\r
    .name("高度偏移 (米)")\r
    .onChange(() => updateTilesetTransform());\r
\r
  gui\r
    .add(controls, "rotateX", -180, 180, 1)\r
    .name("绕 X 轴旋转 (°)")\r
    .onChange(() => updateTilesetTransform());\r
\r
  gui\r
    .add(controls, "rotateY", -180, 180, 1)\r
    .name("绕 Y 轴旋转 (°)")\r
    .onChange(() => updateTilesetTransform());\r
\r
  gui\r
    .add(controls, "rotateZ", -180, 180, 1)\r
    .name("绕 Z 轴旋转 (°)")\r
    .onChange(() => updateTilesetTransform());\r
\r
  gui\r
    .add(controls, "scale", 0.1, 5.0, 0.1)\r
    .name("模型缩放 (倍数)")\r
    .onChange(() => updateTilesetTransform());\r
\r
  gui.add(controls, "reset").name("重置");\r
}\r
\r
onBeforeUnmount(() => {\r
  if (timer) clearTimeout(timer);\r
  if (gui) {\r
    gui.destroy();\r
    gui = null;\r
  }\r
  if (viewer) {\r
    viewer.destroy();\r
    viewer = null;\r
  }\r
});\r
<\/script>\r
\r
<style lang="scss" scoped>\r
.box {\r
  width: 100%;\r
  height: 100%;\r
  position: absolute;\r
  inset: 0;\r
}\r
</style>\r
`,ar={class:"box",ref:"viewerRef"},or=tr({name:"AdjustPositionAndScale"}),sr=Object.assign(or,{setup(lr){const x=W([{fileName:"@/views/3dtile/adjustPositionAndScale/index.vue",rawCode:ir,language:"html"},{fileName:"@/utils/cesium.js",rawCode:P,language:"javascript"}]),C=$("viewerRef");let i=null,a=null,c=null,n=null,u=null;const t={longitude:0,latitude:0,height:0,rotateX:0,rotateY:0,rotateZ:0,scale:1,reset:()=>{if(u){const e=r.Cartographic.fromCartesian(u);t.longitude=Number(r.Math.toDegrees(e.longitude).toFixed(6)),t.latitude=Number(r.Math.toDegrees(e.latitude).toFixed(6))}t.height=0,t.rotateX=0,t.rotateY=0,t.rotateZ=0,t.scale=1,o(),a&&i&&i.zoomTo(a,new r.HeadingPitchRange(0,-.5,a.boundingSphere.radius*2)),n&&n.controllersRecursive().forEach(e=>e.updateDisplay())}};Q(()=>{c=setTimeout(()=>{h()},0)});function f(e,s={}){if(!e)return new r.Matrix4;const{longitude:l,latitude:p,height:T=0,rotateX:v=0,rotateY:b=0,rotateZ:N=0,scale:R=1}=s,d=r.Cartographic.fromCartesian(e),y=r.Math.toDegrees(d.longitude),D=r.Math.toDegrees(d.latitude),E=d.height,_=l!==void 0?Number(l):y,S=p!==void 0?Number(p):D,U=E+(Number(T)||0),F=r.Cartesian3.fromDegrees(_,S,U),L=r.Transforms.eastNorthUpToFixedFrame(F,r.Ellipsoid.WGS84,new r.Matrix4),Z=r.Transforms.eastNorthUpToFixedFrame(e,r.Ellipsoid.WGS84,new r.Matrix4),X=r.Matrix4.inverse(Z,new r.Matrix4),Y=r.Matrix3.fromRotationX(r.Math.toRadians(Number(v)||0)),A=r.Matrix3.fromRotationY(r.Math.toRadians(Number(b)||0)),B=r.Matrix3.fromRotationZ(r.Math.toRadians(Number(N)||0));let m=r.Matrix3.multiply(B,A,new r.Matrix3);m=r.Matrix3.multiply(m,Y,new r.Matrix3);const g=Number(R)||1,j=r.Matrix3.fromScale(new r.Cartesian3(g,g,g),new r.Matrix3);m=r.Matrix3.multiply(m,j,new r.Matrix3);const z=r.Matrix4.fromRotationTranslation(m,r.Cartesian3.ZERO,new r.Matrix4),I=r.Matrix4.multiply(L,z,new r.Matrix4);return r.Matrix4.multiply(I,X,new r.Matrix4)}function M(e,s,l){!e||!s||(e.modelMatrix=f(s,l))}function o(){M(a,u,t)}async function h(){i=O(C.value,{shadows:!0}),G(i,{msaaSamples:4,enableFxaa:!0}),i.scene.globe.depthTestAgainstTerrain=!0;try{a=await r.Cesium3DTileset.fromUrl("/gisnotes-cs/SampleData/Cesium3DTiles/Tilesets/Tileset/tileset.json"),i.scene.primitives.add(a),u=a.boundingSphere.center.clone();const e=r.Cartographic.fromCartesian(u);t.longitude=Number(r.Math.toDegrees(e.longitude).toFixed(6)),t.latitude=Number(r.Math.toDegrees(e.latitude).toFixed(6)),i.zoomTo(a,new r.HeadingPitchRange(0,-.5,a.boundingSphere.radius*2)),o()}catch(e){console.error(`tileset加载失败: ${e}`)}w()}function w(){n=new V({container:C.value,title:"模型位姿与缩放调节",width:320}),n.domElement.style.position="absolute",n.domElement.style.top="10px",n.domElement.style.right="10px",n.domElement.style.zIndex="5";const e=r.Cartographic.fromCartesian(u),s=r.Math.toDegrees(e.longitude),l=r.Math.toDegrees(e.latitude);n.add(t,"longitude",s-.02,s+.02,1e-5).name("经度 (°)").onChange(()=>o()),n.add(t,"latitude",l-.02,l+.02,1e-5).name("纬度 (°)").onChange(()=>o()),n.add(t,"height",-100,100,1).name("高度偏移 (米)").onChange(()=>o()),n.add(t,"rotateX",-180,180,1).name("绕 X 轴旋转 (°)").onChange(()=>o()),n.add(t,"rotateY",-180,180,1).name("绕 Y 轴旋转 (°)").onChange(()=>o()),n.add(t,"rotateZ",-180,180,1).name("绕 Z 轴旋转 (°)").onChange(()=>o()),n.add(t,"scale",.1,5,.1).name("模型缩放 (倍数)").onChange(()=>o()),n.add(t,"reset").name("重置")}return q(()=>{c&&clearTimeout(c),n&&(n.destroy(),n=null),i&&(i.destroy(),i=null)}),(e,s)=>(J(),K(k,{codeBlocks:nr(x)},{default:rr(()=>[er("div",ar,null,512)]),_:1},8,["codeBlocks"]))}}),Cr=H(sr,[["__scopeId","data-v-37176a01"]]);export{Cr as default};
