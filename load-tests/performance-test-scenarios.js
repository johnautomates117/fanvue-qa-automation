import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// DEMO: Different test scenarios (using VERY LOW numbers for production safety)
// Uncomment the scenario you want to demonstrate

// 1. LOAD TESTING - Normal expected load
export const options = {
  stages: [
    { duration: '30s', target: 3 },   // Ramp up to 3 users
    { duration: '1m', target: 5 },    // Stay at 5 users (normal load)
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests under 3s
    http_req_failed: ['rate<0.1'],     // Error rate under 10%
    errors: ['rate<0.1'],              // Custom error rate
  },
};

// 2. STRESS TESTING - Find breaking point
// export const options = {
//   stages: [
//     { duration: '30s', target: 5 },    // Warm up
//     { duration: '1m', target: 10 },    // Increase load
//     { duration: '1m', target: 15 },    // Push further
//     { duration: '30s', target: 0 },    // Ramp down
//   ],
//   thresholds: {
//     http_req_duration: ['p(95)<5000'], // Relaxed threshold
//   },
// };

// 3. SPIKE TESTING - Sudden traffic surge
// export const options = {
//   stages: [
//     { duration: '30s', target: 2 },    // Normal load
//     { duration: '10s', target: 10 },   // Sudden spike!
//     { duration: '30s', target: 10 },   // Stay at peak
//     { duration: '10s', target: 2 },    // Quick drop
//     { duration: '30s', target: 0 },    // Ramp down
//   ],
// };

// 4. SOAK TESTING - Extended duration (shortened for demo)
// export const options = {
//   stages: [
//     { duration: '30s', target: 3 },    // Ramp up
//     { duration: '5m', target: 3 },     // Sustained load (normally hours)
//     { duration: '30s', target: 0 },    // Ramp down
//   ],
// };

// 5. SCALABILITY TESTING - Gradual increase
// export const options = {
//   stages: [
//     { duration: '1m', target: 2 },     // Step 1
//     { duration: '1m', target: 4 },     // Step 2
//     { duration: '1m', target: 6 },     // Step 3
//     { duration: '1m', target: 8 },     // Step 4
//     { duration: '30s', target: 0 },    // Ramp down
//   ],
// };

const BASE_URL = 'https://www.fanvue.com';

export default function () {
  // Test scenario: User browsing the site
  const responses = {};
  
  // 1. Homepage visit
  responses.homepage = http.get(BASE_URL, {
    tags: { name: 'Homepage' },
  });
  
  check(responses.homepage, {
    'Homepage loads successfully': (r) => r.status === 200,
    'Homepage loads quickly': (r) => r.timings.duration < 3000,
  }) || errorRate.add(1);

  sleep(1);

  // 2. Simulate user browsing (if endpoints exist)
  if (Math.random() > 0.5) {
    responses.browse = http.get(`${BASE_URL}/creators`, {
      tags: { name: 'BrowseCreators' },
    });
    
    check(responses.browse, {
      'Browse page accessible': (r) => r.status === 200 || r.status === 404,
    });
  }
  
  // Think time between actions
  sleep(Math.random() * 2 + 1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'k6-results.json': JSON.stringify(data),
  };
}

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
