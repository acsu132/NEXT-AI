const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'guildMemberAdd', // Nome do evento
    execute(member) {
        const welcomeChannelId = '123456789012345678'; // Substitua pelo ID do canal
        const channel = member.guild.channels.cache.get(welcomeChannelId);

        if (!channel) {
            console.error('Canal de boas-vindas não encontrado!');
            return;
        }

        // Criando o embed de boas-vindas
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#34eb83') // Cor do embed
            .setTitle('🌟 Bem-vindo(a) ao Servidor Android Unofficial Community! 🌟')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 })) // Foto do membro
            .setDescription(
                `Olá, **${member.user.username}**! 👋\n\n` +
                `👉 Confira o canal de informações: <#1284876142230372422>.\n` +
                `Lá você encontra tudo sobre o servidor, incluindo cargos por reação para pings.\n\n` +
                `📱 Este é o lugar perfeito para compartilhar dúvidas, experiências e novidades sobre Android!`
            )
            .addFields(
                { name: '📋 Regras e Boas Práticas', value: 'Leia e siga as regras para manter a comunidade acolhedora!' },
                { name: '💬 Interaja!', value: 'Participe das conversas e aproveite ao máximo!' }
            )
            .setFooter({ text: `Estamos agora com ${member.guild.memberCount} membros! 🚀` })
            .setTimestamp();

        // Envia o embed no canal de boas-vindas
        channel.send({ content: `Bem-vindo(a), ${member}! 🎉`, embeds: [welcomeEmbed] });
    },
};
