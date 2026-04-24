package matricula.cliente;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import matricula.dto.AlunoResponseDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class AlunoFacade {

    private static final Logger log = LoggerFactory.getLogger(AlunoFacade.class);
    private final AlunoClient cliente;

    public AlunoFacade(AlunoClient cliente) {
        this.cliente = cliente;
    }

    @CircuitBreaker(name = "alunoClient", fallbackMethod = "fallbackBuscarPorId")
    @Retry(name = "alunoClient")
    public AlunoResponseDTO buscarPorId(Long id) {
        return cliente.buscarPorId(id);
    }

    @SuppressWarnings("unused")
    private AlunoResponseDTO fallbackBuscarPorId(Long id, Throwable t) {
        log.warn("Fallback acionado para AlunoClient.buscarPorId({}) - causa: {}", id, t.toString());
        throw new ServicoIndisponivelException("servico-aluno indisponível: " + t.getMessage());
    }
}
