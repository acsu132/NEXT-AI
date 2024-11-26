const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Caminho para o arquivo config.json
const configPath = path.join(__dirname, 'config.json');

// Verifique se o arquivo realmente existe
if (!fs.existsSync(configPath)) {
    console.error('Arquivo config.json não encontrado!');
    process.exit(1); // Finaliza o processo se o arquivo não for encontrado
}

const config = require(configPath);

// Configurações do arquivo config.json
const NEWS_API_KEY = config.geniusToken; // Substituir pela chave da API correta se necessário
const CHANNEL_ID = '1309897299278696618'; // Substitua pelo ID do canal

// Função para buscar notícias
async function fetchAndroidNews() {
    try {
        const response = await axios.get('https://newsapi.org/v2/everything', {
            params: {
                q: 'android',
                apiKey: NEWS_API_KEY,
                language: config.language, // Usar o idioma configurado
            },
        });
        return response.data.articles;
    } catch (error) {
        console.error('Erro ao buscar notícias:', error);
        return [];
    }
}

// Função para enviar notícias
async function sendAndroidNews(client, lastNews) {
    console.log('Iniciando envio de notícias...');
    const newsArticles = await fetchAndroidNews();
    console.log(`Notícias encontradas: ${newsArticles.length}`);

    const channel = client.channels.cache.get(CHANNEL_ID);
    if (!channel) {
        console.error('Canal não encontrado!');
        return;
    }

    if (newsArticles.length > 0) {
        // Filtra as notícias para não enviar as mesmas já enviadas
        const newArticles = newsArticles.filter(article => !lastNews.includes(article.url));
        if (newArticles.length === 0) {
            console.log('Nenhuma nova notícia encontrada.');
            return;
        }

        const articleToSend = newArticles[0]; // Envia a primeira nova notícia
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(articleToSend.title)
            .setURL(articleToSend.url)
            .setDescription(articleToSend.description || 'Sem descrição disponível.')
            .setThumbnail(articleToSend.urlToImage || 'https://via.placeholder.com/150')
            .addFields(
                { name: 'Fonte', value: articleToSend.source.name, inline: true },
                { name: 'Data', value: new Date(articleToSend.publishedAt).toLocaleString(), inline: true }
            )
            .setFooter({ text: 'Notícias sobre Android' });

        await channel.send({ embeds: [embed] });
        // Armazena a URL da notícia para evitar repetição
        lastNews.push(articleToSend.url);
    } else {
        await channel.send('Nenhuma notícia encontrada sobre Android.');
    }
}

// Função para intervalos automáticos
async function startNewsInterval(client) {
    let lastNews = []; // Lista de URLs já enviadas para evitar repetição
    sendAndroidNews(client, lastNews); // Enviar imediatamente no deploy
    setInterval(() => sendAndroidNews(client, lastNews), 7200000); // Repetir a cada 2 horas
}

module.exports = { startNewsInterval, sendAndroidNews };
