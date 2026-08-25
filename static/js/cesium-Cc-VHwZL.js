const e=`import Cesium from "cesium";

/**
 * 默认的 Cesium Viewer 基础配置
 */
export const DEFAULT_VIEWER_OPTIONS = {
  geocoder: false,
  homeButton: false,
  sceneModePicker: false,
  baseLayerPicker: false,
  navigationHelpButton: false,
  animation: false,
  timeline: false,
  fullscreenButton: false,
  infoBox: false,
  selectionIndicator: false,
  shouldAnimate: true,
};

/**
 * 创建通用的 Cesium Viewer 实例
 * @param {HTMLElement|string} container - DOM 节点引用或容器元素 ID
 * @param {Object} [options={}] - 自定义覆盖配置项
 * @returns {Cesium.Viewer} Cesium.Viewer 实例
 */
export function createViewer(container, options = {}) {
  const defaultBaseLayer = Cesium.ImageryLayer.fromProviderAsync(
    Cesium.TileMapServiceImageryProvider.fromUrl(
      Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII"),
    ),
  );

  return new Cesium.Viewer(container, {
    ...DEFAULT_VIEWER_OPTIONS,
    baseLayer: defaultBaseLayer,
    ...options,
  });
}

/**
 * 开启高清晰度渲染与抗锯齿优化，解决几何体边框线锯齿感与粗糙感
 * @param {Cesium.Viewer} viewer - Viewer 实例
 * @param {Object} [options={}] - 抗锯齿配置项
 * @param {number} [options.msaaSamples=4] - WebGL2 多重采样抗锯齿倍数 (2, 4, 8)
 * @param {boolean} [options.enableFxaa=true] - 是否开启 FXAA 快速近似抗锯齿
 */
export function optimizeViewerQuality(viewer, { msaaSamples = 4, enableFxaa = true } = {}) {
  if (!viewer || !viewer.scene) return;

  viewer.resolutionScale = window.devicePixelRatio || 1.0;
  if (viewer.scene.msaaSamples !== undefined) {
    viewer.scene.msaaSamples = msaaSamples;
  }
  if (enableFxaa && viewer.scene.postProcessStages && viewer.scene.postProcessStages.fxaa) {
    viewer.scene.postProcessStages.fxaa.enabled = true;
  }
}

/**
 * 检测当前设备/平台是否支持地表贴地折线 Z-Index
 * @param {Cesium.Scene} scene - Scene 实例
 * @returns {boolean}
 */
export function supportsPolylinesOnTerrain(scene) {
  return Cesium.Entity.supportsPolylinesOnTerrain(scene);
}

/**
 * 检测当前设备/平台是否支持在地形多边形上渲染材质贴图 Z-Index
 * @param {Cesium.Scene} scene - Scene 实例
 * @returns {boolean}
 */
export function supportsMaterialsForEntitiesOnTerrain(scene) {
  return Cesium.Entity.supportsMaterialsforEntitiesOnTerrain(scene);
}

/**
 * 计算已知地理坐标的对跖(zhí)点（Antipodal Point，地心对称点）
 * @param {Cesium.Cartographic} cartographic - 输入位置（弧度）
 * @returns {Cesium.Cartographic} 对跖点地理坐标
 */
export function calculateAntipode(cartographic) {
  const latitudeDeg = Cesium.Math.toDegrees(cartographic.latitude);
  const longitudeDeg = Cesium.Math.toDegrees(cartographic.longitude);

  const antipodeLatitudeDeg = -latitudeDeg;
  const antipodeLongitudeDeg = (longitudeDeg + 180) % 360;

  return Cesium.Cartographic.fromDegrees(
    antipodeLongitudeDeg,
    antipodeLatitudeDeg,
    cartographic.height || 0,
  );
}

/**
 * 创建纬线实体（基于等角航线 Rhumb Line）
 * @param {Cesium.Viewer} viewer - Viewer 实例
 * @param {number} latitude - 纬度（度）
 * @param {Object} [options={}] - 配置选项（color, width, granularity, name, show）
 * @returns {Cesium.Entity} 纬线实体
 */
export function createRhumbParallel(viewer, latitude, options = {}) {
  const {
    color = Cesium.Color.BLUE,
    width = 2,
    granularity = undefined,
    name = \`纬线 \${latitude}°\`,
    show = false,
  } = options;

  return viewer.entities.add({
    name,
    show,
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray([
        -180, latitude,
        -90, latitude,
        0, latitude,
        90, latitude,
        180, latitude,
      ]),
      width,
      arcType: Cesium.ArcType.RHUMB,
      material: color,
      granularity,
    },
  });
}

/**
 * 创建子午经线实体（基于等角航线 Rhumb Line）
 * @param {Cesium.Viewer} viewer - Viewer 实例
 * @param {number} longitude - 经度（度）
 * @param {Object} [options={}] - 配置选项（color, width, granularity, name, show）
 * @returns {Cesium.Entity} 经线实体
 */
export function createRhumbMeridian(viewer, longitude, options = {}) {
  const {
    color = Cesium.Color.BLUE,
    width = 2,
    granularity = undefined,
    name = \`经线 \${longitude}°\`,
    show = false,
  } = options;

  return viewer.entities.add({
    name,
    show,
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArray([
        longitude, 90,
        longitude, 0,
        longitude, -90,
      ]),
      width,
      arcType: Cesium.ArcType.RHUMB,
      material: color,
      granularity,
    },
  });
}

/**
 * 创建经纬度文本坐标标注实体
 * @param {Cesium.Viewer} viewer - Viewer 实例
 * @param {Cesium.Cartographic} cartographic - 地理坐标
 * @param {Object} [options={}] - 标注样式配置项
 * @returns {Cesium.Entity} 文本 Label 实体
 */
export function createCoordinateLabel(viewer, cartographic, options = {}) {
  const position = Cesium.Cartographic.toCartesian(cartographic);
  const latitude = Cesium.Math.toDegrees(cartographic.latitude).toFixed(4);
  const longitude = Cesium.Math.toDegrees(cartographic.longitude).toFixed(4);
  const labelText = options.text || \`纬度: \${latitude}°\\n经度: \${longitude}°\`;

  return viewer.entities.add({
    position,
    label: {
      text: labelText,
      showBackground: true,
      font: options.font || "14px monospace",
      backgroundColor: options.backgroundColor || new Cesium.Color(0.1, 0.1, 0.1, 0.85),
      ...options.labelOptions,
    },
  });
}

/**
 * 递归生成全球经纬度网格（基于等角航线）
 * @param {Cesium.Viewer} viewer - Viewer 实例
 * @param {number} numberOfDivisions - 递归二分深度
 * @param {Cesium.Color} color - 网格颜色
 * @param {boolean} [show=false] - 初始显隐状态
 * @returns {Cesium.Entity[]} 包含所有网格折线实体的数组
 */
export function createRhumbGrid(viewer, numberOfDivisions, color, show = false) {
  function makeParallelsRecursive(minLat, maxLat, depth) {
    let result = [];
    const midpoint = (minLat + maxLat) / 2;
    result.push(createRhumbParallel(viewer, midpoint, { color, show }));

    if (depth > 0) {
      const southern = makeParallelsRecursive(minLat, midpoint, depth - 1);
      const northern = makeParallelsRecursive(midpoint, maxLat, depth - 1);
      result = southern.concat(result, northern);
    }
    return result;
  }

  function makeMeridiansRecursive(minLon, maxLon, depth) {
    let result = [];
    const midpoint = (minLon + maxLon) / 2;
    result.push(createRhumbMeridian(viewer, midpoint, { color, show }));

    if (depth > 0) {
      const western = makeMeridiansRecursive(minLon, midpoint, depth - 1);
      const eastern = makeMeridiansRecursive(midpoint, maxLon, depth - 1);
      result = western.concat(result, eastern);
    }
    return result;
  }

  const parallels = makeParallelsRecursive(-90, 90, numberOfDivisions);
  const meridians = makeMeridiansRecursive(-180, 180, numberOfDivisions);
  meridians.push(createRhumbMeridian(viewer, 180, { color, show }));

  return parallels.concat(meridians);
}
`;export{e as C};
