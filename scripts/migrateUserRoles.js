const mongoose = require('mongoose');
const User = require('../src/models/User');
const config = require('../src/config/env');

async function migrateUserRoles() {
  try {
    // Conectar ao banco de dados
    await mongoose.connect(config.MONGODB_URI);
    console.log('Conectado ao MongoDB');

    // Migrar usuários STANDARD para DEFAULT
    const standardUsers = await User.updateMany(
      { role: 'STANDARD' },
      { $set: { role: 'DEFAULT' } }
    );
    console.log(`Migrados ${standardUsers.modifiedCount} usuários de STANDARD para DEFAULT`);

    // Verificar se há outros roles que precisam ser migrados
    const users = await User.find({}, 'email role');
    console.log('\nUsuários após migração:');
    users.forEach(user => {
      console.log(`- ${user.email}: ${user.role}`);
    });

    // Verificar estatísticas finais
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('\nEstatísticas por perfil:');
    stats.forEach(stat => {
      console.log(`- ${stat._id}: ${stat.count} usuários`);
    });

    console.log('\nMigração concluída com sucesso!');
  } catch (error) {
    console.error('Erro durante a migração:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado do MongoDB');
  }
}

// Executar migração se o script for chamado diretamente
if (require.main === module) {
  migrateUserRoles();
}

module.exports = migrateUserRoles;
