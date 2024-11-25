const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const axios = require("axios");
const { MongoClient } = require("mongodb");
require("dotenv").config();

// Configurações
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const mongoUri = process.env.MONGODB_URI;
const githubToken = process.env.GITHUB_TOKEN;
const channelId = process.env.NEWS_CHANNEL_ID; // ID do canal de notícias

// Conexão com MongoDB
const mongoClient = new MongoClient(mongoUri);
let db;

// Evento quando o bot está pronto
client.once("ready", async () => {
  console.log(`Bot conectado como ${client.user.tag}`);
  db = mongoClient.db("discordBot").collection("postedNews");

  // Busca e publica notícias a cada 1 hora
  setInterval(postNews, 60 * 60 * 1000); // 1 hora
});

// Função para buscar e publicar notícias
async function postNews() {
  const query = "android";
  const url = `https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc`;

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${githubToken}` },
    });

    const news = response.data.items.slice(0, 5); // Obtém as 5 principais
    const channel = await client.channels.fetch(channelId);

    for (const item of news) {
      const exists = await db.findOne({ id: item.id });
      if (!exists) {
        const embed = new EmbedBuilder()
          .setTitle(item.name)
          .setURL(item.html_url)
          .setDescription(item.description || "Sem descrição")
          .addFields({ name: "Estrelas", value: `${item.stargazers_count}`, inline: true })
          .setFooter({ text: "Fonte: GitHub" })
          .setColor("GREEN");

        await channel.send({ embeds: [embed] });
        await db.insertOne({ id: item.id }); // Marca a notícia como publicada
        break; // Envia apenas uma notícia por hora
      }
    }
  } catch (error) {
    console.error("Erro ao buscar notícias:", error);
  }
}

// Login do bot
client.login(process.env.DISCORD_BOT_TOKEN);
