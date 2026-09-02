import Cesium from "cesium";

// 自定义材质类型标识
export const MaterialType = "ChangeColorMaterialType";

// 注册自定义纯色材质到 Cesium 的 MaterialCache 中
if (!Cesium.Material._materialCache.getMaterial(MaterialType)) {
  Cesium.Material._materialCache.addMaterial(MaterialType, {
    fabric: {
      type: MaterialType,
      uniforms: {
        color: Cesium.Color.BLUE,
      },
      source: `
        czm_material czm_getMaterial(czm_materialInput materialInput) {
          czm_material material = czm_getDefaultMaterial(materialInput);
          material.diffuse = color.rgb;
          return material;
        }
      `,
    },
    translucent: true,
  });
}

/**
 * 自定义材质属性类 (CustomMaterialProperty)
 * @param {Object} [options={}] - 配置项
 * @param {Cesium.Color|string} [options.color] - 初始材质颜色
 */
export function CustomMaterialProperty(options = {}) {
  this._definitionChanged = new Cesium.Event();

  // options 参数接收材质初始参数
  this._color = options.color || Cesium.Color.GREEN;
  this.color = this._color;
}

Object.defineProperties(CustomMaterialProperty.prototype, {
  isConstant: {
    get: function () {
      return false;
    },
  },
  definitionChanged: {
    get: function () {
      return this._definitionChanged;
    },
  },
  // 定义为属性
  color: {
    get: function () {
      return this._color;
    },
    set: function (value) {
      if (value instanceof Cesium.Color) {
        this._color = value;
      } else if (typeof value === "string") {
        this._color = Cesium.Color.fromCssColorString(value);
      }
    },
  },
});

CustomMaterialProperty.prototype.getType = function (time) {
  return MaterialType;
};

CustomMaterialProperty.prototype.getValue = function (time, result) {
  if (!result) {
    result = {};
  }
  // 将材质参数设置到 result 对象后返回给着色器
  result.color = this._color || Cesium.Color.YELLOW;
  return result;
};

CustomMaterialProperty.prototype.equals = function (other) {
  return (
    this === other ||
    (other instanceof CustomMaterialProperty &&
      Cesium.Color.equals(this._color, other._color))
  );
};

export default CustomMaterialProperty;

