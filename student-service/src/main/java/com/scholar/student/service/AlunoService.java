package com.scholar.student.service;

import com.scholar.student.dto.AlunoRequestDTO;
import com.scholar.student.dto.AlunoResponseDTO;
import com.scholar.student.mapper.AlunoMapper;
import com.scholar.student.model.Aluno;
import com.scholar.student.repository.AlunoRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AlunoService {

    private final AlunoRepository repository;
    private final AlunoMapper mapper;

    public AlunoService(AlunoRepository repository, AlunoMapper mapper) {
        this.repository = repository;
        this.mapper = mapper;
    }

    public AlunoResponseDTO create(AlunoRequestDTO dto) {
        Aluno aluno = mapper.toEntity(dto);
        return mapper.toResponseDTO(repository.save(aluno));
    }

    public List<AlunoResponseDTO> findAll() {
        return repository.findAll().stream()
                .map(mapper::toResponseDTO)
                .toList();
    }

    public AlunoResponseDTO findById(Long id) {
        Aluno aluno = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Aluno nao encontrado com id: " + id));
        return mapper.toResponseDTO(aluno);
    }

    public AlunoResponseDTO update(Long id, AlunoRequestDTO dto) {
        Aluno aluno = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Aluno nao encontrado com id: " + id));
        mapper.updateEntity(aluno, dto);
        return mapper.toResponseDTO(repository.save(aluno));
    }

    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new RuntimeException("Aluno nao encontrado com id: " + id);
        }
        repository.deleteById(id);
    }
}
