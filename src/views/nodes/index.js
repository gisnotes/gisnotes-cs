import { STATUS } from "./constants";
import { VIEW_NODES } from "./view";
import { MODEL3D_NODES } from "./model3d";

export { STATUS };

export const NODE_GROUPS = [
  { id: "view", topic: "二维视图", nodes: VIEW_NODES },
  { id: "model3d", topic: "三维模型", nodes: MODEL3D_NODES },
];

export const ALL_NODES = [...VIEW_NODES, ...MODEL3D_NODES];
