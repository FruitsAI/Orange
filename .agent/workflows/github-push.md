---
description: User says "Submit to GitHub", "Release version", "发布版本", "提交更新"时进行一些必要的操作
---

1. 分析变更：回顾当前会话中的代码修改。
   - 包含 Breaking Change -> Major +1 (v1.0.0)
   - 包含新功能 (Feat) -> Minor +1 (v0.1.0)
   - 仅 Bugfix/优化 -> Patch +1 (v0.0.1)
2. 读取当前版本：从项目文件（如 package.json 或 version.txt）获取旧版本号，计算新版本号 $NEW_VERSION。
3. 更新版本文件：将新版本号写入相关配置文件，可尝试执行 `task bump-version VERSION=$NEW_VERSION`，若不成功需自己扫描所有需要更新版本信息的文件，一并更新。
4. 更新 CHANGELOG.md：
   - 如果文件不存在，则以 "# Changelog" 开头创建。
   - 在顶部插入：## [$NEW_VERSION] - YYYY-MM-DD，并分项列出（Added, Fixed, Changed）。
5. 执行本地指令：
   - `git add .`
   - `git commit -m "chore(release): $NEW_VERSION"`
   - `git tag -a v$NEW_VERSION -m "Release v$NEW_VERSION"`
6. 执行推送：`git push origin main --tags`（视分支名而定）。
7. 归档更新：调用 <archive_workflow> 同步本次发布到 0_archive_context.md。
8. 汇报结果：列出更新的文件、新的版本号以及 Tag 链接。
