import { STATUS } from "./constants";

export const TILE3D_NODES = [
  {
    id: "3dtile_1",
    topic: "调整模型高度",
    status: STATUS.DONE,
    route: "/3dtile/adjustHeight",
  },
  {
    id: "3dtile_2",
    topic: "改变模型位置旋转及缩放",
    status: STATUS.DONE,
    route: "/3dtile/adjustPositionAndScale",
  },
];

