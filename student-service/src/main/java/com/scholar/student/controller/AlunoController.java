package com.scholar.student.controller;

import com.scholar.student.dto.AlunoRequestDTO;
import com.scholar.student.dto.AlunoResponseDTO;
import com.scholar.student.service.AlunoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/alunos")
@Tag(name = "Alunos", description = "Gerenciamento de alunos")
public class AlunoController {

    private final AlunoService service;

    public AlunoController(AlunoService service) {
        this.service = service;
    }

    @PostMapping
    @Operation(summary = "Cadastrar aluno", description = "Cadastra um novo aluno no sistema")
    @ApiResponse(responseCode = "201", description = "Aluno cadastrado com sucesso")
    public ResponseEntity<AlunoResponseDTO> create(@Valid @RequestBody AlunoRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(dto));
    }

    @GetMapping
    @Operation(summary = "Listar alunos", description = "Retorna todos os alunos cadastrados")
    @ApiResponse(responseCode = "200", description = "Lista de alunos")
    public ResponseEntity<List<AlunoResponseDTO>> findAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar aluno por ID", description = "Retorna um aluno pelo seu ID")
    @ApiResponse(responseCode = "200", description = "Aluno encontrado")
    public ResponseEntity<AlunoResponseDTO> findById(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar aluno", description = "Atualiza os dados de um aluno existente")
    @ApiResponse(responseCode = "200", description = "Aluno atualizado com sucesso")
    public ResponseEntity<AlunoResponseDTO> update(@PathVariable Long id, @Valid @RequestBody AlunoRequestDTO dto) {
        return ResponseEntity.ok(service.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Remover aluno", description = "Remove um aluno do sistema")
    @ApiResponse(responseCode = "204", description = "Aluno removido com sucesso")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
