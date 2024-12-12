const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { MongoClient } = require('mongodb');

// URI do MongoDB
const MONGO_URI = 'mongodb+srv://RTX:GAMING@cluster0.iuzzl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DATABASE_NAME = 'newsBot';
const COLLECTION_NAME = 'sentArticles';

// ID do canal onde as notícias serão enviadas
const CHANNEL_ID = '1309897299278696618';

module.exports = {
    init: (client) => {
        client.on('ready', async () => {
            console.log('Módulo de notícias sobre Android inicializado.');
            
            // Conecta ao MongoDB
            const mongoClient = new MongoClient(MONGO_URI);
            await mongoClient.connect();
            const db = mongoClient.db(DATABASE_NAME);
            const collection = db.collection(COLLECTION_NAME);

            // Primeiro envio após 5 segundos
            setTimeout(() => enviarNoticiasAndroid(client, collection), 5000);
            
            // Envio regular a cada 2 horas
            setInterval(() => enviarNoticiasAndroid(client, collection), 7200000);
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
async function enviarNoticiasAndroid(client, collection) {
    const noticias = await buscarNoticiasAndroid();
    const canal = client.channels.cache.get(CHANNEL_ID);

    if (!canal) {
        console.error('Canal de notícias não encontrado!');
        return;
    }

    let noticiaEnviada = false;

    for (const noticia of noticias) {
        const existe = await collection.findOne({ url: noticia.url });
        if (existe) {
            continue; // Ignorar notícias já enviadas
        }

        await collection.insertOne({ url: noticia.url }); // Salva a URL no banco de dados

        const embed = new EmbedBuilder()
            .setColor('#42f590')
            .setTitle(noticia.title)
            .setURL(noticia.url)
            .setDescription(noticia.description || 'Sem descrição disponível.')
            .setThumbnail(noticia.source.url || 'https://www.google.com/s2/favicons?sz=64&domain=${new URL(noticia.url).hostname}') // Ícone do site
            .setImage(noticia.urlToImage || 'https://via.placeholder.com/600x400') // Exibe a imagem principal
            .addFields(
                { name: 'Fonte', value: `[${noticia.source.name}](${noticia.url})`, inline: true },
                { name: 'Data', value: new Date(noticia.publishedAt).toLocaleString(), inline: true }
            )
            .setFooter({ text: 'Notícias sobre Android' });

        await canal.send({ embeds: [embed] });
        noticiaEnviada = true;
        break; // Envia apenas uma notícia por vez
    }

    if (!noticiaEnviada) {
        console.log('Nenhuma nova notícia sobre Android foi encontrada.');
    }
}
