import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Ramp up to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests under 3s
    http_req_failed: ['rate<0.1'],     // Error rate under 10%
  },
};

const BASE_URL = 'https://www.fanvue.com';

// User scenarios
export default function () {
  // Scenario 1: Homepage visit
  let homepage = http.get(BASE_URL);
  check(homepage, {
    'Homepage loads successfully': (r) => r.status === 200,
    'Homepage loads quickly': (r) => r.timings.duration < 3000,
  });

  sleep(1);

  // Scenario 2: Browse creators
  let browseCreators = http.get(`${BASE_URL}/creators`);
  check(browseCreators, {
    'Creators page loads': (r) => r.status === 200,
  });
  
  sleep(2);

  // Scenario 3: Search functionality
  let searchResults = http.get(`${BASE_URL}/search?q=fitness`);
  check(searchResults, {
    'Search returns results': (r) => r.status === 200,
    'Search is fast': (r) => r.timings.duration < 2000,
  });
  
  sleep(1);

  // Scenario 4: Static resources
  let staticAssets = http.batch([
    ['GET', `${BASE_URL}/static/css/main.css`],
    ['GET', `${BASE_URL}/static/js/app.js`],
    ['GET', `${BASE_URL}/favicon.ico`],
  ]);
  
  check(staticAssets[0], {
    'CSS loads': (r) => r.status === 200,
  });

  // Random think time between actions
  sleep(Math.random() * 3 + 1);
}

// Generate HTML report after test
export function handleSummary(data) {
  return {
    "k6-results.json": JSON.stringify(data),
    "k6-report.html": htmlReport(data),
  };
}