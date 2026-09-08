# Cesium 贴地线与地形折线实现方案全景总结

在三维 GIS 开发中，当开启真实三维数字高程地形（DEM）与深度检测（`viewer.scene.globe.depthTestAgainstTerrain = true`）后，折线（Polyline）常常因为山体起伏而发生**穿透山体、被地形遮挡（穿模）**的现象。

本文档系统总结了在 Cesium 中实现线段与地形贴合的 **5 种典型技术方案**，深度解析其底层原理、点云兼容性及适用场景。

---

## 方案总览与决策矩阵

| 方案名称 | API 层级 | 线宽单位 | 核心机制 | 点云安全性 | 动态跟手绘制 | 核心优势与局限 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. 普通空间折线** | Entity / Primitive | 像素 (px) | 笛卡尔空间直线段（Chord） | 100% 安全 | 完美支持 | **未贴地**，遇到山脊凸起直接穿入山体被遮挡；作为对比基准。 |
| **2. Entity 走廊 (Corridor)** | Entity API | **米 (Meters)** | 2D 面状图元，GPU 阴影体覆印 | 需限定 TERRAIN | 支持 | 拐角平滑饱满；但线宽近大远小，默认 BOTH 会把上方悬空点云染色。 |
| **3. 官方贴地折线 (clampToGround)** | Entity API | **像素 (px)** | GroundPolyline 屏幕空间线重建 | 100% 安全 | 完美支持 | **官方首选方案**。像素恒定线宽，不污染点云；但不支持透视材质。 |
| **4. 底层走廊图元 (GroundPrimitive)** | Primitive API | **米 (Meters)** | WebGL 原生 GroundPrimitive 图元 | 100% 安全（显式设 TERRAIN） | 需手动管理 | **大体量首选**。支持成百上千条线合并为 1 次 GPU Draw Call，吞吐量极高。 |
| **5. CPU 高密高程采样拟合线** | 异步服务 + Polyline | 像素 (px) | `sampleTerrainMostDetailed` 预先查海拔 | 100% 安全 | 较差（网络耗时） | **支持透视材质 (`depthFailMaterial`)** 与离地定高悬空；但异步网络开销大。 |

---

## 方案深度解析与代码实现

### 方案一：普通空间折线（未开启贴地，穿模对比基准）

#### 1. 实现代码
```javascript
viewer.entities.add({
  name: "普通折线 (未贴地)",
  polyline: {
    positions: Cesium.Cartesian3.fromDegreesArrayHeights([
      lon1, lat1, h1,
      lon2, lat2, h2,
      lon3, lat3, h3
    ]),
    width: 4,
    material: Cesium.Color.YELLOW
  }
});
```

#### 2. 底层原理
- `Polyline` 几何本质是三维欧氏空间里的一维线段。
- 两个端点通过直线（空间弦）直接相连。当两端点之间的地形存在山脊隆起时，直线切入地壳内部，在开启 `depthTestAgainstTerrain = true` 后，处于山体后方的片段直接被深度缓冲剔除，形成“断裂/穿模”。

#### 3. 适用场景
- 架空高压线、卫星/航天器空间轨道、不依赖地表起伏的宏观空间射线。

---

### 方案二：Entity API 走廊面状贴地（Corridor）

#### 1. 实现代码
```javascript
viewer.entities.add({
  name: "走廊 (贴合地表)",
  corridor: {
    positions: Cesium.Cartesian3.fromDegreesArray([
      lon1, lat1,
      lon2, lat2,
      lon3, lat3
    ]),
    width: 40.0, // 注意：单位是米（Meters）
    material: Cesium.Color.CYAN,
    classificationType: Cesium.ClassificationType.TERRAIN // 限制仅作用于地形
  }
});
```

#### 2. 底层原理
- `Corridor` 本质是**具有宽度的二维带状面（Polygon Strip）**。
- Cesium 内部将其归类为 `GroundGeometry`，在 GPU 端沿着走廊轮廓在垂直方向拉伸出一个 3D 体积柱体（**阴影体 Shadow Volume**），利用模板缓冲（Stencil Buffer）将材质直接覆印到落入柱体内的地表像素上。

#### 3. 点云安全注意事项
- **默认分类类型是 `ClassificationType.BOTH`**：如果不做限制，阴影体会将上方悬空的所有 3D 物体（例如树冠点云、高压线点云、建筑屋顶）全部染色；
- **必须显式设置 `classificationType: Cesium.ClassificationType.TERRAIN`**，以强制着色器跳过 3D Tiles / 点云的渲染管线。

---

### 方案三：Entity API 官方标准贴地折线（Polyline + clampToGround）

#### 1. 实现代码
```javascript
viewer.entities.add({
  name: "贴地折线 (clampToGround)",
  polyline: {
    positions: Cesium.Cartesian3.fromDegreesArray([
      lon1, lat1,
      lon2, lat2,
      lon3, lat3
    ]),
    width: 4, // 单位是屏幕像素（Pixels）
    material: Cesium.Color.RED,
    clampToGround: true // 核心开关：启用官方贴地
  }
});
```

#### 2. 底层原理
- Cesium 专门为线图元研发的渲染管线 —— **`GroundPolylinePrimitive`**。
- 不使用大范围体积柱体拉伸，而是在屏幕空间生成紧凑的四边形带（Screen-space Quad Strip），实时采样场景深度重建。

#### 3. 核心优势
1. **线宽恒定**：无论视角拉多远，始终保持 4 个像素的屏幕宽度；
2. **点云 100% 绝对安全**：只在其屏幕线宽内执行深度合成，**绝不拉伸染色悬空点云**；上方的点云能正确遮挡住地表的红线。

---

### 方案四：Primitive API 底层走廊图元（GroundPrimitive + CorridorGeometry）

#### 1. 实现代码
```javascript
const corridorPrimitive = viewer.scene.primitives.add(
  new Cesium.GroundPrimitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry: new Cesium.CorridorGeometry({
        vertexFormat: Cesium.VertexFormat.POSITION_ONLY,
        positions: Cesium.Cartesian3.fromDegreesArray([
          lon1, lat1,
          lon2, lat2,
          lon3, lat3
        ]),
        width: 40.0 // 宽度（米）
      }),
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(
          new Cesium.Color(0.0, 1.0, 0.0, 0.8) // 颜色与透明度
        )
      }
    }),
    classificationType: Cesium.ClassificationType.TERRAIN
  })
);
```

#### 2. 底层原理与工程价值
- 是方案二（Entity Corridor）在 Cesium 最底层的原生形态。
- **批量合并渲染（Batching）**：可将数百条道路实例打包成一个 `geometryInstances: [inst1, inst2, ...]`，在 WebGL 中**仅需 1 次 Draw Call** 即可绘制整座城市的路网，是海量矢量数据贴地的性能天花板。

---

### 方案五：CPU 高密地形高程采样拟合折线（sampleTerrain + depthFailMaterial）

#### 1. 实现代码
```javascript
async function addSampledLine() {
  const length = 1000;
  const terrainSamplePositions = [];
  
  // 1. 在路径两端密集线性插值 1000 个采样点
  for (let i = 0; i < length; ++i) {
    const lon = Cesium.Math.lerp(startLon, endLon, i / (length - 1));
    terrainSamplePositions.push(new Cesium.Cartographic(lon, lat));
  }

  // 2. 异步查询最高精度地形切片，获取真实地表高程
  const terrainProvider = await Cesium.createWorldTerrainAsync();
  const samples = await Cesium.sampleTerrainMostDetailed(
    terrainProvider,
    terrainSamplePositions
  );

  // 3. 为所有点叠加固定离地偏移（如离地 10 米，避免 Z-fighting）
  const offset = 10.0;
  for (let i = 0; i < samples.length; ++i) {
    samples[i].height += offset;
  }

  // 4. 构造包含深度失败透视效果的标准 3D 折线
  viewer.entities.add({
    polyline: {
      positions: Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray(samples),
      arcType: Cesium.ArcType.NONE,
      width: 5,
      material: new Cesium.PolylineOutlineMaterialProperty({
        color: Cesium.Color.ORANGE,
        outlineWidth: 2,
        outlineColor: Cesium.Color.BLACK
      }),
      // 深度测试失败材质：当被山峰或障碍物遮挡时，透视显示为红色！
      depthFailMaterial: new Cesium.PolylineOutlineMaterialProperty({
        color: Cesium.Color.RED,
        outlineWidth: 2,
        outlineColor: Cesium.Color.BLACK
      })
    }
  });
}
```

#### 2. 核心价值与不可替代性
1. **被遮挡透视效果（`depthFailMaterial`）**：露在山体外的部分是橙色黑边，钻入山体内部的部分自动透视变红，视觉极具穿透科技感（官方 `clampToGround` 无法做到）；
2. **支持任意定高悬空**：通过 `height += offset` 可以稳定绘制出距离地表恒定 10 米、30 米的无人机低空巡航线、电力巡检航线；
3. **局限性**：采样依赖异步网络请求，不适合鼠标拖拽高频交互绘制。

---

## 选型建议与工程实践准则

1. **日常业务开发（推荐首选）**：
   - 90% 的道路、边界、地表标线，直接使用 **方案三（`polyline: { clampToGround: true }`）**，兼具像素恒定线宽与零点云干扰。
2. **大体量路网 / 管带可视化**：
   - 使用 **方案四（`GroundPrimitive` + `CorridorGeometry`）**，务必配合 `classificationType: TERRAIN` 防止点云被误染色。
3. **电力巡检 / 低空无人机 / 科技感穿模扫描**：
   - 使用 **方案五（`sampleTerrainMostDetailed` + `depthFailMaterial`）**，利用离地定高与透视变色材质。
