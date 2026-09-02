<template>
  <i
    v-if="isFontClass"
    :class="['sub-el-icon', iconClass, className]"
    :style="{ color: color || undefined }"
    aria-hidden="true"
  />
  <svg v-else :class="svgClass" aria-hidden="true">
    <use :xlink:href="iconName" :fill="color" />
  </svg>
</template>

<script>
export default defineComponent({
  props: {
    iconClass: {
      type: String,
      required: true,
    },
    className: {
      type: String,
      default: "",
    },
    color: {
      type: String,
      default: "",
    },
  },
  setup(props) {
    const isFontClass = computed(() => {
      if (!props.iconClass) return false;
      return (
        props.iconClass.startsWith("iconfont") ||
        props.iconClass.startsWith("el-icon")
      );
    });

    const iconName = computed(() => {
      if (!props.iconClass) return "";
      if (props.iconClass.startsWith("#")) return props.iconClass;
      // 若已经是 icon-xxx，则直接加 #，避免变成 #icon-icon-xxx
      if (props.iconClass.startsWith("icon-")) return `#${props.iconClass}`;
      return `#icon-${props.iconClass}`;
    });

    const svgClass = computed(() => {
      if (props.className) {
        return `svg-icon ${props.className}`;
      }
      return "svg-icon";
    });

    return {
      isFontClass,
      iconName,
      svgClass,
    };
  },
});
</script>

<style scope lang="scss">
.sub-el-icon,
.nav-icon {
  display: inline-block;
  font-size: 15px;
  margin-right: 12px;
  position: relative;
}

.svg-icon {
  width: 1em;
  height: 1em;
  position: relative;
  fill: currentColor;
  vertical-align: -2px;
}
</style>
