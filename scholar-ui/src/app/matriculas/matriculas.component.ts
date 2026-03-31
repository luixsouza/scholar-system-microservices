import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { forkJoin } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatriculaService } from '../shared/services/matricula.service';
import { AlunoService } from '../shared/services/aluno.service';
import { DisciplinaService } from '../shared/services/disciplina.service';
import { Matricula } from '../shared/models/matricula.model';
import { Aluno } from '../shared/models/aluno.model';
import { Disciplina } from '../shared/models/disciplina.model';
import { MatriculaDialogComponent } from './matricula-dialog.component';

interface MatriculaView {
  id: number;
  alunoNome: string;
  disciplinaNome: string;
}

@Component({
  selector: 'app-matriculas',
  imports: [MatTableModule, MatButtonModule, MatIconModule],
  templateUrl: './matriculas.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MatriculasComponent {
  columns = ['alunoNome', 'disciplinaNome', 'acoes'];
  matriculas = signal<MatriculaView[]>([]);

  constructor(
    private matriculaService: MatriculaService,
    private alunoService: AlunoService,
    private disciplinaService: DisciplinaService,
    private dialog: MatDialog,
    private snack: MatSnackBar
  ) {
    this.carregar();
  }

  carregar() {
    forkJoin({
      matriculas: this.matriculaService.listar(),
      alunos: this.alunoService.listar(),
      disciplinas: this.disciplinaService.listar()
    }).subscribe(({ matriculas, alunos, disciplinas }) => {
      const alunoMap = new Map(alunos.map(a => [a.id!, a.nome]));
      const discMap = new Map(disciplinas.map(d => [d.id!, d.nome]));
      this.matriculas.set(matriculas.map(m => ({
        id: m.id!,
        alunoNome: alunoMap.get(m.alunoId) ?? `#${m.alunoId}`,
        disciplinaNome: discMap.get(m.disciplinaId) ?? `#${m.disciplinaId}`
      })));
    });
  }

  abrir() {
    this.dialog.open(MatriculaDialogComponent, { width: '400px' })
      .afterClosed().subscribe(result => { if (result) this.carregar(); });
  }

  excluir(m: MatriculaView) {
    if (!confirm(`Cancelar matricula de ${m.alunoNome} em ${m.disciplinaNome}?`)) return;
    this.matriculaService.excluir(m.id).subscribe(() => {
      this.snack.open('Matricula cancelada', '', { duration: 2000 });
      this.carregar();
    });
  }
}
