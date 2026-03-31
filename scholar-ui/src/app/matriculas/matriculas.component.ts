import { Component, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatriculaService } from '../shared/services/matricula.service';
import { Matricula } from '../shared/models/matricula.model';
import { MatriculaDialogComponent } from './matricula-dialog.component';

@Component({
  selector: 'app-matriculas',
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatDialogModule],
  templateUrl: './matriculas.component.html',
  styleUrl: './matriculas.component.scss'
})
export class MatriculasComponent implements OnInit {
  displayedColumns = ['id', 'alunoId', 'disciplinaId', 'acoes'];
  matriculas: Matricula[] = [];

  constructor(private service: MatriculaService, private dialog: MatDialog) {}

  ngOnInit() {
    this.carregar();
  }

  carregar() {
    this.service.listar().subscribe(data => this.matriculas = data);
  }

  abrir() {
    const ref = this.dialog.open(MatriculaDialogComponent, { width: '400px' });
    ref.afterClosed().subscribe(result => {
      if (result) this.carregar();
    });
  }

  excluir(id: number) {
    this.service.excluir(id).subscribe(() => this.carregar());
  }
}
