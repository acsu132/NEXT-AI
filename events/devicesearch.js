const { Client, Intents, MessageActionRow, MessageSelectMenu, MessageEmbed, MessageButton, Modal, TextInputComponent } = require('discord.js');
const gsmarena = require('gsmarena-api');
const mongoose = require('mongoose');

// Configuração do MongoDB
const deviceSchema = new mongoose.Schema({ name: String });
const Device = mongoose.model('Device', deviceSchema);

// Inicialização do bot
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
const TOKEN = process.env.TOKEN; // Insira o token do bot no ENV

// Função para buscar dispositivos da API
async function fetchDeviceDetails(deviceName) {
    try {
        const device = await gsmarena.getDevice(deviceName);
        return device || null;
    } catch (error) {
        console.error('Erro ao buscar informações do dispositivo:', error);
        return null;
    }
}

// Função para criar um embed inicial
async function createDeviceEmbed() {
    const devices = await Device.find({});
    const options = devices.map(d => ({
        label: d.name,
        value: d.name,
    }));

    const embed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle('Dispositivos Android')
        .setDescription('Selecione um dispositivo para ver as informações detalhadas. Caso não encontre o seu dispositivo, clique no botão abaixo.')
        .setFooter('Atualizado dinamicamente.');

    const row = new MessageActionRow().addComponents(
        new MessageSelectMenu()
            .setCustomId('device-select')
            .setPlaceholder('Escolha um dispositivo')
            .addOptions(options.length ? options : [{ label: 'Nenhum dispositivo disponível', value: 'none' }])
    );

    const buttonRow = new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId('add-device')
            .setLabel('Seu dispositivo não está aqui?')
            .setStyle('PRIMARY')
    );

    return { embed, row, buttonRow };
}

// Evento de interação para o menu de seleção
client.on('interactionCreate', async interaction => {
    if (interaction.isSelectMenu() && interaction.customId === 'device-select') {
        const deviceName = interaction.values[0];
        if (deviceName === 'none') {
            return interaction.reply({ content: 'Nenhum dispositivo disponível no momento.', ephemeral: true });
        }

        const device = await fetchDeviceDetails(deviceName);
        if (!device) {
            return interaction.reply({ content: 'Dispositivo não encontrado. Tente novamente.', ephemeral: true });
        }

        const embed = new MessageEmbed()
            .setColor('#00ff00')
            .setTitle(device.name)
            .setDescription(device.description || 'Descrição não disponível.')
            .addFields(
                { name: 'Lançamento', value: device.releaseDate || 'Desconhecido', inline: true },
                { name: 'Sistema Operacional', value: device.os || 'Desconhecido', inline: true },
                { name: 'Tela', value: device.display || 'Informação indisponível', inline: true }
            )
            .setThumbnail(device.image || 'https://via.placeholder.com/150')
            .setFooter('Informações fornecidas pelo GSMArena.');

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId === 'add-device') {
        const modal = new Modal()
            .setCustomId('add-device-modal')
            .setTitle('Adicionar Dispositivo')
            .addComponents(
                new MessageActionRow().addComponents(
                    new TextInputComponent()
                        .setCustomId('device-name')
                        .setLabel('Nome do dispositivo')
                        .setStyle('SHORT')
                        .setPlaceholder('Exemplo: Galaxy S22 Ultra')
                        .setRequired(true)
                )
            );

        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'add-device-modal') {
        const deviceName = interaction.fields.getTextInputValue('device-name');
        const exists = await Device.findOne({ name: deviceName });

        if (exists) {
            return interaction.reply({ content: 'Este dispositivo já está na lista.', ephemeral: true });
        }

        const newDevice = new Device({ name: deviceName });
        await newDevice.save();

        return interaction.reply({ content: `O dispositivo "${deviceName}" foi adicionado à lista com sucesso!`, ephemeral: true });
    }
});

// Postar o embed inicial em um canal específico
client.once('ready', async () => {
    console.log(`${client.user.tag} está online!`);
    const channel = client.channels.cache.get('1310694029083672587'); // Substitua pelo ID do canal
    const { embed, row, buttonRow } = await createDeviceEmbed();

    if (channel) {
        await channel.send({ embeds: [embed], components: [row, buttonRow] });
    }
});

// Conectar ao MongoDB e inicializar o bot
mongoose.connect('mongodb+srv://RTX:GAMING@cluster0.iuzzl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Conectado ao MongoDB.');
        client.login(TOKEN);
    })
    .catch(err => console.error('Erro ao conectar ao MongoDB:', err));