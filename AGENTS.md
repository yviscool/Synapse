**核心理念与原则**

> **简洁至上**：恪守KISS（Keep It Simple, Stupid）原则，崇尚简洁与可维护性，避免过度工程化与不必要的防御性设计。
> **深度分析**：立足于第一性原理（First Principles Thinking）剖析问题，并善用工具以提升效率。
> **事实为本**：以事实为最高准则。若有任何谬误，恳请坦率斧正，助我精进。

**开发工作流**

> **渐进式开发**：通过多轮对话迭代，明确并实现需求。在着手任何设计或编码工作前，必须完成前期调研并厘清所有疑点。
> **结构化流程**：严格遵循“构思方案 → 提请审核 → 分解为具体任务”的作业顺序。

**输出规范**

> **语言要求**：所有回复、思考过程及任务清单，均须使用中文。
> **固定指令**：`Implementation Plan, Task List and Thought in Chinese`

# Windows Shell Policy 2.0（Git Bash / No WSL）

> 目标：让所有命令在 **Windows Git Bash** 下稳定执行，彻底避免 `|`、括号 `(`、glob 展开、换行、引号丢失导致的解析错误。
> **唯一执行入口**：`bash -lc '<command>'`（外层必须单引号，且 `<command>` 必须单行）


## 0) 唯一执行入口（Hard Rule）

### ✅ 必须
- **所有命令一律**：
  - `bash -lc '<command>'`
- 外层必须 **单引号** `'...'`
- `<command>` **必须是单行**（禁止真实换行）

✅ 正确：
```bash
bash -lc 'rg -n -g "*.vue" "setTimeout" apps/web/src'
````

❌ 错误（多行塞进单引号会炸）：

```bash
bash -lc 'rg -n \
  -g "*.vue" "setTimeout" apps/web/src'
```

---

## 1) Glob 展开规则（`-g` 必须双引号）

### ✅ 必须

* 任何 `-g` 参数一律写成 `-g "*.xxx"`（双引号）
* 禁止 `-g *.vue`（bash 会先 glob 展开）

✅ 正确：

```bash
bash -lc 'rg -n -g "*.vue" "axios" apps/web/src'
```

❌ 错误：

```bash
bash -lc 'rg -n -g *.vue "axios" apps/web/src'
```

---

## 2) Pattern 引号规则（所有 pattern 必须双引号）

### ✅ 必须

* **任何 pattern**（包括单词）都必须写在 **双引号**中：`"pattern"`
* 禁止裸 pattern（尤其包含空格/特殊字符时）

✅ 正确：

```bash
bash -lc 'rg -n -g "*.vue" "axios" apps/web/src'
```

---

## 3) 管道符 `|` 规则（避免被当成 pipe）

### 3A. 首选：多关键字用多个 `-e`（推荐默认策略）

✅ 正确（最稳）：

```bash
bash -lc 'rg -n -g "*.vue" -e "addEventListener" -e "removeEventListener" -e "setTimeout" -e "setInterval" apps/web/src'
```

### 3B. 必须使用 `|`（正则 alternation）时：**整段必须在同一个双引号里**

✅ 正确：

```bash
bash -lc 'rg -n -g "*.vue" "addEventListener|removeEventListener" apps/web/src'
```

❌ 错误（拆行/引号外出现 `|` 会被 bash 当成 pipe）：

```bash
bash -lc 'rg -n -g "*.vue" "addEventListener|removeEventListener|
watch(" apps/web/src'
```

---

## 4) 括号 `(` / `)` 规则（默认用 `-F`）

### ✅ 必须

* 匹配 `watch(` / `fetch(` / `onMounted(` 等 **带括号**的字面量：

  * **默认使用 `-F`**（纯文本匹配）
  * pattern 必须是双引号

✅ 正确（推荐）：

```bash
bash -lc 'rg -n -g "*.vue" -F "watch(" apps/web/src'
bash -lc 'rg -n -g "*.vue" -F "fetch(" apps/web/src'
```

### 备选：必须正则时才允许转义（不建议新手）

✅ 正确：

```bash
bash -lc 'rg -n -g "*.vue" "watch\\(" apps/web/src'
```

---

## 5) 禁止真实换行（AI/脚本最常见炸点）

### ✅ 必须

* `bash -lc '...'` 的单引号内部 **禁止出现真实换行**
* 如果命令很长：保持一行；需要“分步骤”就用 `;` 串联

✅ 正确：

```bash
bash -lc 'cd apps/web && rg -n -g "*.vue" -F "watch(" src; rg -n -g "*.vue" -F "fetch(" src'
```

---

## 6) 通用多类扫描模板（可直接复制）

### 6A. VueUse 替换点全量扫描（推荐）

```bash
bash -lc 'rg -n -g "*.vue" -e "addEventListener" -e "removeEventListener" -e "setTimeout" -e "clearTimeout" -e "setInterval" -e "clearInterval" -e "localStorage" -e "sessionStorage" -e "axios" -F "fetch(" -F "watch(" apps/web/src'
```

### 6B. VueUse 引入痕迹扫描（避免 `|`）

```bash
bash -lc 'rg -n -g "*.vue" -e "@vueuse/core" -e "@vueuse/integrations" -e "from \"@vueuse" -e "from \"vueuse" apps/web/src'
```

### 6C. 生命周期/组合式 API（括号用 `-F`）

```bash
bash -lc 'rg -n -g "*.vue" -F "onMounted(" -F "onUnmounted(" -F "watch(" apps/web/src'
```

---

## 7) Git 命令规则（避免 commit message 引号丢失）

### ✅ 必须

* `git commit -m` 后的 message **必须双引号包住**
* 禁止裸 message（特别是含 `:`、`()` 等字符）

✅ 正确：

```bash
bash -lc 'git commit -m "refactor(web): apply vueuse lifecycle and observer best practices"'
```

✅ message 内含双引号时，用 `\"`：

```bash
bash -lc 'git commit -m "chore: mention \"vueuse\" migration"'
```

