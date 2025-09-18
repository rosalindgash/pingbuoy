#!/usr/bin/env node

/**
 * Migration script to replace unsafe console logging with secure logging
 *
 * This script:
 * 1. Finds all console.* calls in TypeScript/JavaScript files
 * 2. Replaces them with secure logger equivalents
 * 3. Adds necessary imports
 * 4. Creates backup files
 */

const fs = require('fs').promises
const path = require('path')
const { glob } = require('glob')

// Configuration
const SRC_DIR = 'src'
const EXTENSIONS = ['ts', 'tsx', 'js', 'jsx']
const BACKUP_SUFFIX = '.backup-pre-secure-logging'

// Logger mappings based on file type
const LOGGER_MAPPINGS = {
  'api/': 'apiLogger',
  'auth/': 'authLogger',
  'components/auth/': 'authLogger',
  'lib/': 'logger',
  'default': 'logger'
}

// Import statements to add
const IMPORT_STATEMENTS = {
  'apiLogger': "import { apiLogger } from '@/lib/secure-logger'",
  'authLogger': "import { authLogger } from '@/lib/secure-logger'",
  'logger': "import { logger } from '@/lib/secure-logger'"
}

async function getLoggerForFile(filePath) {
  for (const [pathPattern, loggerName] of Object.entries(LOGGER_MAPPINGS)) {
    if (pathPattern !== 'default' && filePath.includes(pathPattern)) {
      return loggerName
    }
  }
  return LOGGER_MAPPINGS.default
}

async function addImportIfNeeded(content, logger) {
  const importStatement = IMPORT_STATEMENTS[logger]

  // Check if import already exists
  if (content.includes(importStatement)) {
    return content
  }

  // Find the last import statement
  const lines = content.split('\n')
  let lastImportIndex = -1

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^import\s+.*from\s+['"].*['"]$/)) {
      lastImportIndex = i
    }
  }

  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, importStatement)
  } else {
    // No imports found, add at the top after any 'use client' or comments
    let insertIndex = 0
    while (insertIndex < lines.length &&
           (lines[insertIndex].startsWith("'use") ||
            lines[insertIndex].startsWith('//') ||
            lines[insertIndex].trim() === '')) {
      insertIndex++
    }
    lines.splice(insertIndex, 0, importStatement, '')
  }

  return lines.join('\n')
}

function transformConsoleCall(match, method, args, logger) {
  // Parse the console call
  const fullMatch = match[0]
  const consoleMethod = match[1] // log, error, warn, info, debug
  const restOfCall = match[2]   // everything after console.method

  // Map console methods to secure logger methods
  const methodMap = {
    'log': 'info',
    'error': 'error',
    'warn': 'warn',
    'info': 'info',
    'debug': 'debug'
  }

  const secureMethod = methodMap[consoleMethod] || 'info'

  // Try to parse the arguments
  try {
    // Handle common patterns

    // Pattern: console.error('message:', error)
    const messageErrorPattern = /^\(['"]([^'"]*?)['"],\s*([^)]+)\)$/
    const messageErrorMatch = restOfCall.match(messageErrorPattern)
    if (messageErrorMatch) {
      const message = messageErrorMatch[1]
      const errorVar = messageErrorMatch[2].trim()
      return `${logger}.${secureMethod}('${message}', ${errorVar})`
    }

    // Pattern: console.error('message', { object })
    const messageObjectPattern = /^\(['"]([^'"]*?)['"],\s*(\{[\s\S]*?\})\)$/
    const messageObjectMatch = restOfCall.match(messageObjectPattern)
    if (messageObjectMatch) {
      const message = messageObjectMatch[1]
      const contextObject = messageObjectMatch[2]
      return `${logger}.${secureMethod}('${message}', null, ${contextObject})`
    }

    // Pattern: console.error(`[${id}] message`)
    const templatePattern = /^\(`\[.*?\]\s*([^`]*?)`\)$/
    const templateMatch = restOfCall.match(templatePattern)
    if (templateMatch) {
      const message = templateMatch[1]
      return `${logger}.${secureMethod}('${message}', null, { requestId })`
    }

    // Pattern: console.log('simple message')
    const simplePattern = /^\(['"]([^'"]*?)['"][\s,]*\)$/
    const simpleMatch = restOfCall.match(simplePattern)
    if (simpleMatch) {
      const message = simpleMatch[1]
      return `${logger}.${secureMethod}('${message}')`
    }

    // Fallback: try to preserve the structure but use secure logger
    return `${logger}.${secureMethod}('Operation logged'${restOfCall.includes(',') ? ', null' : ''}${restOfCall.slice(1)}`

  } catch (parseError) {
    // If we can't parse it cleanly, make a safe replacement
    return `${logger}.${secureMethod}('Operation logged') // TODO: Review this migration`
  }
}

async function migrateFile(filePath) {
  try {
    console.log(`🔄 Processing: ${filePath}`)

    // Read file content
    const content = await fs.readFile(filePath, 'utf-8')
    const originalContent = content

    // Skip if no console calls found
    if (!content.match(/console\.(log|error|warn|info|debug)/)) {
      console.log(`  ✅ No console calls found, skipping`)
      return { processed: false }
    }

    // Determine which logger to use
    const logger = await getLoggerForFile(filePath)

    // Create backup
    const backupPath = filePath + BACKUP_SUFFIX
    await fs.writeFile(backupPath, content)
    console.log(`  💾 Created backup: ${backupPath}`)

    // Add import if needed
    let newContent = await addImportIfNeeded(content, logger)

    // Replace console calls - comprehensive pattern to match multiline calls
    const consolePattern = /console\.(log|error|warn|info|debug)(\([^)]*\))/g

    let replacements = 0
    newContent = newContent.replace(consolePattern, (match, method, args) => {
      replacements++
      const transformed = transformConsoleCall([match, method, args], method, args, logger)
      console.log(`    🔄 Replaced: console.${method}(...) → ${transformed}`)
      return transformed
    })

    // Handle multiline console calls (more complex pattern)
    const multilinePattern = /console\.(log|error|warn|info|debug)\(\s*[\s\S]*?\n[\s\S]*?\)/g
    newContent = newContent.replace(multilinePattern, (match, method) => {
      replacements++
      // For multiline calls, use a safe generic replacement
      const safeReplacement = `${logger}.${method === 'log' ? 'info' : method}('Operation logged') // TODO: Review this multiline migration`
      console.log(`    🔄 Replaced multiline: console.${method}(...) → ${safeReplacement}`)
      return safeReplacement
    })

    if (replacements > 0) {
      // Write the updated file
      await fs.writeFile(filePath, newContent)
      console.log(`  ✅ Updated with ${replacements} replacements using ${logger}`)
      return { processed: true, replacements, logger }
    } else {
      // Remove backup if no changes made
      await fs.unlink(backupPath)
      console.log(`  ⚠️  No replacements made`)
      return { processed: false }
    }

  } catch (error) {
    console.error(`  ❌ Error processing ${filePath}:`, error.message)
    return { processed: false, error: error.message }
  }
}

async function main() {
  console.log('🚀 Starting secure logging migration...\n')

  // Find all TypeScript and JavaScript files
  const patterns = EXTENSIONS.map(ext => `${SRC_DIR}/**/*.${ext}`)
  const files = await glob(patterns.join(','))

  console.log(`📁 Found ${files.length} files to process\n`)

  const results = {
    processed: 0,
    skipped: 0,
    errors: 0,
    totalReplacements: 0
  }

  // Process each file
  for (const file of files) {
    const result = await migrateFile(file)

    if (result.processed) {
      results.processed++
      results.totalReplacements += result.replacements || 0
    } else if (result.error) {
      results.errors++
    } else {
      results.skipped++
    }
  }

  // Summary
  console.log('\n📊 Migration Summary:')
  console.log(`  ✅ Files processed: ${results.processed}`)
  console.log(`  ⏭️  Files skipped: ${results.skipped}`)
  console.log(`  ❌ Errors: ${results.errors}`)
  console.log(`  🔄 Total replacements: ${results.totalReplacements}`)

  if (results.processed > 0) {
    console.log('\n⚠️  Important Notes:')
    console.log('  • Review all TODO comments in migrated files')
    console.log('  • Test the application thoroughly')
    console.log('  • Backup files created with .backup-pre-secure-logging extension')
    console.log('  • Some complex console calls may need manual review')
  }

  console.log('\n🎉 Migration complete!')
}

// Run the migration
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { migrateFile, transformConsoleCall }