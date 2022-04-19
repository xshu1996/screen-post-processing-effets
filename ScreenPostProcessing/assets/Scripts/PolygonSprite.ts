import PolygonSpriteAssembler from "./custom_assembler/base_assembler/PolygonSpriteAssembler";

const { ccclass, property } = cc._decorator;

@ccclass
export default class PolygonSprite extends cc.Sprite
{
    @property(cc.Vec2)
    set moveSpeed(value: cc.Vec2)
    {
        this._moveSpeed = value;
        this.FlushProperties();
    }
    get moveSpeed()
    {
        return this._moveSpeed;
    }

    @property(cc.Vec2)
    _moveSpeed: cc.Vec2 = cc.Vec2.ZERO;

    public FlushProperties()
    {
        //@ts-ignore
        let assembler: PolygonSpriteAssembler = this._assembler;
        if (!assembler)
            return;

        // assembler.moveSpeed = this._moveSpeed;
        // @ts-ignore
        this.setVertsDirty();
    }

    onEnable()
    {
        super.onEnable();
    }

    // // 使用cc.Sprite默认逻辑
    _resetAssembler()
    {
        // @ts-ignore
        this.setVertsDirty();
        // @ts-ignore
        let assembler = this._assembler = new PolygonSpriteAssembler();
        this.FlushProperties();

        assembler.init(this);

        //@ts-ignore
        this._updateColor();        // may be no need
    }
}