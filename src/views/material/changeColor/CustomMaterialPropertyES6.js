import Cesium from "cesium";

// 自定义材质类型标识
export const MaterialType = "ChangeColorMaterialType";

// 注册纯色自定义材质到 Cesium 的 MaterialCache 中
if (!Cesium.Material._materialCache.getMaterial(MaterialType)) {
  /**
   * 这段代码是向 Cesium 底层的全局材质池（_materialCache）注册一种新的材质模板。
   * 一旦注册，后续所有的 Entity、Primitive 都可以通过该 MaterialType 名字直接调用。
   */
  Cesium.Material._materialCache.addMaterial(MaterialType, {
    fabric: {
      type: MaterialType,
      uniforms: {
        color: Cesium.Color.BLUE,
      },
      /**
       * source属性写的是GLSL着色器代码，定义了材质的渲染方式。
       *  - czm_getMaterial 是 Cesium 内置的一个函数，用于获取材质的最终渲染结果。
       *  - materialInput 是 Cesium 内部传入的材质输入参数，包含了顶点信息、纹理坐标等。
       *  - material.diffuse = color.rgb; 这行代码将材质的漫反射颜色设置为传入的 color uniform 的 RGB 值。
       *    最终返回的 material 对象会被 Cesium 用于渲染实体。
       * 
       *  diffuse 代表物体的漫反射颜色（即表面基础固有色），类型是 vec3（包含 r、g、b 三个色彩通道）。
       */
      source: `
        czm_material czm_getMaterial(czm_materialInput materialInput) {
          czm_material material = czm_getDefaultMaterial(materialInput);
          material.diffuse = color.rgb;
          return material;
        }
      `,
    },
    translucent: true,//这个材质支持半透明
  });
}

/**
 * ES6 Class 语法的自定义材质属性类
 */
export class CustomMaterialProperty {
  /**
   * 构造函数
   * @param {Object} [options={}] - 材质配置项
   * @param {Cesium.Color|string} [options.color] - 初始颜色
   */
  constructor(options = {}) {
    this._definitionChanged = new Cesium.Event();
    this._color = options.color || Cesium.Color.GREEN;
    this.color = this._color;
  }

  /**
   * 是否为常量属性（返回 false 表示每帧都会拉取 getValue 更新）
   */
  get isConstant() {
    return false;
  }

  /**
   * 材质定义变更事件
   */
  get definitionChanged() {
    return this._definitionChanged;
  }

  /**
   * 获取材质颜色
   */
  get color() {
    return this._color;
  }

  /**
   * 设置材质颜色（直接修改 uniform 数据，不触发网格重构以避免闪烁）
   */
  set color(value) {
    if (value instanceof Cesium.Color) {
      this._color = value;
    } else if (typeof value === "string") {
      this._color = Cesium.Color.fromCssColorString(value);
    }
  }

  /**
   * 获取材质类型标识
   */
  getType(time) {
    return MaterialType;
  }

  /**
   * 每帧由渲染器调用，返回传递给着色器的 Uniform 对象
   */
  getValue(time, result = {}) {
    if (!result) {
      result = {};
    }
    result.color = this._color || Cesium.Color.YELLOW;
    return result;
  }

  /**
   * 判断材质属性是否相等
   */
  equals(other) {
    return (
      this === other ||
      (other instanceof CustomMaterialProperty &&
        Cesium.Color.equals(this._color, other._color))
    );
  }
}

export default CustomMaterialProperty;

