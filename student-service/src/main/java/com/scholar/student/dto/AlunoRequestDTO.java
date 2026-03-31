package com.scholar.student.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@Schema(name = "AlunoRequest", description = "Dados para criacao/atualizacao de aluno")
public record AlunoRequestDTO(
        @Schema(description = "Nome completo do aluno", example = "Joao Silva")
        @NotBlank
        String nome,

        @Schema(description = "Email institucional", example = "joao.silva@aluno.ifsp.edu.br")
        @NotBlank @Email
        String email,

        @Schema(description = "Numero de matricula", example = "2024001")
        @NotBlank
        String matricula
) {}
