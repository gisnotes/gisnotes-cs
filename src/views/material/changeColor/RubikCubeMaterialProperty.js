import Cesium from "cesium";

// 方案 A：自定义 3x3 九宫格魔方材质类型标识
export const MaterialType = "RubikCubeMaterialType";

// 注册 3x3 九宫格魔方着色器到 Cesium 的 MaterialCache 中
if (!Cesium.Material._materialCache.getMaterial(MaterialType)) {
  Cesium.Material._materialCache.addMaterial(MaterialType, {
    fabric: {
      type: MaterialType,
      uniforms: {},
      source: `
        czm_material czm_getMaterial(czm_materialInput materialInput) {
          czm_material material = czm_getDefaultMaterial(materialInput);
          vec2 st = materialInput.st;

          // 1. 将 0.0 ~ 1.0 的纹理坐标分为 3x3 九宫格
          vec2 grid = floor(st * 3.0); // 坐标 (0,1,2, 0,1,2)
          vec2 f = fract(st * 3.0);    // 每个格子内部局部坐标 (0.0 ~ 1.0)

          // 2. 黑色分界缝隙边框（模拟魔方黑色塑料缝隙）
          float border = 0.06;
          if (f.x < border || f.x > (1.0 - border) || f.y < border || f.y > (1.0 - border)) {
            material.diffuse = vec3(0.05); // 黑色塑料胶骨
            return material;
          }

          // 3. 根据格子序号渲染经典魔方 9 宫格色彩
          int idx = int(grid.y) * 3 + int(grid.x);
          if (idx == 0) material.diffuse = vec3(0.85, 0.0, 0.0);   // 经典红
          else if (idx == 1) material.diffuse = vec3(0.0, 0.3, 0.9); // 经典蓝
          else if (idx == 2) material.diffuse = vec3(0.95, 0.85, 0.0); // 经典黄
          else if (idx == 3) material.diffuse = vec3(0.0, 0.75, 0.2); // 经典绿
          else if (idx == 4) material.diffuse = vec3(0.95, 0.45, 0.0); // 经典橙
          else if (idx == 5) material.diffuse = vec3(0.95, 0.95, 0.95); // 经典白
          else if (idx == 6) material.diffuse = vec3(0.0, 0.8, 0.85);  // 青蓝
          else if (idx == 7) material.diffuse = vec3(0.85, 0.05, 0.75); // 玫红
          else material.diffuse = vec3(1.0, 0.65, 0.0);               // 亮橙

          return material;
        }
      `,
    },
    translucent: false,
  });
}

/**
 * 方案 A：ES6 Class 语法的 3x3 九宫格魔方材质属性类
 */
export class RubikCubeMaterialProperty {
  constructor(options = {}) {
    this._definitionChanged = new Cesium.Event();
  }

  get isConstant() {
    return true;
  }

  get definitionChanged() {
    return this._definitionChanged;
  }

  getType(time) {
    return MaterialType;
  }

  getValue(time, result = {}) {
    return result || {};
  }

  equals(other) {
    return this === other || other instanceof RubikCubeMaterialProperty;
  }
}

export default RubikCubeMaterialProperty;

