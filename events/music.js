const { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActivityType } = require('discord.js');
const config = require('../config.json');
const { dynamicCard } = require("../UI/dynamicCard");
const path = require('path');
const musicIcons = require('../UI/icons/musicicons');
const { Riffy } = require('riffy');
const { autoplayCollection } = require('../mongodb');

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
            console.log(`\x1b[34m[ LAVALINK CONNECTION ]\x1b[0m Node connected: \x1b[32m${node.name}\x1b[0m`);
        });

        client.riffy.on('nodeError', (node, error) => {
            console.error(`\x1b[31m[ LAVALINK ]\x1b[0m Node \x1b[32m${node.name}\x1b[0m had an error: \x1b[33m${error.message}\x1b[0m`);
        });

        client.riffy.on('trackStart', async (player, track) => {
            const channel = client.channels.cache.get(player.textChannel);

            // Update bot status to "Listening to (Track Name)"
            client.user.setPresence({
                activities: [{ name: `♫ ${track.info.title}`, type: ActivityType.Listening }],
                status: 'online',
            });

            function formatTime(ms) {
                if (!ms || ms === 0) return "0:00";
                const totalSeconds = Math.floor(ms / 1000);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                return `${hours > 0 ? hours + ":" : ""}${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
            }

            try {
                // Disable previous message's buttons if it exists.
                if (player.currentMessageId) {
                    try {
                        const oldMessage = await channel.messages.fetch(player.currentMessageId);
                        if (oldMessage) {
                            const disabledComponents = oldMessage.components.map(row => {
                                return new ActionRowBuilder().addComponents(
                                    row.components.map(button => ButtonBuilder.from(button).setDisabled(true))
                                );
                            });
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

                const description = `- Título: ${track.info.title} \n`+
                ` - Artista: ${track.info.author} \n`+
                ` - Duração: ${formatTime(track.info.length)} (\`${track.info.length}ms\`) \n`+
                ` - Stream: ${track.info.stream ? "Sim" : "Não"} \n`+
                ` - Pesquisável: ${track.info.seekable ? "Sim" : "Não"} \n`+
                ` - URI: [Link](${track.info.uri}) \n`+
                ` - Fonte: ${track.info.sourceName} \n`+ 
                ` - Pedido por: ${track.requester ? `<@${track.requester.id}>` : "Unknown"}`; 
                
                const embed = new EmbedBuilder()
                    .setAuthor({ name: "Tocando agora...", iconURL: musicIcons.playerIcon, url: "https://dsc.gg/nextech" })
                    .setDescription(description)
                    .setImage('attachment://songcard.png')
                    .setFooter({ text: 'Distube Player', iconURL: musicIcons.footerIcon })
                    .setColor('#9900ff');

                // Conditionally create buttons only if track.requester is defined.
                let components = [];
                if (track.requester && track.requester.id) {
                    const buttonsRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`volume_up_${track.requester.id}`).setEmoji('🔊').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`volume_down_${track.requester.id}`).setEmoji('🔉').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`pause_${track.requester.id}`).setEmoji('⏸️').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`resume_${track.requester.id}`).setEmoji('▶️').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`skip_${track.requester.id}`).setEmoji('⏭️').setStyle(ButtonStyle.Secondary)
                    );

                    const buttonsRow2 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`stop_${track.requester.id}`).setEmoji('⏹️').setStyle(ButtonStyle.Danger),
                        new ButtonBuilder().setCustomId(`clear_queue_${track.requester.id}`).setEmoji('🗑️').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`show_queue_${track.requester.id}`).setEmoji('📜').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`shuffle_${track.requester.id}`).setEmoji('🔀').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId(`loop_${track.requester.id}`).setEmoji('🔁').setStyle(ButtonStyle.Secondary)
                    );

                    components = [buttonsRow, buttonsRow2];
                }
                // If track.requester is undefined (for autoplay songs), no buttons are added.

                const message = await channel.send({
                    embeds: [embed],
                    files: [attachment],
                    components: components
                });

                player.currentMessageId = message.id;
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

            // Check if there are more tracks in the queue
            if (!player.queue || player.queue.length === 0) {
                // Update bot status back to default
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
                            //console.log("Final embed message has been deleted after delay.");
                        }
                    } catch (err) {
                        //console.error("Error deleting final embed message:", err);
                    }
                }, 2000); 
            }

            // Update bot status back to default
            client.user.setPresence({
                activities: [{ name: 'YouTube Music', type: ActivityType.Watching }],
                status: 'online',
            });
        });

        client.on('interactionCreate', async (interaction) => {
            if (!interaction.isButton()) return;
        
            const parts = interaction.customId.split('_');
            const userId = parts.pop();        
            const action = parts.join('_');   
        
            if (interaction.user.id !== userId) {
                return;
            }
        
            const player = client.riffy.players.get(interaction.guildId);
            if (!player) return;
        
            // Defer the reply first
            await interaction.deferReply({ flags : 64 });
        
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
                //console.error('Error handling button interaction:', error);
                await interaction.editReply('❌ Algo deu errado.');
            }
        });

        client.on('raw', d => client.riffy.updateVoiceState(d));
        client.once('ready', () => {
            //console.log('\x1b[35m[ MUSIC 2 ]\x1b[0m', '\x1b[32mLavalink Music System Active ✅\x1b[0m');
            client.riffy.init(client.user.id);
        });
    } else {
        console.log('\x1b[31m[ MUSIC ]\x1b[0m Lavalink Music System Disabled ❌');
    }
};
