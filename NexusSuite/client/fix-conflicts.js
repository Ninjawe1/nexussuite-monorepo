const fs = require('fs');
const path = require('path');
const glob = require('glob');

const directory = 'src';

function resolveConflicts(content) {
  // Regex to match conflict blocks
  // <<<<<<< HEAD
  // ...
  // =======
  // ...
  // >>>>>>> branch
  const conflictRegex = /<<<<<<< HEAD[\r\n]+([\s\S]*?)=======[\r\n]+([\s\S]*?)>>>>>>> [^\r\n]*/g;
  
  return content.replace(conflictRegex, (match, p1, p2) => {
    // p1 is HEAD content
    // p2 is Incoming content
    
    // For now, let's prefer HEAD (p1) as it seems to be what the user was working with (or at least consistent with my previous edits)
    // However, we should be careful. 
    // In the case of quotes, it doesn't matter much, but let's stick to one.
    return p1;
  });
}

// glob is likely not installed in the environment, so I'll use a recursive readdir
function getFiles(dir, files = []) {
  const fileList = fs.readdirSync(dir);
  for (const file of fileList) {
    const name = `${dir}/${file}`;
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files);
    } else {
      if (name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.css')) {
        files.push(name);
      }
    }
  }
  return files;
}

try {
  const files = getFiles(directory);
  console.log(`Found ${files.length} files to check.`);
  
  let fixedCount = 0;
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('<<<<<<< HEAD')) {
      console.log(`Fixing conflicts in ${file}...`);
      const newContent = resolveConflicts(content);
      fs.writeFileSync(file, newContent, 'utf8');
      fixedCount++;
    }
  });
  
  console.log(`Fixed ${fixedCount} files.`);
} catch (e) {
  console.error(e);
}
