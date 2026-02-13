import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, BaseEntity } from 'typeorm';
import { Reporte } from './Reporte.js';

@Entity('tipo_reporte')
export class Tipo extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', unique: true })
    iconName!: string;

    @Column({ type: 'int' })
    hideAfterZoom!: number;

    @Column({ type: 'varchar' })
    description!: string;

    @ManyToOne(() => Reporte, (reporte) => reporte.iconName)
    reportes!: Reporte[];
}