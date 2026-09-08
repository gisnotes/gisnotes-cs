import { STATUS } from "./constants";

export const CAMERA_NODES = [
  {
    id: "camera_1",
    topic: "相机可视化",
    status: STATUS.DONE,
    route: "/camera/cameraVisualization",
  },
  {
    id: "camera_2",
    topic: "相机控制",
    status: STATUS.DONE,
    route: "/camera/cameraControl",
  },
];

