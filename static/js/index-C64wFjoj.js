import{C as e,D as a}from"./widgets-CySrnfby.js";import{_ as s,r as i,de as t,F as l,M as d,o as m,m as c,f as u,h as f,i as p,H as v}from"./index-DLemvPBx.js";import"./index-DxDEFyth.js";const w=`<template>\r
  <demo-box :codeBlocks>\r
    <div class="rotatable-2d-map" ref="viewerRef"></div>\r
  </demo-box>\r
</template>\r
\r
<script setup name="Rotatable2DMap">\r
import DemoBox from "@/components/DemoBox/index.vue";\r
import IndexSourceCode from "./index.vue?raw";\r
\r
const codeBlocks = ref([\r
  {\r
    fileName: "@/views/view/multipleSyncedViews/index.vue",\r
    rawCode: IndexSourceCode,\r
    language: "html",\r
  },\r
]);\r
\r
import Cesium from "cesium";\r
import "cesium/Build/CesiumUnminified/Widgets/widgets.css";\r
\r
const viewerDivRef = useTemplateRef("viewerRef");\r
\r
let viewer = null;\r
\r
onMounted(() => {\r
  setTimeout(() => {\r
    viewer = new Cesium.Viewer(viewerDivRef.value, {\r
      geocoder: false,\r
      homeButton: false,\r
      sceneModePicker: false,\r
      baseLayerPicker: false,\r
      navigationHelpButton: false,\r
      animation: false,\r
      timeline: false,\r
      fullscreenButton: false,\r
      infoBox: false,\r
      selectionIndicator: false,\r
      shouldAnimate: true,\r
      baseLayer: Cesium.ImageryLayer.fromProviderAsync(\r
        Cesium.TileMapServiceImageryProvider.fromUrl(\r
          Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII"),\r
        ),\r
      ),\r
\r
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
  }, 0);\r
});\r
\r
onBeforeUnmount(() => {\r
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
\r
/** 隐藏底部版权 */\r
:deep(.cesium-viewer-bottom) {\r
  display: none;\r
}\r
</style>\r
`,C={class:"rotatable-2d-map",ref:"viewerRef"},M=v({name:"Rotatable2DMap"}),B=Object.assign(M,{setup(g){const n=i([{fileName:"@/views/view/multipleSyncedViews/index.vue",rawCode:w,language:"html"}]),o=t("viewerRef");let r=null;return l(()=>{setTimeout(()=>{r=new e.Viewer(o.value,{geocoder:!1,homeButton:!1,sceneModePicker:!1,baseLayerPicker:!1,navigationHelpButton:!1,animation:!1,timeline:!1,fullscreenButton:!1,infoBox:!1,selectionIndicator:!1,shouldAnimate:!0,baseLayer:e.ImageryLayer.fromProviderAsync(e.TileMapServiceImageryProvider.fromUrl(e.buildModuleUrl("Assets/Textures/NaturalEarthII"))),sceneMode:e.SceneMode.SCENE2D,mapMode2D:e.MapMode2D.ROTATE}),r.scene.camera.setView({destination:e.Cartesian3.fromDegrees(-73,42,5e7),orientation:{heading:e.Math.toRadians(-45)}})},0)}),d(()=>{r&&r.destroy()}),(x,y)=>(m(),c(a,{codeBlocks:p(n)},{default:u(()=>[f("div",C,null,512)]),_:1},8,["codeBlocks"]))}}),b=s(B,[["__scopeId","data-v-b7a7630d"]]);export{b as default};
