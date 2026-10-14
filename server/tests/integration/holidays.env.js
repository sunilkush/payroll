// holidays.test.js apne alag test database par chalta hai, taaki api.test.js ke saath ek saath chalne par
// dono ek doosre ka database drop na karein. setup.js se PEHLE import hona chahiye.
process.env.TEST_MONGO_URI = (process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/payroll_test').replace(/payroll_test$/, 'payroll_holidays_test');
