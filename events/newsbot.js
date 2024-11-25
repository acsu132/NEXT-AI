import net.dv8tion.jda.api.JDABuilder;
import net.dv8tion.jda.api.entities.TextChannel;
import net.dv8tion.jda.api.EmbedBuilder;
import com.mongodb.MongoClient;
import com.mongodb.MongoClientURI;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import org.bson.Document;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

import javax.security.auth.login.LoginException;
import java.awt.*;
import java.io.IOException;
import java.util.HashSet;
import java.util.Timer;
import java.util.TimerTask;

public class AndroidNewsBot {
    private static final String MONGODB_URI = "mongodb+srv://RTX:GAMING@cluster0.iuzzl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
    private static final String DATABASE_NAME = "discordBot";
    private static final String COLLECTION_NAME = "postedNews";
    private static final String CHANNEL_ID = "1309897299278696618"; // Substitua pelo ID do canal
    private static final String NEWS_API_URL = "https://newsapi.org/v2/everything?q=android&language=pt&apiKey=337b6806debe4df1b083f92f768fe2bf"; // Use sua API de notícias aqui
    private static final int INTERVAL = 3600000; // 1 hora em milissegundos

    public static void main(String[] args) throws LoginException {
        String token = System.getenv("DISCORD_BOT_TOKEN"); // Pega o token do .env

        // Inicializa o bot
        JDABuilder.createDefault(token).addEventListeners(new Object() {
            private final MongoClient mongoClient = new MongoClient(new MongoClientURI(MONGODB_URI));
            private final MongoDatabase database = mongoClient.getDatabase(DATABASE_NAME);
            private final MongoCollection<Document> collection = database.getCollection(COLLECTION_NAME);
            private final HashSet<String> postedNews = new HashSet<>();

            {
                // Carrega IDs das notícias já postadas
                for (Document doc : collection.find()) {
                    postedNews.add(doc.getString("id"));
                }

                // Inicia o timer para buscar notícias
                new Timer().scheduleAtFixedRate(new TimerTask() {
                    @Override
                    public void run() {
                        try {
                            TextChannel channel = JDABuilder.createDefault(token).build().getTextChannelById(CHANNEL_ID);
                            if (channel != null) {
                                String[] news = fetchNews();
                                if (news != null && !postedNews.contains(news[0])) {
                                    EmbedBuilder embed = new EmbedBuilder()
                                            .setTitle(news[1], news[2])
                                            .setDescription(news[3])
                                            .setColor(Color.GREEN)
                                            .setFooter("Fonte: " + news[4]);
                                    channel.sendMessageEmbeds(embed.build()).queue();

                                    // Armazena a notícia como postada
                                    collection.insertOne(new Document("id", news[0]));
                                    postedNews.add(news[0]);
                                }
                            }
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }
                }, 0, INTERVAL);
            }

            private String[] fetchNews() throws IOException {
                // Exemplo de busca de notícias com Jsoup
                Elements articles = Jsoup.connect(NEWS_API_URL).get().select("article");
                for (Element article : articles) {
                    String id = article.attr("data-id");
                    if (!postedNews.contains(id)) {
                        String title = article.select("h1").text();
                        String link = article.select("a").attr("href");
                        String description = article.select("p").text();
                        String source = "Android"; // Customize se necessário
                        return new String[]{id, title, link, description, source};
                    }
                }
                return null; // Nenhuma notícia nova
            }
        }).build();
    }
}