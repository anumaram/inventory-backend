/**
 * test-email-cron.js
 * Tests the email cron service methods.
 */
const { dispatchMonthlyEmails } = require('../services/email-cron.service');
const mongoose = require('mongoose');
require('../db');

async function test() {
  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve) => mongoose.connection.once('connected', resolve));
  }
  console.log('Testing dispatchMonthlyEmails(true)...');
  const res = await dispatchMonthlyEmails(true);
  console.log('Result:', res);
  process.exit(0);
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

