const jwt = require('jsonwebtoken');

const payload = {
  id: 1,
  email: 'admin@example.com',
  role: 'admin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
};

const token = jwt.sign(payload, 'your-jwt-secret-key-here');
console.log('New JWT Token:');
console.log(token);