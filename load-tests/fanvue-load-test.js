import http from 'k6/http';
import { check, sleep } from 'k6';

// Simplified configuration for demo - runs for ~2 minutes total
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 20 },    // Stay at 20 users  
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests under 3s
    http_req_failed: ['rate<0.1'],     // Error rate under 10%
  },
};

const BASE_URL = 'https://www.fanvue.com';

export default function () {
  // Homepage visit
  let homepage = http.get(BASE_URL);
  check(homepage, {
    'Homepage loads successfully': (r) => r.status === 200,
    'Homepage loads quickly': (r) => r.timings.duration < 3000,
  });

  sleep(1);

  // Browse creators (if page exists)
  let browseCreators = http.get(`${BASE_URL}/creators`, {
    tags: { name: 'BrowseCreators' }
  });
  check(browseCreators, {
    'Creators page accessible': (r) => r.status === 200 || r.status === 404,
  });
  
  sleep(2);
}

export function handleSummary(data) {
  return {
    "k6-results.json": JSON.stringify(data),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}

// Import text summary
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';