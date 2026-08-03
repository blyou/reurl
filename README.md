# reurl

超轻量的 URL 解析器：仅做必要的字符串切分与拼接，不做任何编码 / 解码 / 转义，不做规范化，不解析相对路径。与浏览器原生 `URL` / `URLSearchParams` 的 API 对齐，但运行时代码体积极小（构建产物约 1 KB gzip）。

## 特性

- 🪶 **极小体积**：仅做必要的字符串切分与拼接，零依赖
- 🔤 **原样保留**：中文、空格、`%20` 等字符一律不处理，查询串不经 percent 编解码
- 🌐 **支持 IPv6**：`[2001:db8::1]:8080` 这类主机正确拆分 host / hostname / port
- 🧩 **TypeScript 类型对齐**：导出 `ReURL` 与 `ReSearchParams`，签名对齐原生接口

## 安装

```bash
pnpm i @blyou/reurl
```

## 使用

### ReURL

```ts
import { ReURL } from '@blyou/reurl'

const u = new ReURL('https://example.com:8080/a/b?x=1&y=2#frag')

u.protocol // 'https:'
u.host // 'example.com:8080'
u.hostname // 'example.com'
u.port // '8080'
u.pathname // '/a/b'
u.search // '?x=1&y=2'
u.hash // '#frag'
u.origin // 'https://example.com:8080'
u.href // 'https://example.com:8080/a/b?x=1&y=2#frag'
```

所有 getter 都有对应的 setter，修改任一字段都会即时反映到 `href`：

```ts
u.hostname = 'b.com' // host → 'b.com:8080'
u.port = '9090' // host → 'b.com:9090'
u.pathname = '/new' // href 同步更新
```

#### userinfo（username / password）

```ts
const u2 = new ReURL('https://user:pass@a.com/')

u2.username // 'user'
u2.password // 'pass'
u2.password = 'new' // href → 'https://user:new@a.com/'
u2.username = ''
u2.password = '' // href → 'https://a.com/'（userinfo 整体移除）
```

#### searchParams 双向联动

```ts
const u = new ReURL('https://a.com/p?a=1&b=2')
const sp = u.searchParams // 同一对象会被缓存

sp.append('c', '3')
u.href // 'https://a.com/p?a=1&b=2&c=3'

u.search = 'k=v'
sp.get('k') // 'v'
```

### ReSearchParams

查询串仅按 `&` / `=` 切分与拼接，不做编解码。

```ts
import { ReSearchParams } from '@blyou/reurl'

const sp = new ReSearchParams('?a=1&a=2&b=2')

sp.get('a') // '1'
sp.getAll('a') // ['1', '2']
sp.has('b') // true
sp.append('c', '3')
sp.set('b', '9') // 先删后插，不保留键的原始位置
sp.delete('a')
sp.sort() // 按键稳定排序
sp.toString() // 'b=9&c=3'

// 迭代器
for (const [key, value] of sp) {
  /* ... */
}
sp.keys()
sp.values()
sp.entries()
```

支持字符串 / 二维数组 / 对象 / `ReSearchParams` 多种构造方式：

```ts
new ReSearchParams([
  ['a', '1'],
  ['b', '2'],
])
new ReSearchParams({ a: '1', b: '2' })
new ReSearchParams(new ReSearchParams('a=1'))
```

## 与原生 API 的有意差异

为了在最小体积下工作，`reurl` 刻意省略了一些原生行为：

| 项目                 | 原生行为                     | reurl 行为                                     |
| -------------------- | ---------------------------- | ---------------------------------------------- |
| 非分层协议           | `data:` / `mailto:` 等可解析 | **不支持**，直接抛出 `TypeError`               |
| 相对路径             | `new URL('/p', base)` 可解析 | **不支持** `base` 参数（相对路径视为不可解析） |
| `searchParams.set()` | 保留键的原始位置             | 先删后插，位置移到末尾                         |
| userinfo             | 拆分且 percent 编解码        | 拆分 username / password，但原样保留不编解码   |

## 开发

```bash
pnpm install     # 安装依赖
pnpm test        # 运行单元测试
pnpm typecheck   # 类型检查
pnpm lint        # 代码检查
pnpm build       # 构建产物到 dist/
```

## License

[MIT](./LICENSE)
