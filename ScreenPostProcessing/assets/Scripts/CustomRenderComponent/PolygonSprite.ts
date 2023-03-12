import PolygonSpriteAssembler from "../custom_assembler/base_assembler/PolygonSpriteAssembler";

const { ccclass, property, inspector, menu, executeInEditMode } = cc._decorator;

@ccclass
@executeInEditMode
export default class PolygonSprite extends cc.Sprite
{
    @property(cc.Texture2D)
    _texture: cc.Texture2D = null;
    @property(cc.Texture2D)
    get texture() {
        return this._texture;
    }
    set texture(val: cc.Texture2D) {
        if (!val)
        {
            return;
        }
        this._texture = val;
        let l = -val.width/2, b = -val.height/2, t = val.height/2, r = val.width/2;
        this.polygon = [cc.v2(l, b), cc.v2(r, b), cc.v2(r, t), cc.v2(l, t)];
        this.node.width = val.width;
        this.node.height = val.height;
    }

    @property({ type: [cc.Vec2] })
    protected _polygon: cc.Vec2[] = [
        new cc.Vec2(-100, -100),
        new cc.Vec2(100, -100),
        new cc.Vec2(100, 100),
        new cc.Vec2(-100, 100)
    ];
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

    @property
    editing: boolean = false;

    public _flushAssembler(): void
    {
        // @ts-ignore
        let assembler: PolygonSpriteAssembler = this._assembler;
        if (!assembler)
        {
            return;
        }
        // assembler.moveSpeed = this._moveSpeed;
        // @ts-ignore
        this.setVertsDirty();
    }

    protected onLoad(): void
    {
        // overrid the _hitTest function for the node which has this component
        this.node["_hitTest"] = this._hitTest.bind(this);
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

    _hitTest (cameraPt: cc.Vec2): boolean
    {
        // copy from CCMask.js
        let node = this.node;
        let testPt = new cc.Vec2();
        
        node['_updateWorldMatrix']();
        // If scale is 0, it can't be hit.
        let _mat4_temp = new cc.Mat4();
        if (!cc.Mat4.invert(_mat4_temp, node['_worldMatrix'])) {
            return false;
        }
        cc.Vec2.transformMat4(testPt, cameraPt, _mat4_temp);
        return cc.Intersection.pointInPolygon(testPt, this.polygon);
    }
}