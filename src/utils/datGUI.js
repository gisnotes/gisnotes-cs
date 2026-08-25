import * as dat from "dat.gui";

// 静态初始化 dat.GUI 全局文本配置
dat.GUI.TEXT_CLOSED = "收起控件";
dat.GUI.TEXT_OPEN = "展开控件";

class MyDatGUI extends dat.GUI {
  constructor(options = {}) {
    // 默认关闭 autoPlace，避免 dat.GUI 自动在 document.body 创建 fixed 高层级悬浮容器覆盖顶栏 TagsView 及右键菜单
    // 设置 width 默认为 275（原始默认 245），适度加宽容纳名称；支持传入 labelWidth 动态指定标签宽度
    const {
      labelWidth = "50%",
      propertyNameWidth,
      autoPlace = false,
      width = 275,
      ...restOptions
    } = options;

    super({
      autoPlace,
      width,
      ...restOptions,
    });

    this.injectCustomStyles();
    this.setLabelWidth(propertyNameWidth || labelWidth);
    this.setLocale();
    this.enableTooltips();
  }

  /**
   * 动态设置当前 GUI 面板所有表单标签（property-name）的宽度
   * @param {number|string} width - 支持数字（像素如 120 或比例如 0.6）、带单位字符串（如 '140px'、'60%'）
   * @returns {MyDatGUI} 当前实例
   */
  setLabelWidth(width) {
    if (typeof width === "number") {
      width = width > 0 && width <= 1 ? `${width * 100}%` : `${width}px`;
    }
    if (this.domElement && width) {
      this.domElement.style.setProperty("--dg-label-width", width);
    }
    return this;
  }

  /**
   * 注入自定义全局样式，通过 CSS 变量 --dg-label-width 动态适配不同实例的 label 宽度
   */
  injectCustomStyles() {
    if (document.getElementById("my-dat-gui-custom-style")) return;
    const style = document.createElement("style");
    style.id = "my-dat-gui-custom-style";
    style.textContent = `
      /* 优化 dat.GUI 标签与控件间距，支持通过 CSS 变量 --dg-label-width 动态定制各实例宽度 */
      .dg .cr .property-name {
        width: var(--dg-label-width, 50%) !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        box-sizing: border-box !important;
      }
      .dg .cr .c {
        width: calc(100% - var(--dg-label-width, 50%)) !important;
        box-sizing: border-box !important;
      }
      /* 按钮/方法函数类型特殊处理，占满整行 */
      .dg .cr.function .property-name {
        width: 100% !important;
        text-align: center !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 给所有子控件增加 title 属性提示，鼠标悬停时可查看完整全名
   */
  enableTooltips() {
    if (!this.domElement) return;
    const updateTooltips = () => {
      const labels = this.domElement.querySelectorAll(".property-name");
      labels.forEach((label) => {
        const text = label.textContent.trim();
        if (text && label.getAttribute("title") !== text) {
          label.setAttribute("title", text);
        }
      });
    };

    updateTooltips();

    if (window.MutationObserver) {
      this._observer = new MutationObserver(() => updateTooltips());
      this._observer.observe(this.domElement, { childList: true, subtree: true });
    }
  }

  /**
   * 设置界面控件的本地化文本
   */
  setLocale() {
    const closeButton = this.domElement.querySelector(".close-button");
    if (closeButton) {
      closeButton.textContent = this.closed ? dat.GUI.TEXT_OPEN : dat.GUI.TEXT_CLOSED;
    }
  }

  /**
   * 修改位置与挂载节点
   * @param {HTMLElement} [parentDom=document.body] 父 DOM 元素，将当前控件元素添加到此元素中
   * @param {Object} [style={}] 样式对象，用于设置元素的 CSS 样式
   */
  modifyPosition(parentDom, style = {}) {
    // 容错处理：如果第一个参数是样式对象而非 DOM 节点，默认挂载到 document.body
    if (parentDom && !(parentDom instanceof HTMLElement)) {
      style = parentDom;
      parentDom = document.body;
    }

    const targetParent = parentDom || document.body;
    targetParent.appendChild(this.domElement);

    const defaultStyle = {
      position: "absolute",
      top: "10px",
      right: "10px",
      zIndex: "5", // 设置为 5，保持低于布局顶栏 fixed-header (z-index: 100) 及 TagsView 菜单
    };

    // 使用 Object.assign 设置样式
    Object.assign(this.domElement.style, defaultStyle, style);
  }

  /**
   * 销毁组件并自动从父 DOM 中彻底移除
   */
  destroy() {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    if (this.domElement && this.domElement.parentNode) {
      this.domElement.parentNode.removeChild(this.domElement);
    }
    super.destroy();
  }
}

export default MyDatGUI;
