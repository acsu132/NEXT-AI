const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const lang = require('../../events/loadLanguage');

module.exports = {
    name: 'lfartag',
    description: lang.lfartagDescription,
    async execute(message, args) {
        const artist = args[0];  // O nome do artista
        if (!artist) return message.reply(lang.lfartagNoArtist);  // Mensagem de erro se o artista não for informado

        try {
            // A URL base do repositório no GitHub onde as músicas estão armazenadas
            const githubRepo = `https://api./github.com/acsu132/ProjectTag/tree/main/Artists/${artist}`;
            const response = await axios.get(githubRepo);

            if (response.status === 200) {
                // Tipos de arquivos de música suportados
                const supportedFormats = ['.mp3', '.flac', '.wav', '.ogg', '.aac', '.m4a'];

                // Filtra arquivos com extensões de música
                const musicList = response.data.filter(file => supportedFormats.some(format => file.name.endsWith(format)));

                if (musicList.length === 0) {
                    return message.reply(lang.lfartagNoMusicFound);  // Se não encontrar músicas, avisa o usuário
                }

                // Gera a lista de links para as músicas
                const musicLinks = musicList.map(file => file.download_url).join('\n');

                const embed = new EmbedBuilder()
                    .setTitle(`${lang.lfartagTitle} ${artist}`)
                    .setDescription(`${lang.lfartagMusicFound}\n${musicLinks}`)
                    .setColor('#00FF00');

                message.reply({ embeds: [embed] });  // Envia a resposta para o usuário
            } else {
                message.reply(lang.lfartagError);  // Mensagem de erro caso a requisição falhe
            }
        } catch (error) {
            console.error(error);
            message.reply(lang.lfartagError);  // Mensagem de erro geral
        }
    },
};
