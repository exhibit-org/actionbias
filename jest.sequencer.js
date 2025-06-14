const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
  sort(tests) {
    // Run database tests first and sequentially
    const dbTests = tests.filter(test => test.path.includes('/__tests__/db/'));
    const otherTests = tests.filter(test => !test.path.includes('/__tests__/db/'));
    
    // Sort database tests by filename to ensure consistent order
    dbTests.sort((a, b) => a.path.localeCompare(b.path));
    
    // Sort other tests by filename
    otherTests.sort((a, b) => a.path.localeCompare(b.path));
    
    return [...dbTests, ...otherTests];
  }
}

module.exports = CustomSequencer;