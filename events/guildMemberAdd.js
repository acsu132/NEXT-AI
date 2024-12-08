const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { Wcard } = require('wcard-gen');
const { welcomeCollection } = require('../mongodb');
const data = require('../UI/banners/welcomecards');

async function loadWelcomeConfig() {
    try {
        const configs = await welcomeCollection.find().toArray();
        return configs.reduce((acc, config) => {
            acc[config.serverId] = config;
            return acc;
        }, {});
    } catch (err) {
        //console.error('Erro ao carregar a configuração de boas-vindas:', err);
        return {};
    }
}

function getOrdinalSuffix(number) {
    if (number === 11 || number === 12 || number === 13) {
        return 'º';
    }
    const lastDigit = number % 10;
    switch (lastDigit) {
        case 1:
            return 'º';
        case 2:
            return 'º';
        case 3:
            return 'º';
        default:
            return 'º';
    }
}

function getRandomImage(images) {
    return images[Math.floor(Math.random() * images.length)];
}

module.exports = async (client) => {
    let welcomeConfig = await loadWelcomeConfig();

    setInterval(async () => {
        welcomeConfig = await loadWelcomeConfig();
    }, 5000);

    client.on('guildMemberAdd', async (member) => {
        const guildId = member.guild.id;
        const settings = welcomeConfig[guildId];

        if (settings && settings.status) {
            const welcomeChannel = member.guild.channels.cache.get(settings.welcomeChannelId);
            if (welcomeChannel) {
                const memberCount = member.guild.memberCount;
                const suffix = getOrdinalSuffix(memberCount);
                const userName = member.user.username;
                const joinDate = member.joinedAt.toDateString();
                const creationDate = member.user.createdAt.toDateString();
                const serverName = member.guild.name;
                const serverIcon = member.guild.iconURL({ format: 'png', dynamic: true, size: 256 });
                const randomImage = getRandomImage(data.welcomeImages);

                const welcomecard = new Wcard()
                    .setName(userName)
                    .setAvatar(member.user.displayAvatarURL({ format: 'png' }))
                    .setTitle("Bem-vindo ao Servidor")
                    .setColor("00e5ff") 
                    .setBackground(randomImage);
                
                const card = await welcomecard.build();
                const attachment = new AttachmentBuilder(card, { name: 'boasvindas.png' });

                const embed = new EmbedBuilder()
                    .setTitle("Bem-vindo ao Servidor!")
                    .setDescription(`${member}! Você é o **${memberCount}${suffix}** membro do nosso servidor!`)
                    .setColor("#00e5ff")
                    .setThumbnail(member.user.displayAvatarURL())
                    .setImage('attachment://boasvindas.png')
                    .addFields(
                        { name: 'Usuário', value: userName, inline: true },
                        { name: 'Data de Entrada', value: joinDate, inline: true },
                        { name: 'Conta Criada', value: creationDate, inline: true }
                    )
                    .setFooter({ text: "Estamos felizes em ter você aqui!", iconURL: serverIcon })
                    .setAuthor({ name: serverName, iconURL: serverIcon })
                    .setTimestamp();

                welcomeChannel.send({
                    content: `Olá ${member}!`,
                    embeds: [embed],
                    files: [attachment]
                });
            }
        }
    });
};
