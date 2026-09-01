import{c as w,o as C,C as s,D as x}from"./cesium-RVgkKbYd.js";import{C as v}from"./cesium-pNEfRpPT.js";import{G as T}from"./lil-gui.esm-ItvJbUpV.js";import{_ as y,r as b,T as R,F as _,M as z,o as D,m as S,f as B,h as H,i as I,H as V}from"./index-CrInfhqG.js";import"./index-CIQDDkuh.js";const j=`<template>\r
  <demo-box :codeBlocks>\r
    <div class="box" ref="viewerRef"></div>\r
  </demo-box>\r
</template>\r
\r
<script setup name="AdjustHeight">\r
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
    fileName: "@/views/3dtile/adjustHeight/index.vue",\r
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
const viewerDivRef = useTemplateRef("viewerRef");\r
\r
let viewer = null;\r
let tileset = null;\r
let timer = null;\r
let gui = null;\r
\r
const controls = {\r
  height: 0,\r
  resetView: () => {\r
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
  },\r
};\r
\r
onMounted(() => {\r
  timer = setTimeout(() => {\r
    init();\r
  }, 0);\r
});\r
\r
/**\r
 * 调整 3D Tileset 离地高度\r
 * @param {number} height - 偏移高度（米）\r
 */\r
function updateTilesetHeight(height) {\r
  height = Number(height);\r
  if (isNaN(height) || !tileset) return;\r
\r
  // 1. 获取 Tileset 包围球中心点的地理坐标（经度、纬度）\r
  const cartographic = Cesium.Cartographic.fromCartesian(\r
    tileset.boundingSphere.center,\r
  );\r
\r
  // 2. 分别计算地表原点 (高度 0) 与目标偏移高度处的笛卡尔坐标\r
  const surface = Cesium.Cartesian3.fromRadians(\r
    cartographic.longitude,\r
    cartographic.latitude,\r
    0.0,\r
  );\r
  const offset = Cesium.Cartesian3.fromRadians(\r
    cartographic.longitude,\r
    cartographic.latitude,\r
    height,\r
  );\r
\r
  // 3. 计算从地表到目标高度的平移向量 (Translation Vector)\r
  const translation = Cesium.Cartesian3.subtract(\r
    offset,\r
    surface,\r
    new Cesium.Cartesian3(),\r
  );\r
\r
  // 4. 将平移变换矩阵赋值给 tileset.modelMatrix\r
  //\r
  // 【底层数学原理与 4x4 平移变换矩阵】：\r
  //\r
  //   [目标位置]            [平移矩阵 (4x4)]            [原始位置]\r
  //   ┌   ┐          ┌                      ┐          ┌   ┐\r
  //   │ x'│          │  1.0   0.0   0.0   Tx│          │ x │   => x' = x + Tx\r
  //   │ y'│    =     │  0.0   1.0   0.0   Ty│    ×     │ y │   => y' = y + Ty\r
  //   │ z'│          │  0.0   0.0   1.0   Tz│          │ z │   => z' = z + Tz\r
  //   │ 1 │          │  0.0   0.0   0.0  1.0│          │ 1 │   => 1' = 1\r
  //   └   ┘          └                      ┘          └   ┘\r
  //                   第1列  第2列  第3列  第4列 (WebGL 列主序展开)\r
  //\r
  // 方法一：通过 4x4 列主序一维数组直接构造平移矩阵（底层原理）\r
  const m = Cesium.Matrix4.fromArray([\r
    1.0, 0.0, 0.0, 0.0, // 第 1 列 (X 轴)\r
    0.0, 1.0, 0.0, 0.0, // 第 2 列 (Y 轴)\r
    0.0, 0.0, 1.0, 0.0, // 第 3 列 (Z 轴)\r
    translation.x, translation.y, translation.z, 1.0, // 第 4 列 (平移分量 Tx, Ty, Tz, 1.0)\r
  ]);\r
  tileset.modelMatrix = m;\r
\r
  // 方法二：使用 Cesium 内置 API Matrix4.fromTranslation 快捷生成\r
  // tileset.modelMatrix = Cesium.Matrix4.fromTranslation(translation);\r
\r
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
    // 初始应用高度\r
    updateTilesetHeight(controls.height);\r
  } catch (error) {\r
    console.error(\`Error loading tileset: \${error}\`);\r
  }\r
\r
  // 5. 初始化 lil-gui 控件面板\r
  initGUI();\r
}\r
\r
function initGUI() {\r
  gui = new GUI({\r
    container: viewerDivRef.value,\r
    title: "3D Tiles 高度调整",\r
    width: 280,\r
  });\r
  gui.domElement.style.position = "absolute";\r
  gui.domElement.style.top = "10px";\r
  gui.domElement.style.right = "10px";\r
  gui.domElement.style.zIndex = "5";\r
\r
  gui\r
    .add(controls, "height", -100, 100, 1)\r
    .name("高度偏移 (米)")\r
    .onChange((val) => updateTilesetHeight(val));\r
\r
  gui.add(controls, "resetView").name("重置视角");\r
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
`,U={class:"box",ref:"viewerRef"},E=V({name:"AdjustHeight"}),M=Object.assign(E,{setup(N){const c=b([{fileName:"@/views/3dtile/adjustHeight/index.vue",rawCode:j,language:"html"},{fileName:"@/utils/cesium.js",rawCode:v,language:"javascript"}]),u=R("viewerRef");let e=null,r=null,a=null,t=null;const n={height:0,resetView:()=>{r&&e&&e.zoomTo(r,new s.HeadingPitchRange(0,-.5,r.boundingSphere.radius*2))}};_(()=>{a=setTimeout(()=>{d()},0)});function m(i){if(i=Number(i),isNaN(i)||!r)return;const o=s.Cartographic.fromCartesian(r.boundingSphere.center),f=s.Cartesian3.fromRadians(o.longitude,o.latitude,0),p=s.Cartesian3.fromRadians(o.longitude,o.latitude,i),l=s.Cartesian3.subtract(p,f,new s.Cartesian3),h=s.Matrix4.fromArray([1,0,0,0,0,1,0,0,0,0,1,0,l.x,l.y,l.z,1]);r.modelMatrix=h}async function d(){e=w(u.value,{shadows:!0}),C(e,{msaaSamples:4,enableFxaa:!0}),e.scene.globe.depthTestAgainstTerrain=!0;try{r=await s.Cesium3DTileset.fromUrl("/gisnotes-cs/SampleData/Cesium3DTiles/Tilesets/Tileset/tileset.json"),e.scene.primitives.add(r),e.zoomTo(r,new s.HeadingPitchRange(0,-.5,r.boundingSphere.radius*2)),m(n.height)}catch(i){console.error(`Error loading tileset: ${i}`)}g()}function g(){t=new T({container:u.value,title:"3D Tiles 高度调整",width:280}),t.domElement.style.position="absolute",t.domElement.style.top="10px",t.domElement.style.right="10px",t.domElement.style.zIndex="5",t.add(n,"height",-100,100,1).name("高度偏移 (米)").onChange(i=>m(i)),t.add(n,"resetView").name("重置视角")}return z(()=>{a&&clearTimeout(a),t&&(t.destroy(),t=null),e&&(e.destroy(),e=null)}),(i,o)=>(D(),S(x,{codeBlocks:I(c)},{default:B(()=>[H("div",U,null,512)]),_:1},8,["codeBlocks"]))}}),F=y(M,[["__scopeId","data-v-43d576aa"]]);export{F as default};
