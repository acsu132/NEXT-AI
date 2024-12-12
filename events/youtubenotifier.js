const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { youtubeCollection } = require('../mongodb');

async function loadYoutubeConfig() {
    try {
        const configs = await youtubeCollection.find().toArray();
        return configs.reduce((acc, config) => {
            acc[config.serverId] = config;
            return acc;
        }, {});
    } catch (err) {
        return {};
    }
}

module.exports = async (client) => {
    let youtubeConfig = await loadYoutubeConfig();
    const CHECK_INTERVAL = 60000; // 1 minuto
    const apiKey = 'AIzaSyDMqOiKFqv49wI5wQBZkRD0ncDaB991Ifc'; // Substitua pela sua API do YouTube
    const youtubeChannelId = 'UCZmMa-NeAKYc6w-rNzNypxQ'; // Substitua pelo ID do canal

    setInterval(async () => {
        youtubeConfig = await loadYoutubeConfig();
    }, 5000);

    setInterval(async () => {
        for (const guildId in youtubeConfig) {
            const settings = youtubeConfig[guildId];
            if (settings && settings.status) {
                const youtubeChannel = settings.youtubeChannelId || youtubeChannelId;
                const notificationChannel = client.channels.cache.get(settings.notificationChannelId);

                if (notificationChannel) {
                    try {
                        const response = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
                            params: {
                                part: 'snippet',
                                channelId: youtubeChannel,
                                maxResults: 1,
                                order: 'date',
                                type: 'video',
                                key: apiKey,
                            },
                        });

                        const latestVideo = response.data.items[0];
                        const videoId = latestVideo.id.videoId;

                        if (settings.lastVideoId !== videoId) {
                            settings.lastVideoId = videoId;

                            await youtubeCollection.updateOne(
                                { serverId: guildId },
                                { $set: { lastVideoId: videoId } }
                            );

                            const embed = new EmbedBuilder()
                                .setTitle(latestVideo.snippet.title)
                                .setURL(`https://www.youtube.com/watch?v=${videoId}`)
                                .setDescription(latestVideo.snippet.description || 'Sem descrição.')
                                .setThumbnail(latestVideo.snippet.thumbnails.high.url)
                                .setColor('#FF0000')
                                .setAuthor({
                                    name: latestVideo.snippet.channelTitle,
                                    iconURL: 'https://www.youtube.com/favicon.ico',
                                    url: `https://www.youtube.com/channel/${youtubeChannel}`,
                                })
                                .setTimestamp(new Date(latestVideo.snippet.publishedAt));

                            notificationChannel.send({
                                content: `Novo vídeo no canal! Confira aqui:`,
                                embeds: [embed],
                            });
                        }
                    } catch (err) {
                        console.error(`Erro ao buscar vídeos do YouTube:`, err);
                    }
                }
            }
        }
    }, CHECK_INTERVAL);
};
