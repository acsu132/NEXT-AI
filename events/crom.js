const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const gsmarena = require('gsmarena-api');
const mongoose = require('mongoose');

// Configuração do MongoDB
mongoose.connect('mongodb://localhost:27017/dispositivoDB', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Conectado ao MongoDB!'))
    .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Esquema para salvar dispositivos pesquisados
const dispositivoSchema = new mongoose.Schema({
    nome: String,
    detalhes: Object
});
const Dispositivo = mongoose.model('Dispositivo', dispositivoSchema);

// Configuração do bot
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// Lista inicial de dispositivos pesquisados
let dispositivosPesquisados = [{ label: "Pesquisar dispositivo", value: "pesquisar" }];

// Evento "ready"
client.once('ready', () => {
    console.log(`Bot online como ${client.user.tag}!`);
});

// Evento "interactionCreate"
client.on('interactionCreate', async interaction => {
    if (interaction.isSelectMenu() && interaction.customId === 'menu_dispositivos') {
        const escolha = interaction.values[0];

        if (escolha === 'pesquisar') {
            const embed = new EmbedBuilder()
                .setTitle('Pesquisar Dispositivo')
                .setDescription('Digite o nome do dispositivo para iniciar a busca.')
                .setColor(0x00AE86);

            await interaction.reply({ embeds: [embed], ephemeral: true });
            
            const filter = m => m.author.id === interaction.user.id;
            const coletor = interaction.channel.createMessageCollector({ filter, max: 1, time: 30000 });

            coletor.on('collect', async message => {
                const query = message.content;
                let resultado = await gsmarena.search.search(query);

                if (resultado.length > 0) {
                    const dispositivo = resultado[0];

                    // Salvar no MongoDB
                    const novoDispositivo = new Dispositivo({ nome: dispositivo.name, detalhes: dispositivo });
                    await novoDispositivo.save();

                    // Atualizar lista de dispositivos
                    dispositivosPesquisados.push({ label: dispositivo.name, value: dispositivo.name });

                    const embedResultado = new EmbedBuilder()
                        .setTitle(dispositivo.name)
                        .setDescription(dispositivo.description)
                        .setImage(dispositivo.img)
                        .setColor(0x00AE86)
                        .addFields(
                        { name: 'Detalhes', value: dispositivo.specs.join('\n').slice(0, 1024) },
                    );

                    await interaction.followUp({ embeds: [embedResultado], ephemeral: true });
                } else {
                    await interaction.followUp({ content: 'Nenhum dispositivo encontrado!', ephemeral: true });
                }
                coletor.stop();
            });

            coletor.on('end', (_, reason) => {
                if (reason === 'time') {
                    interaction.followUp({ content: 'Tempo esgotado para a busca!', ephemeral: true });
                }
            });
        } else {
            // Busca no banco de dados
            const dispositivo = await Dispositivo.findOne({ nome: escolha });
            if (dispositivo) {
                const embed = new EmbedBuilder()
                    .setTitle(dispositivo.nome)
                    .setDescription(dispositivo.detalhes.description)
                    .setImage(dispositivo.detalhes.img)
                    .setColor(0x00AE86)
                    .addFields(
                        { name: 'Detalhes', value: dispositivo.detalhes.specs.join('\n').slice(0, 1024) },
                    );

                await interaction.reply({ embeds: [embed], ephemeral: true });
            } else {
                await interaction.reply({ content: 'Dispositivo não encontrado no banco de dados.', ephemeral: true });
            }
        }
    }
});

// Comando para enviar o menu
client.on('interactionCreate', async interaction => {
    if (interaction.isCommand() && interaction.commandName === 'menu') {
        const menu = new StringSelectMenuBuilder()
            .setCustomId('menu_dispositivos')
            .setPlaceholder('Selecione ou pesquise um dispositivo')
            .addOptions(dispositivosPesquisados);

        const row = new ActionRowBuilder().addComponents(menu);

        const embed = new EmbedBuilder()
            .setTitle('Lista de Dispositivos')
            .setDescription('Escolha um dispositivo da lista ou pesquise um novo dispositivo.')
            .setColor(0x00AE86);

        await interaction.reply({ embeds: [embed], components: [row] });
    }
});

// Login do bot
client.login('SEU_TOKEN_AQUI');
