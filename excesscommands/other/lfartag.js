const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

module.exports = {
    name: 'lfartag',
    description: 'Procura por todas as músicas de um artista no repositório',
    async execute(message, args) {
        const githubToken = process.env.GITHUB_TOKEN;
        const owner = 'acsu132'; // Substitua pelo nome do proprietário do repositório
        const repo = 'ProjectTag'; // Substitua pelo nome do repositório
        const basePath = 'Artists';

        if (!args.length) {
            return message.reply('Por favor, forneça o nome de um artista.');
        }

        const artistName = args.join(' ').toLowerCase(); // Converte o nome do artista para minúsculas

        const headers = {
            Authorization: `Bearer ${githubToken}`,
            'User-Agent': 'DiscordBot',
        };

        try {
            // Faz a requisição para buscar os artistas na pasta 'Artists'
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${basePath}`, { headers });
            const artists = await response.json();

            if (response.status !== 200) {
                console.error(artists.message);
                return message.reply('Ocorreu um erro ao acessar o repositório. Verifique os logs.');
            }

            // Procura pelo artista ignorando maiúsculas/minúsculas
            const matchingArtist = artists.find(artist => artist.name.toLowerCase() === artistName);

            if (!matchingArtist || matchingArtist.type !== 'dir') {
                return message.reply('Artista não encontrado ou inválido. Certifique-se de que o nome está correto.');
            }

            // Busca as músicas na pasta do artista
            const artistPath = matchingArtist.path;
            const artistResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${artistPath}`, { headers });
            const artistContents = await artistResponse.json();

            if (artistResponse.status !== 200) {
                console.error(artistContents.message);
                return message.reply('Erro ao acessar os conteúdos do artista.');
            }

            // Filtra as pastas de álbuns e arquivos de música
            const albumsAndSingles = artistContents.filter(item => item.type === 'dir');
            const musicFiles = artistContents.filter(item => /\.(mp3|wav|m4a|ogg)$/i.test(item.name)); // Arquivos de música

            // Verifica se existe o arquivo artistdesc.txt e artistpfp.png
            const descriptionFile = artistContents.find(item => item.name === 'artistdesc.txt');
            const pfpFile = artistContents.find(item => item.name === 'artistpfp.png');

            // Busca a descrição do artista
            let artistDescription = 'Descrição não disponível.';
            if (descriptionFile) {
                const descResponse = await fetch(descriptionFile.download_url, { headers });
                artistDescription = await descResponse.text();
            }

            // Monta o link da imagem de perfil, se existir
            const artistPfpUrl = pfpFile ? pfpFile.download_url : null;

            // Cria um embed com as informações
            const embed = new EmbedBuilder()
                .setTitle(`Músicas de ${matchingArtist.name}`)
                .setDescription(artistDescription)
                .setThumbnail(artistPfpUrl || 'https://raw.githubusercontent.com/acsu132/ProjectTag/refs/heads/main/Artists/defaultpfp.png') // Use uma imagem padrão caso não exista artistpfp.png
                .setColor('#FF5733');

            // Adiciona os links de download para álbuns e músicas
            if (albumsAndSingles.length > 0) {
           embed.addFields(
    albumsAndSingles.map(album => ({
        name: `Álbum/Pasta: ${album.name}`,
        value: `[Baixar](https://github.com/${owner}/${repo}/tree/main/${album.path.replace(/ /g, '%20')})`,
    }))
);

            if (musicFiles.length > 0) {
                embed.addFields(
    musicFiles.map(file => ({
        name: `Música: ${file.name}`,
        value: `[Baixar](${file.download_url.replace(/ /g, '%20')})`,
    }))
);


            // Retorna o embed no canal
            message.reply({ embeds: [embed] });

        try {
    // Código que pode gerar um erro
} catch (error) {
    console.error("Erro:", error.message);
        }
                
