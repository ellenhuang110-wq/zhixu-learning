// 本地笔记 API：仅在 docs:dev 开发服务器生效，不参与构建产物。
// 提供三个端点：读取笔记 / 追加笔记段落 / 上传截图。
// 安全约束：只允许读写 docs/ 目录内的 .md 文件与 public/assets/notes/ 图片。
import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const docsRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const notesImageDir = resolve(docsRoot, 'public/assets/notes')

function json(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    let data = ''
    req.on('data', (chunk: Buffer) => {
      data += chunk
      if (data.length > 12 * 1024 * 1024) reject(new Error('body too large'))
    })
    req.on('end', () => resolvePromise(data))
    req.on('error', reject)
  })
}

// 把相对路径（如 doris/01-架构原理/01-学习笔记.md）解析为 docs 内的绝对路径，越界则返回 null
function safeNotePath(rel: string): string | null {
  if (!rel || rel.includes('..') || !rel.endsWith('.md')) return null
  const abs = resolve(docsRoot, rel)
  return abs.startsWith(docsRoot) ? abs : null
}

export function notesApi(): Plugin {
  return {
    name: 'zhixu-notes-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '', 'http://localhost')
        if (!url.pathname.startsWith('/__notes/')) return next()

        try {
          // 读取笔记内容
          if (url.pathname === '/__notes/read' && req.method === 'GET') {
            const abs = safeNotePath(url.searchParams.get('path') || '')
            if (!abs || !existsSync(abs)) return json(res, 404, { error: '笔记文件不存在' })
            return json(res, 200, { content: readFileSync(abs, 'utf8') })
          }

          // 追加一段笔记（自动带日期标题）
          if (url.pathname === '/__notes/append' && req.method === 'POST') {
            const { path, title, body } = JSON.parse(await readBody(req))
            const abs = safeNotePath(path || '')
            if (!abs || !existsSync(abs)) return json(res, 400, { error: '笔记路径无效' })
            if (!title?.trim() || !body?.trim()) return json(res, 400, { error: '标题和正文不能为空' })
            const date = new Date().toISOString().slice(0, 10)
            const section = `\n## ${date} · ${title.trim()}\n\n${body.trim()}\n`
            appendFileSync(abs, section, 'utf8')
            return json(res, 200, { ok: true })
          }

          // 上传截图（base64），返回站内图片地址
          if (url.pathname === '/__notes/upload' && req.method === 'POST') {
            const { dataBase64, ext } = JSON.parse(await readBody(req))
            const safeExt = (ext || 'png').toLowerCase()
            if (!['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(safeExt)) {
              return json(res, 400, { error: '不支持的图片格式' })
            }
            if (!dataBase64) return json(res, 400, { error: '图片数据为空' })
            mkdirSync(notesImageDir, { recursive: true })
            const filename = `note-${Date.now()}.${safeExt}`
            writeFileSync(resolve(notesImageDir, filename), Buffer.from(dataBase64, 'base64'))
            return json(res, 200, { url: `/assets/notes/${filename}` })
          }

          // 读取素材清单的条目（序号 / 名称 / 状态）
          if (url.pathname === '/__notes/materials' && req.method === 'GET') {
            const abs = safeNotePath(url.searchParams.get('path') || '')
            if (!abs || !existsSync(abs)) return json(res, 404, { error: '文件不存在' })
            const items = readFileSync(abs, 'utf8')
              .split(/\r?\n/)
              .map((line) => {
                const m = line.match(/^\|\s*(\d+)\s*\|/)
                if (!m) return null
                const cells = line.split('|')
                return {
                  no: Number(m[1]),
                  name: cells[2]?.trim() || '',
                  status: cells[cells.length - 3]?.trim() || '',
                }
              })
              .filter((x): x is { no: number; name: string; status: string } => x !== null)
            return json(res, 200, { items })
          }

          // 更新某条素材的状态
          if (url.pathname === '/__notes/materials/status' && req.method === 'POST') {
            const { path, no, status } = JSON.parse(await readBody(req))
            const abs = safeNotePath(path || '')
            if (!abs || !existsSync(abs)) return json(res, 400, { error: '文件不存在' })
            if (!['未开始', '学习中', '已学完'].includes(status)) {
              return json(res, 400, { error: '状态值非法' })
            }
            const lines = readFileSync(abs, 'utf8').split(/\r?\n/)
            let changed = false
            const next = lines.map((line) => {
              const m = line.match(/^\|\s*(\d+)\s*\|/)
              if (!m || Number(m[1]) !== Number(no)) return line
              const cells = line.split('|')
              cells[cells.length - 3] = ` ${status} `
              changed = true
              return cells.join('|')
            })
            if (!changed) return json(res, 404, { error: `未找到第 ${no} 条素材` })
            writeFileSync(abs, next.join('\n'), 'utf8')
            return json(res, 200, { ok: true })
          }

          return json(res, 404, { error: '未知接口' })
        } catch (err) {
          return json(res, 500, { error: String(err) })
        }
      })
    },
  }
}
