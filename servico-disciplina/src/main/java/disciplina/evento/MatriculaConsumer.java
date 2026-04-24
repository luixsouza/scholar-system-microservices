package disciplina.evento;

import disciplina.repositorio.DisciplinaRepository;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class MatriculaConsumer {

    private static final Logger log = LoggerFactory.getLogger(MatriculaConsumer.class);
    public static final String TOPICO_MATRICULA_CRIADA = "matricula.criada";

    private final DisciplinaRepository repositorio;

    public MatriculaConsumer(DisciplinaRepository repositorio) {
        this.repositorio = repositorio;
    }

    @Transactional
    @KafkaListener(topics = TOPICO_MATRICULA_CRIADA, groupId = "servico-disciplina")
    public void consumir(EventoMatricula evento) {
        log.info("Recebido evento MatriculaCriada: matriculaId={} disciplinaId={}",
                evento.matriculaId(), evento.disciplinaId());
        repositorio.findById(evento.disciplinaId()).ifPresentOrElse(d -> {
            d.setQtdMatriculas(d.getQtdMatriculas() + 1);
            repositorio.save(d);
            log.info("Atualizado contador de matriculas da disciplina {} para {}",
                    d.getId(), d.getQtdMatriculas());
        }, () -> {
            log.warn("Disciplina {} não encontrada localmente; ignorando evento", evento.disciplinaId());
        });
    }
}
