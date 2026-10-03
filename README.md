# 明日方舟同人角色控制台

浏览、筛选、预览和导出 AI 辅助生成的体素同人角色资源。当前版本 **v1.0.0** 包含 **426 个模型条目、423 个精确形态、385 个人物**；不是 426 个不同人物，也不代表原作全部角色已覆盖。

**[下载完整运行 ZIP](https://github.com/Douglath/arknights-character-console/releases/download/v1.0.0/arknights-character-console-v1.0.0.zip)** · [Release 与 SHA256](https://github.com/Douglath/arknights-character-console/releases/tag/v1.0.0) · [资源使用条款](ASSET-USAGE.md)

## 下载后运行

1. 从上面的 Release 下载 `arknights-character-console-v1.0.0.zip`，完整解压到普通文件夹。
2. 安装 **Python 3.10 或更新版本**。Windows 可从 [python.org](https://www.python.org/downloads/) 安装并添加到 PATH。需要支持 WebGL 2 的现代 Chrome、Edge 或 Firefox。
3. Windows 双击 **`Start-Console.cmd`**；macOS / Linux 在解压目录执行 `bash Start-Console.sh`。
4. 浏览器会自动打开本地控制台。保持终端窗口运行；关闭时在终端按 Ctrl+C。

也可手动运行：

```sh
python roster/serve.py
# 指定端口且不自动开浏览器：
python roster/serve.py --port 8781 --no-browser
```

无需 Node.js、npm、GitHub 账号或 API Key。完整包自带全部模型、426 张模型缩略图、字体和运行依赖；Python 与浏览器安装好后可断网运行。服务只监听本机 `127.0.0.1`。不要直接双击主页面 `index.html`；浏览器会限制它加载本地模块。详情页导出的**单体 HTML**可以直接双击离线打开。

GitHub 自动生成的 “Source code (zip)” 和普通 `git clone` **不包含 GLB 模型**，请下载上方有完整名称的 Release ZIP。开发者可从完整包复制 `showoff/models/` 到克隆目录，再运行同一入口。

## 功能

- 按名称、代号、职业、星级、地区、组织、联动 IP、原型/异格组合筛选。
- 档案、名录、全景三种视图，保留准确形态及不同模型版本。
- 3D 旋转、缩放、待机、跑动、测试动作和骨骼显示。
- 导出原始 GLB，或内嵌模型与 Three.js 的单体离线 HTML。

动作能力因模型而异；没有内置跑动的模型使用控制台的程序动作。头发/尾巴物理、脚本眨眼等原工程运行时逻辑不一定在 GLB 内，不能以 GLB 骨架/动画存在推断完整动态。此包保留上游控制台现有的动作范围，不包含 PV 成片、配乐、第一幕场景和旧广场。

## 许可与归属

本项目是**非官方同人项目**，与鹰角网络及各联动版权方没有隶属、合作或背书关系。

- **原创控制台代码与原创文档：** [MIT](LICENSE)。
- **生成模型与模型缩略图：** [署名、非商业使用、允许修改和再分享](ASSET-USAGE.md)，仅覆盖分享者确有权许可的贡献。
- **原 IP：** 《明日方舟》角色、名称、设定和商标归鹰角网络及相关权利人；联动角色归各自权利人。这些权利不会被代码许可证或资产条款重新授权，见 [NOTICE](NOTICE)。
- **Three.js 和字体：** 保留各自 MIT / SIL OFL 许可，见 [第三方声明](THIRD_PARTY_NOTICES.md)。

再分享模型时请附上资产条款、NOTICE、项目链接、`assetKey` / `character_form_id`，并说明修改。不要将模型冒充官方资源或自己的独立原创，不得将角色资源用于商业用途。

## 文件、校验与维护

`roster/site/` 为界面，`roster/shared/` 为模型舞台及共享样式，`roster/data/` 为索引与缩略图，`showoff/models/` 为 Release 模型，`showoff/runtime-modules/vendor/` 为离线 Three.js。详见 [数据约定](docs/data-contract.md)、[运行与导出](docs/usage.md)、[版本来源](docs/provenance.md) 和 [验证范围](docs/validation.md)。

完整包逐文件校验：

```sh
python tools/verify.py
```

ZIP 的 SHA256 见 Release 的 `SHA256SUMS.txt`。Windows 可运行 `Get-FileHash .\arknights-character-console-v1.0.0.zip -Algorithm SHA256`。文件校验和技术加载验证不等于所有模型外观已获认可。
