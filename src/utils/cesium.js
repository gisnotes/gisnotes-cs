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
