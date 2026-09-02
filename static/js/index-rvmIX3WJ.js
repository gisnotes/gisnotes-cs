import{c as a,C as r,D as s}from"./cesium-DrqHkmj_.js";import{_ as m,r as c,T as d,F as l,M as u,o as f,m as p,f as v,h as w,i as D,H as C}from"./index-BZhg8qW3.js";import"./index-CWeydB1c.js";const M=`<template>\r
  <demo-box :codeBlocks>\r
    <div class="rotatable-2d-map" ref="viewerRef"></div>\r
  </demo-box>\r
</template>\r
\r
<script setup name="Rotatable2DMap">\r
import DemoBox from "@/components/DemoBox/index.vue";\r
import IndexSourceCode from "./index.vue?raw";\r
\r
\r
import Cesium from "cesium";\r
import "cesium/Build/CesiumUnminified/Widgets/widgets.css";\r
import { createViewer } from "@/utils/cesium";\r
\r
const codeBlocks = ref([\r
  {\r
    fileName: "@/views/view/rotatable2DMap/index.vue",\r
    rawCode: IndexSourceCode,\r
    language: "html",\r
  },\r
]);\r
const viewerDivRef = useTemplateRef("viewerRef");\r
\r
let viewer = null;\r
let timer = null;\r
\r
onMounted(() => {\r
  timer = setTimeout(() => {\r
    init();\r
  }, 0);\r
});\r
\r
function init() {\r
  viewer = createViewer(viewerDivRef.value, {\r
    // 关键配置选项：2D 模式和旋转模式\r
    sceneMode: Cesium.SceneMode.SCENE2D,\r
    mapMode2D: Cesium.MapMode2D.ROTATE,\r
  });\r
\r
  viewer.scene.camera.setView({\r
    destination: Cesium.Cartesian3.fromDegrees(-73.0, 42.0, 50000000.0),\r
    orientation: {\r
      heading: Cesium.Math.toRadians(-45.0),\r
    },\r
  });\r
}\r
\r
onBeforeUnmount(() => {\r
  if (timer) clearTimeout(timer);\r
  if (viewer) viewer.destroy();\r
});\r
<\/script>\r
\r
<style lang="scss" scoped>\r
.rotatable-2d-map {\r
  height: 100%;\r
  position: absolute;\r
  inset: 0;\r
}\r
</style>
`,_={class:"rotatable-2d-map",ref:"viewerRef"},x=C({name:"Rotatable2DMap"}),R=Object.assign(x,{setup(B){const t=c([{fileName:"@/views/view/rotatable2DMap/index.vue",rawCode:M,language:"html"}]),o=d("viewerRef");let e=null,n=null;l(()=>{n=setTimeout(()=>{i()},0)});function i(){e=a(o.value,{sceneMode:r.SceneMode.SCENE2D,mapMode2D:r.MapMode2D.ROTATE}),e.scene.camera.setView({destination:r.Cartesian3.fromDegrees(-73,42,5e7),orientation:{heading:r.Math.toRadians(-45)}})}return u(()=>{n&&clearTimeout(n),e&&e.destroy()}),(g,b)=>(f(),p(s,{codeBlocks:D(t)},{default:v(()=>[w("div",_,null,512)]),_:1},8,["codeBlocks"]))}}),S=m(R,[["__scopeId","data-v-470ab8f7"]]);export{S as default};
