import { Component, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DisciplinaService } from '../shared/services/disciplina.service';
import { Disciplina } from '../shared/models/disciplina.model';
import { DisciplinaDialogComponent } from './disciplina-dialog.component';

@Component({
  selector: 'app-disciplinas',
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatDialogModule],
  templateUrl: './disciplinas.component.html',
  styleUrl: './disciplinas.component.scss'
})
export class DisciplinasComponent implements OnInit {
  displayedColumns = ['id', 'nome', 'cargaHoraria', 'acoes'];
  disciplinas: Disciplina[] = [];

  constructor(private service: DisciplinaService, private dialog: MatDialog) {}

  ngOnInit() {
    this.carregar();
  }

  carregar() {
    this.service.listar().subscribe(data => this.disciplinas = data);
  }

  abrir(disciplina?: Disciplina) {
    const ref = this.dialog.open(DisciplinaDialogComponent, {
      width: '400px',
      data: disciplina ? { ...disciplina } : null
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.carregar();
    });
  }

  excluir(id: number) {
    this.service.excluir(id).subscribe(() => this.carregar());
  }
}
