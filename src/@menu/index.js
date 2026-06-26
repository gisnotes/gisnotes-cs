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
    meta: { title: "二维视图", icon: "view", roles: ["admin"] },
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
    ],
  },
];
