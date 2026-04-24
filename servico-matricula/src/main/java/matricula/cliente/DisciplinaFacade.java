package matricula.cliente;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import matricula.dto.DisciplinaResponseDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class DisciplinaFacade {

    private static final Logger log = LoggerFactory.getLogger(DisciplinaFacade.class);
    private final DisciplinaClient cliente;

    public DisciplinaFacade(DisciplinaClient cliente) {
        this.cliente = cliente;
    }

    @CircuitBreaker(name = "disciplinaClient", fallbackMethod = "fallbackBuscarPorId")
    @Retry(name = "disciplinaClient")
    public DisciplinaResponseDTO buscarPorId(Long id) {
        return cliente.buscarPorId(id);
    }

    @SuppressWarnings("unused")
    private DisciplinaResponseDTO fallbackBuscarPorId(Long id, Throwable t) {
        log.warn("Fallback acionado para DisciplinaClient.buscarPorId({}) - causa: {}", id, t.toString());
        throw new ServicoIndisponivelException("servico-disciplina indisponível: " + t.getMessage());
    }
}
