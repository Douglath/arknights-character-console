# 数据与身份约定

权威运行索引为 `roster/data/roster.json` 的 `records`。原索引字段与身份不因独立发布而变更。

| 字段 | 含义 |
| --- | --- |
| `key` | 原展示库 `assetKey`（模型资产 ID 与条目序号组合），每条唯一 |
| `asset` | 模型资产 ID，用于当前 UI 选择和缩略图命名 |
| `form` | 精确 `character_form_id`；不能从同人物其他形态继承 |
| `person` | 人物聚合 ID，仅用于人物统计，不能代替 form |
| `glb` | 相对 `showoff/` 的模型路径 |
| `glbSha256` | 原始 GLB 实际字节 SHA256 |

426 条模型对应 423 个 form 和 385 个 person；同一形态可能有多个模型版本，异格独立保存。缺少模型的形态名单继续保留在 `summary.formsWithoutModel`，不可填入其他形态冒充覆盖。

缩略图由模型渲染生成，路径 `roster/data/portraits/<asset>.webp`。`sources` 中的相对路径和摘要是上游构建输入的溯源记录，这些源资料不随包附带，也不是运行依赖。`manifests/models.json` 提供公开模型清单和准确身份别名，`manifests/files.json` 提供本运行包逐文件 SHA256。

修改模型应另建版本并更新摘要和清单。保留原版本恢复点；技术检查、外观认可和原 IP 授权是不同状态，不得互相推定。
