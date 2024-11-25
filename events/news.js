const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

const NEWS_API_KEY = '337b6806debe4df1b083f92f768fe2bf'; // Defina sua chave da NewsAPI aqui

async function fetchAndroidNews() {
    try {
        const response = await axios.get(`https://newsapi.org/v2/everything?q=android&apiKey=${NEWS_API_KEY}`);
        return response.data.articles;
    } catch (error) {
        console.error('Erro ao buscar notícias:', error);
        return [];
    }
}

async function sendAndroidNews(client) {
    const newsArticles = await fetchAndroidNews();
    const channel = client.channels.cache.get('1309897299278696618'); // Substitua pelo ID do canal

    if (!channel) {
        console.error('Canal não encontrado!');
        return;
    }

    if (newsArticles.length > 0) {
        for (const article of newsArticles) {
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
        channel.send('Nenhuma notícia encontrada sobre Android.');
    }
}

module.exports = { sendAndroidNews };
