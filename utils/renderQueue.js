const PQueue = require('p-queue');

// Create a render queue with concurrency limit of 1
// This prevents multiple Puppeteer instances from competing for memory
const renderQueue = new PQueue({ 
  concurrency: 1,
  timeout: 60000, // 60 second timeout per job
  throwOnTimeout: true
});

/**
 * Queue a print generation task to prevent memory conflicts
 * @param {Function} task - The print generation task to execute
 * @returns {Promise} - Promise that resolves when the task completes
 */
async function queuePrint(task) {
  return await renderQueue.add(task);
}

module.exports = { queuePrint };
