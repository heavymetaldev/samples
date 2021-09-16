export declare class TaskCommand {
    constructor(command: any, properties: any, message: any);
    command: string;
    message: string;
    properties: {
        [key: string]: string;
    };
    toString(): string;
}
export declare function commandFromString(commandLine: any): TaskCommand;
