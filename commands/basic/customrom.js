import discord
from discord.ext import commands
from discord import app_commands
import requests

# Configuração do bot
intents = discord.Intents.default()
bot = commands.Bot(command_prefix="$", intents=intents)

# Comando Slash para buscar ROMs customizadas
@bot.event
async def on_ready():
    print(f"Bot conectado como {bot.user}")
    try:
        synced = await bot.tree.sync()
        print(f"Comandos Slash sincronizados: {len(synced)}")
    except Exception as e:
        print(f"Erro ao sincronizar comandos Slash: {e}")

@bot.tree.command(name="customrom", description="Busca custom ROMs para um dispositivo Android.")
@app_commands.describe(device="Nome do dispositivo Android")
async def customrom(interaction: discord.Interaction, device: str):
    await interaction.response.defer()  # Envia uma resposta "carregando"
    
    # Configuração da API do GitHub
    headers = {"Accept": "application/vnd.github.v3+json"}
    query = f"{device} custom rom"
    url = f"https://api.github.com/search/repositories?q={query}&sort=stars&order=desc"

    try:
        response = requests.get(url, headers=headers)
        data = response.json()

        if "items" in data and data["items"]:
            roms = data["items"][:5]  # Limita a 5 resultados
            rom_list = "\n".join([f"[{rom['name']}]({rom['html_url']}) - ⭐ {rom['stargazers_count']} stars" for rom in roms])
            await interaction.followup.send(
                f"**Custom ROMs encontradas para `{device}`:**\n{rom_list}"
            )
        else:
            await interaction.followup.send(
                f"Nenhuma custom ROM encontrada para `{device}`. Tente outro nome!"
            )
    except Exception as e:
        await interaction.followup.send(f"Erro ao buscar custom ROMs: {e}")
