const fs = require('fs');
const key = fs.readFileSync('./social-event-management-ca42a-firebase-adminsdk-fbsvc-011a7e8b8e.json', 'utf8')
const base64 = Buffer.from(key).toString('base64')
console.log(base64);
