package disciplina.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.common.TopicPartition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.KafkaOperations;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

@Configuration
public class KafkaConsumerConfig {

    private static final Logger log = LoggerFactory.getLogger(KafkaConsumerConfig.class);
    public static final String TOPICO_DLQ = "matricula.criada.dlq";

    @Bean
    public NewTopic topicoMatriculaCriadaDlq() {
        return TopicBuilder.name(TOPICO_DLQ).partitions(1).replicas(1).build();
    }

    @Bean
    public DefaultErrorHandler errorHandler(KafkaOperations<String, Object> template) {
        DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(template,
                (ConsumerRecord<?, ?> record, Exception ex) -> {
                    log.error("Enviando registro para DLQ {} após esgotamento de tentativas: key={}, exception={}",
                            TOPICO_DLQ, record.key(), ex.getMessage());
                    return new TopicPartition(TOPICO_DLQ, record.partition());
                });
        return new DefaultErrorHandler(recoverer, new FixedBackOff(2000L, 3L));
    }
}
