const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'copy',
    description: 'Cria um webhook com o nome e avatar do usuário mencionado por 30 segundos.',
    async execute(message, args) {
        // Configurar os IDs dos cargos necessários
        const requiredRoles = ['1284871020087476266', '1311633633697861703']; // Substitua pelos IDs dos cargos necessários

        // Verificar se o autor da mensagem tem os dois cargos
        const member = message.member;
        if (!requiredRoles.every(role => member.roles.cache.has(role))) {
            return message.reply('Você não tem os cargos necessários para usar este comando.');
        }

        // Verificar se o usuário foi mencionado
        const mentionedUser = message.mentions.users.first();
        if (!mentionedUser) {
            return message.reply('Por favor, mencione um usuário para copiar.');
        }

        try {
            // Criar o webhook no canal atual
            const webhook = await message.channel.createWebhook({
                name: mentionedUser.displayName || mentionedUser.username,
                avatar: mentionedUser.displayAvatarURL({ dynamic: true }),
            });

            // Informar que o webhook foi criado
            await message.reply(`Webhook criado como ${mentionedUser.username}! Ele será removido em 30 segundos.`);

            // Aguardar 30 segundos e remover o webhook
            setTimeout(async () => {
                await webhook.delete();
                console.log('Webhook removido após 30 segundos.');
            }, 30000);

        } catch (error) {
            console.error('Erro ao criar o webhook:', error);
            message.reply('Ocorreu um erro ao criar o webhook. Verifique minhas permissões.');
        }
    },
};
