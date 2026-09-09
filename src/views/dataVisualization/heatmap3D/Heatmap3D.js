import Cesium from "cesium";

/* ---------------------------------------------------- 内置轻量 Canvas2D 热力计算引擎 ----------------------------------------------- */
const HeatmapConfig = {
  defaultRadius: 40,
  defaultRenderer: "canvas2d",
  defaultGradient: {
    0.25: "rgb(0,0,255)",
    0.55: "rgb(0,255,0)",
    0.85: "yellow",
    1.0: "rgb(255,0,0)",
  },
  defaultMaxOpacity: 1,
  defaultMinOpacity: 0,
  defaultBlur: 0.85,
  defaultXField: "x",
  defaultYField: "y",
  defaultValueField: "value",
  plugins: {},
};

const Store = (function () {
  function Store(config) {
    this._coordinator = {};
    this._data = [];
    this._radi = [];
    this._min = 0;
    this._max = 1;
    this._xField = config["xField"] || config.defaultXField;
    this._yField = config["yField"] || config.defaultYField;
    this._valueField = config["valueField"] || config.defaultValueField;

    if (config["radius"]) {
      this._cfgRadius = config["radius"];
    }
  }

  const defaultRadius = HeatmapConfig.defaultRadius;

  Store.prototype = {
    _organiseData: function (dataPoint, forceRender) {
      const x = dataPoint[this._xField];
      const y = dataPoint[this._yField];
      const radi = this._radi;
      const store = this._data;
      const max = this._max;
      const min = this._min;
      const value = dataPoint[this._valueField] || 1;
      const radius = dataPoint.radius || this._cfgRadius || defaultRadius;

      if (!store[x]) {
        store[x] = [];
        radi[x] = [];
      }

      if (!store[x][y]) {
        store[x][y] = value;
        radi[x][y] = radius;
      } else {
        store[x][y] += value;
      }

      if (store[x][y] > max) {
        if (!forceRender) {
          this._max = store[x][y];
        } else {
          this.setDataMax(store[x][y]);
        }
        return false;
      } else {
        return {
          x,
          y,
          value,
          radius,
          min,
          max,
        };
      }
    },
    _unOrganizeData: function () {
      const unorganizedData = [];
      const data = this._data;
      const radi = this._radi;

      for (const x in data) {
        for (const y in data[x]) {
          unorganizedData.push({
            x,
            y,
            radius: radi[x][y],
            value: data[x][y],
          });
        }
      }
      return {
        min: this._min,
        max: this._max,
        data: unorganizedData,
      };
    },
    _onExtremaChange: function () {
      this._coordinator.emit("extremachange", {
        min: this._min,
        max: this._max,
      });
    },
    addData: function () {
      if (arguments[0].length > 0) {
        const dataArr = arguments[0];
        let dataLen = dataArr.length;
        while (dataLen--) {
          this.addData.call(this, dataArr[dataLen]);
        }
        return this;
      }
      const organisedEntry = this._organiseData(arguments[0], true);
      if (organisedEntry) {
        this._coordinator.emit("renderpartial", {
          min: this._min,
          max: this._max,
          data: [organisedEntry],
        });
      }
      return this;
    },
    setData: function (data) {
      const dataPoints = data.data;
      const pointsLen = dataPoints.length;

      this._data = [];
      this._radi = [];

      for (let i = 0; i < pointsLen; i++) {
        this._organiseData(dataPoints[i], false);
      }
      this._max = data.max;
      this._min = data.min || 0;

      this._onExtremaChange();
      this._coordinator.emit("renderall", this._getInternalData());
      return this;
    },
    setDataMax: function (max) {
      this._max = max;
      this._onExtremaChange();
      this._coordinator.emit("renderall", this._getInternalData());
      return this;
    },
    setDataMin: function (min) {
      this._min = min;
      this._onExtremaChange();
      this._coordinator.emit("renderall", this._getInternalData());
      return this;
    },
    setCoordinator: function (coordinator) {
      this._coordinator = coordinator;
    },
    _getInternalData: function () {
      return {
        max: this._max,
        min: this._min,
        data: this._data,
        radi: this._radi,
      };
    },
    getData: function () {
      return this._unOrganizeData();
    },
  };

  return Store;
})();

const Canvas2dRenderer = (function () {
  function _getColorPalette(config) {
    const gradientConfig = config.gradient || config.defaultGradient;
    const paletteCanvas = document.createElement("canvas");
    const paletteCtx = paletteCanvas.getContext("2d");

    paletteCanvas.width = 256;
    paletteCanvas.height = 1;

    const gradient = paletteCtx.createLinearGradient(0, 0, 256, 1);
    for (const key in gradientConfig) {
      gradient.addColorStop(key, gradientConfig[key]);
    }

    paletteCtx.fillStyle = gradient;
    paletteCtx.fillRect(0, 0, 256, 1);

    return paletteCtx.getImageData(0, 0, 256, 1).data;
  }

  function _getPointTemplate(radius, blurFactor) {
    const tplCanvas = document.createElement("canvas");
    const tplCtx = tplCanvas.getContext("2d");
    const x = radius;
    const y = radius;
    tplCanvas.width = tplCanvas.height = radius * 2;

    if (blurFactor == 1) {
      tplCtx.beginPath();
      tplCtx.arc(x, y, radius, 0, 2 * Math.PI, false);
      tplCtx.fillStyle = "rgba(0,0,0,1)";
      tplCtx.fill();
    } else {
      const gradient = tplCtx.createRadialGradient(
        x,
        y,
        radius * blurFactor,
        x,
        y,
        radius,
      );
      gradient.addColorStop(0, "rgba(0,0,0,1)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      tplCtx.fillStyle = gradient;
      tplCtx.fillRect(0, 0, 2 * radius, 2 * radius);
    }

    return tplCanvas;
  }

  function _prepareData(data) {
    const renderData = [];
    const min = data.min;
    const max = data.max;
    const radi = data.radi;
    const d = data.data;

    const xValues = Object.keys(d);
    let xValuesLen = xValues.length;

    while (xValuesLen--) {
      const xValue = xValues[xValuesLen];
      const yValues = Object.keys(d[xValue]);
      let yValuesLen = yValues.length;
      while (yValuesLen--) {
        const yValue = yValues[yValuesLen];
        const value = d[xValue][yValue];
        const radius = radi[xValue][yValue];
        renderData.push({
          x: xValue,
          y: yValue,
          value,
          radius,
        });
      }
    }

    return {
      min,
      max,
      data: renderData,
    };
  }

  function Canvas2dRenderer(config) {
    const container = config.container;
    const shadowCanvas = (this.shadowCanvas = document.createElement("canvas"));
    const canvas = (this.canvas =
      config.canvas || document.createElement("canvas"));
    this._renderBoundaries = [10000, 10000, 0, 0];

    const computed = getComputedStyle(config.container) || {};

    canvas.className = "heatmap-canvas";

    this._width =
      canvas.width =
      shadowCanvas.width =
        +computed.width.replace(/px/, "") || 200;
    this._height =
      canvas.height =
      shadowCanvas.height =
        +computed.height.replace(/px/, "") || 200;

    this.shadowCtx = shadowCanvas.getContext("2d");
    this.ctx = canvas.getContext("2d");

    canvas.style.cssText = shadowCanvas.style.cssText =
      "position:absolute;left:0;top:0;";

    container.style.position = "relative";
    container.appendChild(canvas);

    this._palette = _getColorPalette(config);
    this._templates = {};

    this._setStyles(config);
  }

  Canvas2dRenderer.prototype = {
    renderPartial: function (data) {
      this._drawAlpha(data);
      this._colorize();
    },
    renderAll: function (data) {
      this._clear();
      this._drawAlpha(_prepareData(data));
      this._colorize();
    },
    _updateGradient: function (config) {
      this._palette = _getColorPalette(config);
    },
    updateConfig: function (config) {
      if (config["gradient"]) {
        this._updateGradient(config);
      }
      this._setStyles(config);
    },
    setDimensions: function (width, height) {
      this._width = width;
      this._height = height;
      this.canvas.width = this.shadowCanvas.width = width;
      this.canvas.height = this.shadowCanvas.height = height;
    },
    _clear: function () {
      this.shadowCtx.clearRect(0, 0, this._width, this._height);
      this.ctx.clearRect(0, 0, this._width, this._height);
    },
    _setStyles: function (config) {
      this._blur =
        config.blur == 0 ? 0 : config.blur || config.defaultBlur;

      if (config.backgroundColor) {
        this.canvas.style.backgroundColor = config.backgroundColor;
      }

      this._opacity = (config.opacity || 0) * 255;
      this._maxOpacity = (config.maxOpacity || config.defaultMaxOpacity) * 255;
      this._minOpacity = (config.minOpacity || config.defaultMinOpacity) * 255;
      this._useGradientOpacity = !!config.useGradientOpacity;
    },
    _drawAlpha: function (data) {
      const min = (this._min = data.min);
      const max = (this._max = data.max);
      const d = data.data || [];
      let dataLen = d.length;
      const blur = 1 - this._blur;

      while (dataLen--) {
        const point = d[dataLen];
        const x = point.x;
        const y = point.y;
        const radius = point.radius;
        const value = Math.min(point.value, max);
        const rectX = x - radius;
        const rectY = y - radius;
        const shadowCtx = this.shadowCtx;

        let tpl;
        if (!this._templates[radius]) {
          this._templates[radius] = tpl = _getPointTemplate(radius, blur);
        } else {
          tpl = this._templates[radius];
        }

        shadowCtx.globalAlpha = (value - min) / (max - min || 1);
        shadowCtx.drawImage(tpl, rectX, rectY);

        if (rectX < this._renderBoundaries[0]) {
          this._renderBoundaries[0] = rectX;
        }
        if (rectY < this._renderBoundaries[1]) {
          this._renderBoundaries[1] = rectY;
        }
        if (rectX + 2 * radius > this._renderBoundaries[2]) {
          this._renderBoundaries[2] = rectX + 2 * radius;
        }
        if (rectY + 2 * radius > this._renderBoundaries[3]) {
          this._renderBoundaries[3] = rectY + 2 * radius;
        }
      }
    },
    _colorize: function () {
      let x = this._renderBoundaries[0];
      let y = this._renderBoundaries[1];
      let width = this._renderBoundaries[2] - x;
      let height = this._renderBoundaries[3] - y;
      const maxWidth = this._width;
      const maxHeight = this._height;
      const opacity = this._opacity;
      const maxOpacity = this._maxOpacity;
      const minOpacity = this._minOpacity;
      const useGradientOpacity = this._useGradientOpacity;

      if (x < 0) x = 0;
      if (y < 0) y = 0;
      if (x + width > maxWidth) width = maxWidth - x;
      if (y + height > maxHeight) height = maxHeight - y;
      if (width <= 0 || height <= 0) return;

      const img = this.shadowCtx.getImageData(x, y, width, height);
      const imgData = img.data;
      const len = imgData.length;
      const palette = this._palette;

      for (let i = 3; i < len; i += 4) {
        const alpha = imgData[i];
        const offset = alpha * 4;

        if (!offset) continue;

        let finalAlpha;
        if (opacity > 0) {
          finalAlpha = opacity;
        } else {
          if (alpha < maxOpacity) {
            finalAlpha = alpha < minOpacity ? minOpacity : alpha;
          } else {
            finalAlpha = maxOpacity;
          }
        }

        imgData[i - 3] = palette[offset];
        imgData[i - 2] = palette[offset + 1];
        imgData[i - 1] = palette[offset + 2];
        imgData[i] = useGradientOpacity ? palette[offset + 3] : finalAlpha;
      }

      // 直接 putImageData，避免向只读属性 img.data 赋值触发 TypeError
      this.ctx.putImageData(img, x, y);
      this._renderBoundaries = [1000, 1000, 0, 0];
    },
    getValueAt: function (point) {
      const shadowCtx = this.shadowCtx;
      const img = shadowCtx.getImageData(point.x, point.y, 1, 1);
      const data = img.data[3];
      const max = this._max;
      const min = this._min;
      return (Math.abs(max - min) * (data / 255)) >> 0;
    },
    getDataURL: function () {
      return this.canvas.toDataURL();
    },
  };

  return Canvas2dRenderer;
})();

const Util = {
  merge: function () {
    const merged = {};
    const argsLen = arguments.length;
    for (let i = 0; i < argsLen; i++) {
      const obj = arguments[i];
      for (const key in obj) {
        merged[key] = obj[key];
      }
    }
    return merged;
  },
};

const Heatmap = (function () {
  function Coordinator() {
    this.cStore = {};
  }

  Coordinator.prototype = {
    on: function (evtName, callback, scope) {
      const cStore = this.cStore;
      if (!cStore[evtName]) {
        cStore[evtName] = [];
      }
      cStore[evtName].push(function (data) {
        return callback.call(scope, data);
      });
    },
    emit: function (evtName, data) {
      const cStore = this.cStore;
      if (cStore[evtName]) {
        const len = cStore[evtName].length;
        for (let i = 0; i < len; i++) {
          const callback = cStore[evtName][i];
          callback(data);
        }
      }
    },
  };

  function _connect(scope) {
    const renderer = scope._renderer;
    const coordinator = scope._coordinator;
    const store = scope._store;

    coordinator.on("renderpartial", renderer.renderPartial, renderer);
    coordinator.on("renderall", renderer.renderAll, renderer);
    coordinator.on("extremachange", function (data) {
      scope._config.onExtremaChange &&
        scope._config.onExtremaChange({
          min: data.min,
          max: data.max,
          gradient:
            scope._config["gradient"] || scope._config["defaultGradient"],
        });
    });
    store.setCoordinator(coordinator);
  }

  function Heatmap() {
    const config = (this._config = Util.merge(HeatmapConfig, arguments[0] || {}));
    this._coordinator = new Coordinator();
    this._renderer = new Canvas2dRenderer(config);
    this._store = new Store(config);
    _connect(this);
  }

  Heatmap.prototype = {
    addData: function () {
      this._store.addData.apply(this._store, arguments);
      return this;
    },
    setData: function () {
      this._store.setData.apply(this._store, arguments);
      return this;
    },
    getDataURL: function () {
      return this._renderer.getDataURL();
    },
    getValueAt: function (point) {
      return this._renderer.getValueAt(point);
    },
  };

  return Heatmap;
})();

const miniH337 = {
  create: function (config) {
    return new Heatmap(config);
  },
};

/* ---------------------------------------------------- 辅助空间数学计算函数 --------------------------------------------------- */

function cartesiansToLnglats(cartesians) {
  if (!cartesians || cartesians.length < 1) return [];
  const coordinates = [];
  for (let i = 0; i < cartesians.length; i++) {
    const cartographic = Cesium.Cartographic.fromCartesian(cartesians[i]);
    const latitude = Cesium.Math.toDegrees(cartographic.latitude);
    const longitude = Cesium.Math.toDegrees(cartographic.longitude);
    const height = cartographic.height;
    coordinates.push([longitude, latitude, height]);
  }
  return coordinates;
}

function computeBoundingBox(positions, state) {
  if (!positions) return;
  const boundingSphere = Cesium.BoundingSphere.fromPoints(
    positions,
    new Cesium.BoundingSphere(),
  );
  const centerPoint = boundingSphere.center;
  const sphereRadius = boundingSphere.radius;

  const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
    centerPoint.clone(),
  );
  const yAxisVector = new Cesium.Cartesian3(0, 1, 0);

  const boundingVertices = [];
  for (let angle = 45; angle <= 360; angle += 90) {
    const rotationMatrix = Cesium.Matrix3.fromRotationZ(
      Cesium.Math.toRadians(angle),
      new Cesium.Matrix3(),
    );
    let rotatedYAxis = Cesium.Matrix3.multiplyByVector(
      rotationMatrix,
      yAxisVector,
      new Cesium.Cartesian3(),
    );
    rotatedYAxis = Cesium.Cartesian3.normalize(
      rotatedYAxis,
      new Cesium.Cartesian3(),
    );
    const scaledVector = Cesium.Cartesian3.multiplyByScalar(
      rotatedYAxis,
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

  const coordinates = cartesiansToLnglats(boundingVertices);
  let minLatitude = Number.MAX_VALUE,
    maxLatitude = -Number.MAX_VALUE,
    minLongitude = Number.MAX_VALUE,
    maxLongitude = -Number.MAX_VALUE;
  const vertexCount = boundingVertices.length;

  coordinates.forEach((coordinate) => {
    if (coordinate[0] < minLongitude) minLongitude = coordinate[0];
    if (coordinate[0] > maxLongitude) maxLongitude = coordinate[0];
    if (coordinate[1] < minLatitude) minLatitude = coordinate[1];
    if (coordinate[1] > maxLatitude) maxLatitude = coordinate[1];
  });

  const latitudeRange = maxLatitude - minLatitude;
  const longitudeRange = maxLongitude - minLongitude;

  state.boundingRect = {
    minLatitude: minLatitude - latitudeRange / vertexCount,
    maxLatitude: maxLatitude + latitudeRange / vertexCount,
    minLongitude: minLongitude - longitudeRange / vertexCount,
    maxLongitude: maxLongitude + longitudeRange / vertexCount,
  };

  state.boundingBox = {
    leftTop: Cesium.Cartesian3.fromDegrees(
      state.boundingRect.minLongitude,
      state.boundingRect.maxLatitude,
    ),
    leftBottom: Cesium.Cartesian3.fromDegrees(
      state.boundingRect.minLongitude,
      state.boundingRect.minLatitude,
    ),
    rightTop: Cesium.Cartesian3.fromDegrees(
      state.boundingRect.maxLongitude,
      state.boundingRect.maxLatitude,
    ),
    rightBottom: Cesium.Cartesian3.fromDegrees(
      state.boundingRect.maxLongitude,
      state.boundingRect.minLatitude,
    ),
  };

  state.xAxis = Cesium.Cartesian3.subtract(
    state.boundingBox.rightTop,
    state.boundingBox.leftTop,
    new Cesium.Cartesian3(),
  );
  state.xAxis = Cesium.Cartesian3.normalize(state.xAxis, new Cesium.Cartesian3());

  state.yAxis = Cesium.Cartesian3.subtract(
    state.boundingBox.leftBottom,
    state.boundingBox.leftTop,
    new Cesium.Cartesian3(),
  );
  state.yAxis = Cesium.Cartesian3.normalize(state.yAxis, new Cesium.Cartesian3());

  state.xAxisLength = Cesium.Cartesian3.distance(
    state.boundingBox.rightTop,
    state.boundingBox.leftTop,
  );
  state.yAxisLength = Cesium.Cartesian3.distance(
    state.boundingBox.leftBottom,
    state.boundingBox.leftTop,
  );
}

function computeNormalizedCoordinates(position, state) {
  if (!position) return { x: 0, y: 0 };
  const cartographic = Cesium.Cartographic.fromCartesian(position.clone());
  cartographic.height = 0;
  const flatPos = Cesium.Cartographic.toCartesian(cartographic);

  const originVector = Cesium.Cartesian3.subtract(
    flatPos,
    state.boundingBox.leftTop,
    new Cesium.Cartesian3(),
  );
  const xProjected = Cesium.Cartesian3.dot(originVector, state.xAxis);
  const yProjected = Cesium.Cartesian3.dot(originVector, state.yAxis);

  return {
    x: Number(((xProjected / state.xAxisLength) * state.canvasWidth).toFixed(0)),
    y: Number(((yProjected / state.yAxisLength) * state.canvasWidth).toFixed(0)),
  };
}

function generateMeshData(state) {
  const gridWidth = 200;
  const gridHeight = 200;
  const positions = [];
  const textureCoords = [];
  const indices = [];

  const minLat = state.boundingRect.minLatitude;
  const maxLat = state.boundingRect.maxLatitude;
  const minLng = state.boundingRect.minLongitude;
  const maxLng = state.boundingRect.maxLongitude;

  const latInterval = (maxLat - minLat) / gridHeight;
  const lngInterval = (maxLng - minLng) / gridWidth;

  for (let i = 0; i <= gridWidth; i++) {
    const currentLongitude = minLng + i * lngInterval;
    for (let j = 0; j <= gridHeight; j++) {
      const currentLatitude = minLat + j * latInterval;

      const heatValue = state.heatmapInstance
        ? state.heatmapInstance.getValueAt({
            x: (i / gridWidth) * state.canvasWidth,
            y: (j / gridHeight) * state.canvasWidth,
          })
        : 0;

      const cartesian3 = Cesium.Cartesian3.fromDegrees(
        currentLongitude,
        currentLatitude,
        state.baseElevation,
      );
      positions.push(cartesian3.x, cartesian3.y, cartesian3.z);
      textureCoords.push(i / gridWidth, j / gridHeight);
    }
  }

  const colCount = gridHeight + 1;
  if (state.primitiveType === "LINES") {
    for (let i = 0; i < gridWidth; i++) {
      for (let j = 0; j < gridHeight; j++) {
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
    for (let i = 0; i < gridWidth; i++) {
      for (let j = 0; j < gridHeight; j++) {
        const row1 = i * colCount;
        const row2 = (i + 1) * colCount;

        const p0 = row1 + j;
        const p1 = row2 + j;
        const p2 = row2 + (j + 1);
        const p3 = row1 + (j + 1);

        indices.push(p0, p1, p2);
        indices.push(p0, p2, p3);
      }
    }
  }

  return {
    positions,
    textureCoords,
    indices,
  };
}

function createHeatmapGeometry(state) {
  const meshData = generateMeshData(state);
  return new Cesium.Geometry({
    attributes: new Cesium.GeometryAttributes({
      position: new Cesium.GeometryAttribute({
        componentDatatype: Cesium.ComponentDatatype.DOUBLE,
        componentsPerAttribute: 3,
        values: meshData.positions,
      }),
      st: new Cesium.GeometryAttribute({
        componentDatatype: Cesium.ComponentDatatype.FLOAT,
        componentsPerAttribute: 2,
        values: new Float32Array(meshData.textureCoords),
      }),
    }),
    indices: new (meshData.positions.length / 3 > 65535 ? Uint32Array : Uint16Array)(
      meshData.indices,
    ),
    primitiveType: Cesium.PrimitiveType[state.primitiveType],
    boundingSphere: Cesium.BoundingSphere.fromVertices(meshData.positions),
  });
}

function createHeatmapContainer(state) {
  const containerId = `heatmap-${state.instanceId}`;
  let el = document.getElementById(containerId);
  if (!el) {
    el = document.createElement("div");
    el.id = containerId;
    el.className = "heatmap";
    el.style.width = `${state.canvasWidth}px`;
    el.style.height = `${state.canvasWidth}px`;
    el.style.position = "fixed";
    el.style.left = "-9999px";
    el.style.top = "-9999px";
    el.style.visibility = "hidden";
    el.style.pointerEvents = "none";
    document.body.appendChild(el);
  }
  state.containerElement = el;
}

/* ---------------------------------------------------- 3D热力图类定义 (Heatmap3D) ---------------------------------------------- */

/**
 * 3D 立体热力图组件类
 * 基于 GPU 顶点着色器位移技术实现沿地球法线方向隆起的 3D 热力图
 */
export class Heatmap3D {
  /**
   * @param {Cesium.Viewer} viewer Cesium 视图实例
   * @param {Object} options 配置项
   * @param {Array<{lnglat: [number, number], value: number}>} options.dataPoints 热力数据点集
   * @param {number} [options.radius=20] 热力点影响半径
   * @param {number} [options.maxHeight=1200] GPU 顶点位移最大抬升高度 (米)
   * @param {number} [options.baseElevation=0] 基准海拔高度 (米)
   * @param {'TRIANGLES'|'LINES'} [options.primitiveType='TRIANGLES'] 图元形态
   * @param {Object} [options.colorGradient] 渐变色阶配置
   */
  constructor(viewer, options = {}) {
    if (!viewer) {
      throw new Error("Heatmap3D: 缺少必须参数 viewer");
    }

    this.viewer = viewer;
    this.options = { ...options };
    this.dataPoints = options.dataPoints || [];
    this.radius = options.radius || 20;
    this.maxHeight = options.maxHeight !== undefined ? options.maxHeight : 1200;
    this.baseElevation = options.baseElevation || 0;
    this.primitiveType = options.primitiveType || "TRIANGLES";
    this.colorGradient = options.colorGradient || {
      ".1": "blue",
      ".45": "green",
      ".75": "yellow",
      ".95": "red",
    };

    this.canvasWidth = 200;
    this.instanceId = Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`);
    this.containerElement = null;
    this.heatmapInstance = null;
    this.heatmapPrimitive = null;
    this.positionHierarchy = [];
    this.boundingRect = {};
    this.boundingBox = null;
    this.xAxis = null;
    this.yAxis = null;
    this.xAxisLength = 0;
    this.yAxisLength = 0;

    this._build();
  }

  /**
   * 核心构建流程
   * @private
   */
  _build() {
    if (!this.dataPoints || this.dataPoints.length < 2) {
      console.warn("Heatmap3D: 数据点不得少于 2 个");
      return;
    }

    createHeatmapContainer(this);

    const heatmapConfig = {
      container: this.containerElement,
      radius: this.radius,
      maxOpacity: 0.85,
      minOpacity: 0.05,
      blur: 0.75,
      gradient: this.colorGradient,
    };

    this.heatmapInstance = miniH337.create(heatmapConfig);

    // 1. 生成各点位置并计算局部包围盒
    this.positionHierarchy = [];
    for (const dataPoint of this.dataPoints) {
      const cartesianPosition = Cesium.Cartesian3.fromDegrees(
        dataPoint.lnglat[0],
        dataPoint.lnglat[1],
        0,
      );
      this.positionHierarchy.push(cartesianPosition);
    }

    computeBoundingBox(this.positionHierarchy, this);

    // 2. 局部投影映射并向 Canvas 注入数据
    const heatmapPoints = this.positionHierarchy.map((position, index) => {
      const normalizedCoords = computeNormalizedCoordinates(position, this);
      return {
        x: normalizedCoords.x,
        y: normalizedCoords.y,
        value: this.dataPoints[index].value,
      };
    });

    this.heatmapInstance.addData(heatmapPoints);

    // 3. 构建 3D 三角面几何体
    const geometryInstance = new Cesium.GeometryInstance({
      geometry: createHeatmapGeometry(this),
    });

    // 4. 自定义 WebGL 顶点着色器：采样热力贴图红通道，沿地球法线方向拉伸
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
          // GPU 根据热力值沿法线动态抬升，最大高度 ${heightScale} 米
          p += vec4(color.r * upDir * ${heightScale}, 0.0); 
          gl_Position = czm_modelViewProjectionRelativeToEye * p; 
      }
    `;

    // 5. 创建 Primitive 并加入场景
    this.heatmapPrimitive = this.viewer.scene.primitives.add(
      new Cesium.Primitive({
        geometryInstances: geometryInstance,
        appearance: new Cesium.MaterialAppearance({
          material: new Cesium.Material({
            fabric: {
              type: "Image",
              uniforms: {
                image: this.heatmapInstance.getDataURL(),
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

    this.heatmapPrimitive.id = "heatmap3d";
  }

  /**
   * 动态更新参数并重新构建热力网格
   * @param {Object} newOptions
   */
  update(newOptions = {}) {
    if (newOptions.dataPoints !== undefined) this.dataPoints = newOptions.dataPoints;
    if (newOptions.radius !== undefined) this.radius = newOptions.radius;
    if (newOptions.maxHeight !== undefined) this.maxHeight = newOptions.maxHeight;
    if (newOptions.baseElevation !== undefined) this.baseElevation = newOptions.baseElevation;
    if (newOptions.primitiveType !== undefined) this.primitiveType = newOptions.primitiveType;
    if (newOptions.colorGradient !== undefined) this.colorGradient = newOptions.colorGradient;

    this._destroyInternal();
    this._build();
  }

  /**
   * 内部清理图元与离屏 DOM
   * @private
   */
  _destroyInternal() {
    if (this.containerElement && this.containerElement.parentNode) {
      this.containerElement.parentNode.removeChild(this.containerElement);
      this.containerElement = null;
    }
    if (this.heatmapPrimitive && !this.viewer.isDestroyed()) {
      this.viewer.scene.primitives.remove(this.heatmapPrimitive);
      this.heatmapPrimitive = null;
    }
  }

  /**
   * 彻底销毁热力图实例并释放所有资源
   */
  destroy() {
    this._destroyInternal();
    this.heatmapInstance = null;
    this.viewer = null;
    this.positionHierarchy = [];
    this.dataPoints = [];
  }
}

export default Heatmap3D;

