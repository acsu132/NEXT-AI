const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const mongoose = require('mongoose');

// Conectar ao MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Conectado ao MongoDB!');
}).catch(err => {
    console.error('Erro ao conectar ao MongoDB:', err.message);
});

// Definir o schema para armazenar configurações de servidor (como a última checagem)
const newsSettingsSchema = new mongoose.Schema({
    serverId: { type: String, required: true },
    lastChecked: { type: Date, required: true },
});

const NewsSettings = mongoose.model('NewsSettings', newsSettingsSchema);

const CHANNEL_ID = '1309897299278696618'; // ID do canal onde as notícias serão enviadas
const SENT_ARTICLES = new Set(); // Armazena URLs de notícias já enviadas

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.on('ready', async () => {
    console.log('Bot está pronto!');
    
    // Enviar notícias imediatamente e definir intervalo regular para checar notícias
    await sendAndroidNews();
    setInterval(() => sendAndroidNews(), 7200000); // A cada 2 horas
});

async function fetchAndroidNews() {
    try {
        const response = await axios.get('https://newsapi.org/v2/everything', {
            params: {
                q: 'android',
                apiKey: process.env.NEWS_API, // Usa a variável de ambiente para a API Key
                language: 'pt',
            },
        });
        return response.data.articles;
    } catch (error) {
        console.error('Erro ao buscar notícias:', error.message);
        return [];
    }
}

async function sendAndroidNews() {
    const newsArticles = await fetchAndroidNews();
    const channel = client.channels.cache.get(CHANNEL_ID);

    if (!channel) {
        console.error('Canal de notícias não encontrado!');
        return;
    }

    const articlesToSend = [];

    for (const article of newsArticles) {
        if (SENT_ARTICLES.has(article.url)) {
            continue; // Ignora notícias já enviadas
        }

        SENT_ARTICLES.add(article.url);
        articlesToSend.push(article);
    }

    if (articlesToSend.length > 0) {
        for (const article of articlesToSend) {
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(article.title)
                .setURL(article.url)
                .setDescription(article.description || 'Sem descrição disponível.')
                .setThumbnail(article.urlToImage || 'https://via.placeholder.com/150')
                .addFields(
                    { name: 'Fonte', value: article.source.name, inline: true },
                    { name: 'Data', value: new Date(article.publishedAt).toLocaleString(), inline: true }
                )
                .setFooter({ text: 'Notícias sobre Android' });

            await channel.send({ embeds: [embed] });
        }

        // Armazenar a última checagem de notícias no MongoDB
        const serverId = channel.guild.id;
        await NewsSettings.updateOne(
            { serverId },
            { $set: { lastChecked: new Date() } },
            { upsert: true } // Cria o documento caso ele não exista
        );
    } else {
        await channel.send('Nenhuma nova notícia sobre Android foi encontrada.');
    }
}

// Login do bot
client.login(process.env.TOKEN);
