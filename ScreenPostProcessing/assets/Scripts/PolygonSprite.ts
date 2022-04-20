import PolygonSpriteAssembler from "./custom_assembler/base_assembler/PolygonSpriteAssembler";

const { ccclass, property } = cc._decorator;
@ccclass('PolygonSprite')
export default class PolygonSprite extends cc.Sprite
{
    @property(cc.Vec2)
    set moveSpeed(value: cc.Vec2)
    {
        this._moveSpeed = value;
        this._flushAssembler();
    }
    get moveSpeed()
    {
        return this._moveSpeed;
    }

    @property(cc.Vec2)
    _moveSpeed: cc.Vec2 = cc.Vec2.ZERO;

    @property({ type: [cc.Vec2] })
    protected _vertices: cc.Vec2[] = [new cc.Vec2(-100, -100), new cc.Vec2(100, -100), new cc.Vec2(100, 100), new cc.Vec2(-100, 100)];
    @property({ type: [cc.Vec2] })
    get vertices() {
        return this._vertices;
    }
    set vertices(value) {
        this._vertices = value;
        // this.markForUpdateRenderData();
    }

    @property({ type: [cc.Vec2] })
    protected _uvs: cc.Vec2[] = [new cc.Vec2(0, 0), new cc.Vec2(1, 0), new cc.Vec2(1, 1), new cc.Vec2(0, 1)];
    @property({ type: [cc.Vec2] })
    get uvs() {
        return this._uvs;
    }
    set uvs(value) {
        this._uvs = value;
        //@ts-ignore
        this._markForUpdateUvDirty();
        // this.markForUpdateRenderData();
    }

    // @ts-ignore
    renderData: cc.RenderData = new cc.RenderData();

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
        window["csp"] = this.node;
    }

    // // 使用cc.Sprite默认逻辑
    _resetAssembler()
    {
        // @ts-ignore
        this.setVertsDirty();
        // @ts-ignore
        let assembler = this._assembler = new PolygonSpriteAssembler();
        this._flushAssembler();

        assembler.init(this);

        //@ts-ignore
        this._updateColor();        // may be no need
    }
}