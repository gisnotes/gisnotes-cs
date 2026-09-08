<template>
  <!-- 只有一个代码块时，直接占满当前区域 -->
  <CodeBox
    v-if="blocks.length === 1"
    :fileName="blocks[0].fileName"
    :rawCode="blocks[0].rawCode"
    :language="blocks[0].language"
  />

  <!-- 多个代码块时平铺分割：主界面 index.vue 占 75%，其余所有代码块平分剩下的 25% -->
  <el-splitter v-else layout="vertical">
    <!-- 主界面 index.vue 区域：占 75% -->
    <el-splitter-panel :size="75" :min="10">
      <CodeBox
        :fileName="blocks[0].fileName"
        :rawCode="blocks[0].rawCode"
        :language="blocks[0].language"
      />
    </el-splitter-panel>

    <!-- 其余代码块区域：平铺展示，共享其余 25% -->
    <el-splitter-panel
      v-for="(block, index) in restBlocks"
      :key="block.fileName || index"
      :size="restSize"
      :min="5"
    >
      <CodeBox
        :fileName="block.fileName"
        :rawCode="block.rawCode"
        :language="block.language"
      />
    </el-splitter-panel>
  </el-splitter>
</template>

<script setup>
import CodeBox from "@/components/CodeBox/index.vue";

defineOptions({ name: "CodeBlockGroup" });

const props = defineProps({
  blocks: {
    type: Array,
    required: true,
    default: () => [],
  },
});

// 其余代码块列表
const restBlocks = computed(() => props.blocks.slice(1));

// 其余各个代码块在剩余 25% 空间中的默认占比
const restSize = computed(() => {
  const count = restBlocks.value.length;
  return count > 0 ? 25 / count : 25;
});
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
