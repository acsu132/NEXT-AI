const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { MongoClient } = require('mongodb');
require('dotenv').config(); // Usar variáveis de ambiente para o token

// Configuração
const DISCORD_TOKEN = process.env.DISCORD_TOKEN; // Somente o token do bot está no .env
const MONGO_URI = 'mongodb://localhost:27017'; // URI do MongoDB (fixo no código)
const NEWS_API_KEY = 'sua_chave_newsapi_aqui'; // Substitua pela sua chave da NewsAPI
const CHANNEL_ID = '1309897299278696618'; // Substitua pelo ID do canal
const LANGUAGE = 'pt'; // Idioma das notícias

// Inicializar cliente do Discord
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Inicializar cliente do MongoDB
const mongoClient = new MongoClient(MONGO_URI);
const dbName = 'android_bot';

// Buscar notícias na API
async function fetchAndroidNews() {
    try {
        const response = await axios.get('https://newsapi.org/v2/everything', {
            params: {
                q: 'android',
                apiKey: NEWS_API_KEY,
                language: LANGUAGE,
            },
        });
        return response.data.articles || [];
    } catch (error) {
        console.error('Erro ao buscar notícias:', error.message);
        return [];
    }
}

// Enviar notícias no canal
async function sendNews(channel, articles) {
    for (const article of articles) {
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
}

// Lógica principal para verificar e enviar notícias
async function checkAndSendNews() {
    try {
        await mongoClient.connect();
        console.log('Conectado ao MongoDB!');
        const db = mongoClient.db(dbName);
        const collection = db.collection('sent_articles');

        const channel = client.channels.cache.get(CHANNEL_ID);
        if (!channel) {
            console.error('Canal não encontrado!');
            return;
        }

        const articles = await fetchAndroidNews();
        const newArticles = [];

        for (const article of articles) {
            // Verificar se a notícia já foi enviada
            const exists = await collection.findOne({ url: article.url });
            if (!exists) {
                // Armazenar no banco de dados
                await collection.insertOne({ url: article.url, sentAt: new Date() });
                newArticles.push(article);
            }
        }

        if (newArticles.length > 0) {
            console.log(`Enviando ${newArticles.length} novas notícias...`);
            await sendNews(channel, newArticles);
        } else {
            console.log('Nenhuma notícia nova para enviar.');
            await channel.send('Nenhuma nova notícia encontrada sobre Android.');
        }
    } catch (error) {
        console.error('Erro ao processar notícias:', error.message);
    } finally {
        await mongoClient.close();
    }
}

// Iniciar o bot e o intervalo de envio
client.once('ready', () => {
    console.log(`Bot logado como ${client.user.tag}!`);

    // Enviar notícias imediatamente e depois a cada 2 horas
    checkAndSendNews();
    setInterval(checkAndSendNews, 7200000); // Repetir a cada 2 horas
});

// Login do bot
client.login(DISCORD_TOKEN);
