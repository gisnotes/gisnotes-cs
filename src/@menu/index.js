/**
 * 本地菜单定义结构
 */
export const LOCAL_ROUTES = [
  {
    name: "Veiw",
    path: "/view",
    hidden: false,
    redirect: "noRedirect",
    component: "Layout",
    alwaysShow: true,
    meta: { title: "地图视图", icon: "view", roles: ["admin"] },
    children: [
      {
        path: "multipleSyncedViews",
        component: "view/multipleSyncedViews/index",
        name: "MultipleSyncedViews",
        hidden: false,
        meta: { title: "二三维视图同步", icon: "鹰眼视图", roles: ["admin"] },
      },
      {
        path: "rotatable2DMap",
        component: "view/rotatable2DMap/index",
        name: "Rotatable2DMap",
        hidden: false,
        meta: { title: "可旋转的二维地图", icon: "2dmap", roles: ["admin"] },
      },
      {
        path: "eagleEye",
        component: "view/eagleEye/index",
        name: "EagleEye",
        hidden: false,
        meta: { title: "鹰眼", icon: "鹰眼视图", roles: ["admin"] },
      },
    ],
  },
  // {
  //   name: "3dmodel",
  //   path: "/3dmodel",
  //   hidden: false,
  //   redirect: "noRedirect",
  //   component: "Layout",
  //   alwaysShow: true,
  //   meta: { title: "三维模型", icon: "模型", roles: ["admin"] },
  //   children: [
  //     {
  //       path: "gltfModels",
  //       component: "3dmodel/gltfModels/index",
  //       name: "glTF 模型",
  //       hidden: false,
  //       meta: { title: "glTF模型", icon: "gltf", roles: ["admin"] },
  //     },
  //   ],
  // },
  {
    name: "geometries",
    path: "/geometries",
    hidden: false,
    redirect: "noRedirect",
    component: "Layout",
    alwaysShow: true,
    meta: { title: "几何体绘制", icon: "geometry", roles: ["admin"] },
    children: [
      {
        path: "geometriesDraw",
        component: "geometries/geometriesDraw/index",
        name: "GeometriesDraw",
        hidden: false,
        meta: { title: "常见几何体绘制", icon: "geometry", roles: ["admin"] },
      },
    ],
  },
];
