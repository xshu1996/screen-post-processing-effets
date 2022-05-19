const { ccclass, property, executeInEditMode } = cc._decorator;

const angle2Radian: number = Math.PI / 180;

@ccclass
// @executeInEditMode
export default class CircularMotion extends cc.Component
{
    /** 旋转中心点，基于父节点局部坐标 */
    private _centerPos: cc.Vec2 = cc.Vec2.ZERO;
    public set centerPos(v : cc.Vec2) {
        this._centerPos = v;
    }
    
    private _radius: number = 50;

    public set radius(v: number) 
    {
        this._radius = v;
    }

    public get radius(): number
    {
        return this._radius;
    }

    private _initialized: boolean = false;

    @property({ visible: true })
    private _speed: number = 0;
    public get speed() 
    {
        return this._speed;
    }
    public set speed(v : number) 
    {
        this._speed = v;
    }
    
    @property(cc.Node)
    public target: cc.Node = null;

    private _rotateMat: number[] = [
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
    ];

    private _translateMat: number[] = [
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
    ];

    protected start(): void
    {
        this.target.on(cc.Node.EventType.POSITION_CHANGED, () => {
            this.centerPos = this.target.getPosition();
        }, this);
    }

    public init(centerPos: cc.Vec2, radius: number, speed: number): void
    {
        if (this._initialized)
        {
            throw new Error("This Component has been initialized !");
        }
        this._initialized = true;
        this.centerPos = centerPos;
        this.radius = radius;
        this._speed = speed; 
    }

    public reset(): void
    {

    }

    protected update(dt: number): void
    {
        // if (!this._initialized)
        // {
        //     return;
        // }

        let radian = dt * this._speed * angle2Radian;
        this._setRotateMat(radian);

        let op = this.node.getPosition();

        this._setTranslateMat(this._centerPos.mul(-1));
        
        op = this.calculatePosByMat(op, this._translateMat);
        op = this.calculatePosByMat(op, this._rotateMat);
        
        this._setTranslateMat(this._centerPos);
        op = this.calculatePosByMat(op, this._translateMat);
    
        // op.normalizeSelf().mulSelf(this._radius);
        this.node.setPosition(op);
    }

    private _setRotateMat(radian: number): void
    {
        let sinA: number = Math.sin(radian);
        let cosA: number = Math.cos(radian);
        this._rotateMat[0] = cosA;
        this._rotateMat[3] = sinA;

        this._rotateMat[1] = -sinA;
        this._rotateMat[4] = cosA;
    }

    private _setTranslateMat(dv: cc.Vec2): void
    {
        this._translateMat[2] = dv.x;
        this._translateMat[5] = dv.y;
    }

    private calculatePosByMat(p: cc.Vec2, mat: number[], out?: cc.Vec2): cc.Vec2
    {
        if (!out)
        {
            out = cc.v2(0, 0);
        }
        let px = p.x, py = p.y;
        let m00 = mat[0], m01 = mat[1], m02 = mat[2],
            m10 = mat[3], m11 = mat[4], m12 = mat[5],
            m20 = mat[6], m21 = mat[7], m22 = mat[8];
        out.x = m00 * px + m01 * py + m02;
        out.y = m10 * px + m11 * py + m12;

        return out;
    }
}
