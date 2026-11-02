// 线上（GitHub Pages）直写 GitHub 仓库：用户在网页里保存的笔记/进度会直接提交到仓库，
// 触发 GitHub Actions 自动重新构建发布，无需本地环境。
// 需要用户在本机浏览器一次性填入一个 Fine-grained PAT（仅本仓库 Contents: Read and write）。

const TOKEN_KEY = 'zhixu_github_token'
const REPO = 'ellenhuang110-wq/zhixu-learning'
const BRANCH = 'main'

export function isOnline(): boolean {
  return import.meta.env.PROD
}

export function getToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token.trim())
}

function b64encode(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin)
}

function b64decode(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ''))
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

async function ghFetch(path: string, init?: RequestInit): Promise<any> {
  const token = getToken()
  if (!token) throw new Error('尚未配置 GitHub 令牌（上方「连接 GitHub」里填写一次即可）')
  const url = `https://api.github.com/repos/${REPO}/contents/${path.split('/').map(encodeURIComponent).join('/')}`
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
  })
  if (res.status === 404) return null
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `GitHub API ${res.status}`)
  return data
}

async function readRepoFile(relPath: string): Promise<{ text: string; sha: string } | null> {
  const data = await ghFetch(`${relPath}?ref=${BRANCH}`)
  if (!data) return null
  return { text: b64decode(data.content || ''), sha: data.sha }
}

async function writeRepoFile(relPath: string, text: string, sha?: string) {
  return ghFetch(relPath, {
    method: 'PUT',
    body: JSON.stringify({
      message: `update: ${relPath} (web)`,
      content: b64encode(text),
      branch: BRANCH,
      ...(sha ? { sha } : {}),
    }),
  })
}

// ---------- 对外的三个动作（与本地 /__notes 接口语义一致） ----------

// 追加一篇笔记到主题笔记文件末尾
export async function onlineAppendNote(relPath: string, title: string, body: string): Promise<void> {
  const repoPath = `docs/${relPath}`
  const file = await readRepoFile(repoPath)
  const date = new Date().toISOString().slice(0, 10)
  const base = file ? file.text.trimEnd() : `# 学习笔记\n`
  const next = `${base}\n\n## ${date} · ${title}\n\n${body}\n`
  await writeRepoFile(repoPath, next, file?.sha)
}

// 读取素材清单的条目（序号 / 名称 / 状态）
export async function onlineReadMaterials(relPath: string): Promise<{ no: number; name: string; status: string }[]> {
  const file = await readRepoFile(`docs/${relPath}`)
  if (!file) return []
  return file.text
    .split(/\r?\n/)
    .map((line) => {
      const m = line.match(/^\|\s*(\d+)\s*\|/)
      if (!m) return null
      const cells = line.split('|')
      return { no: Number(m[1]), name: cells[2]?.trim() || '', status: cells[cells.length - 3]?.trim() || '' }
    })
    .filter((x): x is { no: number; name: string; status: string } => x !== null)
}

// 改写素材清单里某一条的状态格
export async function onlineSetStatus(relPath: string, no: number, status: string): Promise<void> {
  const repoPath = `docs/${relPath}`
  const file = await readRepoFile(repoPath)
  if (!file) throw new Error('素材清单文件不存在')
  const lines = file.text.split(/\r?\n/)
  let changed = false
  const next = lines.map((line) => {
    const m = line.match(/^\|\s*(\d+)\s*\|/)
    if (!m || Number(m[1]) !== Number(no)) return line
    const cells = line.split('|')
    cells[cells.length - 3] = ` ${status} `
    changed = true
    return cells.join('|')
  })
  if (!changed) throw new Error(`未找到第 ${no} 条素材`)
  await writeRepoFile(repoPath, next.join('\n'), file.sha)
}

// 上传截图到 docs/public/assets/notes/
export async function onlineUploadImage(dataUrl: string): Promise<string> {
  const comma = dataUrl.indexOf(',')
  const base64 = dataUrl.slice(comma + 1)
  const filename = `note-${Date.now()}.png`
  const res = await ghFetch(`docs/public/assets/notes/${filename}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `upload: ${filename}`,
      content: base64,
      branch: BRANCH,
    }),
  })
  if (!res) throw new Error('图片上传失败')
  return `/assets/notes/${filename}`
}
