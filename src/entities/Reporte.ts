import { Entity, PrimaryGeneratedColumn, Column, OneToMany, JoinColumn, CreateDateColumn, BaseEntity } from 'typeorm';
import { Tipo } from './Tipo.js';

@Entity('Reportes')
export class Reporte extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar' })
    title!: string;

    @Column({ type: 'varchar' })
    ubicacion!: string;

    @Column({ type: 'text' })
    snippet!: string;

    @Column({ type: 'int' })
    size!: number;

    @Column({ type: 'varchar' })
    latitude!: string;

    @Column({ type: 'varchar' })
    longitude!: string;

    @OneToMany(() => Tipo, (tipo) => tipo.reportes)
    // @JoinColumn({ name: 'tipo_id' })
    iconName!: Tipo | null;

    @CreateDateColumn({ type: "timestamp" })
    fechaCreacion!: Date;
}