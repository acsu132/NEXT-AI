const { EmbedBuilder } = require('discord.js');
const axios = require('axios'); // Para acessar a API do YouTube
let youtubeCollection;

async function checkForNewVideos(client) {
    try {
        const configs = await youtubeCollection.find().toArray();

        for (const config of configs) {
            const { notificationChannelId, channelId, lastVideoId } = config;

            // Fetch latest videos from YouTube API
            const response = await axios.get(
                `https://www.googleapis.com/youtube/v3/search?key=${process.env.YT_API_KEY}&channelId=${channelId}&part=snippet,id&order=date&maxResults=1`
            );

            const latestVideo = response.data.items[0];
            if (latestVideo && latestVideo.id.videoId !== lastVideoId) {
                const embed = new EmbedBuilder()
                    .setTitle(latestVideo.snippet.title)
                    .setURL(`https://www.youtube.com/watch?v=${latestVideo.id.videoId}`)
                    .setDescription(latestVideo.snippet.description)
                    .setThumbnail(latestVideo.snippet.thumbnails.high.url)
                    .setTimestamp()
                    .setFooter({ text: 'Novo vídeo no YouTube!' });

                const channel = client.channels.cache.get(notificationChannelId);
                if (channel) {
                    await channel.send({ embeds: [embed] });
                    // Update the database with the new video ID
                    await youtubeCollection.updateOne(
                        { channelId },
                        { $set: { lastVideoId: latestVideo.id.videoId } }
                    );
                }
            }
        }
    } catch (err) {
        console.error('Erro ao verificar novos vídeos do YouTube:', err);
    }
}

module.exports = {
    init(client, collection) {
        youtubeCollection = collection;

        setInterval(() => {
            checkForNewVideos(client);
        }, 60000); // Verifica novos vídeos a cada 60 segundos
    },
};
