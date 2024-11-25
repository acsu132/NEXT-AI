import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch'; // Usando import para node-fetch
import { MongoClient } from 'mongodb';
import fs from 'fs';

// Lê o arquivo de configuração
const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));
const NEWS_API_KEY = config.news_api_key; // Chave da API de notícias
const CHANNEL_ID = config.channel_id; // ID do canal
const MONGODB_URI = config.mongodb_uri; // URI de conexão do MongoDB

const mongoClient = new MongoClient(MONGODB_URI);
let articlesCollection;

async function connectToMongoDB() {
    await mongoClient.connect();
    const database = mongoClient.db('newsBot');
    articlesCollection = database.collection('sentArticles');
}

async function fetchNews() {
    const response = await fetch(`https://newsapi.org/v2/everything?q=android&language=pt&apiKey=${NEWS_API_KEY}`);
    const data = await response.json();
    return data.articles;
}

async function sendNews(channel) {
    const articles = await fetchNews();
    const newArticle = articles.find(article => !await articlesCollection.findOne({ url: article.url }));

    if (newArticle) {
        await articlesCollection.insertOne({ url: newArticle.url });

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(newArticle.title)
            .setURL(newArticle.url)
            .setDescription(newArticle.description || 'Sem descrição disponível.')
            .addFields(
                { name: 'Fonte', value: newArticle.source.name },
                { name: 'Data', value: new Date(newArticle.publishedAt).toLocaleString('pt-BR') }
            )
            .setTimestamp()
            .setFooter({ text: 'Fonte: News API' });

        channel.send({ embeds: [embed] });
    } else {
        console.log('Todas as notícias já foram enviadas.');
    }
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', async () => {
    console.log(`Bot está online como ${client.user.tag}`);

    await connectToMongoDB();
    
    const channel = client.channels.cache.get(CHANNEL_ID);
    if (!channel) {
        console.error('Canal não encontrado!');
        return;
    }

    sendNews(channel); // Envia a primeira notícia imediatamente
    setInterval(() => sendNews(channel), 2 * 60 * 60 * 1000); // Envia uma notícia a cada 2 horas
});

// Acesse o token do bot a partir da variável de ambiente
client.login(process.env.BOT_TOKEN); // Coloque o nome da variável de ambiente correspondente
