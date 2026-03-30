# 按钮权限控制改动整理

## 1. 变更目标

本轮改动的目标，是在现有“菜单级别权限控制”基础上，补齐非 admin 页面内关键按钮的权限控制，并让前端判断逻辑尽量贴近 RustFS 后端当前实际支持的策略语义。

当前实现定位如下：

- 前端按钮控制属于体验层控制，用于隐藏或禁用用户当前无权执行的操作。
- 后端仍然是最终鉴权方，前端不替代服务端鉴权。
- 权限判断以 S3/MinIO 风格策略为基础，同时对齐 RustFS 当前已实现的行为。
- admin-only 菜单页面暂不纳入本轮按钮控制范围，因为页面入口本身已经由菜单权限控制。
- 暂不处理未纳入权限矩阵的页面。

## 2. 本轮实现概览

### 2.1 策略解析层补强

| 改动点              | 说明                                                  |
| ------------------- | ----------------------------------------------------- |
| `Deny` 优先         | 显式拒绝优先于允许，保持和后端一致                    |
| `NotAction` 支持    | 前端能力判断已支持 `NotAction` 语义                   |
| `NotResource` 支持  | `ConsoleStatement` 增加 `NotResource`，并参与资源匹配 |
| 通配符处理          | 裸 `*` 视为 `s3:*`，同时兼容 `s3:*`、`admin:*` 等模式 |
| Action alias 归一化 | 对齐 RustFS 当前实际支持的别名和映射                  |
| admin 资源校验放宽  | `admin:*` 动作前端忽略资源匹配，贴近后端行为          |
| console scope 推导  | console 菜单 scope 会推导到其隐含的 S3/admin 动作集合 |

### 2.2 RustFS 对齐要点

| 语义                      | 当前前端对齐方式                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| `*`                       | 视为 `s3:*`                                                                                  |
| `DeleteBucketTagging`     | 归并到 `s3:PutBucketTagging`                                                                 |
| `DeleteBucketReplication` | 归并到 `s3:PutReplicationConfiguration`                                                      |
| `DeleteBucketLifecycle`   | 归并到 `s3:PutBucketLifecycle`                                                               |
| `DeleteBucketEncryption`  | 通过桶加密编辑能力统一处理                                                                   |
| 生命周期旧别名            | `GetLifecycleConfiguration` / `PutLifecycleConfiguration` 归一到 RustFS 当前桶生命周期动作名 |
| 对象版本读取              | 目前以前端 `GetObject` 近似映射 `objects.version.view`                                       |

### 2.3 新增能力层

新增两个基础文件：

- `lib/permission-capabilities.ts`
- `lib/permission-resources.ts`

能力层职责：

- 将前端“页面按钮动作”抽象为 `ConsoleCapability`
- 将 capability 映射到后端真实 action 集合
- 按资源粒度构造 S3 ARN
- 通过 `hasConsoleCapability(...)` 做统一判断

### 2.4 `usePermissions` 扩展

`hooks/use-permissions.tsx` 新增：

- `canCapability(capability, context?)`

它的用途是：

- 页面只关心“这个按钮能不能显示/能不能点”
- 能力与 action/资源的复杂映射统一收敛到 lib 层

## 3. 新增与修改文件范围

### 3.1 新增文件

| 文件                             | 作用                                      |
| -------------------------------- | ----------------------------------------- |
| `lib/permission-capabilities.ts` | 定义 capability 与 action/resource 的映射 |
| `lib/permission-resources.ts`    | 构造 bucket/object/prefix 对应的 S3 ARN   |

### 3.2 修改文件

| 文件                                     | 作用                                                         |
| ---------------------------------------- | ------------------------------------------------------------ |
| `lib/console-policy-parser.ts`           | 补齐 `NotResource`、alias、wildcard、admin 资源规则          |
| `hooks/use-permissions.tsx`              | 暴露 `canCapability`                                         |
| `app/(dashboard)/browser/page.tsx`       | 桶列表页按钮权限控制                                         |
| `app/(dashboard)/browser/content.tsx`    | 对象页上传能力下发                                           |
| `components/object/list.tsx`             | 对象列表按钮权限控制                                         |
| `components/object/upload-picker.tsx`    | 上传弹窗内部按钮权限控制                                     |
| `components/object/info.tsx`             | 对象详情抽屉按钮权限控制                                     |
| `components/object/versions.tsx`         | 对象版本列表按钮权限控制                                     |
| `components/buckets/info.tsx`            | 桶详情页按钮与提交兜底                                       |
| `components/buckets/new-form.tsx`        | 新建桶表单按钮与开关控制                                     |
| `components/buckets/lifecycle-tab.tsx`   | 生命周期规则按钮控制                                         |
| `components/buckets/replication-tab.tsx` | 复制规则按钮控制                                             |
| `components/buckets/events-tab.tsx`      | 桶事件订阅按钮控制                                           |
| `components/events/columns.tsx`          | 事件列表删除按钮可配置                                       |
| `app/(dashboard)/access-keys/page.tsx`   | Access Keys 页面按钮控制                                     |
| `app/(dashboard)/users/page.tsx`         | Users 页面按钮控制                                           |
| `components/user/edit-form.tsx`          | 用户编辑弹窗内部权限收敛                                     |
| `app/(dashboard)/policies/page.tsx`      | Policies 页面按钮控制                                        |
| `app/(dashboard)/events/page.tsx`        | 适配 `getEventsColumns` 新签名，尚未真正接入 capability 控制 |

## 4. 能力与动作映射

### 4.1 Bucket 能力

| Capability                | 后端 Action                                     | 资源粒度   |
| ------------------------- | ----------------------------------------------- | ---------- |
| `bucket.create`           | `s3:CreateBucket`                               | 全部桶     |
| `bucket.delete`           | `s3:DeleteBucket`                               | 桶         |
| `bucket.policy.put`       | `s3:PutBucketPolicy`                            | 桶         |
| `bucket.policy.delete`    | `s3:DeleteBucketPolicy`                         | 桶         |
| `bucket.policy.edit`      | `s3:PutBucketPolicy` 或 `s3:DeleteBucketPolicy` | 桶         |
| `bucket.encryption.edit`  | `s3:PutBucketEncryption`                        | 桶         |
| `bucket.tag.edit`         | `s3:PutBucketTagging`                           | 桶         |
| `bucket.versioning.edit`  | `s3:PutBucketVersioning`                        | 桶         |
| `bucket.objectLock.edit`  | `s3:PutBucketObjectLockConfiguration`           | 桶         |
| `bucket.quota.edit`       | `admin:SetBucketQuota`                          | 无资源匹配 |
| `bucket.lifecycle.edit`   | `s3:PutBucketLifecycle`                         | 桶         |
| `bucket.replication.edit` | `s3:PutReplicationConfiguration`                | 桶         |
| `bucket.events.edit`      | `s3:PutBucketNotification`                      | 桶         |

### 4.2 Object 能力

| Capability               | 后端 Action             | 资源粒度 |
| ------------------------ | ----------------------- | -------- |
| `objects.upload`         | `s3:PutObject`          | 对象前缀 |
| `objects.view`           | `s3:GetObject`          | 对象     |
| `objects.preview`        | `s3:GetObject`          | 对象     |
| `objects.download`       | `s3:GetObject`          | 对象     |
| `objects.delete`         | `s3:DeleteObject`       | 对象     |
| `objects.bulkDelete`     | `s3:DeleteObject`       | 对象前缀 |
| `objects.tag.view`       | `s3:GetObjectTagging`   | 对象     |
| `objects.tag.edit`       | `s3:PutObjectTagging`   | 对象     |
| `objects.legalHold.edit` | `s3:PutObjectLegalHold` | 对象     |
| `objects.retention.edit` | `s3:PutObjectRetention` | 对象     |
| `objects.version.view`   | `s3:GetObject`          | 对象     |
| `objects.share`          | `s3:GetObject`          | 对象     |

### 4.3 IAM/Policy 能力

| Capability              | 后端 Action                                                                           | 资源粒度   |
| ----------------------- | ------------------------------------------------------------------------------------- | ---------- |
| `accessKeys.create`     | `admin:CreateServiceAccount`                                                          | 无资源匹配 |
| `accessKeys.edit`       | `admin:UpdateServiceAccount`                                                          | 无资源匹配 |
| `accessKeys.delete`     | `admin:RemoveServiceAccount`                                                          | 无资源匹配 |
| `accessKeys.bulkDelete` | `admin:RemoveServiceAccount`                                                          | 无资源匹配 |
| `users.create`          | `admin:CreateUser`                                                                    | 无资源匹配 |
| `users.edit`            | `admin:GetUser` 且 `admin:CreateUser` / `admin:EnableUser` / `admin:DisableUser` 任一 | 无资源匹配 |
| `users.delete`          | `admin:DeleteUser`                                                                    | 无资源匹配 |
| `users.bulkDelete`      | `admin:DeleteUser`                                                                    | 无资源匹配 |
| `users.assignGroups`    | `admin:AddUserToGroup` 或 `admin:RemoveUserFromGroup`                                 | 无资源匹配 |
| `users.policy.edit`     | `admin:AttachUserOrGroupPolicy` 或 `admin:UpdatePolicyAssociation`                    | 无资源匹配 |
| `policies.create`       | `admin:CreatePolicy`                                                                  | 无资源匹配 |
| `policies.edit`         | `admin:CreatePolicy`                                                                  | 无资源匹配 |
| `policies.delete`       | `admin:DeletePolicy`                                                                  | 无资源匹配 |

## 5. 按钮权限矩阵

### 5.1 页面入口与列表按钮

| 页面/组件                                | 按钮                     | Capability                                                     | 后端 Action                                          | 资源上下文        | 当前控制方式               |
| ---------------------------------------- | ------------------------ | -------------------------------------------------------------- | ---------------------------------------------------- | ----------------- | -------------------------- |
| `/browser` 桶列表                        | `Create Bucket`          | `bucket.create`                                                | `s3:CreateBucket`                                    | 全部桶            | 无权限时隐藏               |
| `/browser` 桶列表                        | 行内 `Delete`            | `bucket.delete`                                                | `s3:DeleteBucket`                                    | 当前桶            | 无权限时隐藏               |
| `/browser?bucket=...` 对象列表           | `Upload File/Folder`     | `objects.upload`                                               | `s3:PutObject`                                       | 当前桶 + 当前前缀 | 无权限时隐藏               |
| `/browser?bucket=...` 对象列表           | `Delete Selected`        | `objects.bulkDelete`                                           | `s3:DeleteObject`                                    | 当前桶 + 当前前缀 | 无权限时隐藏               |
| `/browser?bucket=...` 对象列表           | `Download`（批量）       | `objects.download`                                             | `s3:GetObject`                                       | 当前桶 + 当前前缀 | 无权限时隐藏               |
| `/browser?bucket=...` 对象列表           | 行内 `Preview`           | `objects.preview`                                              | `s3:GetObject`                                       | 当前对象          | 无权限时隐藏               |
| `/browser?bucket=...` 对象列表           | 行内 `Download`          | `objects.download`                                             | `s3:GetObject`                                       | 当前对象          | 无权限时隐藏               |
| `/browser?bucket=...` 对象列表           | 行内 `Delete`            | `objects.delete`                                               | `s3:DeleteObject`                                    | 当前对象/前缀     | 无权限时隐藏               |
| `components/buckets/lifecycle-tab.tsx`   | `Add Lifecycle Rule`     | `bucket.lifecycle.edit`                                        | `s3:PutBucketLifecycle`                              | 当前桶            | 无权限时隐藏               |
| `components/buckets/lifecycle-tab.tsx`   | 行内 `Delete`            | `bucket.lifecycle.edit`                                        | `s3:PutBucketLifecycle`                              | 当前桶            | 无权限时隐藏               |
| `components/buckets/replication-tab.tsx` | `Add Replication Rule`   | `bucket.replication.edit`                                      | `s3:PutReplicationConfiguration`                     | 当前桶            | 无权限时隐藏               |
| `components/buckets/replication-tab.tsx` | 行内 `Delete`            | `bucket.replication.edit`                                      | `s3:PutReplicationConfiguration`                     | 当前桶            | 无权限时隐藏               |
| `components/buckets/events-tab.tsx`      | `Add Event Subscription` | `bucket.events.edit`                                           | `s3:PutBucketNotification`                           | 当前桶            | 无权限时隐藏               |
| `components/buckets/events-tab.tsx`      | 行内 `Delete`            | `bucket.events.edit`                                           | `s3:PutBucketNotification`                           | 当前桶            | 无权限时隐藏               |
| `/access-keys`                           | `Add Access Key`         | `accessKeys.create`                                            | `admin:CreateServiceAccount`                         | 无                | 无权限时隐藏               |
| `/access-keys`                           | 行内 `Edit`              | `accessKeys.edit`                                              | `admin:UpdateServiceAccount`                         | 无                | 无权限时隐藏               |
| `/access-keys`                           | 行内 `Delete`            | `accessKeys.delete`                                            | `admin:RemoveServiceAccount`                         | 无                | 无权限时隐藏               |
| `/access-keys`                           | `Delete Selected`        | `accessKeys.bulkDelete`                                        | `admin:RemoveServiceAccount`                         | 无                | 仅在有权限且有选中项时显示 |
| `/users`                                 | `Add User`               | `users.create`                                                 | `admin:CreateUser`                                   | 无                | 无权限时隐藏               |
| `/users`                                 | 行内 `Edit`              | `users.edit` / `users.assignGroups` / `users.policy.edit` 任一 | 组合能力                                             | 无                | 任一编辑相关能力满足即显示 |
| `/users`                                 | 行内 `Delete`            | `users.delete`                                                 | `admin:DeleteUser`                                   | 无                | 无权限时隐藏               |
| `/users`                                 | `Delete Selected`        | `users.bulkDelete`                                             | `admin:DeleteUser`                                   | 无                | 无权限时禁用               |
| `/users`                                 | `Add to Group`           | `users.assignGroups`                                           | `admin:AddUserToGroup` / `admin:RemoveUserFromGroup` | 无                | 无权限时禁用               |
| `/policies`                              | `New Policy`             | `policies.create`                                              | `admin:CreatePolicy`                                 | 无                | 无权限时隐藏               |
| `/policies`                              | 行内 `Edit`              | `policies.edit`                                                | `admin:CreatePolicy`                                 | 无                | 无权限时隐藏               |
| `/policies`                              | 行内 `Delete`            | `policies.delete`                                              | `admin:DeletePolicy`                                 | 无                | 无权限时隐藏               |

### 5.2 详情抽屉、弹窗、表单内部按钮

| 页面/组件                             | 按钮                      | Capability                                                | 后端 Action                                    | 资源上下文    | 当前控制方式                                      |
| ------------------------------------- | ------------------------- | --------------------------------------------------------- | ---------------------------------------------- | ------------- | ------------------------------------------------- |
| `components/object/upload-picker.tsx` | `Select File`             | `objects.upload`                                          | `s3:PutObject`                                 | 当前桶 + 前缀 | 无权限时禁用                                      |
| `components/object/upload-picker.tsx` | `Select Folder`           | `objects.upload`                                          | `s3:PutObject`                                 | 当前桶 + 前缀 | 无权限时禁用                                      |
| `components/object/upload-picker.tsx` | `Clear All`               | `objects.upload`                                          | `s3:PutObject`                                 | 当前桶 + 前缀 | 无权限时禁用                                      |
| `components/object/upload-picker.tsx` | `Start Upload`            | `objects.upload`                                          | `s3:PutObject`                                 | 当前桶 + 前缀 | 无权限时禁用                                      |
| `components/object/info.tsx`          | `Download`                | `objects.download`                                        | `s3:GetObject`                                 | 当前对象      | 无权限时隐藏                                      |
| `components/object/info.tsx`          | `Preview`                 | `objects.preview`                                         | `s3:GetObject`                                 | 当前对象      | 无权限时隐藏                                      |
| `components/object/info.tsx`          | `Set Tags`                | `objects.tag.view` 或 `objects.tag.edit`                  | `s3:GetObjectTagging` / `s3:PutObjectTagging`  | 当前对象      | 无查看/编辑权限时隐藏                             |
| `components/object/info.tsx`          | `Versions`                | `objects.version.view`                                    | `s3:GetObject`                                 | 当前对象      | 无权限时隐藏                                      |
| `components/object/info.tsx`          | `Retention`               | `objects.retention.edit`                                  | `s3:PutObjectRetention`                        | 当前对象      | 无权限时隐藏                                      |
| `components/object/info.tsx`          | `Generate URL`            | `objects.share`                                           | `s3:GetObject`                                 | 当前对象      | 无权限时禁用                                      |
| `components/object/info.tsx`          | 标签删除图标              | `objects.tag.edit`                                        | `s3:PutObjectTagging`                          | 当前对象      | 无权限时隐藏                                      |
| `components/object/info.tsx`          | 标签弹窗 `Add`            | `objects.tag.edit`                                        | `s3:PutObjectTagging`                          | 当前对象      | 无权限时禁用，提交函数再次兜底                    |
| `components/object/info.tsx`          | 保留期弹窗 `Reset`        | `objects.retention.edit`                                  | `s3:PutObjectRetention`                        | 当前对象      | 无权限时禁用，提交函数再次兜底                    |
| `components/object/info.tsx`          | 保留期弹窗 `Confirm`      | `objects.retention.edit`                                  | `s3:PutObjectRetention`                        | 当前对象      | 无权限时禁用，提交函数再次兜底                    |
| `components/object/versions.tsx`      | 行内 `Preview`            | `objects.version.view`                                    | `s3:GetObject`                                 | 当前对象      | 无权限时隐藏                                      |
| `components/object/versions.tsx`      | 行内 `Download`           | `objects.download`                                        | `s3:GetObject`                                 | 当前对象      | 无权限时隐藏                                      |
| `components/object/versions.tsx`      | 行内 `Delete`             | `objects.delete`                                          | `s3:DeleteObject`                              | 当前对象      | 无权限时隐藏                                      |
| `components/buckets/info.tsx`         | `Edit`（Access Policy）   | `bucket.policy.put` / `bucket.policy.delete`              | `s3:PutBucketPolicy` / `s3:DeleteBucketPolicy` | 当前桶        | 有任一策略编辑能力时显示                          |
| `components/buckets/info.tsx`         | `Edit`（Encryption）      | `bucket.encryption.edit`                                  | `s3:PutBucketEncryption`                       | 当前桶        | 无权限时隐藏                                      |
| `components/buckets/info.tsx`         | `Add`（Tag）              | `bucket.tag.edit`                                         | `s3:PutBucketTagging`                          | 当前桶        | 无权限时隐藏                                      |
| `components/buckets/info.tsx`         | 标签点击编辑              | `bucket.tag.edit`                                         | `s3:PutBucketTagging`                          | 当前桶        | 无权限时禁用                                      |
| `components/buckets/info.tsx`         | 标签删除图标              | `bucket.tag.edit`                                         | `s3:PutBucketTagging`                          | 当前桶        | 无权限时禁用                                      |
| `components/buckets/info.tsx`         | `Edit`（Bucket Quota）    | `bucket.quota.edit`                                       | `admin:SetBucketQuota`                         | 无            | 无权限时隐藏                                      |
| `components/buckets/info.tsx`         | `Edit`（Retention）       | `bucket.objectLock.edit`                                  | `s3:PutBucketObjectLockConfiguration`          | 当前桶        | 无权限时隐藏                                      |
| `components/buckets/info.tsx`         | Policy 弹窗 `Confirm`     | `bucket.policy.put` / `bucket.policy.delete`              | 对应策略动作                                   | 当前桶        | 提交函数按 policy 类型再次校验                    |
| `components/buckets/info.tsx`         | Encryption 弹窗 `Confirm` | `bucket.encryption.edit`                                  | `s3:PutBucketEncryption`                       | 当前桶        | 通过入口控制进入                                  |
| `components/buckets/info.tsx`         | Tag 弹窗 `Confirm`        | `bucket.tag.edit`                                         | `s3:PutBucketTagging`                          | 当前桶        | 提交函数再次兜底                                  |
| `components/buckets/info.tsx`         | Quota 弹窗 `Confirm`      | `bucket.quota.edit`                                       | `admin:SetBucketQuota`                         | 无            | 提交函数再次兜底                                  |
| `components/buckets/info.tsx`         | Retention 弹窗 `Confirm`  | `bucket.objectLock.edit`                                  | `s3:PutBucketObjectLockConfiguration`          | 当前桶        | 提交函数再次兜底                                  |
| `components/buckets/new-form.tsx`     | `Create`                  | `bucket.create`                                           | `s3:CreateBucket`                              | 全部桶        | 无权限时禁用                                      |
| `components/user/edit-form.tsx`       | `Submit`                  | `users.edit` / `users.assignGroups` / `users.policy.edit` | 组合能力                                       | 无            | 没有任何可编辑 tab 时禁用；提交仅发送允许的子操作 |

### 5.3 非按钮交互控件

| 页面/组件                         | 交互控件                               | Capability               | 当前控制方式           |
| --------------------------------- | -------------------------------------- | ------------------------ | ---------------------- |
| `components/object/info.tsx`      | `Legal Hold` 开关                      | `objects.legalHold.edit` | 无权限时禁用           |
| `components/buckets/info.tsx`     | `Version Control` 开关                 | `bucket.versioning.edit` | 无权限时禁用           |
| `components/buckets/new-form.tsx` | `Version` 开关                         | `bucket.versioning.edit` | 无权限时禁用           |
| `components/buckets/new-form.tsx` | `Object Lock` 开关                     | `bucket.objectLock.edit` | 无权限时禁用           |
| `components/buckets/new-form.tsx` | `Bucket Quota` 开关                    | `bucket.quota.edit`      | 无权限时禁用           |
| `components/user/edit-form.tsx`   | `Account` / `Groups` / `Policies` Tabs | 对应用户能力             | 无对应权限时不渲染 tab |
| `components/user/edit-form.tsx`   | 用户状态开关                           | `users.edit`             | 无权限时禁用           |

## 6. 当前边界与已知待补位项

### 6.1 本轮明确不纳入

| 范围                 | 说明                                       |
| -------------------- | ------------------------------------------ |
| admin-only 页面      | 菜单入口已受控，本轮不继续做页面内按钮矩阵 |
| 未纳入权限矩阵的页面 | 按当前决策先忽略，不在本轮补齐             |

### 6.2 当前仍需后续完善

| 范围                                   | 当前状态                                                         | 后续建议                                             |
| -------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------- |
| `/events` 页面                         | 只适配了 `getEventsColumns` 的 `canDelete` 参数，当前仍传 `true` | 后续补上 `bucket.events.edit` 的真实 capability 判断 |
| `components/access-keys/new-item.tsx`  | 页面入口已受控，弹窗内部未单独做 capability 下沉                 | 若存在绕过入口的调用路径，再补内部兜底               |
| `components/access-keys/edit-item.tsx` | 同上                                                             | 同上                                                 |
| `components/policies/form.tsx`         | 页面入口已受控，表单内部未单独补 capability                      | 后续可补提交兜底                                     |
| `components/user/new-form.tsx`         | 页面入口已受控，弹窗内部未单独补 capability                      | 后续可补提交兜底                                     |
| `components/lifecycle/new-form.tsx`    | 入口按钮已受控，表单内部未单独补 capability                      | 后续可补提交兜底                                     |
| `components/replication/new-form.tsx`  | 同上                                                             | 同上                                                 |
| `components/events/new-form.tsx`       | 同上                                                             | 同上                                                 |
| 对象版本能力精度                       | `objects.version.view` 目前用 `s3:GetObject` 近似                | 后续若后端暴露更细粒度版本动作，可继续细化           |
| Governance bypass                      | `s3:BypassGovernanceRetention` 尚未单独建 capability             | 如果前端后续暴露该操作，再单独建模                   |

## 7. README 可复用内容

下面这段可以直接作为 README 中“权限控制”或“按钮级权限控制”章节的基础说明：

```md
## Button-Level Permission Control

The console now supports capability-based button control on top of menu-level access control.

- Policies are parsed with S3/MinIO-compatible semantics and aligned with current RustFS backend behavior.
- Frontend capability checks support `Deny` precedence, `NotAction`, `NotResource`, wildcard matching, and RustFS action aliases.
- A dedicated capability layer maps UI actions to backend permissions and resource scopes.
- Bucket-, object-, IAM-, and policy-related operations on non-admin pages are now gated by capability checks.
- Frontend button control is an experience-layer safeguard only; backend authorization remains the source of truth.
```

如果 README 需要中文版本，可以使用：

```md
## 按钮级权限控制

控制台目前已在菜单权限控制基础上，补充了非 admin 页面中的按钮级权限控制。

- 策略解析参考 S3 / MinIO 语义，并对齐当前 RustFS 后端行为。
- 前端已支持 `Deny` 优先、`NotAction`、`NotResource`、通配符匹配以及 RustFS 动作别名归一化。
- 新增 capability 能力层，将页面按钮动作统一映射为后端权限与资源范围。
- 当前已覆盖桶、对象、Access Key、用户、策略、生命周期、复制、桶事件等主要非 admin 页面操作。
- 前端按钮控制仅用于体验层约束，最终权限校验仍以后端为准。
```

## 8. PR 描述草稿

下面内容可以直接作为 PR 描述初稿：

```md
## Summary

This PR adds button-level permission control on top of the existing menu-level access control.

It introduces a capability layer for mapping UI actions to backend permissions, and aligns frontend policy parsing with current RustFS behavior.

## What Changed

- added `permission-capabilities` and `permission-resources` to map UI capabilities to backend actions and resource scopes
- extended `console-policy-parser` to support `NotResource`, RustFS action aliases, wildcard normalization, and admin action matching behavior
- exposed `canCapability(capability, context?)` from `usePermissions`
- gated non-admin page actions for:
  - bucket creation and deletion
  - bucket policy, encryption, tagging, versioning, quota, retention, lifecycle, replication, and bucket events
  - object upload, preview, download, delete, bulk delete, tags, legal hold, retention, versions, and share URL generation
  - access key create/edit/delete/bulk delete
  - user create/edit/delete/bulk delete/group assignment/policy editing
  - policy create/edit/delete
- added internal submit-path guards for several bucket/object/user edit flows to avoid relying only on button visibility

## Notes

- this is frontend UX gating only; backend authorization remains authoritative
- admin-only pages are intentionally out of scope for this round
- pages outside the current permission matrix are intentionally ignored for now
- `/events` page is only partially adapted and still needs real capability-based gating in a follow-up

## Validation

- aligned permission semantics against current RustFS policy behavior
- manually reviewed capability coverage across bucket, object, IAM, and policy pages
```

## 9. 补充建议

如果后续要继续推进“全按钮覆盖”，建议按下面顺序继续做：

1. 先补 `/events` 页面真实 capability 控制，避免桶事件页面存在前后不一致。
2. 再把 `new-form` / `edit-item` / `form` 这类弹窗内部提交逻辑全部下沉 capability 兜底。
3. 最后再扩展到当前未纳入权限矩阵的页面和 admin-only 页面中的细粒度按钮。
