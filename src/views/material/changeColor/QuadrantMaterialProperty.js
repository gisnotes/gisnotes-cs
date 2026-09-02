import Cesium from "cesium";

// 自定义四色象限材质类型标识
export const MaterialType = "QuadrantMaterialType";

// 注册基于 ST 纹理坐标的四色象限材质到 Cesium 的 MaterialCache 中
if (!Cesium.Material._materialCache.getMaterial(MaterialType)) {
  Cesium.Material._materialCache.addMaterial(MaterialType, {
    fabric: {
      type: MaterialType,
      uniforms: {},
      source: `
        czm_material czm_getMaterial(czm_materialInput materialInput) {
          czm_material material = czm_getDefaultMaterial(materialInput);

          vec2 st = materialInput.st;
          if (st.s < 0.5 && st.t < 0.5) {
            material.diffuse = vec3(0., 1., 0.);
          }
          if (st.s < 0.5 && st.t > 0.5) {
            material.diffuse = vec3(0., 0., 1.);
          }
          if (st.s > 0.5 && st.t > 0.5) {
            material.diffuse = vec3(0., 1., 1.);
          }
          if (st.s > 0.5 && st.t < 0.5) {
            material.diffuse = vec3(1., 0., 0.);
          }
          return material;
        }
      `,
    },
    translucent: false,
  });
}

/**
 * ES6 Class 语法的四色象限材质属性类 (QuadrantMaterialProperty)
 */
export class QuadrantMaterialProperty {
  constructor(options = {}) {
    this._definitionChanged = new Cesium.Event();
  }

  /**
   * 该材质属于常量材质（内部颜色固定，无需逐帧拉取）
   */
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
    return this === other || other instanceof QuadrantMaterialProperty;
  }
}

export default QuadrantMaterialProperty;

