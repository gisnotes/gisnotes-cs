import Cesium from "cesium";

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

