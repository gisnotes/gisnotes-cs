import * as dat from "dat.gui";

// 静态初始化 dat.GUI 全局文本配置
dat.GUI.TEXT_CLOSED = "收起控件";
dat.GUI.TEXT_OPEN = "展开控件";

class MyDatGUI extends dat.GUI {
  constructor(options = {}) {
    // 默认关闭 autoPlace，避免 dat.GUI 自动在 document.body 创建 fixed 高层级悬浮容器覆盖顶栏 TagsView 及右键菜单
    // 设置 width 默认为 275（原始默认 245），稍微加宽以适度容纳长名称
    const customOptions = {
      autoPlace: false,
      width: 275,
      ...options,
    };
    super(customOptions);
    this.setLocale();
    this.injectCustomStyles();
    this.enableTooltips();
  }

  /**
   * 注入自定义样式，适度提升长名称文本的宽度占比并防止截断
   */
  injectCustomStyles() {
    if (document.getElementById("my-dat-gui-custom-style")) return;
    const style = document.createElement("style");
    style.id = "my-dat-gui-custom-style";
    style.textContent = `
      /* 优化 dat.GUI 标签与复选框间距 */
      .dg .cr .property-name {
        width: 60% !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      .dg .cr.boolean .property-name {
        width: 65% !important;
      }
      .dg .cr.boolean .c {
        width: 35% !important;
      }
      .dg .cr.number .property-name,
      .dg .cr.string .property-name,
      .dg .cr.color .property-name {
        width: 50% !important;
      }
      .dg .cr.number .c,
      .dg .cr.string .c,
      .dg .cr.color .c {
        width: 50% !important;
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
