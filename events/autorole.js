const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

// ID do canal onde as notícias serão enviadas
const CHANNEL_ID = '1309897299278696618';
const SENT_ARTICLES = new Set(); // Armazena URLs de notícias já enviadas

module.exports = (client) => {
    client.on('ready', async () => {
        console.log('Módulo de notícias inicializado.');

        // Envia as notícias imediatamente e define intervalos regulares
        await sendAndroidNews(client);
        setInterval(() => sendAndroidNews(client), 7200000); // A cada 2 horas
    });
};

// Função para buscar notícias
async function fetchAndroidNews() {
    try {
        const response = await axios.get('https://newsapi.org/v2/everything', {
            params: {
                q: 'android',
                apiKey: process.env.NEWS_API, // Usa a variável de ambiente
                language: 'pt',
            },
        });
        return response.data.articles;
    } catch (error) {
        console.error('Erro ao buscar notícias:', error.message);
        return [];
    }
}

// Função para enviar notícias
async function sendAndroidNews(client) {
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
    } else {
        await channel.send('Nenhuma nova notícia sobre Android foi encontrada.');
    }
}
