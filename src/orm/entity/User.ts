import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
} from "typeorm";


@Entity()
export class User {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({unique: true})
    username!: string;

    @Column({default: null, nullable: true, unique: true})
    googleId!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @CreateDateColumn()
    updatedAt!: Date;

}