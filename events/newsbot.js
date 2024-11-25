const { Client, Intents } = require('discord.js');
const axios = require('axios'); // Para buscar notícias de APIs ou RSS
require('dotenv').config(); // Variáveis de ambiente

const client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

// Configuração básica
const PREFIX = "$"; // Prefixo atualizado
const NEWS_API = process.env.NEWS_API; // Coloque a chave da API no host

// Evento: Bot está pronto
client.once('ready', () => {
    console.log(`Bot logado como ${client.user.tag}`);
});

// Comando para buscar notícias
client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(PREFIX) || message.author.bot) return;

    const args = message.content.slice(PREFIX.length).trim().split(' ');
    const command = args.shift().toLowerCase();

    if (command === 'noticias') {
        const categoria = args[0] || 'tecnologia'; // Categoria padrão

        try {
            const response = await axios.get(
                `https://newsapi.org/v2/top-headlines?category=${categoria}&language=pt&apiKey=${NEWS_API}`
            );

            const artigos = response.data.articles.slice(0, 5); // Limitar a 5 notícias
            if (artigos.length === 0) {
                message.channel.send('Não encontrei notícias nessa categoria.');
                return;
            }

            let reply = "**Últimas Notícias:**\n";
            artigos.forEach((artigo, index) => {
                reply += `\n**${index + 1}. ${artigo.title}**\n${artigo.description || ''}\n[Leia mais](${artigo.url})\n`;
            });

            message.channel.send(reply);
        } catch (error) {
            console.error(error);
            message.channel.send(
                'Houve um erro ao buscar as notícias. Tente novamente mais tarde.'
            );
        }
    }
});

client.login(process.env.TOKEN);