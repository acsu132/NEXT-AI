const { Client, GatewayIntentBits } = require('discord.js'); // Atualizado para GatewayIntentBits
const axios = require('axios'); // Usado para fazer requisições à API de notícias

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent // Necessário para ler o conteúdo das mensagens
    ]
});

// Evento de inicialização
client.once('ready', () => {
    console.log(`Bot conectado como ${client.user.tag}`);
});

// Função para buscar notícias
async function fetchNews(category = 'technology') {
    const apiKey = process.env.NEWS_API; // Pega a chave API do ambiente de host
    const url = `https://newsapi.org/v2/top-headlines?category=${category}&language=pt&apiKey=${apiKey}`;
    
    try {
        const response = await axios.get(url);
        const articles = response.data.articles.slice(0, 5); // Limita a 5 notícias
        if (articles.length === 0) {
            return 'Nenhuma notícia encontrada para essa categoria.';
        }

        return articles.map((article, index) => 
            `**${index + 1}. ${article.title}**\n${article.url}`
        ).join('\n\n');
    } catch (error) {
        console.error('Erro ao buscar notícias:', error);
        return 'Ocorreu um erro ao buscar as notícias. Verifique a API.';
    }
}

// Responde a um comando para mostrar notícias
client.on('messageCreate', async (message) => {
    if (!message.content.startsWith('$')) return; // Verifica o prefixo
    const args = message.content.slice(1).trim().split(' ');
    const command = args.shift().toLowerCase();

    if (command === 'noticias') {
        const category = args[0] || 'technology'; // Define a categoria padrão como 'technology'
        const news = await fetchNews(category);
        message.channel.send(news);
    }
});

// Inicializa o bot com o token
client.login(process.env.TOKEN);
