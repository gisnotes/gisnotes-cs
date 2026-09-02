import{C as i,c as P,D as S}from"./cesium-DrqHkmj_.js";import{C as B}from"./cesium-pNEfRpPT.js";import{_ as D,r as L,T as k,F as N,M as j,o as O,m as z,f as I,h as p,i as X,H as Y}from"./index-BZhg8qW3.js";import"./index-CWeydB1c.js";const G=`<template>\r
  <demo-box :codeBlocks>\r
    <div class="eagle-eye-container">\r
      <!-- 主三维视图 -->\r
      <div class="main-viewer" ref="mainViewerRef"></div>\r
      <!-- 鹰眼视图小窗口 -->\r
      <div class="eagle-eye-wrapper">\r
        <div class="eagle-eye-header">\r
          <span class="title">鹰眼视图</span>\r
        </div>\r
        <div class="eagle-eye-viewer" ref="eagleEyeViewerRef"></div>\r
      </div>\r
    </div>\r
  </demo-box>\r
</template>\r
\r
<script setup name="EagleEye">\r
import DemoBox from "@/components/DemoBox/index.vue";\r
import IndexSourceCode from "./index.vue?raw";\r
import CesiumSourceCode from "@/utils/cesium.js?raw";\r
\r
import Cesium from "cesium";\r
import "cesium/Build/CesiumUnminified/Widgets/widgets.css";\r
import { createViewer } from "@/utils/cesium";\r
\r
const codeBlocks = ref([\r
  {\r
    fileName: "@/views/view/eagleEye/index.vue",\r
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
const mainViewerRef = useTemplateRef("mainViewerRef");\r
const eagleEyeViewerRef = useTemplateRef("eagleEyeViewerRef");\r
\r
let viewer = null;\r
let viewer1 = null;\r
let extentEntity = null;\r
let removePreRenderListener = null;\r
let timer = null;\r
\r
onMounted(() => {\r
  timer = setTimeout(() => {\r
    init();\r
  }, 0);\r
});\r
\r
// 预分配对象与缓存数组，彻底避免每帧 GC\r
const scratchC2 = new Cesium.Cartesian2();\r
let activePositions = [];\r
let closedPositions = [];\r
\r
/**\r
 * 拾取屏幕坐标与椭球面交点；若在地球外部（如全球远景或看天），则从中心向外二分逼近地平线切线边缘\r
 */\r
function pickScreenOrHorizon(\r
  scene,\r
  ellipsoid,\r
  targetX,\r
  targetY,\r
  centerX,\r
  centerY,\r
) {\r
  scratchC2.x = targetX;\r
  scratchC2.y = targetY;\r
  const directPos = scene.camera.pickEllipsoid(scratchC2, ellipsoid);\r
  if (directPos) return Cesium.Cartesian3.clone(directPos);\r
\r
  // 如果目标角在地球外部，从中心点向目标角二分探测地平线边缘\r
  let lowT = 0.0;\r
  let highT = 1.0;\r
  let bestPos = null;\r
\r
  for (let i = 0; i < 4; i++) {\r
    const midT = (lowT + highT) * 0.5;\r
    scratchC2.x = centerX + (targetX - centerX) * midT;\r
    scratchC2.y = centerY + (targetY - centerY) * midT;\r
    const testPos = scene.camera.pickEllipsoid(scratchC2, ellipsoid);\r
    if (testPos) {\r
      bestPos = testPos;\r
      lowT = midT;\r
    } else {\r
      highT = midT;\r
    }\r
  }\r
\r
  return bestPos ? Cesium.Cartesian3.clone(bestPos) : null;\r
}\r
\r
/**\r
 * 获取主视图 Camera 在地面的 4 个角视域范围，支持任意旋转与全缩放等级\r
 */\r
function updateCameraExtent() {\r
  if (!viewer || !viewer.scene || !viewer.camera) {\r
    activePositions = [];\r
    return;\r
  }\r
\r
  const scene = viewer.scene;\r
  const canvas = scene.canvas;\r
  const width = canvas.clientWidth;\r
  const height = canvas.clientHeight;\r
  if (width <= 0 || height <= 0) return;\r
\r
  const ellipsoid = scene.globe.ellipsoid;\r
  const cx = width * 0.5;\r
  const cy = height * 0.5;\r
\r
  // 四个角点（按顺时针/逆时针闭合顺序：左下 -> 右下 -> 右上 -> 左上）\r
  const corners = [\r
    { x: 0, y: height },\r
    { x: width, y: height },\r
    { x: width, y: 0 },\r
    { x: 0, y: 0 },\r
  ];\r
\r
  const points = [];\r
  for (let i = 0; i < 4; i++) {\r
    const pt = pickScreenOrHorizon(\r
      scene,\r
      ellipsoid,\r
      corners[i].x,\r
      corners[i].y,\r
      cx,\r
      cy,\r
    );\r
    if (pt) {\r
      const prev = points[points.length - 1];\r
      if (!prev || Cesium.Cartesian3.distance(pt, prev) > 1.0) {\r
        points.push(pt);\r
      }\r
    }\r
  }\r
\r
  if (points.length >= 3) {\r
    activePositions = points;\r
    closedPositions = points.concat(points[0]);\r
  } else {\r
    activePositions = [];\r
    closedPositions = [];\r
  }\r
}\r
\r
// 相机视角同步与范围框更新函数\r
function syncViewer() {\r
  if (!viewer || !viewer1 || !viewer.camera || !viewer1.camera) return;\r
\r
  // 1. 获取主视图相机的地理坐标（经度、纬度、离地高度）\r
  const carto = viewer.camera.positionCartographic;\r
  if (!carto) return;\r
\r
  const lon = Cesium.Math.toDegrees(carto.longitude);\r
  const lat = Cesium.Math.toDegrees(carto.latitude);\r
  const mainHeight = carto.height; // 主图相机真实离地高度（米）\r
\r
  // 2. 计算合理的高空比例：\r
  const scaleRatio = 3.0;\r
\r
  /**\r
   * 设置平滑的高低区间限制（Clamp）:\r
   *   - 最小高度（300米）：近地视角下依然能灵敏响应缩放\r
   *   - 最大高度（2.0e7米）：全球视角下完整覆盖\r
   */\r
  const minEagleEyeHeight = 300.0;\r
  const maxEagleEyeHeight = 20000000.0;\r
  const eagleEyeHeight = Cesium.Math.clamp(\r
    mainHeight * scaleRatio,\r
    minEagleEyeHeight,\r
    maxEagleEyeHeight,\r
  );\r
\r
  // 3. 鹰眼视图保持正俯视平面视角，实现纯平面的二维小地图效果\r
  viewer1.camera.setView({\r
    destination: Cesium.Cartesian3.fromDegrees(lon, lat, eagleEyeHeight),\r
    orientation: {\r
      heading: viewer.camera.heading,\r
      pitch: Cesium.Math.toRadians(-90), // 正俯视\r
      roll: 0,\r
    },\r
  });\r
\r
  // 4. 更新主视口相机的平面视图范围\r
  updateCameraExtent();\r
}\r
\r
function init() {\r
  const sharedClock = new Cesium.ClockViewModel();\r
  // 1. 创建主视图\r
  viewer = createViewer(mainViewerRef.value, { clockViewModel: sharedClock });\r
  viewer.resolutionScale = window.devicePixelRatio || 1.0;\r
\r
  // 2. 创建鹰眼视图\r
  viewer1 = createViewer(eagleEyeViewerRef.value, {\r
    clockViewModel: sharedClock,\r
  });\r
  viewer1.resolutionScale = window.devicePixelRatio || 1.0;\r
\r
  // 3. 禁用鹰眼视图的用户交互控制\r
  const control = viewer1.scene.screenSpaceCameraController;\r
  control.enableRotate = false;\r
  control.enableTranslate = false;\r
  control.enableZoom = false;\r
  control.enableTilt = false;\r
  control.enableLook = false;\r
\r
  // 4. 在鹰眼视图中添加主视图视域范围实体（纯红色线框，零剖分开销，全球拖动60FPS）\r
  extentEntity = viewer1.entities.add({\r
    name: "主视图视域范围",\r
    show: new Cesium.CallbackProperty(() => activePositions.length >= 3, false),\r
    polyline: {\r
      positions: new Cesium.CallbackProperty(() => closedPositions, false),\r
      width: 2.5,\r
      material: Cesium.Color.RED,\r
      arcType: Cesium.ArcType.NONE, // 纯直线段连接，无任何球面三角化细分开销\r
      clampToGround: false,\r
    },\r
  });\r
\r
  // 5. 监听主场景 preRender 事件，每帧零开销平滑联动\r
  removePreRenderListener = viewer.scene.preRender.addEventListener(syncViewer);\r
}\r
\r
onBeforeUnmount(() => {\r
  if (timer) clearTimeout(timer);\r
  if (removePreRenderListener) {\r
    removePreRenderListener();\r
    removePreRenderListener = null;\r
  }\r
  if (viewer1) {\r
    if (extentEntity) {\r
      viewer1.entities.remove(extentEntity);\r
      extentEntity = null;\r
    }\r
    viewer1.destroy();\r
    viewer1 = null;\r
  }\r
  if (viewer) {\r
    viewer.destroy();\r
    viewer = null;\r
  }\r
});\r
<\/script>\r
\r
<style lang="scss" scoped>\r
.eagle-eye-container {\r
  width: 100%;\r
  height: 100%;\r
  position: relative;\r
\r
  .main-viewer {\r
    width: 100%;\r
    height: 100%;\r
    position: absolute;\r
    inset: 0;\r
  }\r
\r
  .eagle-eye-wrapper {\r
    position: absolute;\r
    right: 8px;\r
    bottom: 8px;\r
    width: 260px;\r
    height: 200px;\r
    background: rgba(30, 30, 30, 0.85);\r
    border: 2px solid rgba(255, 255, 255, 0.4);\r
    border-radius: 8px;\r
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);\r
    overflow: hidden;\r
    z-index: 99;\r
    backdrop-filter: blur(4px);\r
    display: flex;\r
    flex-direction: column;\r
\r
    .eagle-eye-header {\r
      height: 28px;\r
      line-height: 28px;\r
      padding: 0 10px;\r
      background: rgba(0, 0, 0, 0.6);\r
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);\r
\r
      .title {\r
        font-size: 12px;\r
        color: #e0e0e0;\r
        font-weight: 500;\r
        user-select: none;\r
      }\r
    }\r
\r
    .eagle-eye-viewer {\r
      flex: 1;\r
      width: 100%;\r
      height: calc(100% - 28px);\r
      position: relative;\r
    }\r
  }\r
}\r
</style>\r
`,U={class:"eagle-eye-container"},W={class:"eagle-eye-wrapper"},A=Y({name:"EagleEye"}),F=Object.assign(A,{setup(Z){const T=L([{fileName:"@/views/view/eagleEye/index.vue",rawCode:G,language:"html"},{fileName:"@/utils/cesium.js",rawCode:B,language:"javascript"}]),E=k("mainViewerRef"),b=k("eagleEyeViewerRef");let r=null,t=null,f=null,v=null,C=null;N(()=>{C=setTimeout(()=>{M()},0)});const m=new i.Cartesian2;let y=[],x=[];function V(n,e,s,a,g,h){m.x=s,m.y=a;const w=n.camera.pickEllipsoid(m,e);if(w)return i.Cartesian3.clone(w);let c=0,o=1,l=null;for(let u=0;u<4;u++){const d=(c+o)*.5;m.x=g+(s-g)*d,m.y=h+(a-h)*d;const R=n.camera.pickEllipsoid(m,e);R?(l=R,c=d):o=d}return l?i.Cartesian3.clone(l):null}function H(){if(!r||!r.scene||!r.camera){y=[];return}const n=r.scene,e=n.canvas,s=e.clientWidth,a=e.clientHeight;if(s<=0||a<=0)return;const g=n.globe.ellipsoid,h=s*.5,w=a*.5,c=[{x:0,y:a},{x:s,y:a},{x:s,y:0},{x:0,y:0}],o=[];for(let l=0;l<4;l++){const u=V(n,g,c[l].x,c[l].y,h,w);if(u){const d=o[o.length-1];(!d||i.Cartesian3.distance(u,d)>1)&&o.push(u)}}o.length>=3?(y=o,x=o.concat(o[0])):(y=[],x=[])}function _(){if(!r||!t||!r.camera||!t.camera)return;const n=r.camera.positionCartographic;if(!n)return;const e=i.Math.toDegrees(n.longitude),s=i.Math.toDegrees(n.latitude),a=n.height,c=i.Math.clamp(a*3,300,2e7);t.camera.setView({destination:i.Cartesian3.fromDegrees(e,s,c),orientation:{heading:r.camera.heading,pitch:i.Math.toRadians(-90),roll:0}}),H()}function M(){const n=new i.ClockViewModel;r=P(E.value,{clockViewModel:n}),r.resolutionScale=window.devicePixelRatio||1,t=P(b.value,{clockViewModel:n}),t.resolutionScale=window.devicePixelRatio||1;const e=t.scene.screenSpaceCameraController;e.enableRotate=!1,e.enableTranslate=!1,e.enableZoom=!1,e.enableTilt=!1,e.enableLook=!1,f=t.entities.add({name:"主视图视域范围",show:new i.CallbackProperty(()=>y.length>=3,!1),polyline:{positions:new i.CallbackProperty(()=>x,!1),width:2.5,material:i.Color.RED,arcType:i.ArcType.NONE,clampToGround:!1}}),v=r.scene.preRender.addEventListener(_)}return j(()=>{C&&clearTimeout(C),v&&(v(),v=null),t&&(f&&(t.entities.remove(f),f=null),t.destroy(),t=null),r&&(r.destroy(),r=null)}),(n,e)=>(O(),z(S,{codeBlocks:X(T)},{default:I(()=>[p("div",U,[p("div",{class:"main-viewer",ref_key:"mainViewerRef",ref:E},null,512),p("div",W,[e[0]||(e[0]=p("div",{class:"eagle-eye-header"},[p("span",{class:"title"},"鹰眼视图")],-1)),p("div",{class:"eagle-eye-viewer",ref_key:"eagleEyeViewerRef",ref:b},null,512)])])]),_:1},8,["codeBlocks"]))}}),$=D(F,[["__scopeId","data-v-b24d271d"]]);export{$ as default};
