import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    BeforeInsert
} from "typeorm";
import { TipoReportes } from "./TipoReportes";

@Entity()
export class Reportes {
    @PrimaryGeneratedColumn("uuid")
    id?: string;

    @Column({ type: "varchar", length: 255 })
    title?: string;

    @Column({ type: "text" })
    description?: string;

    @Column({ type: "decimal", precision: 10, scale: 8 })
    latitude?: number;

    @Column({ type: "decimal", precision: 11, scale: 8 })
    longitude?: number;

    @Column({ type: "date" })
    fechaReporte?: Date;

    @Column({ type: "datetime" })
    horaReporte?: Date;

    @Column({ type: "datetime" })
    fechaExpiracion?: Date;

    @Column({ type: "boolean", default: false })
    expirado?: boolean;

    @ManyToOne(() => TipoReportes, (tipo) => tipo.reportes, {
        nullable: false,
        onDelete: "CASCADE",
        eager: true
    })
    @JoinColumn({ name: "tipoReporte_id" })
    tipoReporte?: TipoReportes;

    @Column({ type: "varchar", length: 36 })
    tipoReporte_id?: string;

    @Column({ type: "enum", enum: ["activo", "cancelado", "cerrado", "duplicado"], default: "activo" })
    estado?: string;

    @Column({ type: "int", default: 0 })
    reportesDuplicados?: number;

    @Column({ type: "boolean", default: true })
    visible?: boolean;

    @CreateDateColumn({ type: "datetime" })
    fechaCreacion?: Date;

    @UpdateDateColumn({ type: "datetime" })
    fechaActualizacion?: Date;

    @Column({ type: "datetime", nullable: true })
    fechaResolucion?: Date;


    @BeforeInsert()
    calcularFechaExpiracion() {
        if (this.tipoReporte && this.tipoReporte.duracionMinutos) {
            const ahora = new Date();
            this.fechaExpiracion = new Date(ahora.getTime() + this.tipoReporte.duracionMinutos * 60000);
        }
    }
}