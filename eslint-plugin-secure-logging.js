/**
 * Custom ESLint plugin for secure logging enforcement
 *
 * This plugin provides rules to prevent sensitive data exposure in logs
 */

module.exports = {
  rules: {
    'no-sensitive-data-logging': {
      meta: {
        type: 'security',
        docs: {
          description: 'Prevent logging of potentially sensitive data',
          category: 'Security',
          recommended: true
        },
        fixable: 'code',
        schema: []
      },
      create(context) {
        const sensitivePatterns = [
          // Variable names that likely contain sensitive data
          /password|secret|token|key|auth|jwt|session|cookie/i,
          // Email patterns
          /email|mail|user.*email/i,
          // Financial data
          /payment|card|stripe|billing|amount|price/i,
          // API keys and credentials
          /api.*key|credential|private.*key|client.*secret/i
        ]

        const sensitiveStringPatterns = [
          // JWT tokens
          /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/,
          // API key patterns
          /[sS][kK]_[a-zA-Z0-9]{20,}/,
          // Long hash-like strings
          /[a-f0-9]{32,}/,
          // Bearer tokens
          /Bearer\s+[A-Za-z0-9-._~+/]+=*/
        ]

        function isSensitiveIdentifier(name) {
          return sensitivePatterns.some(pattern => pattern.test(name))
        }

        function hasSensitiveString(value) {
          return sensitiveStringPatterns.some(pattern => pattern.test(value))
        }

        function checkForSensitiveLogging(node) {
          // Check if using secure logger
          const callee = node.callee
          if (callee.type === 'MemberExpression') {
            const objectName = callee.object.name
            const propertyName = callee.property.name

            // Allow secure logger methods
            if (['logger', 'apiLogger', 'authLogger', 'dbLogger', 'integrationLogger'].includes(objectName) &&
                ['info', 'warn', 'error', 'debug'].includes(propertyName)) {
              return // This is using secure logging, allow it
            }

            // Flag console methods
            if (objectName === 'console') {
              context.report({
                node,
                message: `Use secure logger instead of console.${propertyName}() to prevent sensitive data exposure`,
                fix(fixer) {
                  const loggerMap = {
                    'log': 'logger.info',
                    'info': 'logger.info',
                    'warn': 'logger.warn',
                    'error': 'logger.error',
                    'debug': 'logger.debug'
                  }
                  const replacement = loggerMap[propertyName] || 'logger.info'
                  return fixer.replaceText(callee, replacement)
                }
              })
              return
            }
          }

          // Check arguments for sensitive data patterns
          node.arguments.forEach((arg, index) => {
            if (arg.type === 'Identifier' && isSensitiveIdentifier(arg.name)) {
              context.report({
                node: arg,
                message: `Potential sensitive data logging: variable "${arg.name}" may contain sensitive information. Use secure logger with redaction.`
              })
            }

            if (arg.type === 'Literal' && typeof arg.value === 'string' && hasSensitiveString(arg.value)) {
              context.report({
                node: arg,
                message: 'Potential sensitive data in log string. Use secure logger with automatic redaction.'
              })
            }

            // Check object properties for sensitive keys
            if (arg.type === 'ObjectExpression') {
              arg.properties.forEach(prop => {
                if (prop.key && prop.key.name && isSensitiveIdentifier(prop.key.name)) {
                  context.report({
                    node: prop,
                    message: `Logging object with sensitive property "${prop.key.name}". Use secure logger to automatically redact sensitive fields.`
                  })
                }
              })
            }

            // Check template literals for sensitive patterns
            if (arg.type === 'TemplateLiteral') {
              arg.quasis.forEach(quasi => {
                if (hasSensitiveString(quasi.value.raw)) {
                  context.report({
                    node: quasi,
                    message: 'Template literal may contain sensitive data. Use secure logger with redaction.'
                  })
                }
              })
            }
          })
        }

        return {
          CallExpression(node) {
            checkForSensitiveLogging(node)
          }
        }
      }
    },

    'require-structured-logging': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Require structured logging format',
          category: 'Best Practices',
          recommended: true
        },
        schema: []
      },
      create(context) {
        return {
          CallExpression(node) {
            const callee = node.callee
            if (callee.type === 'MemberExpression' &&
                ['logger', 'apiLogger', 'authLogger', 'dbLogger', 'integrationLogger'].includes(callee.object.name) &&
                ['info', 'warn', 'error', 'debug'].includes(callee.property.name)) {

              // Check if first argument is a string (message)
              if (node.arguments.length === 0) {
                context.report({
                  node,
                  message: 'Logger calls should include a descriptive message as the first argument'
                })
              } else if (node.arguments[0].type !== 'Literal' && node.arguments[0].type !== 'TemplateLiteral') {
                context.report({
                  node: node.arguments[0],
                  message: 'First argument to logger should be a descriptive string message'
                })
              }

              // For error logging, suggest including error object as second parameter
              if (callee.property.name === 'error' && node.arguments.length < 2) {
                context.report({
                  node,
                  message: 'Error logging should include error object as second parameter: logger.error("message", error, context?)'
                })
              }
            }
          }
        }
      }
    }
  }
}