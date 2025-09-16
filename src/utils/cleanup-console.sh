// cleanup-console.js
// Salve este arquivo na raiz do seu projeto

const fs = require('fs');
const path = require('path');

function cleanConsoleLogsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalLength = content.length;
    
    // Regex para remover console.logs
    // Remove console.log, console.error, console.warn, etc.
    const consoleRegex = /console\.(log|error|warn|info|debug)\s*\([^)]*\);\s*[\r\n]*/g;
    
    content = content.replace(consoleRegex, '');
    
    // Remove linhas vazias extras
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    if (content.length !== originalLength) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ${filePath} - Console logs removidos`);
      return true;
    } else {
      console.log(`⏭️  ${filePath} - Nenhum console log encontrado`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Erro ao processar ${filePath}:`, error.message);
    return false;
  }
}

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Pular node_modules e outras pastas
      if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
        walkDir(filePath, fileList);
      }
    } else if (file.endsWith('.js') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function cleanupProject() {
  console.log('🧹 Iniciando limpeza de console.logs...\n');
  
  const projectDir = process.cwd();
  const jsFiles = walkDir(projectDir);
  
  let processedFiles = 0;
  let modifiedFiles = 0;
  
  jsFiles.forEach(file => {
    processedFiles++;
    if (cleanConsoleLogsInFile(file)) {
      modifiedFiles++;
    }
  });
  
  console.log(`\n📊 Resumo:`);
  console.log(`   Arquivos processados: ${processedFiles}`);
  console.log(`   Arquivos modificados: ${modifiedFiles}`);
  console.log(`   ✅ Limpeza concluída!`);
}

// Verificar argumentos
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🧹 Console Log Cleaner

Uso:
  node cleanup-console.js        - Limpa console.logs de todo o projeto
  node cleanup-console.js --help - Mostra esta ajuda

⚠️  ATENÇÃO: Este script modifica seus arquivos!
   Faça um backup ou commit antes de usar.
  `);
  process.exit(0);
}

if (args.includes('--confirm') || args.length === 0) {
  cleanupProject();
} else {
  console.log('⚠️  Use --confirm para executar ou --help para ajuda');
}