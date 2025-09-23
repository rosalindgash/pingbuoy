/**
 * apply_security_patch.js
 * 
 * Usage:
 *   node apply_security_patch.js
 * 
 * Run from your repo root. Creates .bak files before editing.
 * Idempotent: running multiple times will not duplicate changes.
 */

const fs = require('fs');
const path = require('path');

function backup(file) {
  if (!fs.existsSync(file)) return false;
  const bak = file + '.bak';
  if (!fs.existsSync(bak)) {
    fs.copyFileSync(file, bak);
  }
  return true;
}

function read(file) {
  // Prevent path traversal attacks by ensuring file is within current directory
  const resolvedPath = path.resolve(file);
  const basePath = path.resolve(process.cwd());

  if (!resolvedPath.startsWith(basePath + path.sep) && resolvedPath !== basePath) {
    throw new Error(`Access denied: File path '${file}' is outside the allowed directory`);
  }

  return fs.existsSync(resolvedPath) ? fs.readFileSync(resolvedPath, 'utf8') : null;
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function ensureEnvAllowedOrigins() {
  const file = '.env.example';
  let c = read(file);
  if (c == null) return { file, changed: false, note: 'not found' };
  if (!c.includes('ALLOWED_ORIGINS=')) {
    backup(file);
    c += '\n# CORS: comma-separated list; required in production\nALLOWED_ORIGINS=https://pingbuoy.com,https://www.pingbuoy.com,https://your-staging.vercel.app\n';
    write(file, c);
    return { file, changed: true };
  }
  return { file, changed: false };
}

function patchCorsConfig() {
  const file = 'supabase/functions/_shared/cors-config.ts';
  let c = read(file);
  if (c == null) return { file, changed: false, note: 'not found' };
  if (c.includes('ENV_ALLOWED')) return { file, changed: false, note: 'already patched' };

  backup(file);
  c = c.replace(
`export const corsOptions = {
  allowHeaders: ["authorization", "content-type"],
  allowMethods: ["GET", "POST", "OPTIONS"],
  // TODO: tighten this before prod
  allowOrigins: ["*"],
  exposeHeaders: ["content-length"],
  maxAge: 86400,
};`,
`const ENV_ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const corsOptions = {
  allowHeaders: ["authorization", "content-type"],
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowOrigins: ENV_ALLOWED.length > 0
    ? ENV_ALLOWED
    : (Deno.env.get("NODE_ENV") === "production" ? [] : ["*"]),
  exposeHeaders: ["content-length"],
  maxAge: 86400,
};`
  );
  write(file, c);
  return { file, changed: true };
}

function patchNextConfig() {
  const file = 'next.config.ts';
  let c = read(file);
  if (c == null) return { file, changed: false, note: 'not found' };
  if (c.includes('Content-Security-Policy') && c.includes('headers()')) {
    return { file, changed: false, note: 'CSP/headers likely present' };
  }

  backup(file);
  // Try to inject SECURITY_HEADERS and headers() block before module export.
  const securityBlock = `
const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' vercel-insights.com js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.supabase.co https://*.upstash.io https://api.stripe.com",
      "frame-src https://js.stripe.com",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  }
];
`;

  const headersBlock = `
async headers() {
  return [
    {
      source: '/:path*',
      headers: SECURITY_HEADERS,
    },
  ];
},`;

  // Insert securityBlock at top if missing
  if (!c.includes('const SECURITY_HEADERS')) {
    c = securityBlock + '\n' + c;
  }

  // Insert headers() into nextConfig object
  c = c.replace(
    /const\s+nextConfig\s*=\s*{([\s\S]*?)}/m,
    (match, inner) => {
      if (inner.includes('headers()')) return match; // already has headers
      return `const nextConfig = {${inner}\n  ${headersBlock}\n}`;
    }
  );

  write(file, c);
  return { file, changed: true };
}

function patchValidation() {
  const file = 'src/lib/validation.ts';
  let c = read(file);
  if (c == null) return { file, changed: false, note: 'not found' };
  if (c.includes('.max(5000)')) return { file, changed: false, note: 'already patched' };

  backup(file);
  c = c.replace(
    /export const contactSchema = z\.object\(\{[\s\S]*?\}\);/m,
    `export const contactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(254),
  subject: z.string().min(1).max(150),
  message: z.string().min(1).max(5000),
});`
  );
  write(file, c);
  return { file, changed: true };
}

function patchContactTLS() {
  const file = 'src/app/api/contact/route.ts';
  let c = read(file);
  if (c == null) return { file, changed: false, note: 'not found' };
  if (c.includes('NODE_ENV') && c.includes('rejectUnauthorized')) {
    return { file, changed: false, note: 'already patched' };
  }

  backup(file);
  // Remove explicit rejectUnauthorized:false if present
  c = c.replace(/tls:\s*\{\s*[^}]*rejectUnauthorized:\s*false[^}]*\},?/m, '');

  // Add env-guarded TLS
  c = c.replace(
    /createTransport\(\{\s*([\s\S]*?)\}\)/m,
    (match, inner) => {
      if (inner.includes('tls:')) return match; // already has tls
      const injected = `createTransport({ ${inner},
    ...(process.env.NODE_ENV === "production" ? {} : { tls: { rejectUnauthorized: false } })
  })`;
      return injected;
    }
  );

  write(file, c);
  return { file, changed: true };
}

function patchUptimeSSRF() {
  const file = 'supabase/functions/uptime-monitor/index.ts';
  let c = read(file);
  if (c == null) return { file, changed: false, note: 'not found' };
  if (c.includes('assertPublicDns(')) return { file, changed: false, note: 'already patched' };

  backup(file);
  const helpers = `
async function isPrivateOrReservedIp(ip) {
  const toInt = (ip) => ip.split('.').reduce((a, o) => (a << 8) + (+o), 0) >>> 0;
  try {
    if (ip.includes(':')) return true; // treat IPv6 as restricted unless explicitly allowed
    const x = toInt(ip);
    const ranges = [
      [toInt('10.0.0.0'), toInt('10.255.255.255')],
      [toInt('172.16.0.0'), toInt('172.31.255.255')],
      [toInt('192.168.0.0'), toInt('192.168.255.255')],
      [toInt('127.0.0.0'), toInt('127.255.255.255')],
    ];
    return ranges.some(([a, b]) => x >= a && x <= b);
  } catch {
    return true;
  }
}

async function assertPublicDns(hostname) {
  try {
    const A = await Deno.resolveDns(hostname, "A");
    const AAAA = await Deno.resolveDns(hostname, "AAAA").catch(() => []);
    const ips = [...A, ...AAAA];
    if (ips.length === 0) throw new Error("No DNS A/AAAA records");
    for (const ip of ips) {
      if (await isPrivateOrReservedIp(ip)) {
        throw new Error(\`Hostname resolves to private/reserved IP: \${ip}\`);
      }
    }
  } catch (e) {
    throw new Error(\`DNS validation failed for \${hostname}: \${e.message || e}\`);
  }
}
`;

  if (!c.includes('async function safeFetch(')) {
    // append helpers safely
    c += `\n${helpers}\n`;
  } else {
    // inject helpers before safeFetch
    c = c.replace(/async function safeFetch\(/, `${helpers}\nasync function safeFetch(`);
  }

  // Inject hostname check inside safeFetch loop
  c = c.replace(
    /for\s*\(let i = 0; i <= max; i\+\+\)\s*\{\s*([\s\S]*?)const res = await fetch/,
    (match, beforeFetch) => {
      const injection = `
    const parsed = new URL(current);
    await assertPublicDns(parsed.hostname);
    `;
      return match.replace(beforeFetch, `${injection}\n${beforeFetch}`);
    }
  );

  write(file, c);
  return { file, changed: true };
}

const results = [
  ensureEnvAllowedOrigins(),
  patchCorsConfig(),
  patchNextConfig(),
  patchValidation(),
  patchContactTLS(),
  patchUptimeSSRF(),
];

console.table(results.map(r => ({ file: r.file, changed: !!r.changed, note: r.note || '' })));
console.log('\n✅ Security patch applied (where files were found). Review git diff and run your app.\n');