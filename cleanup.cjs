const fs = require('fs');

let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const replacements = [
  ['text-zinc-400 dark:text-zinc-500 dark:text-zinc-400', 'text-zinc-500 dark:text-zinc-400'],
  ['dark:bg-white/80 dark:bg-zinc-950/80', 'dark:bg-zinc-950/80'],
  ['bg-zinc-50 dark:bg-white/80', 'bg-white/80'],
  ['hover:text-zinc-900 dark:text-zinc-100', 'hover:text-zinc-900 dark:hover:text-zinc-100'],
  ['hover:bg-zinc-200 dark:bg-zinc-800', 'hover:bg-zinc-200 dark:hover:bg-zinc-800'],
  ['bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400', 'bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400'],
  ['text-zinc-300 dark:text-zinc-700 dark:text-zinc-300', 'text-zinc-700 dark:text-zinc-300'],
  ['bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900', 'bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'],
  ['bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800', 'bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800'],
];

for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}

fs.writeFileSync('src/components/Dashboard.tsx', content);
console.log('Done');
