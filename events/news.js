const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

const NEWS_API_KEY = '337b6806debe4df1b083f92f768fe2bf'; // Chave embutida no código
const CHANNEL_ID = '1309897299278696618'; // Substitua pelo ID do canal

async function fetchAndroidNews() {
    try {
        const response = await axios.get('https://newsapi.org/v2/everything', {
            params: {
                q: 'android',
                apiKey: NEWS_API_KEY,
                language: 'pt', // Adiciona idioma português
            },
        });
        return response.data.articles;
    } catch (error) {
        console.error('Erro ao buscar notícias:', error);
        return [];
    }
}

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
        for (const article of newsArticles.slice(0, 5)) {
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
        await channel.send('Nenhuma notícia encontrada sobre Android.');
    }
}

function startNewsInterval(client) {
    sendAndroidNews(client); // Enviar imediatamente no deploy
    setInterval(() => sendAndroidNews(client), 7200000); // Repetir a cada 2 horas
}

module.exports = { startNewsInterval, sendAndroidNews };
