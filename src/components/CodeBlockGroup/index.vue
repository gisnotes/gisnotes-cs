<template>
  <!-- 如果只剩一个代码块，直接沾满当前区域 -->
  <CodeBox
    v-if="blocks.length === 1"
    :fileName="blocks[0].fileName"
    :rawCode="blocks[0].rawCode"
    :language="blocks[0].language"
  />

  <!-- 如果有多个代码块，使用上下分割 -->
  <el-splitter v-else layout="vertical">
    <el-splitter-panel :size="50" :min="10">
      <CodeBox
        :fileName="blocks[0].fileName"
        :rawCode="blocks[0].rawCode"
        :language="blocks[0].language"
      />
    </el-splitter-panel>

    <el-splitter-panel :size="50" :min="10">
      <!-- 递归调用自身 -->
      <CodeBlockGroup :blocks="rest" />
    </el-splitter-panel>
  </el-splitter>
</template>

<script setup>
import CodeBox from "@/components/CodeBox/index.vue";

// Vue 3.3+ 显式声明组件名，方便递归调用时 Vue 内部识别
defineOptions({ name: "CodeBlockGroup" });

defineProps({
  blocks: {
    type: Array,
    required: true,
    default: () => [],
  },
});

const rest = computed(() => props.blocks.slice(1));
</script>

<style scoped>
:deep(.el-splitter) {
  height: 100%;
  width: 100%;
}

:deep(.el-splitter-panel) {
  height: 100%;
  overflow: hidden;
  position: relative;
}
</style>
