import { describe, expect, it } from 'vitest'
import { ConfigLoadError, handleConfigError, parseApiError } from '../../utils/error-handler'

describe('ConfigLoadError', () => {
  it('should create error with correct properties', () => {
    const error = new ConfigLoadError('Test message', 'INVALID_URL')

    expect(error.message).toBe('Test message')
    expect(error.code).toBe('INVALID_URL')
    expect(error.name).toBe('ConfigLoadError')
  })

  it('should default to UNKNOWN_ERROR code', () => {
    const error = new ConfigLoadError('Test message')
    expect(error.code).toBe('UNKNOWN_ERROR')
  })

  it('should store original error', () => {
    const originalError = new Error('Original error')
    const error = new ConfigLoadError('Test message', 'NETWORK_ERROR', originalError)

    expect(error.originalError).toBe(originalError)
  })

  it('should support all error codes', () => {
    const codes: Array<ConfigLoadError['code']> = [
      'INVALID_URL',
      'STORAGE_ERROR',
      'NETWORK_ERROR',
      'UNKNOWN_ERROR'
    ]

    codes.forEach(code => {
      const error = new ConfigLoadError('Test', code)
      expect(error.code).toBe(code)
    })
  })
})

describe('parseApiError', () => {
  it('should parse JSON error response', async () => {
    const response = new Response(
      JSON.stringify({ message: 'API Error' }),
      { status: 400, statusText: 'Bad Request' }
    )

    const result = await parseApiError(response)
    expect(result).toBe('API Error')
  })

  it('should stringify JSON when no message property exists', async () => {
    const errorData = { error: 'Something went wrong', code: 500 }
    const response = new Response(
      JSON.stringify(errorData),
      { status: 500 }
    )

    const result = await parseApiError(response)
    expect(result).toBe(JSON.stringify(errorData))
  })

  it('should parse XML error with Message tag', async () => {
    const xmlError = '<Error><Message>XML Error Message</Message></Error>'
    const response = new Response(xmlError, { status: 400 })

    const result = await parseApiError(response)
    expect(result).toBe('XML Error Message')
  })

  it('should parse XML error with Error tag', async () => {
    const xmlError = '<Response><Error>XML Error Content</Error></Response>'
    const response = new Response(xmlError, { status: 400 })

    const result = await parseApiError(response)
    expect(result).toBe('XML Error Content')
  })

  it('should return plain text when not JSON or XML', async () => {
    const response = new Response('Plain text error', { status: 400 })

    const result = await parseApiError(response)
    expect(result).toBe('Plain text error')
  })

  it('should return statusText when response body cannot be parsed', async () => {
    const response = new Response(null, {
      status: 500,
      statusText: 'Internal Server Error'
    })

    const result = await parseApiError(response)
    expect(result).toBe('Internal Server Error')
  })

  it('should handle empty response body', async () => {
    const response = new Response('', {
      status: 404,
      statusText: 'Not Found'
    })

    const result = await parseApiError(response)
    expect(result).toBe('Not Found')
  })

  it('should extract message from nested XML structure', async () => {
    const xmlError = `
      <?xml version="1.0"?>
      <Error>
        <Code>NoSuchBucket</Code>
        <Message>The specified bucket does not exist</Message>
      </Error>
    `
    const response = new Response(xmlError, { status: 404 })

    const result = await parseApiError(response)
    expect(result).toBe('The specified bucket does not exist')
  })
})

describe('handleConfigError', () => {
  it('should return ConfigLoadError as-is', () => {
    const originalError = new ConfigLoadError('Original', 'INVALID_URL')
    const result = handleConfigError(originalError, 'test context')

    expect(result).toBe(originalError)
  })

  it('should detect invalid URL errors', () => {
    const error = new Error('Invalid URL: http://')
    const result = handleConfigError(error, 'config loading')

    expect(result).toBeInstanceOf(ConfigLoadError)
    expect(result.code).toBe('INVALID_URL')
    expect(result.message).toContain('Invalid URL')
    expect(result.message).toContain('config loading')
    expect(result.originalError).toBe(error)
  })

  it('should detect storage errors', () => {
    const error = new Error('localStorage is not available')
    const result = handleConfigError(error, 'save config')

    expect(result).toBeInstanceOf(ConfigLoadError)
    expect(result.code).toBe('STORAGE_ERROR')
    expect(result.message).toContain('Storage error')
    expect(result.message).toContain('save config')
  })

  it('should detect network errors', () => {
    const error = new Error('fetch failed due to network')
    const result = handleConfigError(error, 'fetch config')

    expect(result).toBeInstanceOf(ConfigLoadError)
    expect(result.code).toBe('NETWORK_ERROR')
    expect(result.message).toContain('Network error')
    expect(result.message).toContain('fetch config')
  })

  it('should handle unknown errors', () => {
    const error = new Error('Some random error')
    const result = handleConfigError(error, 'process')

    expect(result).toBeInstanceOf(ConfigLoadError)
    expect(result.code).toBe('UNKNOWN_ERROR')
    expect(result.message).toContain('Unknown error')
    expect(result.message).toContain('process')
  })

  it('should handle non-Error objects', () => {
    const error = 'String error message'
    const result = handleConfigError(error, 'operation')

    expect(result).toBeInstanceOf(ConfigLoadError)
    expect(result.code).toBe('UNKNOWN_ERROR')
    expect(result.message).toContain('String error message')
  })

  it('should handle null/undefined errors', () => {
    const result1 = handleConfigError(null, 'null test')
    const result2 = handleConfigError(undefined, 'undefined test')

    expect(result1).toBeInstanceOf(ConfigLoadError)
    expect(result1.code).toBe('UNKNOWN_ERROR')
    expect(result2).toBeInstanceOf(ConfigLoadError)
    expect(result2.code).toBe('UNKNOWN_ERROR')
  })

  it('should preserve context in error message', () => {
    const error = new Error('Test error')
    const context = 'loading user configuration'
    const result = handleConfigError(error, context)

    expect(result.message).toContain(context)
  })

  it('should detect storage error with "storage" keyword', () => {
    const error = new Error('Failed to access storage')
    const result = handleConfigError(error, 'test')

    expect(result.code).toBe('STORAGE_ERROR')
  })
})
