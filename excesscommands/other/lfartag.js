const axios = require('axios');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'lfartag',
    description: 'Busca por um artista no repositório.',
    execute: async (message, args) => {
        const artistName = args.join(' ');
        const owner = 'acsu132'; // Substitua pelo dono do repositório
        const repo = 'ProjectTag'; // Substitua pelo nome do repositório
        const githubToken = process.env.GITHUB_TOKEN;

        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/Artists/${encodeURIComponent(artistName)}`;
        try {
            const { data } = await axios.get(apiUrl, {
                headers: { Authorization: `token ${githubToken}` },
            });

            if (!Array.isArray(data)) {
                message.reply('Artista não encontrado.');
                return;
            }

            // Procura o arquivo de descrição e miniatura
            const descriptionFile = data.find(file => file.name === 'artistdesc.txt');
            const thumbnailFile = data.find(file => file.name === 'artistpfp.png');

            let description = 'Descrição não disponível.';
            let thumbnailUrl = null;

            if (descriptionFile) {
                const descResponse = await axios.get(descriptionFile.download_url);
                description = descResponse.data;
            }

            if (thumbnailFile) {
                thumbnailUrl = thumbnailFile.download_url;
            }

            // Filtra apenas pastas e arquivos de músicas
            const filesToDownload = data.filter(file => file.type === 'file' && file.name !== 'artistdesc.txt' && file.name !== 'artistpfp.png');

            if (filesToDownload.length === 0) {
                message.reply('Nenhum arquivo encontrado para esse artista.');
                return;
            }

            // Cria uma pasta temporária para os arquivos
            const tempFolder = `./temp/${artistName}`;
            fs.mkdirSync(tempFolder, { recursive: true });

            // Baixa os arquivos
            for (const file of filesToDownload) {
                const fileResponse = await axios.get(file.download_url, { responseType: 'arraybuffer' });
                const filePath = path.join(tempFolder, file.name);
                fs.writeFileSync(filePath, fileResponse.data);
            }

            // Cria o arquivo ZIP
            const zip = new AdmZip();
            zip.addLocalFolder(tempFolder);
            const zipPath = `./temp/${artistName}.zip`;
            zip.writeZip(zipPath);

            // Envia o embed e o arquivo ZIP
            const embed = {
                title: `Músicas de ${artistName}`,
                description: description,
                thumbnail: thumbnailUrl ? { url: thumbnailUrl } : undefined,
                fields: filesToDownload.map(file => ({
                    name: 'Álbum/Pasta',
                    value: `[Baixar](${file.html_url})`,
                })),
                color: 0x00ff00,
            };

            await message.reply({
                content: `Aqui está o arquivo ZIP com todas as músicas de ${artistName}:`,
                embeds: [embed],
                files: [zipPath],
            });

            // Remove os arquivos temporários
            fs.rmSync(tempFolder, { recursive: true, force: true });
            fs.unlinkSync(zipPath);

        } catch (error) {
            console.error('Erro ao processar o comando:', error.message);
            message.reply('Ocorreu um erro ao processar a solicitação.');
        }
    },
};
