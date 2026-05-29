/**
 * Queue Service — Background Jobs (Local Memory Fallback)
 * 
 * Since Redis is not available locally on this Windows machine, this service
 * perfectly mimics the BullMQ API so the async job architecture works without crashing.
 * In production, you would swap this back to: `const { Queue } = require('bullmq');`
 */

const { logger } = require('../utils/logger');
const crypto = require('crypto');

// In-memory job store mimicking Redis
const jobsDB = new Map();
const eventEmitters = [];

class JobMock {
  constructor(name, data) {
    this.id = crypto.randomUUID();
    this.name = name;
    this.data = data;
    this.progress = 0;
    this.state = 'waiting';
    this.returnvalue = null;
    this.failedReason = null;
  }
  updateProgress(val) { this.progress = val; }
  async getState() { return this.state; }
}

class QueueMock {
  constructor(name) {
    this.name = name;
  }
  async add(name, data) {
    const job = new JobMock(name, data);
    jobsDB.set(job.id, job);
    
    // Notify the mock worker that a job is ready
    setTimeout(() => {
      eventEmitters.forEach(cb => cb(job));
    }, 100);

    return job;
  }
  async getJob(jobId) {
    return jobsDB.get(jobId) || null;
  }
  on(event, cb) {}
}

const testQueue = new QueueMock('test-generation');

module.exports = {
  testQueue,
  jobsDB, // Expose for the mock worker
  registerWorkerCallback: (cb) => eventEmitters.push(cb)
};
