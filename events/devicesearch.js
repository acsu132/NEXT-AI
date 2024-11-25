const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const gsmarena = require('gsmarena-api'); // Certifique-se de instalar este pacote
const { MongoClient } = require('mongodb'); // Para MongoDB, se necessário

// Função para criar o embed e os componentes
async function createDeviceEmbed() {
    const embed = new EmbedBuilder()
        .setTitle('Avaliação de Dispositivos')
        .setDescription('Escolha um dispositivo na lista abaixo ou sugira um novo.')
        .setColor('#0099ff')
        .setFooter({ text: 'Powered by GSMArena' });

    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('device-select')
            .setPlaceholder('Selecione um dispositivo')
            .addOptions([
                { label: 'Galaxy S22 Ultra', value: 'galaxy_s22_ultra' },
                { label: 'iPhone 15 Pro', value: 'iphone_15_pro' },
                { label: 'Seu dispositivo não está aqui?', value: 'request_device' },
            ])
    );

    const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('request-device')
            .setLabel('Sugerir Dispositivo')
            .setStyle(ButtonStyle.Primary)
    );

    return { embed, row, buttonRow };
}

// Função para buscar informações de um dispositivo da API
async function fetchDeviceInfo(deviceName) {
    try {
        const device = await gsmarena.search(deviceName); // Pesquisa na API
        if (!device || device.length === 0) {
            return null;
        }
        const details = device[0]; // Pegando o primeiro resultado
        return details;
    } catch (error) {
        console.error('Erro ao buscar informações do dispositivo:', error);
        return null;
    }
}

// Função principal para enviar o embed ao canal especificado
async function sendDeviceEmbed(channelId, client) {
    const channel = client.channels.cache.get(channelId);
    if (!channel) {
        console.error('Canal não encontrado!');
        return;
    }

    const { embed, row, buttonRow } = await createDeviceEmbed();
    await channel.send({ embeds: [embed], components: [row, buttonRow] });
}

module.exports = { createDeviceEmbed, fetchDeviceInfo, sendDeviceEmbed };
