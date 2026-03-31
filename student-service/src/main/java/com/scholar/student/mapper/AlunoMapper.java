package com.scholar.student.mapper;

import com.scholar.student.dto.AlunoRequestDTO;
import com.scholar.student.dto.AlunoResponseDTO;
import com.scholar.student.model.Aluno;
import org.springframework.stereotype.Component;

@Component
public class AlunoMapper {

    public Aluno toEntity(AlunoRequestDTO dto) {
        Aluno aluno = new Aluno();
        aluno.setNome(dto.nome());
        aluno.setEmail(dto.email());
        aluno.setMatricula(dto.matricula());
        return aluno;
    }

    public AlunoResponseDTO toResponseDTO(Aluno aluno) {
        return new AlunoResponseDTO(
                aluno.getId(),
                aluno.getNome(),
                aluno.getEmail(),
                aluno.getMatricula()
        );
    }

    public void updateEntity(Aluno aluno, AlunoRequestDTO dto) {
        aluno.setNome(dto.nome());
        aluno.setEmail(dto.email());
        aluno.setMatricula(dto.matricula());
    }
}
