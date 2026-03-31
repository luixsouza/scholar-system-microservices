package com.scholar.student.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "AlunoResponse", description = "Dados do aluno retornados pela API")
public record AlunoResponseDTO(
        @Schema(description = "ID do aluno", example = "1")
        Long id,

        @Schema(description = "Nome completo do aluno", example = "Joao Silva")
        String nome,

        @Schema(description = "Email institucional", example = "joao.silva@aluno.ifsp.edu.br")
        String email,

        @Schema(description = "Numero de matricula", example = "2024001")
        String matricula
) {}
