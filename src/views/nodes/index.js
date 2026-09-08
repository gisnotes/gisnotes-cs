import { STATUS } from "./constants";
import { VIEW_NODES } from "./view";
import { MODEL3D_NODES } from "./model3d";
import { GEOMETRIES_NODES } from "./geometries";
import { TILE3D_NODES } from "./tile3d";
import { CAMERA_NODES } from "./camera";
import { MATERIAL_NODES } from "./material";
import { SPACE_ANALYSIS_NODES } from "./spaceAnalysis";

export { STATUS };

export const NODE_GROUPS = [
  { id: "view", topic: "地图视图", nodes: VIEW_NODES },
  { id: "geometries", topic: "几何体绘制", nodes: GEOMETRIES_NODES },
  { id: "3dtile", topic: "3DTiles", nodes: TILE3D_NODES },
  { id: "camera", topic: "相机", nodes: CAMERA_NODES },
  { id: "material", topic: "材质", nodes: MATERIAL_NODES },
  { id: "spaceAnalysis", topic: "空间分析", nodes: SPACE_ANALYSIS_NODES },
];

export const ALL_NODES = [
  ...VIEW_NODES,
  ...GEOMETRIES_NODES,
  ...TILE3D_NODES,
  ...CAMERA_NODES,
  ...MATERIAL_NODES,
  ...SPACE_ANALYSIS_NODES,
  ...MODEL3D_NODES,
];
