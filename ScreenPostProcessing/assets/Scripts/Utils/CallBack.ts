export class CallBack 
{
    private _caller: any;
    public get caller()
    {
        return this._caller;
    }
    private _handler: Function | null;
    public get handler()
    {
        return this._handler;
    }
    private _args: any[];

    constructor(thisArg: any, func: Function, ...args: any[])
    {
        this._caller = thisArg;
        this._handler = func;
        this._args = args;
        if (this._handler == null)
        {
            console.warn("CallBack-->  func 为空");
        }
    }

    public call(...callArgs: any[]): any
    {
        let arr = this.getCallBackArgs(callArgs);
        return this._handler.apply(this._caller, arr);
    }

    public getCallBackArgs(callArgs: any[]): any[]
    {
        let arr: any[] = [];
        if (this._args && this._args.length)
        {
            for (let index = 0; index < this._args.length; index++)
            {
                arr.push(this._args[index]);
            }
        }
        if (callArgs && callArgs.length)
        {
            for (let index = 0; index < callArgs.length; index++)
            {
                arr.push(callArgs[index]);
            }
        }
        return arr;
    }

    public destroy(): void
    {
        this._caller = null;
        this._handler = null;
        this._args = null;
    }
}