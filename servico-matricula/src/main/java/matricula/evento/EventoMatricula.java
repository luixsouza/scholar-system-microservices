package matricula.evento;

import java.time.Instant;

public record EventoMatricula(Long matriculaId, Long alunoId, Long disciplinaId, Instant ocorridoEm) {}
