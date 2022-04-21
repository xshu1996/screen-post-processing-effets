import PolygonSpriteAssembler from "./custom_assembler/base_assembler/PolygonSpriteAssembler";

const { ccclass, property } = cc._decorator;
@ccclass
export default class PolygonSprite extends cc.Sprite
{
    @property({ type: [cc.Vec2] })
    protected _polygon: cc.Vec2[] = [new cc.Vec2(-100, -100), new cc.Vec2(0, 100), new cc.Vec2(100, -100)];
    @property({ type: [cc.Vec2] })
    get polygon()
    {
        return this._polygon;
    }
    set polygon(value)
    {
        this._polygon = value;
        // @ts-ignore
        this.setVertsDirty();
    }

    public _flushAssembler(): void
    {
        //@ts-ignore
        let assembler: PolygonSpriteAssembler = this._assembler;
        if (!assembler)
        {
            return;
        }
        // assembler.moveSpeed = this._moveSpeed;
        // @ts-ignore
        this.setVertsDirty();
    }

    onEnable()
    {
        super.onEnable();
    }

    // 使用cc.Sprite默认逻辑
    _resetAssembler()
    {
        // @ts-ignore
        let assembler = this._assembler = new PolygonSpriteAssembler();
        this._flushAssembler();

        assembler.init(this);

        //@ts-ignore
        this._updateColor();        // may be no need
    }
}