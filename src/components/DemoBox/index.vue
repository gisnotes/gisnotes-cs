<template>
  <div class="demo-box">
    <el-splitter>
      <el-splitter-panel :size="50" :min="minWidth">
        <div class="preview-container">
          <slot></slot>
        </div>
      </el-splitter-panel>
      <el-splitter-panel :size="50" :min="minWidth">
        <CodeBlockGroup :blocks="codeBlocks" />
      </el-splitter-panel>
    </el-splitter>
  </div>
</template>

<script setup>
import CodeBlockGroup from "@/components/CodeBlockGroup/index.vue";

const minWidth = "75px";

defineProps({
  // 将原先的两个 string 参数合并为一个对象数组
  codeBlocks: {
    type: Array,
    required: true,
    default: () => [
      // 数据结构示例：
      // { fileName: 'index.vue', rawCode: '<template>...</template>',language:'html' }
    ],
  },
});
</script>

<style scoped lang="scss">
$border-color: #ddd;

.demo-box {
  width: 100%;
  height: 100%;
  border: 1px solid $border-color;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.preview-container {
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
  position: relative;
}

:deep(.el-splitter) {
  height: 100%;
}
:deep(.el-splitter-panel) {
  height: 100%;
}
</style>
