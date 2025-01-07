const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const config = require('../../config.json'); // Contém o prefixo

module.exports = {
    name: 'lfartag',
    description: 'Busca todas as músicas de um artista no repositório',
    async execute(message, args) {
        if (args.length < 1) {
            return message.reply('Você precisa fornecer o nome de um artista.');
        }

        const artist = args.join(' ');
        const githubRepo = 'acsu132/ProjectTag'; // Substitua pelo caminho do seu repositório
        const githubApiUrl = `https://api.github.com/repos/${githubRepo}/contents/Artists/${artist}`;

        try {
            const response = await axios.get(githubApiUrl, {
                headers: { 'Authorization': `token ${process.env.GITHUB_TOKEN}` },
            });

            if (!Array.isArray(response.data)) {
                return message.reply('Artista não encontrado no repositório.');
            }

            const files = response.data.filter(item => item.type === 'file');

            if (files.length === 0) {
                return message.reply('Nenhuma música encontrada para este artista.');
            }

            const fileLinks = files.map(file => `[${file.name}](${file.download_url})`).join('\n');

            const embed = new EmbedBuilder()
                .setTitle(`Músicas de ${artist}`)
                .setDescription(fileLinks)
                .setColor(0x00AE86);

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            return message.reply('Ocorreu um erro ao buscar as músicas. Verifique o nome do artista ou tente novamente mais tarde.');
        }
    },
};
