import initSqlJs from 'sql.js';
import fs from 'fs';

const SQL = await initSqlJs();
const buf = fs.readFileSync('.cortex/cortex.db');
const db = new SQL.Database(buf);

const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
console.log('Tables:', tables[0].values.map(v => v[0]));

const project = db.exec('SELECT * FROM project');
console.log('Project rows:', project.length > 0 ? project[0].values.length : 0);
if (project.length > 0) console.log('Project data:', project[0].values[0]);

const features = db.exec('SELECT * FROM features');
console.log('Feature rows:', features.length > 0 ? features[0].values.length : 0);

const files = db.exec('SELECT * FROM file_tree');
console.log('File rows:', files.length > 0 ? files[0].values.length : 0);

db.close();
