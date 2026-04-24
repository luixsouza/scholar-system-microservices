package disciplina.modelo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "disciplinas")
public class Disciplina {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String nome;
    private Integer cargaHoraria;

    @Column(name = "qtd_matriculas", nullable = false)
    private Integer qtdMatriculas = 0;

    public Disciplina() {}

    public Disciplina(Long id, String nome, Integer cargaHoraria) {
        this.id = id;
        this.nome = nome;
        this.cargaHoraria = cargaHoraria;
        this.qtdMatriculas = 0;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public Integer getCargaHoraria() { return cargaHoraria; }
    public void setCargaHoraria(Integer cargaHoraria) { this.cargaHoraria = cargaHoraria; }
    public Integer getQtdMatriculas() { return qtdMatriculas; }
    public void setQtdMatriculas(Integer qtdMatriculas) { this.qtdMatriculas = qtdMatriculas; }
}
