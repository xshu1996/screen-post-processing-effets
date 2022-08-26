export interface IDelegate
{
    (sender: any, ...parameters: any[]): void;
}

export class DelegateBuilder
{
    private callees: IDelegate[];

    constructor()
    {
        this.callees = [];
    }

    private invoke(sender: any, ...parameters: any[]): void
    {
        for (let i = 0; i < this.callees.length; i++)
        {
            let callee = this.callees[i];
            if (callee)
                callee(sender, parameters);
        }
    }

    private contains(callee: IDelegate): boolean
    {
        if (!callee)
            return false;

        return this.callees.indexOf(callee) >= 0;
    }

    public add(callee: IDelegate): DelegateBuilder
    {
        if (!callee)
            return this;

        if (!this.contains(callee))
            this.callees.push(callee);

        return this;
    }

    public remove(callee: IDelegate): DelegateBuilder
    {
        if (!callee)
            return this;

        const index = this.callees.indexOf(callee);
        if (index >= 0)
            this.callees.splice(index, 1);

        return this;
    }

    /** 生成 Delegate 函数 */
    public toDelegate(): IDelegate
    {
        return (sender: any, ...parameters: any[]) => this.invoke(sender, parameters);
    }
}