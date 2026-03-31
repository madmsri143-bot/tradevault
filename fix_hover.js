const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.git') && !file.includes('.next')) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk(path.join(__dirname, 'app')).concat(walk(path.join(__dirname, 'components')));
let count = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('hover:text-zinc-900 dark:text-[#EAEAEA]')) {
        content = content.replace(/hover:text-zinc-900 dark:text-\[#EAEAEA\]/g, 'hover:text-[#EAEAEA]');
        fs.writeFileSync(file, content);
        count++;
    }
});
console.log('Fixed', count, 'files.');
