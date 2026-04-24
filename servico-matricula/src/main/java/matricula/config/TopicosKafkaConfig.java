package matricula.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class TopicosKafkaConfig {

    @Bean
    public NewTopic topicoMatriculaCriada() {
        return TopicBuilder.name("matricula.criada").partitions(1).replicas(1).build();
    }

    @Bean
    public NewTopic topicoMatriculaCriadaDlq() {
        return TopicBuilder.name("matricula.criada.dlq").partitions(1).replicas(1).build();
    }
}
