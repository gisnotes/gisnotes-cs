import { STATUS } from "./constants";
import { VIEW_NODES } from "./view";
import { MODEL3D_NODES } from "./model3d";
import { GEOMETRIES_NODES } from "./geometries";
import { TILE3D_NODES } from "./tile3d";

export { STATUS };

export const NODE_GROUPS = [
  { id: "view", topic: "地图视图", nodes: VIEW_NODES },
  // { id: "model3d", topic: "三维模型", nodes: MODEL3D_NODES },
  { id: "geometries", topic: "几何体绘制", nodes: GEOMETRIES_NODES },
  { id: "3dtile", topic: "3DTiles", nodes: TILE3D_NODES },
];

export const ALL_NODES = [
  ...VIEW_NODES,
  ...GEOMETRIES_NODES,
  ...TILE3D_NODES,
  ...MODEL3D_NODES,
];
