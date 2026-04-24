package disciplina.mapeador;

import disciplina.dto.DisciplinaRequestDTO;
import disciplina.dto.DisciplinaResponseDTO;
import disciplina.modelo.Disciplina;
import org.springframework.stereotype.Component;

@Component
public class DisciplinaMapper {

    public Disciplina paraEntidade(DisciplinaRequestDTO dto) {
        Disciplina disciplina = new Disciplina();
        disciplina.setNome(dto.nome());
        disciplina.setCargaHoraria(dto.cargaHoraria());
        disciplina.setQtdMatriculas(0);
        return disciplina;
    }

    public DisciplinaResponseDTO paraRespostaDTO(Disciplina disciplina) {
        return new DisciplinaResponseDTO(
                disciplina.getId(),
                disciplina.getNome(),
                disciplina.getCargaHoraria(),
                disciplina.getQtdMatriculas()
        );
    }

    public void atualizarEntidade(Disciplina disciplina, DisciplinaRequestDTO dto) {
        disciplina.setNome(dto.nome());
        disciplina.setCargaHoraria(dto.cargaHoraria());
    }
}
