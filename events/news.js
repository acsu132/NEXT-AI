const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Carregar a configuração do arquivo config.json
const configPath = path.resolve(__dirname, 'config.json');
if (!fs.existsSync(configPath)) {
    console.error('Arquivo config.json não encontrado!');
    process.exit(1);
}
const config = require(configPath);

const NEWS_API_KEY = config.newsApiKey; // A chave da API agora está no arquivo config.json
const CHANNEL_ID = '1309897299278696618'; // Substitua pelo ID do canal
const SENT_ARTICLES = new Set(); // Usado para armazenar URLs das notícias já enviadas

// Função para buscar notícias
async function fetchAndroidNews() {
    try {
        const response = await axios.get('https://newsapi.org/v2/everything', {
            params: {
                q: 'android',
                apiKey: NEWS_API_KEY,
                language: config.language || 'pt', // Usando a configuração de idioma do arquivo
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
            // Verificar se a notícia já foi enviada
            if (SENT_ARTICLES.has(article.url)) {
                console.log(`Notícia repetida encontrada, ignorando: ${article.title}`);
                continue; // Ignorar notícias repetidas
            }

            // Marcar a notícia como enviada
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
            await channel.send('Nenhuma nova notícia encontrada sobre Android.');
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

module.exports = { startNewsInterval, sendAndroidNews };
