/**
 * Timeout wrapper utility for preventing hanging operations
 * @param {Promise} promise - The promise to wrap with timeout
 * @param {number} ms - Timeout in milliseconds
 * @param {string} label - Label for error messages
 * @returns {Promise} - Promise that rejects if timeout is exceeded
 */
async function withTimeout(promise, ms, label = 'operation') {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Timeout: ${label} exceeded ${ms}ms`));
    }, ms);
  });
  
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = withTimeout;
