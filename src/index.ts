/**
 * reurl —— 超轻量 URL 解析器
 *
 * 仅对url字符串做必要的字符串切分与拼接：不做任何编码 / 解码 / 转义，不做规范化，不解析相对路径，
 * 中文、空格等字符一律原样保留，查询串仅按 `&` / `=` 切分与拼接。
 *
 * 与原生 URL / ReSearchParams 的有意差异：
 * - 不支持非分层协议 如 `data:` / `mailto:` 等，会抛出异常
 * - 去除 `base` 参数不解析相对路径
 * - `searchParams.set()` 不保留键的原始位置（先删后插）
 * - 不识别 userinfo（`user@host` 会被当作 host 的一部分）
 */
export class ReURL {
  declare private _protocol: string // 协议（含结尾冒号），如 "https:"
  declare private _host: string // 主机部分，如 "example.com:8080"
  declare private _hostname: string
  declare private _port: string
  declare private _pathname: string // 路径，如 "/a/b"
  declare private _search: string // 查询串（含 ?）
  declare private _hash: string //（含 #）
  declare private _searchParams?: ReSearchParams // searchParams 缓存

  constructor(url: string | URL | ReURL) {
    this.href = url as string
  }

  get href(): string {
    return this._protocol + '//' + this._host + this._pathname + this._search + this._hash
  }

  set href(value: string) {
    let url = '' + value
    const invalid = new TypeError('Invalid URL: ' + value)
    if (!SCHEME_RE.test(url)) throw invalid
    let i = url.indexOf('#')
    if (~i) {
      this._hash = url.slice(i)
      url = url.slice(0, i)
    } else this._hash = ''
    i = url.indexOf('?')
    if (~i) {
      this._search = url.slice(i)
      url = url.slice(0, i)
    } else this._search = ''
    this._protocol = SCHEME_RE.exec(url)![0]
    url = url.slice(this._protocol.length)
    this._host = ''
    if (url.startsWith('//')) {
      i = url.indexOf('/', 2)
      if (~i) {
        this.host = url.slice(2, i)
        url = url.slice(i)
      } else {
        this.host = url.slice(2)
        url = ''
      }
    } else throw invalid
    this.pathname = url
    // href 被整体重写后，同步已缓存的 searchParams
    // @ts-expect-error 内部允许调用私有属性
    this._searchParams?._parse(this._search)
  }

  get protocol(): string {
    return this._protocol
  }

  set protocol(value: string) {
    this._protocol = SCHEME_RE.test(value) ? value : value + ':'
  }

  get host(): string {
    return this._host
  }

  set host(value: string) {
    this._host = value
    const j = value.indexOf(':', value.lastIndexOf(']') + 1)
    if (~j) {
      this._hostname = value.slice(0, j)
      this._port = value.slice(j + 1)
    } else {
      this._hostname = value
      this._port = ''
    }
  }

  get hostname(): string {
    return this._hostname
  }

  set hostname(value: string) {
    this._hostname = value
    this._host = value + prefix(':', this._port)
  }

  get port(): string {
    return this._port
  }

  set port(value: string) {
    this._host = this._hostname + prefix(':', (this._port = value))
  }

  get pathname(): string {
    return this._pathname
  }

  set pathname(value: string) {
    this._pathname = prefix('/', value) || '/'
  }

  get search(): string {
    return this._search
  }

  set search(value: string) {
    this._search = prefix('?', value)
    // @ts-expect-error 内部允许调用私有属性
    this._searchParams?._parse(this._search)
  }

  get hash(): string {
    return this._hash
  }

  set hash(value: string) {
    this._hash = prefix('#', value)
  }

  get origin(): string {
    return this._host ? this._protocol + '//' + this._host : 'null'
  }

  get searchParams(): ReSearchParams {
    return (this._searchParams ??= new ReSearchParams(this as any))
  }

  toString(): string {
    return this.href
  }

  toJSON(): string {
    return this.href
  }
}

export class ReSearchParams {
  /** 键值对列表：第二项为含前导 = 的原始片段（无 = 时为空串） */
  private _list: [string, string][] = []
  declare private _url?: ReURL // 绑定的 URL（内部使用）

  constructor(init?: string | string[][] | Record<string, string> | ReSearchParams) {
    if (init instanceof ReURL) {
      this._url = init
      // @ts-expect-error 内部允许调用私有属性
      init = init._search
    }
    if (init instanceof ReSearchParams) init = [...init]
    if (typeof init == 'string') this._parse(init)
    else if (init != null)
      for (const [key, value = ''] of (Array.isArray(init) ? init : Object.entries(init)) as [
        string,
        string,
      ][])
        this._list.push([key, value])
  }

  /** 按 & / = 切分查询串（忽略前导 ?），不做任何解码 */
  private _parse(query: string): void {
    this._list = []
    if ((query = query[0] == '?' ? query.slice(1) : query))
      for (const pair of query.split('&')) {
        const [key, value = ''] = pair.split('=')
        this._list.push([key, value])
      }
  }

  /** 变更后回写绑定的 URL */
  private _sync(): void {
    // @ts-expect-error 内部允许调用私有属性
    if (this._url) this._url._search = '?' + this
  }

  append(name: string, value: string): void {
    // @ts-expect-error 压缩后少一个逗号
    this._sync(this._list.push([name, value]))
  }

  delete(name: string, value?: string): void {
    this._sync(
      // @ts-expect-error 压缩后少一个逗号
      (this._list = this._list.filter(
        entry => entry[0] != name || (value != null && entry[1] != value),
      )),
    )
  }

  get(name: string): string | null {
    return this._list.find(entry => entry[0] == name)?.[1] ?? null
  }

  getAll(name: string): string[] {
    return this._list.filter(entry => entry[0] == name).map(entry => entry[1])
  }

  has(name: string, value?: string): boolean {
    return this._list.some(entry => entry[0] == name && (value == null || entry[1] == value))
  }

  set(name: string, value: string): void {
    this.delete(name)
    this.append(name, value)
  }

  /** 按键稳定排序 */
  sort(): void {
    // @ts-expect-error 压缩后少一个逗号
    this._sync(this._list.sort(([a], [b]) => (a < b ? -1 : +(a > b))))
  }

  /** 仅拼接，不做任何编码 */
  toString(): string {
    return this._list.map(entry => entry.join('=')).join('&')
  }

  *entries(): IterableIterator<[string, string]> {
    for (const entry of this._list) yield entry
  }

  *keys(): IterableIterator<string> {
    for (const entry of this._list) yield entry[0]
  }

  *values(): IterableIterator<string> {
    for (const entry of this._list) yield entry[1]
  }

  [Symbol.iterator](): IterableIterator<[string, string]> {
    return this.entries()
  }
}

/** scheme：字母开头 + 字母/数字/+/-/.，以冒号结尾 */
const SCHEME_RE = /^[a-zA-Z][a-zA-Z\d+.-]*:/

const prefix = (prefix: string, value: string) =>
  value && value[0] != prefix ? prefix + value : value
