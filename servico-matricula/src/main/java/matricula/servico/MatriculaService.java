package matricula.servico;

import matricula.cliente.AlunoFacade;
import matricula.cliente.DisciplinaFacade;
import matricula.dto.MatriculaRequestDTO;
import matricula.dto.MatriculaResponseDTO;
import matricula.evento.EventoMatricula;
import matricula.evento.MatriculaProducer;
import matricula.mapeador.MatriculaMapper;
import matricula.modelo.Matricula;
import matricula.repositorio.MatriculaRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class MatriculaService {

    private final MatriculaRepository repositorio;
    private final MatriculaMapper mapeador;
    private final AlunoFacade fachadaAluno;
    private final DisciplinaFacade fachadaDisciplina;
    private final MatriculaProducer produtor;

    public MatriculaService(MatriculaRepository repositorio, MatriculaMapper mapeador,
                            AlunoFacade fachadaAluno, DisciplinaFacade fachadaDisciplina,
                            MatriculaProducer produtor) {
        this.repositorio = repositorio;
        this.mapeador = mapeador;
        this.fachadaAluno = fachadaAluno;
        this.fachadaDisciplina = fachadaDisciplina;
        this.produtor = produtor;
    }

    public MatriculaResponseDTO criar(MatriculaRequestDTO dto) {
        fachadaAluno.buscarPorId(dto.alunoId());
        fachadaDisciplina.buscarPorId(dto.disciplinaId());
        Matricula matricula = mapeador.paraEntidade(dto);
        Matricula salva = repositorio.save(matricula);
        produtor.publicarMatriculaCriada(new EventoMatricula(
                salva.getId(), salva.getAlunoId(), salva.getDisciplinaId(), Instant.now()));
        return mapeador.paraRespostaDTO(salva);
    }

    public List<MatriculaResponseDTO> buscarTodos() {
        return repositorio.findAll().stream()
                .map(mapeador::paraRespostaDTO)
                .toList();
    }

    public MatriculaResponseDTO buscarPorId(Long id) {
        Matricula matricula = repositorio.findById(id)
                .orElseThrow(() -> new RuntimeException("Matrícula não encontrada com id: " + id));
        return mapeador.paraRespostaDTO(matricula);
    }

    public void excluir(Long id) {
        if (!repositorio.existsById(id)) {
            throw new RuntimeException("Matrícula não encontrada com id: " + id);
        }
        repositorio.deleteById(id);
    }
}
