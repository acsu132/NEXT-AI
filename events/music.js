const { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActivityType } = require('discord.js');
const config = require('../config.json');
const { dynamicCard } = require("../UI/dynamicCard");
const path = require('path');
const musicIcons = require('../UI/icons/musicicons');
const { Riffy } = require('riffy');
const { autoplayCollection } = require('../mongodb');
const axios = require('axios');
const fs = require('fs');

module.exports = (client) => {
    if (config.excessCommands.lavalink) {
        const nodes = [
            {
                host: config.lavalink.lavalink.host,
                password: config.lavalink.lavalink.password,
                port: config.lavalink.lavalink.port,
                secure: config.lavalink.lavalink.secure
            }
        ];

        client.riffy = new Riffy(client, nodes, {
            send: (payload) => {
                const guild = client.guilds.cache.get(payload.d.guild_id);
                if (guild) guild.shard.send(payload);
            },
            defaultSearchPlatform: "ytmsearch",
            restVersion: "v4",
        });

        client.riffy.on('nodeConnect', (node) => {
            console.log(`[ LAVALINK CONNECTION ] Node connected: ${node.name}`);
        });

        client.riffy.on('nodeError', (node, error) => {
            console.error(`[ LAVALINK ] Node ${node.name} had an error: ${error.message}`);
        });

        client.riffy.on('trackStart', async (player, track) => {
            const channel = client.channels.cache.get(player.textChannel);

            // Update bot status to "Listening to (Track Name)"
            client.user.setPresence({
                activities: [{ name: `♫ ${track.info.title}`, type: ActivityType.Listening }],
                status: 'online',
            });

            const formatTime = (ms) => {
                if (!ms || ms === 0) return "0:00";
                const totalSeconds = Math.floor(ms / 1000);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                return `${hours > 0 ? hours + ":" : ""}${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
            };

            try {
                // Disable previous message's buttons if it exists.
                if (player.currentMessageId) {
                    try {
                        const oldMessage = await channel.messages.fetch(player.currentMessageId);
                        if (oldMessage) {
                            const disabledComponents = oldMessage.components.map(row => 
                                new ActionRowBuilder().addComponents(
                                    row.components.map(button => ButtonBuilder.from(button).setDisabled(true))
                                )
                            );
                            await oldMessage.edit({ components: disabledComponents });
                        }
                    } catch (err) {
                        console.warn("Previous message not found (likely deleted), skipping edit.");
                    }
                }

                // Generate the song card image.
                const cardImage = await dynamicCard({
                    thumbnailURL: track.info.thumbnail,
                    songTitle: track.info.title,
                    songArtist: track.info.author,
                    trackRequester: track.requester ? track.requester.username : "Next AI",
                    fontPath: path.join(__dirname, "../UI", "fonts", "AfacadFlux-Regular.ttf"),
                    backgroundColor: "#FF00FF",
                });

                const attachment = new AttachmentBuilder(cardImage, { name: 'songcard.png' });

                const description = `- Título: ${track.info.title} \n` +
                    ` - Artista: ${track.info.author} \n` +
                    ` - Duração: ${formatTime(track.info.length)} (\`${track.info.length}ms\`) \n` +
                    ` - Stream: ${track.info.stream ? "Sim" : "Não"} \n` +
                    ` - Pesquisável: ${track.info.seekable ? "Sim" : "Não"} \n` +
                    ` - URI: [Link](${track.info.uri}) \n` +
                    ` - Fonte: ${track.info.sourceName} \n` +
                    ` - Pedido por: ${track.requester ? `<@${track.requester.id}>` : "Unknown"}` +
                    "\n\n**Lyrics**: Fetching lyrics...";

                const embed = new EmbedBuilder()
                    .setAuthor({ name: "Tocando agora...", iconURL: musicIcons.playerIcon, url: "https://dsc.gg/nextech" })
                    .setDescription(description)
                    .setImage('attachment://songcard.png')
                    .setFooter({ text: 'Distube Player', iconURL: musicIcons.footerIcon })
                    .setColor('#9900ff');

                // Conditionally create buttons only if track.requester is defined.
                const components = track.requester && track.requester.id ? [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`volume_up_${track.requester.id}`).setEmoji('🔊').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`volume_down_${track.requester.id}`).setEmoji('🔉').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`pause_${track.requester.id}`).setEmoji('⏸️').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`resume_${track.requester.id}`).setEmoji('▶️').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`skip_${track.requester.id}`).setEmoji('⏭️').setStyle(ButtonStyle.Secondary)
                    ),
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`stop_${track.requester.id}`).setEmoji('⏹️').setStyle(ButtonStyle.Danger),
                        new ButtonBuilder().setCustomId(`clear_queue_${track.requester.id}`).setEmoji('🗑️').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`show_queue_${track.requester.id}`).setEmoji('📜').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`shuffle_${track.requester.id}`).setEmoji('🔀').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`loop_${track.requester.id}`).setEmoji('🔁').setStyle(ButtonStyle.Secondary)
                    )
                ] : [];

                const message = await channel.send({
                    embeds: [embed],
                    files: [attachment],
                    components: components
                });

                player.currentMessageId = message.id;

                // Fetch the lyrics using lrclib
                const apiUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(track.info.title)}&artist_name=${encodeURIComponent(track.info.author)}`;
                const response = await axios.get(apiUrl);

                if (!response.data || !response.data.syncedLyrics) {
                    embed.setDescription(description.replace('Fetching lyrics...', 'No lyrics found.'));
                    return message.edit({ embeds: [embed] });
                }

                const lyrics = response.data.syncedLyrics;
                const parsedLyrics = lyrics.split('\n').map(line => {
                    const match = line.match(/\[(\d{2}:\d{2}.\d{2})\](.*)/);
                    return match ? { time: match[1], text: match[2] } : null;
                }).filter(line => line);

                const parseTime = (time) => {
                    const [minutes, seconds] = time.split(':').map(parseFloat);
                    return (minutes * 60 + seconds) * 1000;
                };

                const getCurrentLyric = (lyrics, currentTime) => {
                    for (let i = lyrics.length - 1; i >= 0; i--) {
                        if (currentTime >= parseTime(lyrics[i].time)) {
                            return lyrics[i].text;
                        }
                    }
                    return '';
                };

                let currentLyric = getCurrentLyric(parsedLyrics, player.position);
                embed.setDescription(description.replace('Fetching lyrics...', `**Lyrics**: ${currentLyric}`));
                await message.edit({ embeds: [embed] });

                const interval = setInterval(async () => {
                    if (!player || !player.playing) {
                        clearInterval(interval);
                        return;
                    }
                    const currentTime = player.position;
                    currentLyric = getCurrentLyric(parsedLyrics, currentTime);
                    embed.setDescription(description.replace(/(\*\*Lyrics\*\*: ).*/, `**Lyrics**: ${currentLyric}`));
                    try {
                        await message.edit({ embeds: [embed] });
                    } catch (err) {
                        console.warn("Failed to edit message, it might have been deleted.");
                        clearInterval(interval);
                    }
                }, 100); // Update every 100ms for better synchronization

                player.on('trackEnd', () => {
                    clearInterval(interval);
                });

            } catch (error) {
                console.error('Error creating or sending song card:', error);
            }
        });

        client.riffy.on('trackEnd', async (player, track) => {
            const channel = client.channels.cache.get(player.textChannel);
            if (player.currentMessageId) {
                try {
                    const oldMessage = await channel.messages.fetch(player.currentMessageId);
                    if (oldMessage) await oldMessage.delete();
                } catch (err) {
                    console.error("Failed to delete finished song message:", err);
                }
            }

            if (!player.queue || player.queue.length === 0) {
                client.user.setPresence({
                    activities: [{ name: 'YouTube Music', type: ActivityType.Watching }],
                    status: 'online',
                });
            }
        });

        client.riffy.on("queueEnd", async (player) => {
            const channel = client.channels.cache.get(player.textChannel);
            const guildId = player.guildId;

            const result = await autoplayCollection.findOne({ guildId });
            const autoplay = result ? result.autoplay : false;

            if (autoplay) {
                player.autoplay(player);
            } else {
                player.destroy();
                channel.send("A fila acabou.");
            }
            if (player.currentMessageId) {
                setTimeout(async () => {
                    try {
                        const finalMessage = await channel.messages.fetch(player.currentMessageId);
                        if (finalMessage) {
                            await finalMessage.delete();
                        }
                    } catch (err) {
                        console.error("Error deleting final embed message:", err);
                    }
                }, 2000);
            }

            client.user.setPresence({
                activities: [{ name: 'YouTube Music', type: ActivityType.Watching }],
                status: 'online',
            });
        });

        client.on('interactionCreate', async (interaction) => {
            if (!interaction.isButton()) return;

            const [action, userId] = interaction.customId.split('_').slice(-2);

            if (interaction.user.id !== userId) {
                return;
            }

            const player = client.riffy.players.get(interaction.guildId);
            if (!player) return;

            await interaction.deferReply({ ephemeral: true });

            try {
                switch (action) {
                    case 'volume_up':
                        player.setVolume(Math.min(player.volume + 10, 100));
                        await interaction.editReply('🔊 Volume aumentado!');
                        break;

                    case 'volume_down':
                        player.setVolume(Math.max(player.volume - 10, 0));
                        await interaction.editReply('🔉 Volume diminuido!');
                        break;

                    case 'pause':
                        player.pause(true);
                        await interaction.editReply('⏸️ Player pausado.');
                        break;

                    case 'resume':
                        player.pause(false);
                        await interaction.editReply('▶️ Player resumido.');
                        break;

                    case 'skip':
                        player.stop();
                        await interaction.editReply('⏭️ Pulando para a próxima música!');
                        break;

                    case 'stop': {
                        const channel = client.channels.cache.get(player.textChannel);
                        if (player.currentMessageId) {
                            try {
                                const finalMessage = await channel.messages.fetch(player.currentMessageId);
                                if (finalMessage) await finalMessage.delete();
                            } catch (deleteErr) {
                                try {
                                    const finalMessage = await channel.messages.fetch(player.currentMessageId);
                                    if (finalMessage) {
                                        const disabledComponents = finalMessage.components.map(row =>
                                            new ActionRowBuilder().addComponents(
                                                row.components.map(component =>
                                                    ButtonBuilder.from(component).setDisabled(true)
                                                )
                                            )
                                        );
                                        await finalMessage.edit({ components: disabledComponents });
                                    }
                                } catch (editErr) {
                                    console.error("Failed to disable buttons:", editErr);
                                }
                            }
                        }
                        player.destroy();
                        await interaction.editReply('Parei a música, desconectandooo :P');
                        break;
                    }

                    case 'clear_queue':
                        player.queue.clear();
                        await interaction.editReply('🗑️Fila engolida com sucesso 😋.');
                        break;

                    case 'shuffle':
                        player.queue.shuffle();
                        await interaction.editReply('🔀 Fila misturada!');
                        break;

                    case 'loop':
                        const loopMode = player.loop === 'none' ? 'track' : player.loop === 'track' ? 'queue' : 'none';
                        player.setLoop(loopMode);
                        await interaction.editReply(`🔁 Modo loop definido como: **${loopMode}**.`);
                        break;

                    case 'show_queue':
                        if (!player.queue || player.queue.length === 0) {
                            await interaction.editReply('❌ A fila está vazia.');
                        } else {
                            const queueStr = player.queue
                                .map((track, i) => `${i + 1}. **${track.info.title}**`)
                                .join('\n');
                            await interaction.editReply(`🎶 **Fila:**\n${queueStr}`);
                        }
                        break;

                    default:
                        await interaction.editReply('❌ Ação desconhecida.');
                        break;
                }
            } catch (error) {
                await interaction.editReply('❌ Algo deu errado.');
            }
        });

        client.on('raw', d => client.riffy.updateVoiceState(d));
        client.once('ready', () => {
            client.riffy.init(client.user.id);
        });
    } else {
        console.log('[ MUSIC ] Lavalink Music System Disabled ❌');
    }
};
