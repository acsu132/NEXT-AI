const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('imitar')
        .setDescription('Imita um usuário mencionado por 30 segundos!')
        .addUserOption(option =>
            option
                .setName('usuario')
                .setDescription('O usuário que será imitado')
                .setRequired(true)),
    async execute(interaction) {
        // Pegando o usuário mencionado
        const targetUser = interaction.options.getUser('usuario');
        const channel = interaction.channel;

        // Verificando permissões
        if (!channel.permissionsFor(interaction.guild.members.me).has('ManageWebhooks')) {
            return interaction.reply({ content: 'Eu preciso da permissão de gerenciar webhooks neste canal!', ephemeral: true });
        }

        // Criando o webhook
        try {
            const webhook = await channel.createWebhook({
                name: targetUser.username,
                avatar: targetUser.displayAvatarURL({ format: 'png' }),
                reason: 'Comando de imitar usuário'
            });

            await interaction.reply({ content: `Agora estou imitando ${targetUser.username} por 30 segundos!`, ephemeral: false });

            // Função para enviar mensagens como o webhook
            const sendAsWebhook = async (content) => {
                await webhook.send({
                    content,
                    username: targetUser.username,
                    avatarURL: targetUser.displayAvatarURL({ format: 'png' }),
                });
            };

            // Enviando algumas mensagens como exemplo
            await sendAsWebhook('Eu sou incrível!');
            setTimeout(() => sendAsWebhook('Discord é muito divertido!'), 5000);
            setTimeout(() => sendAsWebhook('Isso é hilário!'), 15000);

            // Espera 30 segundos antes de deletar o webhook
            setTimeout(async () => {
                await webhook.delete('Tempo de imitação expirado');
                console.log('Webhook deletado.');
            }, 30000);
        } catch (error) {
            console.error('Erro ao criar o webhook:', error);
            interaction.reply({ content: 'Algo deu errado ao criar o webhook.', ephemeral: true });
        }
    }
};