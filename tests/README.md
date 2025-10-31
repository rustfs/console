# Config Helpers Test Suite

This is a comprehensive test suite for the `config-helpers.ts` module, including unit tests, integration tests, and edge case tests.

## Test Structure

```
tests/
├── setup.ts                                    # Test environment setup
├── utils/
│   ├── config-helpers.test.ts                 # Main unit tests
│   ├── config-helpers.integration.test.ts     # Integration tests and edge cases
│   └── test-helpers.ts                        # Test utilities and Mock functions
└── README.md                                   # This file
```

## Installing Test Dependencies

```bash
# Install test dependencies
pnpm add -D vitest jsdom @vitest/ui c8
```

## Running Tests

### Basic Test Commands

```bash
# Run all tests
pnpm test

# Run tests and generate coverage report
pnpm test:coverage

# Run test UI interface
pnpm test:ui

# Run tests once (CI mode)
pnpm test:run
```

### Targeted Tests

```bash
# Run only config-helpers related tests
pnpm test:config-helpers

# Run only integration tests
pnpm test:integration

# Run specific test file
pnpm exec vitest tests/utils/config-helpers.test.ts

# Run specific test case
pnpm exec vitest -t "getCurrentBrowserConfig"
```

## Test Coverage

### 1. Unit Tests (`config-helpers.test.ts`)

- ✅ **createDefaultConfig**: Default configuration creation
- ✅ **getCurrentBrowserConfig**: Browser configuration retrieval
- ✅ **getStoredHostConfig**: localStorage configuration retrieval
- ✅ **fetchConfigFromServer**: Server configuration retrieval and merging
- ✅ **getConfig**: Smart configuration strategy
- ✅ **saveHostConfig**: Configuration saving
- ✅ **clearStoredHostConfig**: Configuration clearing
- ✅ **validateConfig**: Configuration validation
- ✅ **getConfigSources**: Debug information retrieval
- ✅ **Legacy Functions**: Backward compatibility functions

### 2. Integration Tests (`config-helpers.integration.test.ts`)

- ✅ **Complete Configuration Flow**: Save → Retrieve → Validate → Clear
- ✅ **Configuration Priority**: server > localStorage > browser > default
- ✅ **Edge Cases**: Extreme URLs, special characters, error handling
- ✅ **Concurrent Operations**: Race conditions, concurrent read/write
- ✅ **Cross-browser Compatibility**: Behavior in different environments
- ✅ **Error Recovery**: Network errors, JSON parsing errors, storage exceptions

## Test Utilities (`test-helpers.ts`)

### Mock Utilities

- **BrowserMock**: Mock browser environment and window.location
- **LocalStorageMock**: Mock localStorage behavior and exceptions
- **FetchMock**: Mock various network response scenarios

### Data Generators

- **createTestConfig**: Generate test configuration objects
- **createTestServerResponse**: Generate server response data
- **generateUrlTestCases**: Generate URL test cases
- **generateConfigTestCases**: Generate configuration test cases

### Performance Utilities

- **measureExecutionTime**: Measure function execution time
- **runBatchTest**: Execute tests in batch
- **TestCleaner**: Test environment cleanup

### Assertion Helpers

- **expectValidConfig**: Validate configuration object structure
- **expectValidConfigResult**: Validate ConfigResult structure
- **expectErrorResult**: Validate error results

## Test Scenarios

### Normal Flow Tests

1. **Configuration Creation**: Verify correctness of default configuration generation
2. **Configuration Retrieval**: Test retrieval logic for various configuration sources
3. **Configuration Merging**: Verify merging of server configuration with default configuration
4. **Configuration Saving**: Test configuration persistence functionality
5. **Configuration Validation**: Verify configuration completeness checks

### Exception Handling Tests

1. **Network Exceptions**: Timeouts, connection failures, invalid responses
2. **Storage Exceptions**: localStorage unavailable, quota exceeded
3. **Data Exceptions**: Invalid URLs, corrupted JSON, missing fields
4. **Environment Exceptions**: Non-browser environment, missing APIs

### Edge Case Tests

1. **Extreme Data**: Ultra-long URLs, large configuration objects, special characters
2. **Concurrent Operations**: Simultaneous read/write, race conditions, resource contention
3. **Performance Limits**: Large amounts of data, high-frequency operations, memory pressure

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test Config Helpers
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10.19.0
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:run
      - run: pnpm test:coverage
```

### Coverage Requirements

- **Statement Coverage**: > 95%
- **Branch Coverage**: > 90%
- **Function Coverage**: 100%
- **Line Coverage**: > 95%

## Debugging Tips

### Running Single Tests

```bash
# Using describe or it names
pnpm exec vitest -t "getCurrentBrowserConfig should create config based on current browser location"

# Using file path and line number
pnpm exec vitest tests/utils/config-helpers.test.ts:45
```

### Viewing Detailed Output

```bash
# Show detailed test output
pnpm exec vitest --reporter=verbose

# Show coverage details
pnpm exec vitest --coverage --reporter=verbose
```

### Debug Mode

```bash
# Run in Node.js debug mode
pnpm exec vitest --inspect-brk

# Using VS Code debugger
# Add configuration in .vscode/launch.json
```

## Best Practices

1. **Test Isolation**: Each test should be independent and not depend on other tests' state
2. **Mock Management**: Reset mocks in `beforeEach`, clean up in `afterEach`
3. **Clear Assertions**: Use specific assertions, avoid overly broad checks
4. **Error Testing**: Test both success and failure paths
5. **Code Coverage**: Maintain high coverage (> 95%), focus on testing edge conditions and error paths

## Troubleshooting

### Common Issues

1. **localStorage Unavailable**: Ensure localStorage is properly mocked in test setup
2. **fetch Undefined**: Ensure fetch is mocked in setup.ts
3. **window Object Missing**: Use jsdom environment or properly mock window
4. **Async Test Timeout**: Increase timeout or optimize async logic

### Debugging Steps

1. Check test setup file (`setup.ts`)
2. Verify mock configuration is correct
3. Review test output and error messages
4. Use `console.log` or debugger to check state
5. Run single test to isolate issues

## Contributing Guidelines

### Adding New Tests

1. Determine test type (unit/integration)
2. Choose appropriate test file
3. Use existing test utilities and mocks
4. Follow naming conventions and structure
5. Add necessary documentation comments

### Test Naming Conventions

- Use descriptive English test descriptions
- Format: `should + expected behavior`
- Example: `should fallback to browser config when server config fails`

### Code Coverage

- New features must have corresponding tests
- Maintain high coverage (> 95%)
- Focus on testing edge conditions and error paths
