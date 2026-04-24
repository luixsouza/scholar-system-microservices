package matricula.evento;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class MatriculaProducer {

    private static final Logger log = LoggerFactory.getLogger(MatriculaProducer.class);
    public static final String TOPICO_MATRICULA_CRIADA = "matricula.criada";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public MatriculaProducer(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publicarMatriculaCriada(EventoMatricula evento) {
        log.info("Publicando evento MatriculaCriada: matriculaId={} alunoId={} disciplinaId={}",
                evento.matriculaId(), evento.alunoId(), evento.disciplinaId());
        kafkaTemplate.send(TOPICO_MATRICULA_CRIADA, String.valueOf(evento.matriculaId()), evento);
    }
}
