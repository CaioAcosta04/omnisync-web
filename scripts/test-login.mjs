const API_BASE_URL = (process.env.API_BASE_URL || 'https://omnisync.site').replace(/\/$/, '')
const TEST_EMAIL = process.env.TEST_EMAIL || 'cicdlogin@teste.com'
const TEST_PASSWORD = process.env.TEST_PASSWORD || '123456'

const LOGIN_ENDPOINT = `${API_BASE_URL}/api/auth/login`

const green = (t) => `\x1b[32m${t}\x1b[0m`
const red = (t) => `\x1b[31m${t}\x1b[0m`
const cyan = (t) => `\x1b[36m${t}\x1b[0m`
const dim = (t) => `\x1b[2m${t}\x1b[0m`

function separator() {
  console.log(dim('─'.repeat(55)))
}

async function main() {

  const startTime = Date.now()

  try {
    const res = await fetch(LOGIN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    })

    const elapsed = Date.now() - startTime
    const body = await res.text()

    let parsed = null
    try {
      parsed = JSON.parse(body)
    } catch {}

    console.log(`Status: ${res.status} ${res.statusText}`)
    console.log(`Tempo: ${elapsed}ms`)

    if (parsed) {
      console.log(`   Resposta :`)
      const safeBody = JSON.stringify(parsed, (key, value) => {
        if (typeof value === 'string' && value.length > 60 && /token|jwt|key|secret/i.test(key)) {
          return value.slice(0, 15) + '...[REDACTED]'
        }
        return value
      }, 2)
      console.log(dim(safeBody.split('\n').map(l => `     ${l}`).join('\n')))
    } else if (body) {
      console.log(`Resposta: ${dim(body.slice(0, 200))}`)
    }

    console.log()

    if (res.ok) {
      separator()
      console.log(green('Login realizado com sucesso!'))
      separator()
      console.log()
      process.exit(0)
    } else {
      separator()
      console.log(red(`Login falhou — HTTP ${res.status}`))
      separator()
      console.log()
      process.exit(1)
    }
  } catch (err) {
    const elapsed = Date.now() - startTime
    console.log()
    console.log(`Tempo: ${elapsed}ms`)
    separator()
    console.log(red(`Erro de conexão: ${err.message}`))
    separator()
    console.log()
    process.exit(1)
  }
}

main()
