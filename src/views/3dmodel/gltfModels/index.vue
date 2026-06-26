<template>
  <div class="gltf-models" ref="viewerRef"></div>
</template>

<script setup name="GltfModels">

</script>

<style lang="scss" scoped>
.gltf-models {
  height: 100%;
  position: absolute;
  inset: 0;
}

/** 隐藏底部版权 */
:deep(.cesium-viewer-bottom) {
  display: none;
}
</style>
