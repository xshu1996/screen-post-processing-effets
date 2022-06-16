type Vec2 = cc.Vec2;
const Vec2 = cc.Vec2;

export class MathUtils 
{
    /** 耳切法，将多边形分解为多个三角形，获取切除凹顶点后的顶点 */
    public static splitPolygon2Triangle(points: cc.Vec2[]): number[]
    {
        if (points.length <= 3) return [0, 1, 2];
        // point与idx的映射
        let pointMap: { [key: string]: number } = {};
        for (let i = 0; i < points.length; ++i)
        {
            let p = points[i];
            pointMap[`${p.x}-${p.y}`] = i;
        }
        const getIdx = (p: cc.Vec2) =>
        {
            return pointMap[`${p.x}-${p.y}`];
        }
        points = points.concat([]);
        let idxs: number[] = [];

        let index = 0;
        while (points.length > 3)
        {
            let p1 = points[(index) % points.length]
                , p2 = points[(index + 1) % points.length]
                , p3 = points[(index + 2) % points.length];
            let splitPoint = (index + 1) % points.length;

            let v1 = p2.sub(p1);
            let v2 = p3.sub(p2);
            if (v1.cross(v2) < 0)
            {
                // 是一个凹角, 寻找下一个
                index = (index + 1) % points.length;
                continue;
            }
            let hasPoint = false;
            for (const p of points)
            {
                if (p != p1 && p != p2 && p != p3 && this.isInTriangle(p, p1, p2, p3))
                {
                    hasPoint = true;
                    break;
                }
            }
            if (hasPoint)
            {
                // 当前三角形包含其他点, 寻找下一个
                index = (index + 1) % points.length;
                continue;
            }
            // 找到了耳朵, 切掉
            idxs.push(getIdx(p1), getIdx(p2), getIdx(p3));
            points.splice(splitPoint, 1);
        }
        for (const p of points)
        {
            idxs.push(getIdx(p));
        }
        return idxs;
    }

    /** 判断一个点是否在三角形内 */
    public static isInTriangle(point: cc.Vec2, triA: cc.Vec2, triB: cc.Vec2, triC: cc.Vec2): boolean
    {
        let AB = triB.sub(triA), AC = triC.sub(triA),
            BC = triC.sub(triB), AD = point.sub(triA),
            BD = point.sub(triB);
        // @ts-ignore
        return (AB.cross(AC) >= 0 ^ AB.cross(AD) < 0) && (AB.cross(AC) >= 0 ^ AC.cross(AD) >= 0) && (BC.cross(AB) > 0 ^ BC.cross(BD) >= 0);
    }

    /** 计算图片上的点在合图中真实的uv */
    public static calculateUVsInAtlas(points: cc.Vec2[], size: cc.Size, frame_uv: number[] = [0, 1, 1, 0], anchorPoint: cc.Vec2 = cc.v2(0.5, 0.5), isRotated: boolean = false): cc.Vec2[]
    {
        // 用于合图映射到真实的uv
        let [l, b, r, t] = frame_uv;
        let uvs: cc.Vec2[] = points.map(p =>
        {
            return cc.v2(
                cc.misc.clamp01((p.x + size.width * anchorPoint.x) / size.width) * (r - l) + l,
                cc.misc.clamp01(1.0 - (p.y + size.height * anchorPoint.y) / size.height) * (b - t) + t
            );
        });
        if (isRotated)
        {
            uvs.map(uv => [uv.x, uv.y] = [uv.y, 1.0 - uv.x]);
        }
        return uvs;
    }


    /** 把图片上的点映射到 uv 中,范围[0~1] */
    public static calculatedUv01(points: cc.Vec2[], size: cc.Size, anchorPoint: cc.Vec2 = cc.v2(0.5, 0.5)): cc.Vec2[]
    {
        const { width, height } = size;
        let uvs: cc.Vec2[] = points.map(p => 
        {
            return cc.v2(
                cc.misc.clamp01((p.x + width * anchorPoint.x) / width),
                cc.misc.clamp01(1.0 - (p.y + height * anchorPoint.y) / height)
            );
        });
        return uvs;
    }

    /**
     * 旋转二维向量
     * @param angle 弧度
     */
    public static rotateVec2(p: Vec2, angle: number): Vec2
    {
        return new Vec2(
            Math.cos(angle) * p.x - Math.sin(angle) * p.y,
            Math.sin(angle) * p.x + Math.cos(angle) * p.y
        );
    }

    /**
     * 矢量压缩算法-光栏法
     * 适合绘画路径时，压缩路径的点
     * @param caliber 扇形口径 
     */
    public static simplifyLightBar(points: Vec2[], caliber: number = 3): Vec2[]
    {
        if (caliber <= 0)
        {
            return points;
        }

        if (points.length < 2)
        {
            return points;
        }

        /**
        * 点是否在光栏内
        * @param p1 光栏起始点
        */
        const isInLightBar = function (up: Vec2, down: Vec2, p1: Vec2, target: Vec2): boolean
        {
            let line: Vec2 = target.sub(p1);
            if (line.cross(up) >= 0 && line.cross(down) <= 0)
            {
                return true;
            }

            return false;
        }

        // 获取光栏上下两条边向量
        const getLightBarEdge = function (p1: Vec2, p2: Vec2, caliber: number)
        {
            // 旋转向量
            const rotateVec2 = function (p: Vec2, angle: number): Vec2
            {
                return new Vec2(
                    Math.cos(angle) * p.x - Math.sin(angle) * p.y,
                    Math.sin(angle) * p.x + Math.cos(angle) * p.y
                );
            }
            let len = Vec2.distance(p1, p2);
            let angle = Math.atan2(caliber * 0.5, len);
            let up = rotateVec2(p2.sub(p1), angle);
            let down = rotateVec2(p2.sub(p1), -angle);
            return { up, down };
        }

        const acosVector = function (v1: Vec2, v2: Vec2)
        {
            return Math.acos(v1.dot(v2) / (v1.mag() * v2.mag()));
        }

        for (let p of points)
        {
            p["__valid__"] = true;
        }

        let p1 = points[0];
        let p2 = points[1];
        let light = getLightBarEdge(p1, p2, caliber);
        let up = light.up;
        let down = light.down;
        let lastIndex = 1;

        for (let i = 2; i < points.length; i++)
        {
            let p = points[i];
            if (isInLightBar(up, down, p1, p))
            {
                // 如果下一个点在光栏内，则删除上一个点，当前点为新p2
                points[i - 1]["__valid__"] = false;
                p2 = points[i];
                let light = getLightBarEdge(p1, p2, caliber);
                let newUp = light.up, newDown = light.down;

                // 开始缩小光栏口径
                let p1p2: Vec2 = p2.sub(p1);

                // 新的点与旧的扇形的起始点p1产生的新扇形的两条边与旧的扇形两条边，一共四条边，取中间夹角最小的两条边作为新的边
                // 也就是缩小光栏的口径
                if (acosVector(p1p2, newDown) < acosVector(p1p2, down))
                {
                    down = newDown;
                }

                if (acosVector(p1p2, newUp) < acosVector(p1p2, up))
                {
                    up = newUp;
                }
            } else
            {
                // 如果不在，则保留上一个点，以上一个点为新p1
                points[i - 1]["__valid__"] = true;
                p1 = points[i - 1];
                p2 = points[i];
                let light = getLightBarEdge(p1, p2, caliber);
                up = light.up;
                down = light.down;

                // 上一个有效点到现在有效点直线， 之间如果有回折，那最末端的点应该保留
                let lastPoint = points[lastIndex];
                let maxDis = 0;
                let maxDisIndex = 0;

                for (let i = lastIndex; i > 0; i--)
                {
                    let dis = Vec2.distance(lastPoint, points[i]);
                    if (dis > maxDis)
                    {
                        maxDis = dis;
                        maxDisIndex = i;
                    }
                }

                if (maxDis - Vec2.distance(lastPoint, p1) > caliber)
                {
                    points[maxDisIndex]["__valid__"] = true;
                }
                lastIndex = i - 1;
            }
        }

        let ret: Vec2[] = [];

        for (let p of points)
        {
            if (p["__valid__"])
            {
                ret.push(new Vec2(p.x, p.y));
            }
            delete p["__valid__"];
        }

        return ret;
    }

    /**
     * simulates lightning bolts using midpoint displacement.
     * @see {@link https://krazydad.com/bestiary/bestiary_lightning.html}
     * @param {IVec2Like} startPos  起始点
     * @param {IVec2Like} endPos 终点
     * @param {number} detail 最短线段
     * @param {number} displacement 电位移量
     * @returns {IVec2Like[]}
     */
    public static lightningGenerator(startPos: IVec2Like, endPos: IVec2Like, detail: number, displacement: number): IVec2Like[]
    {
        const ret: IVec2Like[] = [];
        const division = function (x1, y1, x2, y2, displace)
        {
            if (displace < detail)
            {
                if (ret.length === 0)
                {
                    // 起点
                    ret.push({ x: x1, y: y1 });
                }
                // 中点 or 终点
                ret.push({ x: x2, y: y2 });
            }
            else
            {
                let mid_x = x1 + (x2 - x1) / 2;
                let mid_y = y1 + (y2 - y1) / 2;
                mid_x += (Math.random() - 0.5) * displace;
                mid_y += (Math.random() - 0.5) * displace;
                division(x1, y1, mid_x, mid_y, displace / 2);
                division(mid_x, mid_y, x2, y2, displace / 2);
            }
        }

        division(startPos.x, startPos.y, endPos.x, endPos.y, displacement);

        return ret;
    }
}