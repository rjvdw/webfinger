import { parseArgs } from 'node:util'
import { URL } from 'node:url'
import fetch from 'node-fetch'

main().catch((err) => {
  process.stderr.write(`${err}\n`)
  process.exit(1)
})

async function main() {
  const [acct, hostname, json] = getArguments()
  const response = await webfinger(acct, hostname)

  if (json) {
    process.stdout.write(JSON.stringify(response))
  } else {
    process.stdout.write(
      response ? format(response) : `User ${acct} not found on ${hostname}\n`
    )
  }
}

function getArguments(): [string, string, boolean] {
  const { positionals, values } = parseArgs({
    options: {
      hostname: {
        type: 'string',
      },
      json: {
        type: 'boolean',
      },
    },
    allowPositionals: true,
  })

  let [acct] = positionals
  let { hostname, json } = values

  if (!acct) {
    throw new Error('Usage: webfinger <acct>')
  }

  // trim leading @
  if (acct[0] === '@') {
    acct = acct.substring(1)
  }

  const idx = acct.lastIndexOf('@')

  if (idx === -1) {
    if (hostname) {
      acct += `@${hostname}`
    } else {
      throw new Error('Missing host in account')
    }
  }

  if (!hostname) {
    hostname = acct.substring(idx + 1)
  }

  return [acct, hostname, Boolean(json)]
}

async function webfinger(acct: string, hostname: string): Promise<JRD | null> {
  const webfingerUrl = new URL('https://' + hostname)
  webfingerUrl.pathname = '.well-known/webfinger'
  webfingerUrl.searchParams.set('resource', `acct:${acct}`)

  const response = await fetch(webfingerUrl)
  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error(
      `Request failed with status: ${response.status} ${response.statusText}`
    )
  }

  return validateWebfingerResponse(await response.json())
}

function validateWebfingerResponse(data: unknown): JRD {
  return data as JRD // TODO
}

function format(response: JRD): string {
  let formatted = `subject: ${response.subject}\n`

  if (response.aliases && response.aliases.length) {
    formatted += '\naliases:\n'
    for (const alias of response.aliases) {
      formatted += `- ${alias}\n`
    }
  }

  if (response.properties && Object.keys(response.properties).length) {
    formatted += `\nproperties:\n${formatObj(response.properties)}`
  }

  if (response.links && response.links.length) {
    formatted += '\nlinks:\n'
    for (const link of response.links) {
      formatted += `- rel: ${link.rel}\n`
      if (link.href) formatted += `  href: ${link.href}\n`
      if (link.type) formatted += `  type: ${link.type}\n`
      if (link.titles) formatted += `  titles:\n${formatObj(link.titles, 1)}`
      if (link.properties)
        formatted += `  properties:\n${formatObj(link.properties, 1)}`
    }
  }

  return formatted
}

function formatObj(records: Record<string, string>, indent = 0): string {
  const indentation = Array(indent + 1)
    .fill('')
    .join('  ')
  let formatted = ''

  for (const [key, value] of sortedEntries(records)) {
    formatted += `${indentation}- ${key}: ${value}\n`
  }

  return formatted
}

function sortedEntries(records: Record<string, string>): [string, string][] {
  return Object.keys(records)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => [key, records[key]])
}

/**
 * JSON Resource Descriptor (JRD), as specified in RFC 6415.
 */
export type JRD = {
  /**
   * URI identifying the entity described by this JRD.
   */
  subject: string

  /**
   * List of URI strings that identify the same entity as the `subject` URI.
   */
  aliases?: string[]

  /**
   * Additional information about the subject in the form of name/value pairs.
   *
   * The names (aka "property identifiers") are URIs.
   * The values are strings or null.
   */
  properties?: Record<string, string>

  /**
   * Links relating to the subject.
   */
  links?: Link[]
}

/**
 * A link in a JRD.
 */
export type Link = {
  /**
   * The relation type.
   */
  rel: string

  /**
   * The target URI.
   */
  href?: string

  /**
   * The media type of the target resource.
   */
  type?: string

  /**
   * Human-readable texts describing the link relation in the form of name/value pairs.
   *
   * The names are either language tags or undefined (`"und"`).
   * The values contain text in the specified language.
   */
  titles?: Record<string, string>

  /**
   * Additional information about the link in the form of name/value pairs.
   *
   * The names (aka "property identifiers") are URIs.
   * The values are strings or null.
   */
  properties: Record<string, string>
}
