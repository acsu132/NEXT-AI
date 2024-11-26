const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { MongoClient } = require('mongodb');
const config = require('./config.json');

const NEWS_API_KEY = config.newsApiKey;
const CHANNEL_ID = config.channelId;
const MONGO_URI = config.mongoURI;
const DB_NAME = 'newsBotDB';
const COLLECTION_NAME = 'sentArticles';

let dbCollection;

// Função para conectar ao MongoDB
async function connectToDB() {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log('Conectado ao MongoDB!');
    const db = client.db(DB_NAME);
    dbCollection = db.collection(COLLECTION_NAME);
}

// Função para buscar notícias
async function fetchAndroidNews() {
    try {
        const response = await axios.get('https://newsapi.org/v2/everything', {
            params: {
                q: 'android',
                apiKey: NEWS_API_KEY,
                language: 'pt',
            },
        });
        return response.data.articles;
    } catch (error) {
        console.error('Erro ao buscar notícias:', error);
        return [];
    }
}

// Função para enviar notícias
async function sendAndroidNews(client) {
    console.log('Iniciando envio de notícias...');
    const newsArticles = await fetchAndroidNews();
    console.log(`Notícias encontradas: ${newsArticles.length}`);

    const channel = client.channels.cache.get(CHANNEL_ID);
    if (!channel) {
        console.error('Canal não encontrado!');
        return;
    }

    if (newsArticles.length > 0) {
        const articlesToSend = [];
        for (const article of newsArticles) {
            const alreadySent = await dbCollection.findOne({ url: article.url });
            if (!alreadySent) {
                articlesToSend.push(article);
            }
        }

        if (articlesToSend.length === 0) {
            console.log('Nenhuma notícia nova para enviar.');
            return;
        }

        for (const article of articlesToSend.slice(0, 1)) { // Enviar até 1 nova notícia
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

            // Registrar a URL no banco como enviada
            await dbCollection.insertOne({ url: article.url, dateSent: new Date() });
        }
    } else {
        await channel.send('Nenhuma notícia encontrada sobre Android.');
    }
}

// Função para intervalos automáticos
function startNewsInterval(client) {
    sendAndroidNews(client); // Enviar imediatamente no deploy
    setInterval(() => sendAndroidNews(client), 7200000); // Repetir a cada 2 horas
}

// Exportar a função principal
module.exports = { connectToDB, startNewsInterval, sendAndroidNews };
