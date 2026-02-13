import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  OneToMany 
} from "typeorm";
import { Reportes } from "./Reportes";

@Entity()
export class TipoReportes {
  @PrimaryGeneratedColumn("uuid")
  id?: string;

  @Column({ type: "varchar", length: 255 })
  title?: string;

  @Column({ type: "varchar", length: 100 })
  iconName?: string;

  @Column({ type: "text" })
  snippet?: string;

  @Column({ type: "int" })
  size?: number;

  @Column({ type: "int" })
  hideAfterZoom?: number;

  @Column({ type: "int", comment: "Duración de vida del reporte en minutos", default: 60 })
  duracionMinutos?: number;

  @Column({ type: "boolean", default: true })
  activo?: boolean;

  @CreateDateColumn({ type: "datetime" })
  fechaCreacion?: Date;

  @UpdateDateColumn({ type: "datetime" })
  fechaActualizacion?: Date;

  @OneToMany(() => Reportes, (reporte) => reporte.tipoReporte)
  reportes?: Reportes[];
}