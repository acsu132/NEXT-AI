const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { ticketsCollection } = require('../../mongodb');
const cmdIcons = require('../../UI/icons/commandicons');
const { serverConfigCollection } = require('../../mongodb'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setticketchannel')
        .setDescription('Set or view the ticket channel configuration for a server')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)

        // Set ticket channel configuration
        .addSubcommand(sub =>
            sub.setName('set')
                .setDescription('Set the ticket channel for the server')
                .addStringOption(option =>
                    option.setName('serverid')
                        .setDescription('The ID of the server')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('channelid')
                        .setDescription('The ID of the ticket channel')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('adminroleid')
                        .setDescription('The ID of the admin role for tickets')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('supportteamrole')
                        .setDescription('The ID of the support team role')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('status')
                        .setDescription('Enable or disable the ticket system')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('categoryid')
                        .setDescription('The ID of the category for the ticket channel')
                        .setRequired(false))
        )

        // View ticket channel configuration
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View the current ticket channel setup')
                .addStringOption(option =>
                    option.setName('serverid')
                        .setDescription('The ID of the server')
                        .setRequired(true))
        ),

    async execute(interaction) {
        if (interaction.isCommand && interaction.isCommand()) {
            const subcommand = interaction.options.getSubcommand();
            const serverId = interaction.options.getString('serverid');
            const guild = interaction.guild;

            if (serverId !== guild.id) {
                return interaction.reply({ content: 'The server ID provided does not match this server.', flags: 64 });
            }

            const configMangerData = await serverConfigCollection.findOne({ serverId });
            const botManagers = configMangerData ? configMangerData.botManagers || [] : [];
  
            if (!botManagers.includes(interaction.user.id) && interaction.user.id !== guild.ownerId) {
                return interaction.reply({ 
                    content: '❌ Only the **server owner** or **bot managers** can use this command.', 
                    flags: 64
                });
            }

            const configData = await ticketsCollection.findOne({ serverId });

            if (subcommand === 'set') {
                const channelId = interaction.options.getString('channelid');
                const adminRoleId = interaction.options.getString('adminroleid');
                const supportTeamRoleId = interaction.options.getString('supportteamrole');
                const status = interaction.options.getBoolean('status');
                const categoryId = interaction.options.getString('categoryid');

                if (!serverId || !channelId || !adminRoleId || !supportTeamRoleId || status === null) {
                    return interaction.reply({ content: 'Invalid input. Please provide valid server ID, channel ID, admin role ID, support team role ID, and status.', flags: 64 });
                }

                // Check permissions: Only the server owner or assigned owners can modify settings.
                const serverOwnerId = guild.ownerId;
                // Update the database
                await ticketsCollection.updateOne(
                    { serverId },
                    { $set: { serverId, ticketChannelId: channelId, adminRoleId, supportTeamRoleId, status, categoryId, ownerId: serverOwnerId } },
                    { upsert: true }
                );

                return interaction.reply({ content: `Ticket channel updated successfully for server ID ${serverId}.`, flags: 64 });

            } else if (subcommand === 'view') {

                if (!configData) {
                    return interaction.reply({ content: 'No ticket system configuration found for this server.', flags: 64 });
                }

                // Create an embed with server configuration details
                const embed = new EmbedBuilder()
                    .setColor('#3498db')
                    .setTitle('Ticket System Configuration')
                    .setDescription(`
                        **Server ID:** ${configData.serverId}
                        **Ticket Channel ID:** ${configData.ticketChannelId}
                        **Admin Role ID:** ${configData.adminRoleId}
                        **Support Team Role ID:** ${configData.supportTeamRoleId}
                        **Status:** ${configData.status ? 'Enabled' : 'Disabled'}
                        **Category ID:** ${configData.categoryId || 'None'}
                    `)
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], flags: 64 });
            }
        } else {
            // Not a slash command usage.
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setAuthor({
                    name: "Alert!",
                    iconURL: cmdIcons.dotIcon,
                    url: "https://discord.gg/xQF9f9yUEM"
                })
                .setDescription('- This command can only be used through slash commands!\n- Please use `/setticketchannel`')
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }
    }
};
