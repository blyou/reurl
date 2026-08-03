import { describe, expect, test } from 'vitest'
// import { ReURL, ReSearchParams } from '../src'
import { ReURL, ReSearchParams } from '../dist/index.mjs'

describe('ReURL', () => {
  test('基础解析', () => {
    const u = new ReURL('https://example.com:8080/a/b?x=1&y=2#frag')
    expect(u.protocol).toBe('https:')
    expect(u.host).toBe('example.com:8080')
    expect(u.hostname).toBe('example.com')
    expect(u.port).toBe('8080')
    expect(u.pathname).toBe('/a/b')
    expect(u.search).toBe('?x=1&y=2')
    expect(u.hash).toBe('#frag')
    expect(u.origin).toBe('https://example.com:8080')
    expect(u.href).toBe('https://example.com:8080/a/b?x=1&y=2#frag')
    expect(u.toString()).toBe(u.href)
    expect(u.toJSON()).toBe(u.href)
  })

  test('原样保留：不编码、不规范化', () => {
    const href = 'https://a.com/a/../b/./中 文?键=值&x=%20#锚 点'
    const u = new ReURL(href)
    expect(u.href).toBe(href)
    expect(u.pathname).toBe('/a/../b/./中 文')
    expect(u.search).toBe('?键=值&x=%20')
    expect(u.hash).toBe('#锚 点')
    expect(u.port).toBe('')
  })

  test('非分层协议', () => {
    expect(() => new ReURL('mailto:a@b.c')).toThrow(TypeError)
  })

  describe('IPv6 host', () => {
    test('带端口', () => {
      const u = new ReURL('http://[2001:db8::1]:8080/p?x#h')
      expect(u.hostname).toBe('[2001:db8::1]')
      expect(u.port).toBe('8080')
      expect(u.host).toBe('[2001:db8::1]:8080')
      expect(u.pathname).toBe('/p')
      expect(u.search).toBe('?x')
      expect(u.hash).toBe('#h')
    })

    test('无端口', () => {
      const u = new ReURL('http://[fe80::1]/p')
      expect(u.hostname).toBe('[fe80::1]')
      expect(u.port).toBe('')
      expect(u.host).toBe('[fe80::1]')
    })

    test('回环地址 [::1]', () => {
      const u = new ReURL('http://[::1]/')
      expect(u.hostname).toBe('[::1]')
      expect(u.port).toBe('')
      expect(u.host).toBe('[::1]')
    })

    test('默认值地址 [::]', () => {
      const u = new ReURL('http://[::]:9090/')
      expect(u.hostname).toBe('[::]')
      expect(u.port).toBe('9090')
      expect(u.host).toBe('[::]:9090')
    })

    test('改 hostname 保留端口', () => {
      const u = new ReURL('http://[2001:db8::1]:8080/p')
      u.hostname = '[2001:db8::2]'
      expect(u.host).toBe('[2001:db8::2]:8080')
      expect(u.port).toBe('8080')
    })

    test('改 host 整体保留 IPv6 括号', () => {
      const u = new ReURL('http://[2001:db8::1]:8080/p')
      u.host = '[2001:db8::3]:9090'
      expect(u.hostname).toBe('[2001:db8::3]')
      expect(u.port).toBe('9090')
    })

    test('改 port 回写 host', () => {
      const u = new ReURL('http://[2001:db8::1]/p')
      u.port = '9999'
      expect(u.host).toBe('[2001:db8::1]:9999')
    })
  })

  test('setter 联动 href', () => {
    const u = new ReURL('https://a.com:1/p?x=1#f')
    u.protocol = 'http'
    expect(u.href).toBe('http://a.com:1/p?x=1#f')
    u.protocol = 'https:'
    expect(u.protocol).toBe('https:')
    u.hostname = 'b.com'
    expect(u.host).toBe('b.com:1')
    u.port = '8080'
    expect(u.host).toBe('b.com:8080')
    u.port = ''
    expect(u.host).toBe('b.com')
    u.host = 'c.com:9'
    expect(u.hostname).toBe('c.com')
    expect(u.port).toBe('9')
    u.pathname = '/new'
    expect(u.href).toBe('https://c.com:9/new?x=1#f')
    u.pathname = ''
    expect(u.pathname).toBe('/')
    expect(u.href).toBe('https://c.com:9/?x=1#f')
    u.pathname = 'new'
    expect(u.href).toBe('https://c.com:9/new?x=1#f')
    u.search = '?y=2'
    expect(u.search).toBe('?y=2')
    u.search = 'z=3'
    expect(u.search).toBe('?z=3')
    u.search = ''
    expect(u.href).toBe('https://c.com:9/new#f')
    u.hash = '#top'
    expect(u.hash).toBe('#top')
    u.hash = ''
    expect(u.href).toBe('https://c.com:9/new')
  })

  test('href setter 重新解析', () => {
    const u = new ReURL('https://a.com/')
    u.href = 'https://b.com:2/x?y#z'
    expect(u.hostname).toBe('b.com')
    expect(u.port).toBe('2')
    expect(u.searchParams.get('y')).toBe('')
    expect(() => (u.href = 'bad')).toThrow(TypeError)
  })

  test('searchParams 双向联动', () => {
    const u = new ReURL('https://a.com/p?a=1&b=2')
    const sp = u.searchParams
    expect(u.searchParams).toBe(sp) // 缓存同一对象
    sp.append('c', '3')
    expect(u.href).toBe('https://a.com/p?a=1&b=2&c=3')
    sp.delete('a')
    expect(u.search).toBe('?b=2&c=3')
    u.search = 'k=中 文'
    expect(sp.get('k')).toBe('中 文')
    expect(sp.has('a')).toBe(false)
  })
})

describe('ReSearchParams', () => {
  test('构造与读取', () => {
    const sp = new ReSearchParams('?a=1&a=2&b&c=%20')
    expect(sp.get('a')).toBe('1')
    expect(sp.getAll('a')).toEqual(['1', '2'])
    expect(sp.get('b')).toBe('')
    expect(sp.get('c')).toBe('%20') // 不解码
    expect(sp.get('x')).toBeNull()
    expect(sp.has('b')).toBe(true)
    expect(sp.has('a', '2')).toBe(true)
    expect(sp.has('a', '3')).toBe(false)
  })

  test('修改', () => {
    const sp = new ReSearchParams('a=1&b=2&a=3')
    sp.append('c', '4')
    expect(sp.toString()).toBe('a=1&b=2&a=3&c=4')
    sp.delete('a')
    expect(sp.toString()).toBe('b=2&c=4')
    sp.set('b', '5')
    sp.set('d', '6')
    expect(sp.toString()).toBe('c=4&b=5&d=6') // set 先删后插，不保留原位置
    const sp2 = new ReSearchParams('x=1&x=2&y=3')
    sp2.delete('x', '2')
    expect(sp2.toString()).toBe('x=1&y=3')
  })

  test('sort 稳定排序', () => {
    const sp = new ReSearchParams('b=1&a=1&a=2&c=3')
    sp.sort()
    expect(sp.toString()).toBe('a=1&a=2&b=1&c=3')
  })

  test('无 = 的键原样保留', () => {
    const sp = new ReSearchParams('a&b=2')
    expect(sp.get('a')).toBe('')
    expect(sp.toString()).toBe('a=&b=2')
  })

  test('迭代', () => {
    const sp = new ReSearchParams('a=1&b=2')
    expect([...sp.entries()]).toEqual([
      ['a', '1'],
      ['b', '2'],
    ])
    expect([...sp.keys()]).toEqual(['a', 'b'])
    expect([...sp.values()]).toEqual(['1', '2'])
    expect([...sp]).toEqual([
      ['a', '1'],
      ['b', '2'],
    ])
  })

  test('其他构造形式', () => {
    expect(
      new ReSearchParams([
        ['a', '1'],
        ['b', '2'],
      ]).toString(),
    ).toBe('a=1&b=2')
    expect(new ReSearchParams({ a: '1', b: '2' }).toString()).toBe('a=1&b=2')
    expect(new ReSearchParams(new ReSearchParams('a=1')).toString()).toBe('a=1')
    expect(new ReSearchParams().toString()).toBe('')
  })
})
