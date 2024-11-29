const { EmbedBuilder } = require('discord.js');

module.exports = (client) => {
    client.on('threadCreate', async (thread) => {
        try {
            // Verifica se o thread está em um canal específico (ID do fórum)
            const forumChannelId = '1311632836276781096'; // Substitua com o ID do canal do fórum
            if (thread.parentId !== forumChannelId) return;

            // Busca a mensagem do post dentro da thread
            const messages = await thread.messages.fetch({ limit: 1 });
            const message = messages.first();

            if (!message) return;

            // Criação do embed com o conteúdo da mensagem
            const embed = new EmbedBuilder()
                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                .setDescription(message.content || 'Sem texto.')
                .setColor(#19ff40)
                .setTimestamp();

            // Adiciona anexos ao embed, se houver
            if (message.attachments.size > 0) {
                embed.addFields(
                    Array.from(message.attachments.values()).map((attachment, index) => ({
                        name: `Anexo ${index + 1}`,
                        value: `[Download aqui](${attachment.url})`,
                        inline: false
                    }))
                );
            }

            // Envia o embed para o canal do fórum
            const forumChannel = await client.channels.fetch(forumChannelId);
            if (forumChannel.isText()) {
                await forumChannel.send({ embeds: [embed] });
            }

            // Apaga o post original da thread
            await thread.delete('Mensagem repostada pelo bot.');

        } catch (error) {
            console.error('Erro ao processar o evento threadCreate:', error);
        }
    });
};
