const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

// ID do canal onde as notícias serão enviadas
const CHANNEL_ID = '1309897299278696618'; 
const SENT_ARTICLES = new Set(); // Armazena URLs de notícias já enviadas

module.exports = {
    init: (client) => {
        client.on('ready', async () => {
            console.log('Módulo de notícias sobre Android inicializado.');
            
            // Primeiro envio após 5 segundos
            setTimeout(() => enviarNoticiasAndroid(client), 5000);
            
            // Envio regular a cada 2 horas
            setInterval(() => enviarNoticiasAndroid(client), 7200000);
        });
    },
    enviarNoticiasAndroid, // Exportando a função
};

// Função para buscar notícias
async function buscarNoticiasAndroid() {
    try {
        const response = await axios.get('https://newsapi.org/v2/everything', {
            params: {
                q: 'android',
                apiKey: '337b6806debe4df1b083f92f768fe2bf', // Variável de ambiente para a chave da API
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
async function enviarNoticiasAndroid(client) {
    const noticias = await buscarNoticiasAndroid();
    const canal = client.channels.cache.get(CHANNEL_ID);

    if (!canal) {
        console.error('Canal de notícias não encontrado!');
        return;
    }

    let noticiaEnviada = false; // Variável para rastrear se uma notícia foi enviada

    for (const noticia of noticias) {
        if (SENT_ARTICLES.has(noticia.url)) {
            continue; // Ignorar notícias já enviadas
        }

        SENT_ARTICLES.add(noticia.url);

        const embed = new EmbedBuilder()
            .setColor('#42f590')
            .setTitle(noticia.title)
            .setURL(noticia.url)
            .setDescription(noticia.description || 'Sem descrição disponível.

||<@&1284872178562502678>||')
            .setImage(noticia.urlToImage || 'https://via.placeholder.com/600x400') // Exibe a imagem principal
            .addFields(
                { name: 'Fonte', value: noticia.source.name, inline: true },
                { name: 'Data', value: new Date(noticia.publishedAt).toLocaleString(), inline: true }
            )
            .setFooter({ text: 'Notícias sobre Android' });

        await canal.send({ embeds: [embed] });
        noticiaEnviada = true; // Marca que uma notícia foi enviada
        break; // Envia apenas uma notícia por vez
    }

    // Loga a mensagem em vez de enviá-la no canal
    if (!noticiaEnviada) {
        console.log('Nenhuma nova notícia sobre Android foi encontrada.');
    }
}
