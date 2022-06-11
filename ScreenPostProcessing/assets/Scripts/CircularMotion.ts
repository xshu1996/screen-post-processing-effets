const { ccclass, property, executeInEditMode } = cc._decorator;

/** 角度转弧度 */
const angle2Radian: number = Math.PI / 180;
/** 弧度转角度 */
const radian2Angle: number = 180 / Math.PI;

/**
 * 基于矩阵去计算旋转和平移，加深对变换矩阵的理解
 */
@ccclass
// @executeInEditMode
export default class CircularMotion extends cc.Component
{
    @property
    isNormal: boolean = false;
    /** 旋转中心点，基于父节点局部坐标 */
    private _centerPos: cc.Vec2 = cc.Vec2.ZERO;
    public set centerPos(v: cc.Vec2)
    {
        if (v.equals(this._centerPos))
        {
            return;
        }
        let p = this.node.getPosition();
        let cc1 = v.sub(this._centerPos);
        this._setTranslateMat(cc1);
        p = this.calculatePosByMat(p, this._translateMat);
        this.node.setPosition(p);
        this._centerPos = v;
    }
    private _angleDelta: number = 0;

    @property({ visible: CC_EDITOR })
    private _radius: number = 200;
    public set radius(v: number) 
    {
        this._scaling = Math.abs(v - this._radius) > 1;
        this._radius = v;
    }
    public get radius(): number
    {
        return this._radius;
    }
    _scaling: boolean = false;

    private _initialized: boolean = false;

    @property({ visible: CC_EDITOR })
    private _speed: number = 0;
    public get speed() 
    {
        return this._speed;
    }
    public set speed(v: number) 
    {
        this._speed = v;
    }

    @property({ type: cc.Node, visible: CC_EDITOR })
    public target: cc.Node = null;

    @property(cc.Slider)
    public slider: cc.Slider = null;

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

    private _angleOffset: number = 180;

    private _angleSum: number = 90;

    protected start(): void
    {
        if (cc.isValid(this.target))
        {
            this.centerPos = this.target.getPosition();
        }
    }

    protected onEnable(): void
    {
        if (cc.isValid(this.target))
        {
            this.target.on(cc.Node.EventType.POSITION_CHANGED, () =>
            {
                this.centerPos = this.target.getPosition();
            }, this);
        }

        this.slider.handle.node.on(cc.Node.EventType.TOUCH_END, () =>
        {
            let v = this.slider.progress * (500 - 100) + 10 - this._radius;
            cc.tween(this as any).by(2, { radius: v }).start();
        }, this);
    }

    protected onDisable(): void
    {
        if (cc.isValid(this.target))
        {
            this.target.off(cc.Node.EventType.POSITION_CHANGED, null, this);
        }
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

        let op: cc.Vec2;
        if (this.isNormal)
        {
            // normal
            this._angleSum += dt * this.speed;
            this._angleSum %= 360;
            op = cc.v2(
                this._centerPos.x + this._radius * Math.cos(this._angleSum * angle2Radian),
                this._centerPos.y + this._radius * Math.sin(this._angleSum * angle2Radian)
            );
        }
        else 
        {
            op = this.node.getPosition();
            let cp = op.sub(this._centerPos);

            cp.normalizeSelf().mulSelf(this._radius);
            op = cp.add(this._centerPos);
            // 设置平移矩阵，先将旋转原点平移到坐标系原点
            this._setTranslateMat(this._centerPos.mul(-1));
            op = this.calculatePosByMat(op, this._translateMat);
            // 通过角度计算旋转之后的向量
            let radian: number = dt * this._speed * angle2Radian;
            this._setRotateMat(radian + this._angleDelta);
            // this._angleDelta && cc.log(this._angleDelta);
            this._angleDelta = 0;
            op = this.calculatePosByMat(op, this._rotateMat);
            // 再将向量平移回去
            this._setTranslateMat(this._centerPos);
            op = this.calculatePosByMat(op, this._translateMat);

        }

        let dir = op.sub(this.node.getPosition());
        let targetAngle = cc.Vec2.RIGHT.signAngle(dir) * radian2Angle + 90;
        this.node.angle = targetAngle;
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
