'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const css=fs.readFileSync('joyful-theme-v89.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
test('v89 keeps palette distinct and does not recolor semantic P/L values',()=>{
 for(const token of ['--sb89-coral','--sb89-lavender','--sb89-sky','--sb89-sun','--sb89-mint']){
  assert.ok(css.includes(token),token);
 }
 assert.match(css,/\.sahamban-module-v87:nth-child\(5n/);
 assert.match(css,/\.sb88-tabs/);
 assert.doesNotMatch(css,/\b(?:profit|loss|gain|negative|positive|error|failed)\b[^}]*color\s*:/i);
});
test('v89 theme loads after base style and remains available offline',()=>{
 assert.ok(html.indexOf('</style>')<html.indexOf('joyful-theme-v89.css'));
 assert.ok(html.indexOf('joyful-theme-v89.css')<html.indexOf('</head>'));
 assert.match(sw,/sahamban-static-v90-0/);
 assert.match(sw,/joyful-theme-v89\.css\?v=89\.0/);
});
