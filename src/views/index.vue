<template>
  <div class="app-container home" ref="jsmindContainerRef"></div>
</template>

<script setup name="Index">
import "jsmind/style/jsmind.css";
import jsMind from "jsmind";
import { useRouter } from "vue-router";
import { ElMessageBox, ElMessage } from "element-plus";

const router = useRouter();
const jsmindContainerRef = ref(null);

const STATUS = {
  DONE: undefined, // 已完成背景色为默认即可
  IN_PROGRESS: "#009B77",
  PENDING: "#909399",
};

const VIEW2D_NODES = [
  {
    id: "view2D1",
    topic: "Multiple Synced Views",
    status: STATUS.DONE,
    route: "/view/multipleSyncedViews",
  },
  {
    id: "view2D2",
    topic: "Rotatable 2D Map",
    status: STATUS.PENDING,
  },
];

const CATEGORIES = [
  {
    id: "view2D",
    topic: "二维视图",
    nodes: VIEW2D_NODES,
  },
];

function buildMindData() {
  return {
    meta: { name: "Cesium示例归类", author: "gisnotes", version: "1.0" },
    format: "node_tree",
    data: {
      id: "root",
      topic: "Cesium示例归类",
      children: CATEGORIES.map((cat) => ({
        id: cat.id,
        topic: cat.topic,
        children: cat.nodes.map((n) => ({
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
  for (const cat of CATEGORIES) {
    for (const n of cat.nodes) {
      if (n.route) handlers[n.id] = () => router.push(n.route);
      if (n.children) {
        for (const c of n.children) {
          if (c.externalLink)
            handlers[c.id] = () => openExternalLink(c.externalLink);
        }
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
