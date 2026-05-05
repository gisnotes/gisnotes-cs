<template>
  <div class="code-box">
    <!-- 顶部状态栏 -->
    <div class="mac-header">
      <div class="dots">
        <span class="mac-dot red"></span>
        <span class="mac-dot yellow"></span>
        <span class="mac-dot green"></span>
      </div>
      <span class="file-name" v-if="fileName">{{ fileName }}</span>
      <div class="copy-btn">
        <el-button
          v-if="isSupported"
          :type="copied ? 'success' : 'primary'"
          link
          @click="copy(rawCode)"
        >
          <template #icon>
            <el-icon>
              <Check v-if="copied" />
              <CopyDocument v-else />
            </el-icon>
          </template>
          {{ copied ? "已复制" : "复制" }}
        </el-button>
      </div>
    </div>

    <!-- 主体区域 -->
    <div class="code-main-body">
      <div class="line-numbers-wrapper" ref="lineNumbersRef">
        <div class="line-numbers-col">
          <span v-for="n in lineCount" :key="n" v-memo="[lineCount]">{{
            n
          }}</span>
        </div>
      </div>

      <!-- 右侧代码区 -->
      <div class="code-scroll-area" @scroll="handleScroll">
        <pre
          class="code-content"
          v-html="`<code class='hljs'>${highlightedCode}</code>`"
        ></pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import hljs from "highlight.js";
import "highlight.js/styles/atom-one-dark.css";
import { useClipboard } from "@vueuse/core";

const props = defineProps({
  fileName: { type: String, default: "index.vue" },
  rawCode: { type: String, required: true },
  language: { type: String, default: "html" },
});

const lineNumbersRef = shallowRef(null);

const { copy, copied, isSupported } = useClipboard({ legacy: true });

const handleScroll = (e) => {
  const el = lineNumbersRef.value;
  if (el) el.scrollTop = e.target.scrollTop;
};

const lineCount = computed(() => {
  const lines = props.rawCode.split("\n");
  return lines[lines.length - 1] === "" ? lines.length - 1 || 1 : lines.length;
});

const highlightedCode = computed(() => {
  try {
    if (props.language && hljs.getLanguage(props.language)) {
      return hljs.highlight(props.rawCode, { language: props.language }).value;
    }
    return hljs.highlightAuto(props.rawCode).value;
  } catch (e) {
    return props.rawCode;
  }
});

onUnmounted(() => {
  lineNumbersRef.value = null;
});
</script>

<style scoped lang="scss">
$code-bg: #1e1e1e;
$header-bg: #2d2d2d;
$line-num-color: #5c6370;
$border-color: #333;

.code-box {
  height: 100%;
  background-color: $code-bg;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  // box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  & ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  & ::-webkit-scrollbar-track {
    background: transparent;
  }

  & ::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 5px;
    border: 2px solid $code-bg;
    &:hover {
      background: #555;
    }
  }

  & ::-webkit-scrollbar-corner {
    background-color: transparent;
  }

  .mac-header {
    height: 32px;
    flex-shrink: 0;
    background: $header-bg;
    display: flex;
    align-items: center;
    padding: 0 15px;
    z-index: 10;
    position: relative;

    .dots {
      display: flex;
      align-items: center;

      .mac-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        display: inline-block;
        margin-right: 8px;

        &.red {
          background: #ff5f56;
        }

        &.yellow {
          background: #ffbd2e;
        }

        &.green {
          background: #27c93f;
        }
      }
    }

    .file-name {
      flex: 1;
      margin-left: 5px;
      color: #858585;
      font-size: 12px;
      font-family: monospace;
    }

    .copy-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      right: 0;
      padding: 0 10px;
      z-index: 10;
      background-color: $header-bg;
    }
  }

  /* 主体布局 */
  .code-main-body {
    flex: 1;
    display: flex;
    overflow: hidden;
    min-height: 0;
    /* 避免多个代码区域时，水平滚动条和分割线区域重叠的问题 */
    padding-bottom: 10px;

    /* 行号外部容器 */
    .line-numbers-wrapper {
      flex-shrink: 0;
      width: 46px;
      overflow: hidden;
      background-color: $code-bg;
      border-right: 1px solid $border-color;

      .line-numbers-col {
        /* 底部的padding设置的大一点，不管是否有水平滚动条，都不会出现行号和代码不在一条水平线上的情况 */
        padding: 15px 0 30px 0;
        display: flex;
        flex-direction: column;
        text-align: right;
        user-select: none;

        span {
          padding: 0 10px;
          color: $line-num-color;
          font-family: Consolas, Monaco, monospace;
          font-size: 14px;
          line-height: 1.5;
        }
      }
    }
    /* 代码滚动区域 */
    .code-scroll-area {
      flex: 1;
      overflow: auto;
      background-color: $code-bg;
      min-width: 0;

      .code-content {
        margin: 0;
        padding: 15px;
        /* 确保宽度由最长行决定，触发水平滚动 */
        width: max-content;
        min-width: 100%;

        :deep(code.hljs) {
          font-family: Consolas, Monaco, monospace;
          font-size: 14px;
          line-height: 1.5;
          display: block;
          background: transparent;
          padding: 0;
          white-space: pre; /* 强制不换行 */
        }
      }
    }
  }
}
</style>
