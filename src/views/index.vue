<template>
  <div class="app-container home" ref="jsmindContainerRef"></div>
</template>

<script setup name="Index">
import "jsmind/style/jsmind.css";
import jsMind from "jsmind";
import { useRouter } from "vue-router";
import { ElMessageBox, ElMessage } from "element-plus";
import { NODE_GROUPS, ALL_NODES, STATUS } from "./nodes";

const router = useRouter();
const jsmindContainerRef = ref(null);

function buildMindData() {
  return {
    meta: { name: "Cesium示例归类", author: "gisnotes", version: "1.0" },
    format: "node_tree",
    data: {
      id: "root",
      topic: "Cesium示例归类",
      children: NODE_GROUPS.map((group) => ({
        id: group.id,
        topic: group.topic,
        children: group.nodes.map((n) => ({
          ...n,
          "background-color": n.status,
          clickable: n.status === STATUS.DONE,
          children: n.children?.map((c) => ({ ...c, clickable: true })),
        })),
      })),
    },
  };
}

function buildHandlers() {
  const handlers = {};
  for (const n of ALL_NODES) {
    if (n.route) handlers[n.id] = () => router.push(n.route);
    if (n.children) {
      for (const c of n.children) {
        if (c.externalLink)
          handlers[c.id] = () => openExternalLink(c.externalLink);
      }
    }
  }
  return handlers;
}

let jm = null;

function openExternalLink(url) {
  ElMessageBox.confirm("是否打开外部链接？", "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "info",
  })
    .then(() => {
      window.open(url, "_blank");
    })
    .catch(() => {
      ElMessage.warning("取消打开外部链接");
    });
}

onMounted(() => {
  const JsMind = jsMind.default || jsMind;
  const options = {
    container: jsmindContainerRef.value,
    theme: "primary",
    editable: false,
    support_html: true,
    view: {
      custom_node_render: (jm, ele, node) => {
        ele.setAttribute("title", node.topic);
        if (node.data?.clickable) {
          ele.style.cursor = "pointer";
        } else {
          ele.style.pointerEvents = "none";
        }
      },
    },
  };
  jm = new JsMind(options);
  jm.show(buildMindData());

  jm.add_event_listener((type, data) => {
    if (type !== JsMind.event_type.select) return;
    const handlers = buildHandlers();
    if (handlers[data.node]) {
      handlers[data.node]();
    }
  });
});

onUnmounted(() => {
  if (jm) {
    jm = null;
  }
});
</script>
<style scoped lang="scss">
.home {
  height: 100%;
  padding: 0;
  box-sizing: border-box;
  overflow: auto;

  &::-webkit-scrollbar {
    width: 12px;
    height: 12px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: #c0c4cc;
    border-radius: 6px;

    &:hover {
      background-color: #909399;
    }
  }

  &::-webkit-scrollbar-track {
    background-color: #f5f7fa;
    border-radius: 6px;
  }

  scrollbar-width: auto;
  scrollbar-color: #c0c4cc #f5f7fa;
}
</style>
