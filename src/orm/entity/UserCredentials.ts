import {Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn} from "typeorm";


@Entity()
export class UserCredentials {

    @PrimaryColumn()
    salt!: string;

    @Column()
    email!: string;

    @Column()
    verifiedEmail!: boolean;

    @Column()
    username!: string

    @Column()
    hash!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

}