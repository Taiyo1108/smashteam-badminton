const bcrypt = require('bcrypt');

async function gen() {
  const hash = await bcrypt.hash('admin123', 10);
  console.log('New hash for admin123:', hash);
  process.exit(0);
}
gen();
