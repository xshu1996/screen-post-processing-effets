const { ccclass, property, menu } = cc._decorator;

@ccclass
@menu("MetaBall")
export default class MetaBall2D extends cc.Component
{

    public static metaballs: MetaBall2D[] = [];

    private _circleCollider: cc.CircleCollider;

    protected onLoad(): void
    {
        this._circleCollider = this.getComponent(cc.CircleCollider);
        if (!cc.isValid(this._circleCollider))
        {
            this._circleCollider = this.addComponent(cc.CircleCollider);
            this._circleCollider.radius = this.node.width * 0.5;
        }
        MetaBall2D.metaballs.push(this);
    }

    public getRadius(): number
    {
        return this._circleCollider.radius;
    }

    protected onDestroy(): void
    {
        const index: number = MetaBall2D.metaballs.indexOf(this);
        if (index > -1)
        {
            MetaBall2D.metaballs.slice(index, 1);
        }
    }
}
