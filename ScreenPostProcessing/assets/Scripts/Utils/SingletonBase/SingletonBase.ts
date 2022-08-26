export class SingletonBase
{
    constructor() { }

    private static _instance = null;
    public static get instance()
    {
        return this._instance;
    }
    public static set instance(ins: SingletonBase)
    {
        this._instance = ins;
    }

    public static getSingletonInstance(...params: any[]): any
    {
        const Cls: any = this;
        if (!Cls.instance)
        {
            Cls.instance = new Cls(...params);
        }

        return Cls._instance;
    }
}