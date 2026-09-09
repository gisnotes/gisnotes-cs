import Cesium from "cesium";

/**
 * ===================================================================================
 * 1. 基于 Canvas2D 的现代 ES6 轻量级热力图引擎 (CanvasHeatmap)
 *    - 纯内存运行，无任何 DOM 挂载和全局变量污染
 *    - 调色板映射：将 Alpha 灰度叠加场线性映射为 256 色阶真实渐变
 *    - 画笔缓存：采用 Map 缓存径向渐变笔触，极致渲染性能
 * ===================================================================================
 */
class CanvasHeatmap {
  /**
   * @param {Object} options 配置项
   * @param {number} [options.width=200] 纹理宽度
   * @param {number} [options.height=200] 纹理高度
   * @param {number} [options.radius=20] 基础热力扩散半径
   * @param {number} [options.blur=0.75] 模糊羽化系数 (0~1)
   * @param {number} [options.maxOpacity=0.85] 最大不透明度
   * @param {number} [options.minOpacity=0.05] 最小不透明度
   * @param {Record<number, string>} [options.gradient] 渐变阈值配置
   */
  constructor({
    width = 200,
    height = 200,
    radius = 20,
    blur = 0.75,
    maxOpacity = 0.85,
    minOpacity = 0.05,
    gradient = {
      0.1: "#0000ff",
      0.45: "#00ff00",
      0.75: "#ffff00",
      0.95: "#ff0000",
    },
  } = {}) {
    this.width = width;
    this.height = height;
    this.radius = radius;
    this.blur = blur;
    this.maxOpacity = maxOpacity;
    this.minOpacity = minOpacity;
    this.gradient = gradient;

    this.points = [];
    this.min = 0;
    this.max = 1;

    // 1. 离屏输出 Canvas
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });

    // 2. 灰度累加阴影 Canvas (用于 Alpha 强度重叠叠加)
    this.shadowCanvas = document.createElement("canvas");
    this.shadowCanvas.width = this.width;
    this.shadowCanvas.height = this.height;
    this.shadowCtx = this.shadowCanvas.getContext("2d", { willReadFrequently: true });

    // 3. 画笔径向渐变模板缓存池 (Map)
    this.brushCache = new Map();

    // 4. 生成 256 色阶线性查找表
    this.palette = this._createPalette();
  }

  /**
   * 生成 256 阶线性渐变调色板查找表
   * @private
   */
  _createPalette() {
    const paletteCanvas = document.createElement("canvas");
    paletteCanvas.width = 256;
    paletteCanvas.height = 1;
    const pCtx = paletteCanvas.getContext("2d");

    const linearGradient = pCtx.createLinearGradient(0, 0, 256, 1);
    for (const [stop, color] of Object.entries(this.gradient)) {
      linearGradient.addColorStop(Number(stop), color);
    }

    pCtx.fillStyle = linearGradient;
    pCtx.fillRect(0, 0, 256, 1);

    return pCtx.getImageData(0, 0, 256, 1).data;
  }

  /**
   * 获取或动态构建单点径向渐变笔触
   * @private
   */
  _getBrush(radius, blur) {
    const cacheKey = `${radius}_${blur}`;
    if (this.brushCache.has(cacheKey)) {
      return this.brushCache.get(cacheKey);
    }

    const brushCanvas = document.createElement("canvas");
    brushCanvas.width = radius * 2;
    brushCanvas.height = radius * 2;
    const bCtx = brushCanvas.getContext("2d");

    const radialGradient = bCtx.createRadialGradient(
      radius,
      radius,
      radius * blur,
      radius,
      radius,
      radius,
    );
    radialGradient.addColorStop(0, "rgba(0,0,0,1)");
    radialGradient.addColorStop(1, "rgba(0,0,0,0)");

    bCtx.fillStyle = radialGradient;
    bCtx.fillRect(0, 0, radius * 2, radius * 2);

    this.brushCache.set(cacheKey, brushCanvas);
    return brushCanvas;
  }

  /**
   * 填充热力数据并触发渲染
   * @param {Array<{x: number, y: number, value: number, radius?: number}>} points
   */
  setData(points = []) {
    this.points = points;
    this.min = 0;
    this.max = points.length > 0 ? Math.max(...points.map((p) => p.value), 1) : 1;
    this.render();
  }

  /**
   * 执行渲染管线
   */
  render() {
    const { width, height, shadowCtx, ctx, points, min, max, blur } = this;

    shadowCtx.clearRect(0, 0, width, height);
    ctx.clearRect(0, 0, width, height);

    if (!points || points.length === 0) return;

    const range = max - min || 1;

    // Step 1: 在阴影画布上叠加绘制 Alpha 灰度羽化圆
    for (const point of points) {
      const r = point.radius || this.radius;
      const brush = this._getBrush(r, blur);
      const intensity = Math.min(Math.max((point.value - min) / range, 0), 1);

      shadowCtx.globalAlpha = intensity;
      shadowCtx.drawImage(brush, point.x - r, point.y - r);
    }

    // Step 2: 采样像素点 Alpha 值，通过调色板映射为彩色并回写
    const imageData = shadowCtx.getImageData(0, 0, width, height);
    const { data } = imageData;
    const len = data.length;
    const { palette, minOpacity, maxOpacity } = this;

    const minAlpha = minOpacity * 255;
    const maxAlpha = maxOpacity * 255;

    for (let i = 3; i < len; i += 4) {
      const alpha = data[i];
      if (alpha === 0) continue;

      const paletteOffset = alpha * 4;
      data[i - 3] = palette[paletteOffset];     // R
      data[i - 2] = palette[paletteOffset + 1]; // G
      data[i - 1] = palette[paletteOffset + 2]; // B

      // 透明度区间限制
      let finalAlpha = alpha;
      if (finalAlpha < minAlpha) finalAlpha = minAlpha;
      if (finalAlpha > maxAlpha) finalAlpha = maxAlpha;
      data[i] = finalAlpha;
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * 获取指定离屏坐标处的归一化热力强度值
   * @param {number} x
   * @param {number} y
   * @returns {number}
   */
  getValueAt(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    const pixel = this.shadowCtx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
    const alpha = pixel[3];
    return Math.round((alpha / 255) * (this.max - this.min));
  }

  /**
   * 输出用于 Cesium Material 的 Image DataURL
   * @returns {string}
   */
  toDataURL() {
    return this.canvas.toDataURL();
  }

  /**
   * 销毁所有离屏 Canvas 资源
   */
  destroy() {
    this.brushCache.clear();
    this.points = [];
    this.canvas.width = 0;
    this.canvas.height = 0;
    this.shadowCanvas.width = 0;
    this.shadowCanvas.height = 0;
  }
}

/**
 * ===================================================================================
 * 2. 现代 ES6 Class 语法的 Cesium 3D 立体热力图组件 (Heatmap3D)
 *    - 自动计算离散点集的 ENU 局部空间切平面最小包围框
 *    - 构建 200 × 200 (40,000 顶点) 高精度三角曲面网格
 *    - WebGL GPU 顶点着色器位移：沿地球表面法线方向向上隆起，形成立体山峰
 * ===================================================================================
 */
export class Heatmap3D {
  /**
   * @param {Cesium.Viewer} viewer Cesium 视图实例
   * @param {Object} options 配置项
   * @param {Array<{lnglat: [number, number], value: number}>} options.dataPoints 经纬度及强度数组
   * @param {number} [options.radius=20] 热力点作用半径
   * @param {number} [options.maxHeight=1200] GPU 顶点位移最大拉伸高度 (米)
   * @param {number} [options.baseElevation=0] 基底标高 (米)
   * @param {'TRIANGLES'|'LINES'} [options.primitiveType='TRIANGLES'] 图元形态
   * @param {number} [options.gridResolution=200] 网格分辨率 (默认 200x200 = 40,000 顶点)
   * @param {Record<number, string>} [options.colorGradient] 颜色梯度映射
   */
  constructor(viewer, options = {}) {
    if (!viewer) {
      throw new Error("Heatmap3D: 缺少必须参数 viewer 实例");
    }

    this.viewer = viewer;
    this.options = { ...options };

    this.dataPoints = options.dataPoints || [];
    this.radius = options.radius ?? 20;
    this.maxHeight = options.maxHeight ?? 1200;
    this.baseElevation = options.baseElevation ?? 0;
    this.primitiveType = options.primitiveType || "TRIANGLES";
    this.gridResolution = options.gridResolution ?? 200;
    this.canvasResolution = 200;
    this.colorGradient = options.colorGradient || {
      0.1: "#0000ff",
      0.45: "#00ff00",
      0.75: "#ffff00",
      0.95: "#ff0000",
    };

    // 内部状态与图元引用
    this.heatmapCanvas = null;
    this.heatmapPrimitive = null;
    this.positionHierarchy = [];
    this.boundingRect = null;
    this.boundingBox = null;
    this.xAxis = null;
    this.yAxis = null;
    this.xAxisLength = 0;
    this.yAxisLength = 0;

    this._build();
  }

  /**
   * 构建 3D 热力图核心流水线
   * @private
   */
  _build() {
    if (!this.dataPoints || this.dataPoints.length < 2) {
      console.warn("Heatmap3D: 数据点位数量不得少于 2 个");
      return;
    }

    // 1. 初始化纯内存 Canvas2D 热力图渲染器
    this.heatmapCanvas = new CanvasHeatmap({
      width: this.canvasResolution,
      height: this.canvasResolution,
      radius: this.radius,
      gradient: this.colorGradient,
    });

    // 2. 将经纬度点集转换为空间直角坐标并计算局部切平面包围盒
    this.positionHierarchy = this.dataPoints.map((point) =>
      Cesium.Cartesian3.fromDegrees(point.lnglat[0], point.lnglat[1], 0),
    );
    this._computeBoundingBox();

    // 3. 投影归一化并向 Canvas 注入数据绘制热力纹理
    const canvasPoints = this.positionHierarchy.map((position, index) => {
      const { x, y } = this._computeNormalizedCoordinates(position);
      return {
        x,
        y,
        value: this.dataPoints[index].value,
      };
    });
    this.heatmapCanvas.setData(canvasPoints);

    // 4. 构建 200x200 高精度曲面几何体
    const geometryInstance = new Cesium.GeometryInstance({
      geometry: this._createGeometry(),
    });

    // 5. 自定义 WebGL 顶点着色器：动态采样热力贴图红通道 (color.r)，沿地球法线方向 (upDir) 向上拉伸
    const heightScale = Number(this.maxHeight).toFixed(1);
    const customVertexShader = `
      in vec3 position3DHigh;
      in vec3 position3DLow;
      in vec2 st;
      in float batchId;
      uniform sampler2D image_0; 
      out vec3 v_positionEC;
      in vec3 normal;
      out vec3 v_normalEC;
      out vec2 v_st; 
      void main(){
          vec4 p = czm_computePosition();
          v_normalEC = czm_normal * normal;   
          v_positionEC = (czm_modelViewRelativeToEye * p).xyz;
          vec4 positionWC = czm_inverseModelView * vec4(v_positionEC, 1.0);
          v_st = st; 
          vec4 color = texture(image_0, v_st); 
          vec3 upDir = normalize(positionWC.xyz); 
          // GPU 依据热力值沿法线抬升，最高隆起 ${heightScale} 米
          p += vec4(color.r * upDir * ${heightScale}, 0.0); 
          gl_Position = czm_modelViewProjectionRelativeToEye * p; 
      }
    `;

    // 6. 创建 Cesium Primitive 并加入渲染场景
    this.heatmapPrimitive = this.viewer.scene.primitives.add(
      new Cesium.Primitive({
        geometryInstances: geometryInstance,
        appearance: new Cesium.MaterialAppearance({
          material: new Cesium.Material({
            fabric: {
              type: "Image",
              uniforms: {
                image: this.heatmapCanvas.toDataURL(),
              },
            },
          }),
          vertexShaderSource: customVertexShader,
          translucent: true,
          flat: true,
        }),
        asynchronous: false,
      }),
    );

    this.heatmapPrimitive.id = "heatmap3d_es6";
  }

  /**
   * 基于局部 ENU (East-North-Up) 站心坐标系精确计算点集的包围框
   * @private
   */
  _computeBoundingBox() {
    if (!this.positionHierarchy || this.positionHierarchy.length === 0) return;

    // 1. 计算点集的外接球中心点与半径
    const boundingSphere = Cesium.BoundingSphere.fromPoints(
      this.positionHierarchy,
      new Cesium.BoundingSphere(),
    );
    const centerPoint = boundingSphere.center;
    const sphereRadius = boundingSphere.radius;

    // 2. 建立局部 ENU 变换矩阵
    const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(centerPoint.clone());
    const yAxisVector = new Cesium.Cartesian3(0, 1, 0);

    // 3. 计算 4 个角点的旋转顶点
    const boundingVertices = [];
    for (let angle = 45; angle <= 360; angle += 90) {
      const rotationMatrix = Cesium.Matrix3.fromRotationZ(
        Cesium.Math.toRadians(angle),
        new Cesium.Matrix3(),
      );
      const rotatedVector = Cesium.Matrix3.multiplyByVector(
        rotationMatrix,
        yAxisVector,
        new Cesium.Cartesian3(),
      );
      const normalizedVector = Cesium.Cartesian3.normalize(
        rotatedVector,
        new Cesium.Cartesian3(),
      );
      const scaledVector = Cesium.Cartesian3.multiplyByScalar(
        normalizedVector,
        sphereRadius,
        new Cesium.Cartesian3(),
      );
      const vertex = Cesium.Matrix4.multiplyByPoint(
        modelMatrix,
        scaledVector.clone(),
        new Cesium.Cartesian3(),
      );
      boundingVertices.push(vertex);
    }

    // 4. 提取四至经纬度边界
    const coordinates = boundingVertices.map((vertex) => {
      const cartographic = Cesium.Cartographic.fromCartesian(vertex);
      return [
        Cesium.Math.toDegrees(cartographic.longitude),
        Cesium.Math.toDegrees(cartographic.latitude),
        cartographic.height,
      ];
    });

    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    for (const [lng, lat] of coordinates) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }

    const vertexCount = boundingVertices.length;
    const latSpan = maxLat - minLat;
    const lngSpan = maxLng - minLng;

    this.boundingRect = {
      minLatitude: minLat - latSpan / vertexCount,
      maxLatitude: maxLat + latSpan / vertexCount,
      minLongitude: minLng - lngSpan / vertexCount,
      maxLongitude: maxLng + lngSpan / vertexCount,
    };

    // 5. 确定矩形四角直角坐标与投影轴向量
    this.boundingBox = {
      leftTop: Cesium.Cartesian3.fromDegrees(
        this.boundingRect.minLongitude,
        this.boundingRect.maxLatitude,
      ),
      leftBottom: Cesium.Cartesian3.fromDegrees(
        this.boundingRect.minLongitude,
        this.boundingRect.minLatitude,
      ),
      rightTop: Cesium.Cartesian3.fromDegrees(
        this.boundingRect.maxLongitude,
        this.boundingRect.maxLatitude,
      ),
      rightBottom: Cesium.Cartesian3.fromDegrees(
        this.boundingRect.maxLongitude,
        this.boundingRect.minLatitude,
      ),
    };

    this.xAxis = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.subtract(
        this.boundingBox.rightTop,
        this.boundingBox.leftTop,
        new Cesium.Cartesian3(),
      ),
      new Cesium.Cartesian3(),
    );

    this.yAxis = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.subtract(
        this.boundingBox.leftBottom,
        this.boundingBox.leftTop,
        new Cesium.Cartesian3(),
      ),
      new Cesium.Cartesian3(),
    );

    this.xAxisLength = Cesium.Cartesian3.distance(
      this.boundingBox.rightTop,
      this.boundingBox.leftTop,
    );
    this.yAxisLength = Cesium.Cartesian3.distance(
      this.boundingBox.leftBottom,
      this.boundingBox.leftTop,
    );
  }

  /**
   * 将三维坐标点通过切平面向量点积映射为 Canvas 离屏像素坐标
   * @private
   */
  _computeNormalizedCoordinates(position) {
    if (!position) return { x: 0, y: 0 };

    const cartographic = Cesium.Cartographic.fromCartesian(position.clone());
    cartographic.height = 0;
    const flatCartesian = Cesium.Cartographic.toCartesian(cartographic);

    const relativeVector = Cesium.Cartesian3.subtract(
      flatCartesian,
      this.boundingBox.leftTop,
      new Cesium.Cartesian3(),
    );
    const xProjected = Cesium.Cartesian3.dot(relativeVector, this.xAxis);
    const yProjected = Cesium.Cartesian3.dot(relativeVector, this.yAxis);

    return {
      x: Math.round((xProjected / this.xAxisLength) * this.canvasResolution),
      y: Math.round((yProjected / this.yAxisLength) * this.canvasResolution),
    };
  }

  /**
   * 生成网格顶点数据 (Positions, TextureCoords, Indices)
   * @private
   */
  _generateMeshData() {
    const { gridResolution, boundingRect, baseElevation } = this;
    const positions = [];
    const textureCoords = [];
    const indices = [];

    const { minLatitude, maxLatitude, minLongitude, maxLongitude } = boundingRect;
    const latInterval = (maxLatitude - minLatitude) / gridResolution;
    const lngInterval = (maxLongitude - minLongitude) / gridResolution;

    const colCount = gridResolution + 1; // 每列实际包含的顶点数 (例如 201)

    // 1. 生成 (gridResolution + 1) * (gridResolution + 1) 个规范规则网格顶点
    for (let i = 0; i <= gridResolution; i++) {
      const currentLng = minLongitude + i * lngInterval;
      const u = i / gridResolution;

      for (let j = 0; j <= gridResolution; j++) {
        const currentLat = minLatitude + j * latInterval;
        const v = j / gridResolution;

        // 基准网格顶点统一置于 baseElevation，所有三维隆起完全交由 GPU 顶点着色器平滑拉伸
        const vertexPosition = Cesium.Cartesian3.fromDegrees(
          currentLng,
          currentLat,
          baseElevation,
        );

        positions.push(vertexPosition.x, vertexPosition.y, vertexPosition.z);
        textureCoords.push(u, v);
      }
    }

    // 2. 正确构建四边形网格索引，严格以 colCount 为跨度，彻底解决跳行错位与竖向锯齿条纹
    if (this.primitiveType === "LINES") {
      for (let i = 0; i < gridResolution; i++) {
        for (let j = 0; j < gridResolution; j++) {
          const row1 = i * colCount;
          const row2 = (i + 1) * colCount;

          const p0 = row1 + j;
          const p1 = row2 + j;
          const p2 = row2 + (j + 1);
          const p3 = row1 + (j + 1);

          indices.push(p0, p1, p1, p2, p2, p3, p3, p0);
        }
      }
    } else {
      for (let i = 0; i < gridResolution; i++) {
        for (let j = 0; j < gridResolution; j++) {
          const row1 = i * colCount;
          const row2 = (i + 1) * colCount;

          const p0 = row1 + j;         // 左下
          const p1 = row2 + j;         // 右下
          const p2 = row2 + (j + 1);   // 右上
          const p3 = row1 + (j + 1);   // 左上

          // 两个逆时针三角形构成一个严丝合缝的四边形面元
          indices.push(p0, p1, p2);
          indices.push(p0, p2, p3);
        }
      }
    }

    return { positions, textureCoords, indices };
  }

  /**
   * 构建 Cesium.Geometry 对象
   * @private
   */
  _createGeometry() {
    const { positions, textureCoords, indices } = this._generateMeshData();
    const IndexArrayType =
      positions.length / 3 > 65535 ? Uint32Array : Uint16Array;

    return new Cesium.Geometry({
      attributes: new Cesium.GeometryAttributes({
        position: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.DOUBLE,
          componentsPerAttribute: 3,
          values: positions,
        }),
        st: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.FLOAT,
          componentsPerAttribute: 2,
          values: new Float32Array(textureCoords),
        }),
      }),
      indices: new IndexArrayType(indices),
      primitiveType: Cesium.PrimitiveType[this.primitiveType],
      boundingSphere: Cesium.BoundingSphere.fromVertices(positions),
    });
  }

  /**
   * 动态更新配置参数并重构热力图
   * @param {Object} newOptions
   */
  update(newOptions = {}) {
    Object.assign(this, newOptions);
    this._destroyInternal();
    this._build();
  }

  /**
   * 内部销毁逻辑
   * @private
   */
  _destroyInternal() {
    if (this.heatmapPrimitive && !this.viewer?.isDestroyed?.()) {
      this.viewer.scene.primitives.remove(this.heatmapPrimitive);
      this.heatmapPrimitive = null;
    }
    if (this.heatmapCanvas) {
      this.heatmapCanvas.destroy();
      this.heatmapCanvas = null;
    }
  }

  /**
   * 彻底销毁热力图实例并释放所有显存与内存
   */
  destroy() {
    this._destroyInternal();
    this.viewer = null;
    this.positionHierarchy = [];
    this.dataPoints = [];
    this.boundingRect = null;
    this.boundingBox = null;
  }
}

export default Heatmap3D;

