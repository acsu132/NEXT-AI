const {
    ticketsCollection
} = require('../mongodb');
const {
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    PermissionsBitField,
    ChannelType
} = require('discord.js');
const ticketIcons = require('../UI/icons/ticketicons');

let config = {};

async function loadConfig() {
    try {
        const tickets = await ticketsCollection.find({}).toArray();
        config.tickets = tickets.reduce((acc, ticket) => {
            acc[ticket.serverId] = {
                ticketChannelId: ticket.ticketChannelId,
                adminRoleId: ticket.adminRoleId,
                supportTeamRoleId: ticket.supportTeamRoleId,
                status: ticket.status
            };
            return acc;
        }, {});
    } catch (err) {
        console.error('Erro ao carregar configuração do MongoDB:', err);
    }
}

setInterval(loadConfig, 5000);

module.exports = (client) => {
    client.on('ready', async () => {
        try {
            await loadConfig();
            monitorConfigChanges(client);
        } catch (error) {
            console.error('Erro durante o evento de cliente pronto:', error);
        }
    });

    client.on('interactionCreate', async (interaction) => {
        try {
            if (interaction.isStringSelectMenu() && interaction.customId === 'select_ticket_type') {
                handleSelectMenu(interaction, client);
            } else if (interaction.isButton() && interaction.customId.startsWith('close_ticket_')) {
                handleCloseButton(interaction, client);
            } else if (interaction.isButton() && interaction.customId.startsWith('delete_ticket_')) {
                handleDeleteButton(interaction, client);
            }
        } catch (error) {
            console.error('Erro ao lidar com a interação:', error);
        }
    });
};

async function monitorConfigChanges(client) {
    let previousConfig = JSON.parse(JSON.stringify(config));

    setInterval(async () => {
        try {
            await loadConfig();
            if (JSON.stringify(config) !== JSON.stringify(previousConfig)) {
                for (const guildId of Object.keys(config.tickets)) {
                    const settings = config.tickets[guildId];
                    const previousSettings = previousConfig.tickets[guildId];

                    if (
                        settings &&
                        settings.status &&
                        settings.ticketChannelId &&
                        (!previousSettings || settings.ticketChannelId !== previousSettings.ticketChannelId)
                    ) {
                        const guild = client.guilds.cache.get(guildId);
                        if (!guild) continue;

                        const ticketChannel = guild.channels.cache.get(settings.ticketChannelId);
                        if (!ticketChannel) {
                            // Channel doesn't exist, reset the config
                            await ticketsCollection.updateOne(
                                { serverId: guildId },
                                { $unset: { ticketChannelId: "" } }
                            );
                            continue;
                        }

                        const embed = new EmbedBuilder()
                            .setAuthor({
                                name: "Bem-vindo ao Suporte de Tickets",
                                iconURL: ticketIcons.mainIcon,
                                url: "https://dsc.gg/nextech"
                            })
                            .setDescription(
                                '- Por favor, clique no menu abaixo para criar um novo ticket.\n\n' +
                                '**Diretrizes do Ticket:**\n' +
                                '- Tickets vazios não são permitidos.\n' +
                                '- Por favor, seja paciente enquanto espera por uma resposta da nossa equipe de suporte.'
                            )
                            .setFooter({ text: 'Estamos aqui para ajudar!', iconURL: ticketIcons.modIcon })
                            .setColor('#00FF00')
                            .setTimestamp();

                        const menu = new StringSelectMenuBuilder()
                            .setCustomId('select_ticket_type')
                            .setPlaceholder('Escolha o tipo de ticket')
                            .addOptions([
                                { label: '🆘 Suporte', value: 'support' },
                                { label: '📂 Sugestão', value: 'suggestion' },
                                { label: '💜 Feedback', value: 'feedback' },
                                { label: '⚠️ Reportar', value: 'report' }
                            ]);

                        const row = new ActionRowBuilder().addComponents(menu);

                        try {
                            await ticketChannel.send({
                                embeds: [embed],
                                components: [row]
                            });
                        } catch (sendError) {
                            console.error("Erro ao enviar mensagem do menu de tickets:", sendError);
                        }

                        previousConfig = JSON.parse(JSON.stringify(config));
                    }
                }
            }
        } catch (error) {
            console.error("Erro em monitorConfigChanges:", error);
        }
    }, 5000);
}

async function handleSelectMenu(interaction, client) {
    try {
        await interaction.deferReply({ ephemeral: true });
    } catch (error) {
        console.error("Erro ao adiar resposta:", error);
    }

    const { guild, user, values } = interaction;
    if (!guild || !user) return;

    const guildId = guild.id;
    const userId = user.id;
    const ticketType = values[0];
    const settings = config.tickets[guildId];
    if (!settings) return;

    try {
        const ticketExists = await ticketsCollection.findOne({ guildId, userId });
        if (ticketExists) {
            return interaction.followUp({
                content: 'Você já tem um ticket aberto!!! >:V',
                ephemeral: true
            });
        }
    } catch (error) {
        console.error("Erro ao verificar ticket existente:", error);
    }

    let ticketChannel;
    try {
        ticketChannel = await guild.channels.create({
            name: `${user.username}-${ticketType}-ticket`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone,
                    deny: [PermissionsBitField.Flags.ViewChannel]
                },
                {
                    id: userId,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                },
                {
                    id: settings.adminRoleId,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                },
                {
                    id: settings.supportTeamRoleId,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                }
            ]
        });
    } catch (error) {
        console.error("Erro ao criar canal de ticket:", error);
        return interaction.followUp({
            content: "Não consegui criar o ticket, contate um administrador :(",
            ephemeral: true
        });
    }

    const ticketId = `${guildId}-${ticketChannel.id}`;
    try {
        await ticketsCollection.insertOne({ id: ticketId, channelId: ticketChannel.id, guildId, userId, type: ticketType });
    } catch (error) {
        console.error("Erro ao inserir ticket no banco de dados:", error);
    }

    const ticketEmbed = new EmbedBuilder()
        .setAuthor({
            name: "Ticket de Suporte",
            iconURL: ticketIcons.modIcon,
            url: "https://dsc.gg/nextech"
        })
        .setDescription(
            `Olá ${user}, Bem-vindo ao seu ticket!\n- Por favor, descreva seu problema\n- Você receberá uma resposta em breve.\n- Sinta-se livre para abrir outro ticket se este for fechado.`
        )
        .setFooter({ text: 'Sua satisfação é nossa prioridade.', iconURL: ticketIcons.heartIcon })
        .setColor('#9900FF')
        .setTimestamp();

    const closeButton = new ButtonBuilder()
        .setCustomId(`close_ticket_${ticketId}`)
        .setLabel('Fechar Ticket')
        .setStyle(ButtonStyle.Danger);

    const deleteButton = new ButtonBuilder()
        .setCustomId(`delete_ticket_${ticketId}`)
        .setLabel('Excluir Ticket')
        .setStyle(ButtonStyle.Danger);

    const actionRow = new ActionRowBuilder().addComponents(closeButton, deleteButton);

    try {
        await ticketChannel.send({
            content: `${user}`,
            embeds: [ticketEmbed],
            components: [actionRow]
        });
    } catch (error) {
        console.error("Erro ao enviar mensagem no canal de ticket:", error);
    }

    const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setAuthor({
            name: "Ticket Criado!",
            iconURL: ticketIcons.correctIcon,
            url: "https://dsc.gg/nextech"
        })
        .setDescription(`- Seu ticket de ${ticketType} foi criado.`)
        .addFields(
            { name: 'Canal do Ticket', value: `${ticketChannel.url}` },
            { name: 'Instruções', value: 'Por favor, detalhe seu problema.' }
        )
        .setTimestamp()
        .setFooter({ text: 'Obrigado por nos contatar :P', iconURL: ticketIcons.modIcon });

    try {
        await user.send({
            content: `Seu ticket de ${ticketType} foi criado.`,
            embeds: [embed]
        });
    } catch (error) {
        console.error("Erro ao enviar DM para o usuário:", error);
    }

    try {
        await interaction.followUp({
            content: 'Ticket criado!',
            ephemeral: true
        });
    } catch (error) {
        console.error("Erro ao enviar mensagem de acompanhamento:", error);
    }
}

async function handleCloseButton(interaction, client) {
    try {
        await interaction.deferReply({ ephemeral: true });
    } catch (error) {
        console.error("Erro ao adiar resposta no botão de fechar:", error);
    }

    const ticketId = interaction.customId.replace('close_ticket_', '');
    const { guild, user } = interaction;
    if (!guild || !user) return;

    let ticket;
    try {
        ticket = await ticketsCollection.findOne({ id: ticketId });
    } catch (error) {
        console.error("Erro ao encontrar ticket no banco de dados:", error);
    }
    if (!ticket) {
        return interaction.followUp({
            content: 'Ticket não encontrado, reporte o bug para o Administrador.',
            ephemeral: true
        });
    }

    const ticketChannel = guild.channels.cache.get(ticket.channelId);

    if (ticketChannel) {
        if (user.id === ticket.userId || guild.members.cache.get(user.id).roles.cache.has(ticket.adminRoleId)) {
            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setAuthor({
                    name: "Ticket fechado!",
                    iconURL: ticketIcons.correctrIcon,
                    url: "https://dsc.gg/nextech"
                })
                .setDescription(`- Seu ticket foi fechado.`)
                .setTimestamp()
                .setFooter({ text: 'Obrigado por nos contatar :P', iconURL: ticketIcons.modIcon });

            try {
                await ticketChannel.send({
                    content: 'Este ticket foi fechado.',
                    embeds: [embed]
                });
            } catch (error) {
                console.error("Erro ao enviar mensagem de fechamento no canal do ticket:", error);
            }

            setTimeout(async () => {
                try {
                    await ticketChannel.permissionOverwrites.edit(ticket.userId, { ViewChannel: false });
                    await ticketChannel.permissionOverwrites.edit(ticket.adminRoleId, { ViewChannel: true });
                    await ticketChannel.permissionOverwrites.edit(ticket.supportTeamRoleId, { ViewChannel: true });
                } catch (error) {
                    console.error("Erro ao editar permissões do canal do ticket:", error);
                }
            }, 5000);
        }
    }

    try {
        await ticketsCollection.updateOne({ id: ticketId }, { $set: { closed: true } });
    } catch (error) {
        console.error("Erro ao atualizar status do ticket no banco de dados:", error);
    }

    let ticketUser;
    try {
        ticketUser = await client.users.fetch(ticket.userId);
    } catch (error) {
        console.error("Erro ao buscar usuário do ticket:", error);
    }
    if (ticketUser) {
        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setAuthor({
                name: "Ticket fechado!",
                iconURL: ticketIcons.correctrIcon,
                url: "https://dsc.gg/nextech"
            })
            .setDescription(`- Seu ticket foi fechado.`)
            .setTimestamp()
            .setFooter({ text: 'Obrigado por nos contatar :P', iconURL: ticketIcons.modIcon });

        try {
            await ticketUser.send({
                content: `Seu ticket foi fechado.`,
                embeds: [embed]
            });
        } catch (error) {
            console.error("Erro ao enviar DMs ao usuário:", error);
        }
    }

    try {
        await interaction.followUp({
            content: 'Ticket fechado e usuário notificado.',
            ephemeral: true
        });
    } catch (error) {
        console.error("Erro ao enviar mensagem de acompanhamento para fechamento do ticket:", error);
    }
}

async function handleDeleteButton(interaction, client) {
    const ticketId = interaction.customId.replace('delete_ticket_', '');
    const { guild, user } = interaction;
    if (!guild || !user) return;

    let ticket;
    try {
        ticket = await ticketsCollection.findOne({ id: ticketId });
    } catch (error) {
        console.error("Erro ao encontrar ticket no banco de dados:", error);
        return interaction.reply({ content: 'Ticket não encontrado, reporte o bug para o Administrador.', ephemeral: true });
    }

    if (!guild.members.cache.get(user.id).roles.cache.has(ticket.adminRoleId)) {
        return interaction.reply({ content: 'Você não tem permissão para deletar este ticket.', ephemeral: true });
    }

    const ticketChannel = guild.channels.cache.get(ticket.channelId);

    if (ticketChannel) {
        try {
            await ticketChannel.delete();
        } catch (error) {
            console.error("Erro ao deletar canal do ticket:", error);
            return interaction.reply({
                content: "Não consegui deletar o ticket, contate um administrador :(",
                ephemeral: true
            });
        }
    }

    try {
        await ticketsCollection.deleteOne({ id: ticketId });
    } catch (error) {
        console.error("Erro ao deletar ticket no banco de dados:", error);
        return interaction.reply({ content: 'Erro ao deletar dados do ticket.', ephemeral: true });
    }

    try {
        await interaction.reply({ content: 'Ticket deletado com sucesso.', ephemeral: true });
    } catch (error) {
        console.error("Erro ao enviar mensagem de acompanhamento para deletar o ticket:", error);
    }
}
