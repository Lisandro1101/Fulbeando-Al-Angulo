const fs = require('fs');
let c = fs.readFileSync('app/firestore.rules', 'utf8');
c = c.replace(/request\.resource\.data\.deletedAt == null/g, "request.resource.data.get('deletedAt', null) == null");
c = c.replace(/request\.resource\.data\.deletedAt == resource\.data\.deletedAt/g, "request.resource.data.get('deletedAt', null) == resource.data.get('deletedAt', null)");
fs.writeFileSync('app/firestore.rules', c);
console.log('Fixed rules');
