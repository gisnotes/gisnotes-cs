import autoImport from "unplugin-auto-import/vite";
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";

export default function createAutoImport() {
  return [
    autoImport({
      imports: [
        "vue",
        "vue-router",
        "pinia",
        {
          "@/utils/dict": ["useDict"],
          "@/utils/ruoyi": ["selectDictLabel"],
        },
      ],
      resolvers: [ElementPlusResolver()],
      dts: false,
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ];
}
