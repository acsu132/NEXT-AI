const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const NEWS_API_KEY = '337b6806debe4df1b083f92f768fe2bf'; // Coloque sua chave da API aqui
const CHANNEL_ID = '1309897299278696618'; // Coloque o ID do canal onde deseja enviar as notícias

const sentArticles = new Set(); // Para armazenar os IDs das notícias já enviadas

async function fetchNews() {
    const response = await fetch(`https://newsapi.org/v2/everything?q=android&language=pt&apiKey=${NEWS_API_KEY}`);
    const data = await response.json();
    return data.articles;
}

async function sendNews(channel) {
    const articles = await fetchNews();
    const newArticle = articles.find(article => !sentArticles.has(article.url));

    if (newArticle) {
        sentArticles.add(newArticle.url);
        
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

client.once('ready', () => {
    console.log(`Bot está online como ${client.user.tag}`);

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