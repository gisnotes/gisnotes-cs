import GUI from "lil-gui";

/**
 * 预设位置偏移量映射表
 */
const POSITION_PRESETS = {
  "top-left": { top: "10px", left: "10px" },
  "top-right": { top: "10px", right: "10px" },
  "bottom-left": { bottom: "10px", left: "10px" },
  "bottom-right": { bottom: "10px", right: "10px" },
};

/**
 * 格式化坐标值，数字自动添加 px 单位
 */
function formatOffset(val) {
  if (typeof val === "number") return `${val}px`;
  return val;
}

/**
 * 自定义扩展的 lil-gui 类
 * 默认位于左上角 (top: 10px, left: 10px)，默认宽度 260px，默认使用时无需额外配置样式参数
 */
export class CustomGUI extends GUI {
  /**
   * @param {Object} [options={}] 配置对象
   * @param {HTMLElement} [options.container] 挂载的 DOM 容器
   * @param {number} [options.width=260] 面板宽度，默认 260
   * @param {string|Object} [options.position='top-left'] 定位预设 ('top-left' | 'top-right' | 'bottom-left' | 'bottom-right') 或自定义坐标对象 { top, bottom, left, right }，默认 'top-left'
   * @param {number} [options.zIndex=5] 层级 z-index，默认 5
   * @param {string} [options.title] 标题
   * @param {boolean} [options.closeFolders=false] 是否默认折叠文件夹
   */
  constructor(options = {}) {
    const {
      width = 260,
      position = "top-left",
      zIndex = 5,
      ...guiOptions
    } = options;

    // 1. 调用父类 lil-gui 构造函数
    super({
      width,
      ...guiOptions,
    });

    // 2. 设置绝对定位与层级
    const el = this.domElement;
    el.style.position = "absolute";
    el.style.zIndex = zIndex;
    el.style.maxHeight = "calc(100% - 20px)";

    // 3. 应用位置样式（默认 top-left: 10px, 10px）
    this.setPosition(position);
  }

  /**
   * 动态更新面板位置
   * @param {string|Object} position 预设字符串或坐标对象
   */
  setPosition(position) {
    const el = this.domElement;
    const posConfig =
      typeof position === "string"
        ? POSITION_PRESETS[position] || POSITION_PRESETS["top-left"]
        : position;

    ["top", "bottom", "left", "right"].forEach((prop) => {
      el.style[prop] =
        posConfig && posConfig[prop] !== undefined
          ? formatOffset(posConfig[prop])
          : "auto";
    });
  }
}

/**
 * 工厂函数：快速创建 CustomGUI 实例
 * @param {Object} options 配置对象
 * @returns {CustomGUI}
 */
export function createGUI(options = {}) {
  return new CustomGUI(options);
}

export { CustomGUI as GUI };
export default CustomGUI;
